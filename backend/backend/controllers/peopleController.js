/**
 * Discover and member profiles. Results never include: yourself, blocked people (either way),
 * people you already have a request or connection with, people you skipped, paused, hidden or
 * deactivated profiles, and anyone whose privacy settings exclude you.
 */
const { getDb, nowIso } = require("../db");
const Users = require("../models/users");
const Access = require("../services/access");
const { personCard, personProfile } = require("../services/views");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const PAGE_SIZE = 10;
const CANDIDATE_LIMIT = 300;

const overlap = (a = [], b = []) => {
    const set = new Set(a.map((x) => String(x).toLowerCase()));
    return b.filter((x) => set.has(String(x).toLowerCase())).length;
};

/** Ordering only. Setu never shows a "match %" or predicts outcomes. */
const relevance = (me, t) => {
    let score = 0;
    score += 2 * overlap(me.values, t.profile.values);
    score += overlap(me.interests, t.profile.interests);
    if (me.location && t.profile.location && me.location.split(",")[0].trim().toLowerCase() === t.profile.location.split(",")[0].trim().toLowerCase()) score += 2;
    if (me.intent && me.intent === t.profile.intent) score += 2;
    if (Access.fitsPreferences({ preferences: me.preferences }, t.profile)) score += 3;
    return score;
};

const matchesQuery = (t, q) => {
    if (!q) return true;
    const hay = [Users.firstName(t.user), t.profile.location, t.profile.profession, t.profile.education, ...(t.profile.interests || [])]
        .join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};

const matchesFilters = (t, f) => {
    const p = t.profile;
    if (f.ageMin && (!p.age || p.age < f.ageMin)) return false;
    if (f.ageMax && (!p.age || p.age > f.ageMax)) return false;
    if (f.location && !String(p.location).toLowerCase().includes(f.location.toLowerCase())) return false;
    if (f.education && !String(p.education).toLowerCase().includes(f.education.toLowerCase())) return false;
    if (f.profession && !String(p.profession).toLowerCase().includes(f.profession.toLowerCase())) return false;
    if (f.verifiedOnly && !t.verified) return false;
    return true;
};

const discover = async (req, res) => {
    const me = req.user;
    const myProfile = Users.expandProfile(await Users.getProfile(me.id));
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";
    const page = Math.max(1, Math.min(50, Number.parseInt(req.query.page, 10) || 1));
    const sort = ["recommended", "newest", "active"].includes(req.query.sort) ? req.query.sort : "recommended";
    const filters = {
        ageMin: Number.parseInt(req.query.ageMin, 10) || null,
        ageMax: Number.parseInt(req.query.ageMax, 10) || null,
        location: typeof req.query.location === "string" ? req.query.location.slice(0, 60) : "",
        education: typeof req.query.education === "string" ? req.query.education.slice(0, 60) : "",
        profession: typeof req.query.profession === "string" ? req.query.profession.slice(0, 60) : "",
        verifiedOnly: req.query.verifiedOnly === "true"
    };

    const db = getDb();
    const rows = await db.prepare(`SELECT u.id FROM users u JOIN profiles p ON p.user_id = u.id
        WHERE u.id <> ? AND u.status = 'active' AND u.onboarding_completed = 1 AND p.profile_status = 'active'
        AND u.id NOT IN (SELECT target_id FROM skips WHERE user_id = ?)
        ORDER BY u.created_at DESC LIMIT ${CANDIDATE_LIMIT}`).all(me.id, me.id);
    const verifiedViewer = await Access.isVerified(me.id);
    const bookmarks = new Set((await db.prepare("SELECT target_id FROM bookmarks WHERE user_id = ?").all(me.id)).map((r) => r.target_id));

    const visible = [];
    for (const { id } of rows) {
        const t = await Access.loadTarget(me, id);
        if (!t || !(await Access.canAppearInDiscover(me, myProfile, t, { verifiedViewer }))) continue;
        t.verified = await Access.isVerified(id);
        if (!matchesQuery(t, q) || !matchesFilters(t, filters)) continue;
        visible.push(t);
    }
    if (sort === "recommended") visible.sort((a, b) => relevance(myProfile, b) - relevance(myProfile, a));
    if (sort === "active") visible.sort((a, b) => String(b.user.last_active_at || "").localeCompare(String(a.user.last_active_at || "")));

    const total = visible.length;
    const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        .map((t) => personCard(t, { verified: t.verified, bookmarked: bookmarks.has(t.user.id) }));
    const newest = [...visible].sort((a, b) => String(b.user.created_at).localeCompare(String(a.user.created_at))).slice(0, 8)
        .map((t) => personCard(t, { verified: t.verified, bookmarked: bookmarks.has(t.user.id) }));

    H.ok(res, { items: pageItems, newProfiles: newest, page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
};

const getPerson = async (req, res) => {
    const targetId = H.id(req.params.userId, "userId");
    const me = req.user;
    if (targetId === me.id) throw ApiError.badRequest("Use your own profile page");
    const myProfile = Users.expandProfile(await Users.getProfile(me.id));
    const t = await Access.loadTarget(me, targetId);
    if (!t || !(await Access.canViewProfile(me, myProfile, t))) throw ApiError.notFound("This profile is not available");
    const db = getDb();
    const verified = await Access.isVerified(targetId);
    const bookmarked = Boolean(await db.prepare("SELECT 1 AS x FROM bookmarks WHERE user_id = ? AND target_id = ?").get(me.id, targetId));
    const conn = await Access.connectionBetween(me.id, targetId);
    const reqRow = await Access.pendingRequestBetween(me.id, targetId);
    const chat = conn ? await db.prepare("SELECT id FROM chats WHERE connection_id = ?").get(conn.id) : null;
    H.ok(res, personProfile(t, {
        verified, bookmarked,
        links: { connectionId: conn && conn.status !== "closed" ? conn.id : null, requestId: reqRow?.id || null, chatId: chat?.id || null, stage: conn?.stage || null }
    }));
};

const bookmark = async (req, res) => {
    const targetId = H.id(req.params.userId, "userId");
    if (!(await Access.loadTarget(req.user, targetId))) throw ApiError.notFound("This profile is not available");
    await getDb().prepare("INSERT INTO bookmarks (user_id, target_id, created_at) VALUES (?, ?, ?) ON CONFLICT (user_id, target_id) DO NOTHING").run(req.user.id, targetId, nowIso());
    H.ok(res, { bookmarked: true });
};

const unbookmark = async (req, res) => {
    await getDb().prepare("DELETE FROM bookmarks WHERE user_id = ? AND target_id = ?").run(req.user.id, H.id(req.params.userId, "userId"));
    H.ok(res, { bookmarked: false });
};

const listBookmarks = async (req, res) => {
    const rows = await getDb().prepare("SELECT target_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    const items = [];
    for (const r of rows) {
        const t = await Access.loadTarget(req.user, r.target_id);
        if (t) items.push(personCard(t, { verified: await Access.isVerified(r.target_id), bookmarked: true }));
    }
    H.ok(res, { items });
};

const skip = async (req, res) => {
    const targetId = H.id(req.params.userId, "userId");
    await getDb().prepare("INSERT INTO skips (user_id, target_id, created_at) VALUES (?, ?, ?) ON CONFLICT (user_id, target_id) DO NOTHING").run(req.user.id, targetId, nowIso());
    H.ok(res, { skipped: true });
};

module.exports = { discover, getPerson, bookmark, unbookmark, listBookmarks, skip };
