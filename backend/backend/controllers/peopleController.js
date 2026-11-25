/**
 * Discover and member profiles. Results never include: yourself, blocked people (either way),
 * people you already have a request or connection with, people you skipped, paused, hidden or
 * deactivated profiles, and anyone whose privacy settings exclude you.
 *
 * Discover loads candidates in a handful of bulk queries (not one query per person) and ranks
 * them with services/recommender.js.
 */
const { getDb, nowIso } = require("../db");
const Users = require("../models/users");
const Settings = require("../models/settings");
const Access = require("../services/access");
const Rec = require("../services/recommender");
const { personCard, personProfile } = require("../services/views");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const PAGE_SIZE = 10;
const CANDIDATE_LIMIT = 400;

const placeholders = (n) => Array.from({ length: n }, () => "?").join(",");

/** Expanded profiles for many members: { userId: profile }. */
const profilesOf = async (ids) => {
    if (!ids.length) return {};
    const rows = await getDb().prepare(`SELECT * FROM profiles WHERE user_id IN (${placeholders(ids.length)})`).all(...ids);
    return Object.fromEntries(rows.map((r) => [r.user_id, Users.expandProfile(r)]));
};

const matchesQuery = (t, q) => {
    if (!q) return true;
    const hay = [Users.firstName(t.user), t.profile.location, t.profile.profession, t.profile.education, ...(t.profile.interests || []), ...(t.profile.values || [])]
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

/** Everyone the viewer could see in Discover, with profile, settings and verification loaded. */
const loadCandidates = async (me, myProfile) => {
    const db = getDb();
    const users = await db.prepare(`SELECT u.* FROM users u JOIN profiles p ON p.user_id = u.id
        WHERE u.id <> ? AND u.status = 'active' AND u.onboarding_completed = 1 AND p.profile_status = 'active'
        AND u.id NOT IN (SELECT target_id FROM skips WHERE user_id = ?)
        ORDER BY COALESCE(u.last_active_at, u.created_at) DESC LIMIT ${CANDIDATE_LIMIT}`).all(me.id, me.id);
    if (!users.length) return [];
    const ids = users.map((u) => u.id);
    const [profiles, settings, blocked] = await Promise.all([profilesOf(ids), Settings.getMany(ids), Access.blockedIdsFor(me.id)]);
    const related = new Set();
    for (const r of await db.prepare("SELECT participant_a, participant_b FROM connections WHERE participant_a = ? OR participant_b = ?").all(me.id, me.id)) {
        related.add(r.participant_a === me.id ? r.participant_b : r.participant_a);
    }
    for (const r of await db.prepare("SELECT sender_id, recipient_id FROM connection_requests WHERE status = 'pending' AND (sender_id = ? OR recipient_id = ?)").all(me.id, me.id)) {
        related.add(r.sender_id === me.id ? r.recipient_id : r.sender_id);
    }
    const verifiedIds = new Set((await db.prepare(`SELECT DISTINCT user_id FROM verifications WHERE type = 'identity' AND status = 'verified' AND user_id IN (${placeholders(ids.length)})`).all(...ids)).map((r) => r.user_id));
    const verifiedViewer = await Access.isVerified(me.id);
    const sameCity = (a, b) => String(a || "").split(",")[0].trim().toLowerCase() === String(b || "").split(",")[0].trim().toLowerCase();

    const out = [];
    for (const u of users) {
        if (blocked.has(u.id) || related.has(u.id) || !profiles[u.id]) continue;
        const t = { user: u, profile: profiles[u.id], settings: settings[u.id], relation: "none", verified: verifiedIds.has(u.id) };
        if (!(await Access.canAppearInDiscover(me, myProfile, t, { verifiedViewer }))) continue;
        if (t.settings.discovery.distanceVisibility === "city" && !sameCity(t.profile.location, myProfile.location)) continue;
        t.completeness = Users.completeness(u, t.profile).percent;
        out.push(t);
    }
    return out;
};

const discover = async (req, res) => {
    const me = req.user;
    const myProfile = Users.expandProfile(await Users.getProfile(me.id));
    const mySettings = await Settings.getSettings(me.id);
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

    let visible = (await loadCandidates(me, myProfile)).filter((t) => matchesQuery(t, q) && matchesFilters(t, filters));
    if (sort === "recommended") {
        const signals = await Rec.loadSignals(me.id, visible.map((t) => t.user.id), profilesOf);
        visible = await Rec.rank({ user: me, profile: myProfile, settings: mySettings }, visible, signals);
    } else if (sort === "active") {
        visible.sort((a, b) => String(b.user.last_active_at || "").localeCompare(String(a.user.last_active_at || "")));
    } else {
        visible.sort((a, b) => String(b.user.created_at).localeCompare(String(a.user.created_at)));
    }

    const bookmarks = new Set((await getDb().prepare("SELECT target_id FROM bookmarks WHERE user_id = ?").all(me.id)).map((r) => r.target_id));
    const card = (t) => ({ ...personCard(t, { verified: t.verified, bookmarked: bookmarks.has(t.user.id) }), reasons: t.rec?.reasons || [] });
    const total = visible.length;
    const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const newest = [...visible].sort((a, b) => String(b.user.created_at).localeCompare(String(a.user.created_at))).slice(0, 8);
    Rec.logImpressions(me.id, pageItems.map((t) => t.user.id)).catch(() => {});

    H.ok(res, { items: pageItems.map(card), newProfiles: newest.map(card), page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), sort });
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
    if (t.relation === "none") Rec.logEvent(me.id, targetId, "view");
    H.ok(res, personProfile(t, {
        verified, bookmarked,
        links: { connectionId: conn && conn.status !== "closed" ? conn.id : null, requestId: reqRow?.id || null, chatId: chat?.id || null, stage: conn?.stage || null }
    }));
};

const bookmark = async (req, res) => {
    const targetId = H.id(req.params.userId, "userId");
    if (!(await Access.loadTarget(req.user, targetId))) throw ApiError.notFound("This profile is not available");
    await getDb().prepare("INSERT INTO bookmarks (user_id, target_id, created_at) VALUES (?, ?, ?) ON CONFLICT (user_id, target_id) DO NOTHING").run(req.user.id, targetId, nowIso());
    Rec.logEvent(req.user.id, targetId, "bookmark");
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
    Rec.logEvent(req.user.id, targetId, "skip");
    H.ok(res, { skipped: true });
};

module.exports = { discover, getPerson, bookmark, unbookmark, listBookmarks, skip, profilesOf };
