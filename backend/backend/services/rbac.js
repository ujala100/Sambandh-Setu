/**
 * Role-based access control for the team console.
 *
 * Every account has one role (users.role). A role is a named set of permissions stored in the
 * roles table. Built-in roles are created on first use; admins with roles.manage can edit them
 * (except member and super_admin) and create custom roles. super_admin always has every permission.
 *
 * Rules that cannot be configured away:
 *  - you can only grant a role whose permissions you already hold (no escalation);
 *  - you cannot change your own role;
 *  - the last super_admin cannot be demoted or suspended.
 */
const { getDb, nowIso } = require("../db");
const { parseJson } = require("../utils/helpers");
const ApiError = require("../utils/ApiError");

const PERMISSIONS = [
    { key: "overview.view", label: "View the console overview" },
    { key: "analytics.view", label: "View analytics and recommendation metrics" },
    { key: "verifications.review", label: "Review verification documents" },
    { key: "reports.review", label: "Review reports and close them" },
    { key: "tickets.handle", label: "Answer and close support requests" },
    { key: "members.view", label: "Search members and see account details" },
    { key: "members.suspend", label: "Suspend and reactivate members" },
    { key: "members.roles", label: "Assign roles to members" },
    { key: "features.manage", label: "Turn features on or off, roll out and announce" },
    { key: "recommendations.manage", label: "Tune the recommendation system" },
    { key: "roles.manage", label: "Create and edit roles" },
    { key: "audit.view", label: "Read the audit log" }
];
const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);
const ALL = "*";

const BUILT_IN = [
    { key: "member", name: "Member", description: "Regular member. No console access.", permissions: [] },
    { key: "support", name: "Support", description: "Answers support requests.", permissions: ["overview.view", "tickets.handle", "members.view"] },
    { key: "verifier", name: "Verifier", description: "Reviews verification documents.", permissions: ["overview.view", "verifications.review", "members.view"] },
    { key: "moderator", name: "Moderator", description: "Keeps the community safe: reports, verification, suspensions.", permissions: ["overview.view", "reports.review", "verifications.review", "tickets.handle", "members.view", "members.suspend"] },
    { key: "analyst", name: "Analyst", description: "Reads analytics and recommendation metrics.", permissions: ["overview.view", "analytics.view"] },
    { key: "admin", name: "Admin", description: "Runs the platform. Everything except editing roles.", permissions: PERMISSION_KEYS.filter((p) => p !== "roles.manage") },
    { key: "super_admin", name: "Super admin", description: "Owner. Every permission, including roles.", permissions: [ALL] }
];
const LOCKED = new Set(["member", "super_admin"]);

/** Creates missing built-in roles (runs whenever the role cache refreshes). */
const ensureRoles = async () => {
    const db = getDb();
    const now = nowIso();
    for (const r of BUILT_IN) {
        await db.prepare(`INSERT INTO roles (key, name, description, permissions, built_in, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT (key) DO NOTHING`).run(r.key, r.name, r.description, JSON.stringify(r.permissions), now, now);
    }
};

// Short in-process cache so permission checks do not hit the database on every request.
let cache = { at: 0, roles: null };
const TTL_MS = 5000;
const invalidate = () => { cache = { at: 0, roles: null }; };

const allRoles = async () => {
    if (cache.roles && Date.now() - cache.at < TTL_MS) return cache.roles;
    await ensureRoles();
    const rows = await getDb().prepare("SELECT * FROM roles ORDER BY built_in DESC, name").all();
    const roles = rows.map((r) => ({
        key: r.key, name: r.name, description: r.description, builtIn: Boolean(r.built_in), locked: LOCKED.has(r.key),
        permissions: r.key === "super_admin" ? [ALL] : parseJson(r.permissions, []).filter((p) => PERMISSION_KEYS.includes(p))
    }));
    cache = { at: Date.now(), roles };
    return roles;
};

const roleByKey = async (key) => (await allRoles()).find((r) => r.key === key) || null;

/** Effective permission list for a role key ('*' expanded). */
const permissionsOf = async (roleKey) => {
    const role = await roleByKey(roleKey || "member");
    if (!role) return [];
    return role.permissions.includes(ALL) ? [...PERMISSION_KEYS] : role.permissions;
};

const isStaffRole = async (roleKey) => (await permissionsOf(roleKey)).length > 0;

const can = async (roleKey, permission) => (await permissionsOf(roleKey)).includes(permission);

/** Can someone with `actorRole` hand out `targetRole`? Only roles whose permissions they already hold. */
const canGrant = async (actorRole, targetRole) => {
    if (actorRole === "super_admin") return true;
    const mine = new Set(await permissionsOf(actorRole));
    const theirs = await permissionsOf(targetRole);
    return theirs.every((p) => mine.has(p)) && targetRole !== "super_admin";
};

const superAdminCount = async () => Number((await getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin' AND status <> 'deleted'").get()).n);

const validateRoleInput = (body, { creating }) => {
    const out = {};
    if (creating) {
        const key = String(body.key || "").trim().toLowerCase();
        if (!/^[a-z][a-z0-9_]{2,30}$/.test(key)) throw ApiError.badRequest("Role key: 3-31 lowercase letters, numbers or underscores, starting with a letter");
        out.key = key;
    }
    if (body.name !== undefined || creating) {
        const name = String(body.name || "").trim();
        if (name.length < 2 || name.length > 40) throw ApiError.badRequest("Role name must be 2-40 characters");
        out.name = name;
    }
    if (body.description !== undefined) out.description = String(body.description || "").trim().slice(0, 160);
    if (body.permissions !== undefined || creating) {
        if (!Array.isArray(body.permissions)) throw ApiError.badRequest("permissions must be a list");
        const bad = body.permissions.filter((p) => !PERMISSION_KEYS.includes(p));
        if (bad.length) throw ApiError.badRequest(`Unknown permissions: ${bad.join(", ")}`);
        out.permissions = [...new Set(body.permissions)];
    }
    return out;
};

const createRole = async (input) => {
    const r = validateRoleInput(input, { creating: true });
    if (await roleByKey(r.key)) throw ApiError.conflict("A role with this key already exists");
    const now = nowIso();
    await getDb().prepare("INSERT INTO roles (key, name, description, permissions, built_in, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)")
        .run(r.key, r.name, r.description || "", JSON.stringify(r.permissions), now, now);
    invalidate();
    return roleByKey(r.key);
};

const updateRole = async (key, input) => {
    const role = await roleByKey(key);
    if (!role) throw ApiError.notFound("Role not found");
    if (role.locked) throw ApiError.badRequest(`The ${role.name} role cannot be edited`);
    const r = validateRoleInput(input, { creating: false });
    const next = { ...role, ...r };
    await getDb().prepare("UPDATE roles SET name = ?, description = ?, permissions = ?, updated_at = ? WHERE key = ?")
        .run(next.name, next.description || "", JSON.stringify(next.permissions), nowIso(), key);
    invalidate();
    return roleByKey(key);
};

const deleteRole = async (key) => {
    const role = await roleByKey(key);
    if (!role) throw ApiError.notFound("Role not found");
    if (role.builtIn) throw ApiError.badRequest("Built-in roles cannot be deleted");
    // Anyone holding the role goes back to member.
    await getDb().prepare("UPDATE users SET role = 'member' WHERE role = ?").run(key);
    await getDb().prepare("DELETE FROM roles WHERE key = ?").run(key);
    invalidate();
};

module.exports = {
    PERMISSIONS, PERMISSION_KEYS, BUILT_IN, allRoles, roleByKey, permissionsOf, isStaffRole, can, canGrant,
    superAdminCount, createRole, updateRole, deleteRole, invalidate, ensureRoles
};
