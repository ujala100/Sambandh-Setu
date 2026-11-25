/**
 * Team console API.
 *
 * Access is permission-based (services/rbac.js): each route names the permission it needs; the
 * account's role must include it. The X-Admin-Key header (ADMIN_API_KEY) acts as super admin for
 * scripts, and claims the first super admin from the console. Every action is written to
 * admin_audit with who did it.
 *
 * Privacy: the console never exposes chats or Reflect answers. It shows account basics, documents
 * a member submitted for verification, and what was reported.
 */
const crypto = require("crypto");
const { getDb, generateId, nowIso } = require("../db");
const Users = require("../models/users");
const Rbac = require("../services/rbac");
const Features = require("../services/features");
const Rec = require("../services/recommender");
const { notify } = require("../services/notify");
const { userFromToken, bearer } = require("../middleware/requireAuth");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const keyMatches = (given) => {
    const key = process.env.ADMIN_API_KEY;
    if (!key || key.length < 24 || typeof given !== "string" || given.length !== key.length) return false;
    return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(key));
};

/** Route guard: the caller needs at least one of `perms`. Non-staff get a 404 (the console is invisible). */
const perm = (...perms) => async (req, res, next) => {
    try {
        if (keyMatches(String(req.get("x-admin-key") || ""))) {
            req.staff = { id: null, role: "super_admin", permissions: Rbac.PERMISSION_KEYS, via: "key" };
            return next();
        }
        const token = bearer(req);
        const user = token ? await userFromToken(token) : null;
        const permissions = user ? await Rbac.permissionsOf(user.role) : [];
        if (user && permissions.length) {
            req.user = user;
            req.staff = { id: user.id, role: user.role, permissions, via: "account" };
            if (!perms.length || perms.some((p) => permissions.includes(p))) return next();
            return next(ApiError.forbidden("Your role does not allow this"));
        }
        return next(ApiError.notFound());
    } catch (error) {
        return next(error);
    }
};
const has = (req, p) => req.staff.permissions.includes(p);

const audit = (req, action, refId, note = "") => getDb()
    .prepare("INSERT INTO admin_audit (id, actor_id, action, ref_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(generateId(), req.staff?.id || null, action, refId, String(note).slice(0, 300), nowIso());

const statusParam = (req, allowed, fallback) => (allowed.includes(req.query.status) ? req.query.status : fallback);
const count = async (sql, ...params) => Number((await getDb().prepare(sql).get(...params))?.n || 0);
const dataUrls = async (photoIds) => {
    const out = [];
    for (const pid of photoIds) {
        const p = await getDb().prepare("SELECT mime, data FROM photos WHERE id = ?").get(pid);
        if (p) out.push(`data:${p.mime};base64,${p.data}`);
    }
    return out;
};

// ---------------- Session ----------------

/** POST /admin/claim { key } — a signed-in member becomes super admin with the setup key. */
const claim = async (req, res) => {
    if (!keyMatches(String(req.body?.key || ""))) throw ApiError.forbidden("That setup key is not correct");
    await Users.updateUser(req.user.id, { role: "super_admin" });
    req.staff = { id: req.user.id, role: "super_admin" };
    await audit(req, "claim_super_admin", req.user.id);
    H.ok(res, { role: "super_admin" });
};

/** GET /admin/me — role and permissions, so the console shows only what you can use. */
const me = async (req, res) => {
    const role = await Rbac.roleByKey(req.staff.role);
    H.ok(res, { role: req.staff.role, roleName: role?.name || req.staff.role, permissions: req.staff.permissions, via: req.staff.via });
};

// ---------------- Overview & analytics ----------------

const overview = async (req, res) => {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const dayAgo = new Date(Date.now() - 864e5).toISOString();
    H.ok(res, {
        members: {
            total: await count("SELECT COUNT(*) AS n FROM users"),
            active: await count("SELECT COUNT(*) AS n FROM users WHERE status = 'active'"),
            activeToday: await count("SELECT COUNT(*) AS n FROM users WHERE last_active_at >= ?", dayAgo),
            newThisWeek: await count("SELECT COUNT(*) AS n FROM users WHERE created_at >= ?", weekAgo),
            onboarded: await count("SELECT COUNT(*) AS n FROM users WHERE onboarding_completed = 1"),
            verified: await count("SELECT COUNT(DISTINCT user_id) AS n FROM verifications WHERE type = 'identity' AND status = 'verified'"),
            deactivated: await count("SELECT COUNT(*) AS n FROM users WHERE status = 'deactivated'"),
            suspended: await count("SELECT COUNT(*) AS n FROM users WHERE status = 'suspended'"),
            staff: await count("SELECT COUNT(*) AS n FROM users WHERE role <> 'member'")
        },
        activity: {
            activeConnections: await count("SELECT COUNT(*) AS n FROM connections WHERE status = 'active'"),
            pendingRequests: await count("SELECT COUNT(*) AS n FROM connection_requests WHERE status = 'pending'"),
            messagesToday: await count("SELECT COUNT(*) AS n FROM messages WHERE created_at >= ?", dayAgo),
            familyMembers: await count("SELECT COUNT(*) AS n FROM family_members WHERE status = 'active'")
        },
        queues: {
            verifications: await count("SELECT COUNT(*) AS n FROM verifications WHERE status = 'in_review'"),
            reports: await count("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'"),
            tickets: await count("SELECT COUNT(*) AS n FROM support_tickets WHERE status = 'open'")
        }
    });
};

/** Daily series for the last N days (default 14). */
const analytics = async (req, res) => {
    const days = Math.min(90, Math.max(7, Number.parseInt(req.query.days, 10) || 14));
    const start = new Date(Date.now() - (days - 1) * 864e5);
    start.setUTCHours(0, 0, 0, 0);
    const since = start.toISOString();
    const series = async (sql) => {
        const rows = await getDb().prepare(sql).all(since);
        return Object.fromEntries(rows.map((r) => [String(r.day).slice(0, 10), Number(r.n)]));
    };
    const [signups, requests, accepted, messages, interests] = await Promise.all([
        series("SELECT SUBSTR(created_at, 1, 10) AS day, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY SUBSTR(created_at, 1, 10)"),
        series("SELECT SUBSTR(created_at, 1, 10) AS day, COUNT(*) AS n FROM connection_requests WHERE created_at >= ? GROUP BY SUBSTR(created_at, 1, 10)"),
        series("SELECT SUBSTR(updated_at, 1, 10) AS day, COUNT(*) AS n FROM connection_requests WHERE status = 'accepted' AND updated_at >= ? GROUP BY SUBSTR(updated_at, 1, 10)"),
        series("SELECT SUBSTR(created_at, 1, 10) AS day, COUNT(*) AS n FROM messages WHERE created_at >= ? GROUP BY SUBSTR(created_at, 1, 10)"),
        series("SELECT SUBSTR(created_at, 1, 10) AS day, COUNT(*) AS n FROM rec_events WHERE type = 'impression' AND created_at >= ? GROUP BY SUBSTR(created_at, 1, 10)")
    ]);
    const rows = [];
    for (let i = 0; i < days; i++) {
        const day = new Date(start.getTime() + i * 864e5).toISOString().slice(0, 10);
        rows.push({ day, signups: signups[day] || 0, requests: requests[day] || 0, accepted: accepted[day] || 0, messages: messages[day] || 0, impressions: interests[day] || 0 });
    }
    H.ok(res, { days, rows, recommendations: await Rec.metrics(days) });
};

// ---------------- Verifications ----------------

const listVerifications = async (req, res) => {
    const status = statusParam(req, ["in_review", "verified", "needs_action", "all"], "in_review");
    const rows = await getDb().prepare(`SELECT v.*, u.display_name, u.email FROM verifications v JOIN users u ON u.id = v.user_id
        ${status === "all" ? "" : "WHERE v.status = ?"} ORDER BY v.created_at ${status === "in_review" ? "ASC" : "DESC"} LIMIT 200`)
        .all(...(status === "all" ? [] : [status]));
    H.ok(res, {
        items: rows.map((v) => ({
            id: v.id, userId: v.user_id, name: v.display_name, email: v.email, type: v.type, docType: v.doc_type, status: v.status,
            details: H.parseJson(v.details, {}), documents: H.parseJson(v.photo_ids, []).length, reviewerNote: v.reviewer_note,
            createdAt: v.created_at, updatedAt: v.updated_at
        }))
    });
};

const verificationDocs = async (req, res) => {
    const v = await getDb().prepare("SELECT * FROM verifications WHERE id = ?").get(H.id(req.params.id));
    if (!v) throw ApiError.notFound();
    await audit(req, "view_verification_docs", v.id);
    H.ok(res, { id: v.id, docs: await dataUrls(H.parseJson(v.photo_ids, [])) });
};

const decideVerification = async (req, res) => {
    const v = await getDb().prepare("SELECT * FROM verifications WHERE id = ?").get(H.id(req.params.id));
    if (!v) throw ApiError.notFound();
    const status = H.oneOf(req.body?.status, "status", ["verified", "needs_action"]);
    const note = H.str(req.body?.note, "note", { max: 300, optional: true }) || "";
    if (status === "needs_action" && !note) throw ApiError.badRequest("Tell the member what to fix");
    await getDb().prepare("UPDATE verifications SET status = ?, reviewer_note = ?, updated_at = ? WHERE id = ?").run(status, note, nowIso(), v.id);
    await audit(req, `verification_${status}`, v.id, note);
    await notify(v.user_id, { type: "verification_update", refId: v.id, payload: { status, type: v.type } });
    H.ok(res, { id: v.id, status });
};

// ---------------- Reports ----------------

const listReports = async (req, res) => {
    const status = statusParam(req, ["open", "closed", "all"], "open");
    const rows = await getDb().prepare(`SELECT r.*, a.display_name AS reporter_name, a.email AS reporter_email,
            b.display_name AS reported_name, b.email AS reported_email, b.status AS reported_status
        FROM reports r JOIN users a ON a.id = r.reporter_id LEFT JOIN users b ON b.id = r.reported_user_id
        ${status === "all" ? "" : "WHERE r.status = ?"} ORDER BY r.created_at DESC LIMIT 200`).all(...(status === "all" ? [] : [status]));
    const against = {};
    for (const r of rows) {
        if (r.reported_user_id && against[r.reported_user_id] === undefined) {
            against[r.reported_user_id] = await count("SELECT COUNT(*) AS n FROM reports WHERE reported_user_id = ?", r.reported_user_id);
        }
    }
    H.ok(res, {
        items: rows.map((r) => ({
            id: r.id, reason: r.reason, details: r.details, contentType: r.content_type, status: r.status, createdAt: r.created_at,
            screenshots: H.parseJson(r.photo_ids, []).length,
            reporter: { id: r.reporter_id, name: r.reporter_name, email: r.reporter_email },
            reported: r.reported_user_id ? { id: r.reported_user_id, name: r.reported_name, email: r.reported_email, status: r.reported_status, reportsAgainst: against[r.reported_user_id] } : null
        }))
    });
};

const reportImages = async (req, res) => {
    const r = await getDb().prepare("SELECT * FROM reports WHERE id = ?").get(H.id(req.params.id));
    if (!r) throw ApiError.notFound();
    await audit(req, "view_report_images", r.id);
    H.ok(res, { id: r.id, images: await dataUrls(H.parseJson(r.photo_ids, [])) });
};

/** Suspension rules: never yourself, never someone holding permissions you lack, never the last super admin. */
const suspendUser = async (req, userId, note) => {
    const user = await Users.findById(userId);
    if (!user) throw ApiError.notFound("Member not found");
    if (req.staff.id && user.id === req.staff.id) throw ApiError.badRequest("You cannot suspend yourself");
    if (!(await Rbac.canGrant(req.staff.role, user.role || "member"))) throw ApiError.forbidden("You cannot suspend someone with more access than you");
    if (user.role === "super_admin" && (await Rbac.superAdminCount()) <= 1) throw ApiError.badRequest("The last super admin cannot be suspended");
    await Users.updateUser(user.id, { status: "suspended", token_version: Number(user.token_version || 0) + 1 });
    await audit(req, "suspend_user", user.id, note);
    return user;
};

const closeReport = async (req, res) => {
    const r = await getDb().prepare("SELECT * FROM reports WHERE id = ?").get(H.id(req.params.id));
    if (!r) throw ApiError.notFound();
    const note = H.str(req.body?.note, "note", { max: 300, optional: true }) || "";
    const action = H.oneOf(req.body?.action || "none", "action", ["none", "suspend"]);
    if (action === "suspend") {
        if (!has(req, "members.suspend")) throw ApiError.forbidden("Your role cannot suspend members");
        if (!r.reported_user_id) throw ApiError.badRequest("This report is not about a member");
        await suspendUser(req, r.reported_user_id, `report ${r.id}${note ? `: ${note}` : ""}`);
    }
    await getDb().prepare("UPDATE reports SET status = 'closed' WHERE id = ?").run(r.id);
    await audit(req, "close_report", r.id, note);
    await notify(r.reporter_id, { type: "report_reviewed", refId: r.id });
    H.ok(res, { id: r.id, status: "closed", action });
};

// ---------------- Support ----------------

const listTickets = async (req, res) => {
    const status = statusParam(req, ["open", "closed", "all"], "open");
    const rows = await getDb().prepare(`SELECT t.*, u.display_name, u.email FROM support_tickets t JOIN users u ON u.id = t.user_id
        ${status === "all" ? "" : "WHERE t.status = ?"} ORDER BY t.created_at DESC LIMIT 200`).all(...(status === "all" ? [] : [status]));
    H.ok(res, {
        items: rows.map((t) => ({
            id: t.id, reference: `SS-${t.id.slice(0, 6).toUpperCase()}`, kind: t.kind, category: t.category, subject: t.subject,
            message: t.message, status: t.status, createdAt: t.created_at, member: { id: t.user_id, name: t.display_name, email: t.email }
        }))
    });
};

/** Close a ticket. An optional reply reaches the member as an in-app notification. */
const closeTicket = async (req, res) => {
    const t = await getDb().prepare("SELECT * FROM support_tickets WHERE id = ?").get(H.id(req.params.id));
    if (!t) throw ApiError.notFound();
    const reply = H.str(req.body?.reply, "reply", { max: 300, optional: true }) || "";
    const note = H.str(req.body?.note, "note", { max: 300, optional: true }) || "";
    await getDb().prepare("UPDATE support_tickets SET status = 'closed' WHERE id = ?").run(t.id);
    await audit(req, "close_ticket", t.id, note || (reply ? `replied: ${reply}` : ""));
    await notify(t.user_id, { type: "support_reply", refId: t.id, payload: { reference: `SS-${t.id.slice(0, 6).toUpperCase()}`, reply } });
    H.ok(res, { id: t.id, status: "closed" });
};

// ---------------- Members ----------------

const PAGE = 30;
const likeEscape = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

const listMembers = async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase().slice(0, 80) : "";
    const status = ["active", "deactivated", "suspended"].includes(req.query.status) ? req.query.status : "";
    const role = typeof req.query.role === "string" && /^[a-z_]{2,32}$/.test(req.query.role) ? req.query.role : "";
    const page = Math.max(1, Math.min(200, Number.parseInt(req.query.page, 10) || 1));
    const where = [];
    const params = [];
    if (q) { where.push("(LOWER(u.display_name) LIKE ? ESCAPE '\\' OR LOWER(u.email) LIKE ? ESCAPE '\\')"); params.push(`%${likeEscape(q)}%`, `%${likeEscape(q)}%`); }
    if (status) { where.push("u.status = ?"); params.push(status); }
    if (role === "staff") where.push("u.role <> 'member'");
    else if (role) { where.push("u.role = ?"); params.push(role); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = await count(`SELECT COUNT(*) AS n FROM users u ${clause}`, ...params);
    const rows = await getDb().prepare(`SELECT u.*, p.date_of_birth, p.location, p.profession FROM users u LEFT JOIN profiles p ON p.user_id = u.id
        ${clause} ORDER BY u.created_at DESC LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`).all(...params);
    const ids = rows.map((u) => u.id);
    const verified = new Set(ids.length ? (await getDb().prepare(`SELECT DISTINCT user_id FROM verifications WHERE type = 'identity' AND status = 'verified' AND user_id IN (${ids.map(() => "?").join(",")})`).all(...ids)).map((r) => r.user_id) : []);
    H.ok(res, {
        items: rows.map((u) => ({
            id: u.id, name: u.display_name, email: u.email, status: u.status, role: u.role || "member",
            age: H.ageFromDob(u.date_of_birth), location: u.location || "", profession: u.profession || "",
            onboardingCompleted: Boolean(u.onboarding_completed), emailVerified: Boolean(u.email_verified), verified: verified.has(u.id),
            createdAt: u.created_at, lastActiveAt: u.last_active_at
        })),
        page, total, totalPages: Math.max(1, Math.ceil(total / PAGE))
    });
};

const getMember = async (req, res) => {
    const u = await Users.findById(H.id(req.params.userId, "userId"));
    if (!u) throw ApiError.notFound("Member not found");
    const p = Users.expandProfile(await Users.getProfile(u.id));
    const verifications = await getDb().prepare("SELECT id, type, doc_type, status, created_at FROM verifications WHERE user_id = ? ORDER BY created_at DESC").all(u.id);
    const reports = await getDb().prepare("SELECT id, reason, status, created_at FROM reports WHERE reported_user_id = ? ORDER BY created_at DESC LIMIT 20").all(u.id);
    await audit(req, "view_member", u.id);
    H.ok(res, {
        id: u.id, name: u.display_name, email: u.email, phone: u.phone || "", status: u.status, role: u.role || "member",
        emailVerified: Boolean(u.email_verified), onboardingCompleted: Boolean(u.onboarding_completed),
        createdAt: u.created_at, lastActiveAt: u.last_active_at,
        profile: { age: p.age, gender: p.gender, location: p.location, profession: p.profession, education: p.education, bio: p.bio, photoUrl: Users.photoUrl(p.avatarPhotoId) },
        counts: {
            connections: await count("SELECT COUNT(*) AS n FROM connections WHERE participant_a = ? OR participant_b = ?", u.id, u.id),
            requestsSent: await count("SELECT COUNT(*) AS n FROM connection_requests WHERE sender_id = ?", u.id),
            reportsAgainst: await count("SELECT COUNT(*) AS n FROM reports WHERE reported_user_id = ?", u.id),
            reportsMade: await count("SELECT COUNT(*) AS n FROM reports WHERE reporter_id = ?", u.id),
            blockedBy: await count("SELECT COUNT(*) AS n FROM blocks WHERE blocked_id = ?", u.id)
        },
        verifications: verifications.map((v) => ({ id: v.id, type: v.type, docType: v.doc_type, status: v.status, createdAt: v.created_at })),
        reports: reports.map((r) => ({ id: r.id, reason: r.reason, status: r.status, createdAt: r.created_at }))
    });
};

const suspendMember = async (req, res) => {
    const note = H.str(req.body?.note, "note", { max: 300, optional: true }) || "";
    const user = await suspendUser(req, H.id(req.params.userId, "userId"), note);
    H.ok(res, { id: user.id, status: "suspended" });
};

const reactivateMember = async (req, res) => {
    const user = await Users.findById(H.id(req.params.userId, "userId"));
    if (!user) throw ApiError.notFound("Member not found");
    if (user.status !== "suspended" && user.status !== "deactivated") throw ApiError.conflict("This account is already active");
    await Users.updateUser(user.id, { status: "active" });
    await audit(req, "reactivate_user", user.id, H.str(req.body?.note, "note", { max: 300, optional: true }) || "");
    H.ok(res, { id: user.id, status: "active" });
};

const setRole = async (req, res) => {
    const user = await Users.findById(H.id(req.params.userId, "userId"));
    if (!user) throw ApiError.notFound("Member not found");
    const role = H.str(req.body?.role, "role", { max: 32 });
    if (!(await Rbac.roleByKey(role))) throw ApiError.badRequest("Unknown role");
    if (req.staff.id && user.id === req.staff.id) throw ApiError.badRequest("You cannot change your own role");
    if (!(await Rbac.canGrant(req.staff.role, role)) || !(await Rbac.canGrant(req.staff.role, user.role || "member"))) {
        throw ApiError.forbidden("You can only assign roles whose permissions you already have");
    }
    if (user.role === "super_admin" && role !== "super_admin" && (await Rbac.superAdminCount()) <= 1) throw ApiError.badRequest("The last super admin cannot be demoted");
    await Users.updateUser(user.id, { role });
    await audit(req, "set_role", user.id, `${user.role || "member"} -> ${role}`);
    H.ok(res, { id: user.id, role });
};

// ---------------- Roles ----------------

const listRoles = async (req, res) => {
    const roles = await Rbac.allRoles();
    const counts = Object.fromEntries((await getDb().prepare("SELECT role, COUNT(*) AS n FROM users GROUP BY role").all()).map((r) => [r.role, Number(r.n)]));
    const grantable = [];
    for (const r of roles) if (await Rbac.canGrant(req.staff.role, r.key)) grantable.push(r.key);
    H.ok(res, { roles: roles.map((r) => ({ ...r, members: counts[r.key] || 0, grantable: grantable.includes(r.key) })), permissions: Rbac.PERMISSIONS });
};

const createRole = async (req, res) => {
    const role = await Rbac.createRole(req.body || {});
    await audit(req, "create_role", role.key, role.permissions.join(","));
    H.ok(res, role, 201);
};

const updateRole = async (req, res) => {
    const role = await Rbac.updateRole(String(req.params.key), req.body || {});
    await audit(req, "update_role", role.key, role.permissions.join(","));
    H.ok(res, role);
};

const deleteRole = async (req, res) => {
    await Rbac.deleteRole(String(req.params.key));
    await audit(req, "delete_role", String(req.params.key));
    H.ok(res, { deleted: true });
};

// ---------------- Features ----------------

const listFeatures = async (req, res) => {
    const flags = await Features.load();
    const roles = await Rbac.allRoles();
    H.ok(res, { features: flags, roles: roles.map((r) => ({ key: r.key, name: r.name })) });
};

const updateFeature = async (req, res) => {
    const key = String(req.params.key);
    const flag = await Features.update(key, req.body || {}, req.staff.id);
    await audit(req, "update_feature", key, `${flag.enabled ? "on" : "off"} ${flag.rollout}%${flag.roles.length ? ` roles=${flag.roles.join("|")}` : ""}`);
    H.ok(res, flag);
};

// ---------------- Recommendations ----------------

const getRecommender = async (req, res) => {
    const cfg = await Rec.getConfig();
    H.ok(res, { ...cfg, defaults: { weights: Rec.DEFAULT_WEIGHTS, tuning: Rec.DEFAULT_TUNING }, labels: Rec.WEIGHT_LABELS, metrics: await Rec.metrics(30) });
};

const updateRecommender = async (req, res) => {
    const cfg = await Rec.setConfig(req.body || {}, req.staff.id);
    await audit(req, "tune_recommender", null, req.body?.reset ? "reset to defaults" : JSON.stringify({ ...(req.body?.weights || {}), ...(req.body?.tuning || {}) }).slice(0, 280));
    H.ok(res, cfg);
};

// ---------------- Audit ----------------

const listAudit = async (req, res) => {
    const rows = await getDb().prepare(`SELECT a.*, u.display_name AS actor_name, t.display_name AS target_name
        FROM admin_audit a LEFT JOIN users u ON u.id = a.actor_id LEFT JOIN users t ON t.id = a.ref_id
        ORDER BY a.created_at DESC LIMIT 300`).all();
    H.ok(res, {
        items: rows.map((r) => ({
            id: r.id, action: r.action, refId: r.ref_id, target: r.target_name || null, note: r.note,
            actor: r.actor_id ? r.actor_name || "Former member" : "Admin key", createdAt: r.created_at
        }))
    });
};

module.exports = {
    perm, claim, me, overview, analytics,
    listVerifications, verificationDocs, decideVerification,
    listReports, reportImages, closeReport,
    listTickets, closeTicket,
    listMembers, getMember, suspendMember, reactivateMember, setRole,
    listRoles, createRole, updateRole, deleteRole,
    listFeatures, updateFeature, getRecommender, updateRecommender,
    listAudit
};
