/**
 * Blocking, reporting and support requests (Privacy & Visibility > Report & Safety, Help & Support).
 */
const { getDb, generateId, nowIso } = require("../db");
const Users = require("../models/users");
const Photos = require("../services/photos");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const REPORT_REASONS = [
    "Inappropriate behaviour", "Harassment or unwanted contact", "Fake or misleading profile", "Scam or suspicious activity",
    "Offensive or abusive content", "Safety concern", "Harassment or abuse", "Inappropriate content", "Spam", "Scam or fraud",
    "Misleading information", "Other"
];
const CONTENT_TYPES = ["user", "message", "photo", "profile", "other"];
const SUPPORT_CATEGORIES = ["Account & Login", "Profile & Verification", "Connections & Chat", "Setu Guide", "Privacy & Safety", "Payments & Billing", "Other"];
const PROBLEM_TYPES = ["Something isn't working", "App is slow or crashing", "Problem with my profile", "Problem with chat or connections", "Problem with verification", "Other"];

const listBlocks = async (req, res) => {
    const rows = await getDb().prepare("SELECT blocked_id, created_at FROM blocks WHERE blocker_id = ? ORDER BY created_at DESC").all(req.user.id);
    const items = [];
    for (const r of rows) {
        const u = await Users.findById(r.blocked_id);
        if (u) items.push({ userId: u.id, name: u.display_name || Users.firstName(u), blockedAt: r.created_at });
    }
    H.ok(res, { items });
};

const block = async (req, res) => {
    const targetId = H.id(req.body?.userId, "userId");
    if (targetId === req.user.id) throw ApiError.badRequest("You cannot block yourself");
    if (!(await Users.findById(targetId))) throw ApiError.notFound("Member not found");
    const db = getDb();
    await db.prepare("INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?) ON CONFLICT (blocker_id, blocked_id) DO NOTHING").run(req.user.id, targetId, nowIso());
    // Pending requests between the two are withdrawn; an active connection is paused (not deleted),
    // so it can resume if the block is lifted.
    await db.prepare("UPDATE connection_requests SET status = 'withdrawn', updated_at = ? WHERE pair_key = ? AND status = 'pending'").run(nowIso(), H.pairKey(req.user.id, targetId));
    await db.prepare("UPDATE connections SET status = 'paused', paused_by = ?, paused_at = ?, updated_at = ? WHERE pair_key = ? AND status = 'active'").run(req.user.id, nowIso(), nowIso(), H.pairKey(req.user.id, targetId));
    H.ok(res, { blocked: true }, 201);
};

const unblock = async (req, res) => {
    await getDb().prepare("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?").run(req.user.id, H.id(req.params.userId, "userId"));
    H.ok(res, { blocked: false });
};

const report = async (req, res) => {
    const b = req.body || {};
    const contentType = H.oneOf(b.contentType || "user", "contentType", CONTENT_TYPES);
    const reason = H.oneOf(b.reason, "reason", REPORT_REASONS);
    const details = H.str(b.details, "details", { max: 500, optional: true }) || "";
    const reportedUserId = b.userId ? H.id(b.userId, "userId") : null;
    if (reportedUserId === req.user.id) throw ApiError.badRequest("You cannot report yourself");
    const contentRef = H.str(b.contentRef, "contentRef", { max: 64, optional: true }) || null;
    const images = Array.isArray(b.images) ? b.images.slice(0, 5) : [];
    const photoIds = [];
    for (const img of images) photoIds.push(await Photos.savePhoto(req.user.id, "report", img));
    const id = generateId();
    await getDb().prepare(`INSERT INTO reports (id, reporter_id, reported_user_id, content_type, content_ref, reason, details, photo_ids, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`).run(id, req.user.id, reportedUserId, contentType, contentRef, reason, details, JSON.stringify(photoIds), nowIso());
    if (b.alsoBlock === true && reportedUserId) {
        await getDb().prepare("INSERT INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?) ON CONFLICT (blocker_id, blocked_id) DO NOTHING").run(req.user.id, reportedUserId, nowIso());
    }
    H.ok(res, { id, status: "open" }, 201);
};

const createTicket = async (req, res) => {
    const b = req.body || {};
    const kind = H.oneOf(b.kind || "support", "kind", ["support", "problem"]);
    const category = H.oneOf(b.category, "category", kind === "support" ? SUPPORT_CATEGORIES : PROBLEM_TYPES);
    const subject = H.str(b.subject, "subject", { max: 120, optional: true }) || "";
    const message = H.str(b.message, "message", { max: 1000, min: 10 });
    const id = generateId();
    await getDb().prepare("INSERT INTO support_tickets (id, user_id, kind, category, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'open', ?)")
        .run(id, req.user.id, kind, category, subject, message, nowIso());
    H.ok(res, { id, reference: `SS-${id.slice(0, 6).toUpperCase()}`, status: "open" }, 201);
};

module.exports = { listBlocks, block, unblock, report, createTicket, REPORT_REASONS, SUPPORT_CATEGORIES, PROBLEM_TYPES };
