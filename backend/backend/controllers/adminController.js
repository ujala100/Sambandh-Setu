/**
 * Minimal review tools for the Sambandh Setu team, protected by ADMIN_API_KEY (header X-Admin-Key).
 * Disabled entirely when the key is not configured. Every decision is written to admin_audit.
 */
const crypto = require("crypto");
const { getDb, generateId, nowIso } = require("../db");
const Users = require("../models/users");
const { notify } = require("../services/notify");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const requireAdmin = (req, res, next) => {
    const key = process.env.ADMIN_API_KEY;
    const given = String(req.get("x-admin-key") || "");
    if (!key || key.length < 24 || given.length !== key.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(key))) {
        return next(ApiError.notFound());
    }
    return next();
};

const audit = (action, refId, note = "") => getDb().prepare("INSERT INTO admin_audit (id, action, ref_id, note, created_at) VALUES (?, ?, ?, ?, ?)").run(generateId(), action, refId, note, nowIso());

const queue = async (req, res) => {
    const db = getDb();
    const verifications = await db.prepare("SELECT id, user_id, type, doc_type, status, details, created_at FROM verifications WHERE status = 'in_review' ORDER BY created_at").all();
    const reports = await db.prepare("SELECT id, reporter_id, reported_user_id, content_type, reason, details, status, created_at FROM reports WHERE status = 'open' ORDER BY created_at").all();
    const tickets = await db.prepare("SELECT id, user_id, kind, category, subject, message, status, created_at FROM support_tickets WHERE status = 'open' ORDER BY created_at").all();
    H.ok(res, { verifications: verifications.map((v) => ({ ...v, details: H.parseJson(v.details, {}) })), reports, tickets });
};

/** Returns a verification's document images (base64) for review. */
const verificationDocs = async (req, res) => {
    const v = await getDb().prepare("SELECT * FROM verifications WHERE id = ?").get(H.id(req.params.id));
    if (!v) throw ApiError.notFound();
    const docs = [];
    for (const pid of H.parseJson(v.photo_ids, [])) {
        const p = await getDb().prepare("SELECT mime, data FROM photos WHERE id = ?").get(pid);
        if (p) docs.push(`data:${p.mime};base64,${p.data}`);
    }
    await audit("view_verification_docs", v.id);
    H.ok(res, { id: v.id, docs });
};

const decideVerification = async (req, res) => {
    const v = await getDb().prepare("SELECT * FROM verifications WHERE id = ?").get(H.id(req.params.id));
    if (!v) throw ApiError.notFound();
    const status = H.oneOf(req.body?.status, "status", ["verified", "needs_action"]);
    const note = H.str(req.body?.note, "note", { max: 300, optional: true }) || "";
    await getDb().prepare("UPDATE verifications SET status = ?, reviewer_note = ?, updated_at = ? WHERE id = ?").run(status, note, nowIso(), v.id);
    await audit(`verification_${status}`, v.id, note);
    await notify(v.user_id, { type: "verification_update", refId: v.id, payload: { status, type: v.type } });
    H.ok(res, { id: v.id, status });
};

const closeItem = (table) => async (req, res) => {
    const id = H.id(req.params.id);
    await getDb().prepare(`UPDATE ${table} SET status = 'closed' WHERE id = ?`).run(id);
    await audit(`close_${table}`, id, H.str(req.body?.note, "note", { max: 300, optional: true }) || "");
    H.ok(res, { id, status: "closed" });
};

const suspendUser = async (req, res) => {
    const user = await Users.findById(H.id(req.params.userId));
    if (!user) throw ApiError.notFound();
    await Users.updateUser(user.id, { status: "deactivated", token_version: Number(user.token_version || 0) + 1 });
    await audit("suspend_user", user.id, H.str(req.body?.note, "note", { max: 300, optional: true }) || "");
    H.ok(res, { id: user.id, status: "deactivated" });
};

module.exports = { requireAdmin, queue, verificationDocs, decideVerification, closeReport: closeItem("reports"), closeTicket: closeItem("support_tickets"), suspendUser };
