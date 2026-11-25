/**
 * Live feature flags.
 *
 * Admins (features.manage) switch features on or off, roll them out to a percentage of members, or
 * limit them to roles. The API enforces the flags on every request, and clients receive changes
 * through the realtime stream (or polling) within seconds. Each API instance caches the flags for
 * a few seconds, so a change reaches every instance quickly without a database read per request.
 */
const crypto = require("crypto");
const { getDb, nowIso } = require("../db");
const { parseJson } = require("../utils/helpers");
const ApiError = require("../utils/ApiError");

const DEFS = [
    { key: "signups", name: "New sign-ups", group: "Access", description: "Let new people create accounts. Turn off to pause registrations.", default: true },
    { key: "discover", name: "Discover", group: "Core", description: "Browse and search recommended profiles.", default: true },
    { key: "chat", name: "Chat", group: "Core", description: "Messages between connected members.", default: true },
    { key: "reflect", name: "Reflect", group: "Core", description: "Private Reflect questions in the journey.", default: true },
    { key: "setu_guide", name: "Setu Guide", group: "Core", description: "AI guidance chat and suggestions.", default: true },
    { key: "family_access", name: "Family Access", group: "Core", description: "Invite family to view selected profile details.", default: true },
    { key: "verification", name: "Verification uploads", group: "Trust", description: "Members can submit identity and professional documents.", default: true },
    { key: "photo_uploads", name: "Photo uploads", group: "Trust", description: "Members can add or change their profile photo.", default: true },
    { key: "realtime_stream", name: "Live updates", group: "Platform", description: "Push new messages, notifications and changes to open apps instantly. Off: apps check every 15 seconds.", default: true },
    { key: "maintenance", name: "Maintenance mode", group: "Platform", description: "Read-only mode: members can browse but not make changes. Staff are not affected.", default: false, configFields: ["message"] },
    { key: "announcement", name: "Announcement banner", group: "Platform", description: "Show a message at the top of the app for everyone.", default: false, configFields: ["text", "tone"] }
];
const KEYS = DEFS.map((d) => d.key);

let cache = { at: 0, flags: null };
const TTL_MS = 3000;
const invalidate = () => { cache = { at: 0, flags: null }; };

const load = async () => {
    if (cache.flags && Date.now() - cache.at < TTL_MS) return cache.flags;
    const rows = await getDb().prepare("SELECT * FROM feature_flags").all();
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    const flags = DEFS.map((d) => {
        const r = byKey[d.key];
        return {
            key: d.key, name: d.name, group: d.group, description: d.description, configFields: d.configFields || [],
            enabled: r ? Boolean(r.enabled) : d.default,
            rollout: r ? Number(r.rollout) : 100,
            roles: r ? parseJson(r.roles, []) : [],
            config: r ? parseJson(r.config, {}) : {},
            updatedAt: r?.updated_at || null,
            updatedBy: r?.updated_by || null
        };
    });
    cache = { at: Date.now(), flags };
    return flags;
};

/** Stable 0-99 bucket per member and feature, so a rollout always picks the same people. */
const bucket = (userId, key) => parseInt(crypto.createHash("sha256").update(`${key}:${userId}`).digest("hex").slice(0, 8), 16) % 100;

const isOnFor = (flag, user) => {
    if (!flag.enabled) return false;
    if (!user) return flag.rollout >= 100 && !flag.roles.length;
    if (flag.roles.length && !flag.roles.includes(user.role || "member")) return false;
    return flag.rollout >= 100 || bucket(user.id, flag.key) < flag.rollout;
};

/** Flags as the given user experiences them (null = signed out). */
const evaluate = async (user) => {
    const flags = await load();
    const out = {};
    for (const f of flags) out[f.key] = isOnFor(f, user);
    const ann = flags.find((f) => f.key === "announcement");
    const maint = flags.find((f) => f.key === "maintenance");
    return {
        features: out,
        announcement: ann.enabled && ann.config.text ? { text: String(ann.config.text), tone: ann.config.tone || "info" } : null,
        maintenance: maint.enabled ? { message: maint.config.message || "Sambandh Setu is being updated. You can browse, but changes are paused for a few minutes." } : null,
        version: await version()
    };
};

const version = async () => {
    const flags = await load();
    const latest = flags.map((f) => f.updatedAt || "").sort().pop() || "0";
    return crypto.createHash("sha1").update(latest).digest("hex").slice(0, 12);
};

const isEnabled = async (key, user) => {
    const flag = (await load()).find((f) => f.key === key);
    return flag ? isOnFor(flag, user) : true;
};

/** Express middleware: 403 FEATURE_OFF when the feature is not available to this user. */
const requireFeature = (key) => async (req, res, next) => {
    try {
        if (await isEnabled(key, req.user || null)) return next();
        const def = DEFS.find((d) => d.key === key);
        const name = def ? def.name : "This feature";
        const verb = /[^s]s$/.test(name) ? "are" : "is";
        return next(new ApiError(403, "FEATURE_OFF", `${name} ${verb} paused right now. Please try again later.`));
    } catch (error) {
        return next(error);
    }
};

const update = async (key, input, actorId) => {
    if (!KEYS.includes(key)) throw ApiError.notFound("Unknown feature");
    const current = (await load()).find((f) => f.key === key);
    const next = { ...current };
    if (input.enabled !== undefined) {
        if (typeof input.enabled !== "boolean") throw ApiError.badRequest("enabled must be true or false");
        next.enabled = input.enabled;
    }
    if (input.rollout !== undefined) {
        if (!Number.isInteger(input.rollout) || input.rollout < 0 || input.rollout > 100) throw ApiError.badRequest("rollout must be a whole number from 0 to 100");
        next.rollout = input.rollout;
    }
    if (input.roles !== undefined) {
        if (!Array.isArray(input.roles) || input.roles.some((r) => typeof r !== "string" || r.length > 32)) throw ApiError.badRequest("roles must be a list of role keys");
        next.roles = [...new Set(input.roles)];
    }
    if (input.config !== undefined) {
        const def = DEFS.find((d) => d.key === key);
        const allowed = def.configFields || [];
        const cfg = {};
        for (const [k, v] of Object.entries(input.config || {})) {
            if (!allowed.includes(k)) throw ApiError.badRequest(`Unknown setting: ${k}`);
            if (k === "tone") {
                if (!["info", "success", "warning"].includes(v)) throw ApiError.badRequest("tone must be info, success or warning");
                cfg[k] = v;
            } else {
                if (typeof v !== "string" || v.length > 240) throw ApiError.badRequest(`${k} must be text of at most 240 characters`);
                cfg[k] = v.trim();
            }
        }
        next.config = { ...current.config, ...cfg };
    }
    const now = nowIso();
    await getDb().prepare(`INSERT INTO feature_flags (key, enabled, rollout, roles, config, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (key) DO UPDATE SET enabled = excluded.enabled, rollout = excluded.rollout, roles = excluded.roles, config = excluded.config,
        updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
        .run(key, next.enabled ? 1 : 0, next.rollout, JSON.stringify(next.roles), JSON.stringify(next.config), actorId, now);
    invalidate();
    return (await load()).find((f) => f.key === key);
};

module.exports = { DEFS, KEYS, load, evaluate, isEnabled, requireFeature, update, invalidate, version, bucket };
