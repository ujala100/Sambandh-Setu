/**
 * Who may see or contact whom. Every read of another member goes through here so blocks, paused
 * profiles and privacy settings are applied in one place.
 */
const { getDb } = require("../db");
const Users = require("../models/users");
const Settings = require("../models/settings");
const { pairKey } = require("../utils/helpers");

const isBlockedEitherWay = async (a, b) => Boolean(await getDb()
    .prepare("SELECT 1 AS x FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)")
    .get(String(a), String(b), String(b), String(a)));

const blockedIdsFor = async (userId) => {
    const rows = await getDb().prepare("SELECT blocked_id AS id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id AS id FROM blocks WHERE blocked_id = ?")
        .all(String(userId), String(userId));
    return new Set(rows.map((r) => r.id));
};

const connectionBetween = (a, b) => getDb().prepare("SELECT * FROM connections WHERE pair_key = ?").get(pairKey(a, b));

const pendingRequestBetween = (a, b) => getDb()
    .prepare("SELECT * FROM connection_requests WHERE pair_key = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1")
    .get(pairKey(a, b));

/** 'self' | 'connected' | 'request_sent' | 'request_received' | 'closed' | 'none' */
const relationOf = async (viewerId, targetId) => {
    if (String(viewerId) === String(targetId)) return "self";
    const conn = await connectionBetween(viewerId, targetId);
    if (conn && conn.status !== "closed") return "connected";
    const req = await pendingRequestBetween(viewerId, targetId);
    if (req) return req.sender_id === String(viewerId) ? "request_sent" : "request_received";
    if (conn) return "closed";
    return "none";
};

/** Does `viewerProfile` fit the partner preferences of `targetProfile`? Missing preferences match everyone. */
const fitsPreferences = (targetProfile, viewerProfile) => {
    const prefs = targetProfile?.preferences?.basic || {};
    const age = viewerProfile?.age;
    if (age && Number.isInteger(prefs.ageMin) && age < prefs.ageMin) return false;
    if (age && Number.isInteger(prefs.ageMax) && age > prefs.ageMax) return false;
    if (Array.isArray(prefs.genders) && prefs.genders.length && viewerProfile?.gender &&
        !prefs.genders.map((g) => g.toLowerCase()).includes(String(viewerProfile.gender).toLowerCase())) return false;
    return true;
};

const isVerified = async (userId) => Boolean(await getDb()
    .prepare("SELECT 1 AS x FROM verifications WHERE user_id = ? AND type = 'identity' AND status = 'verified'").get(String(userId)));

/**
 * Loads everything needed to decide visibility of `targetId` for `viewer`.
 * Returns null when the target must be treated as not existing (blocked, deleted, deactivated).
 */
const loadTarget = async (viewer, targetId) => {
    const target = await Users.findById(targetId);
    if (!target || target.status !== "active") return null;
    if (await isBlockedEitherWay(viewer.id, target.id)) return null;
    const profile = Users.expandProfile(await Users.getProfile(target.id));
    const settings = await Settings.getSettings(target.id);
    const relation = await relationOf(viewer.id, target.id);
    return { user: target, profile, settings, relation };
};

/** May the viewer open the target's full profile page? Connected people always may. */
const canViewProfile = async (viewer, viewerProfile, t) => {
    if (!t) return false;
    if (["self", "connected", "request_received", "request_sent"].includes(t.relation)) return true;
    if (t.profile.profileStatus !== "active") return false;
    const who = t.settings.privacy.whoCanSeeProfile;
    if (who === "everyone") return true;
    if (who === "matching") return fitsPreferences(t.profile, viewerProfile);
    return false; // 'connected' and 'selected' need a relationship
};

/** May the target appear in the viewer's Discover? */
const canAppearInDiscover = async (viewer, viewerProfile, t, { verifiedViewer }) => {
    if (!t || t.relation !== "none") return false;
    if (!t.user.onboarding_completed || t.profile.profileStatus !== "active") return false;
    const { privacy, discovery } = t.settings;
    if (!privacy.showInDiscover || discovery.hideProfile) return false;
    switch (discovery.peopleWhoCanFindMe) {
        case "nobody": return false;
        case "verified": if (!verifiedViewer) return false; break;
        case "matching": if (!fitsPreferences(t.profile, viewerProfile)) return false; break;
        default: break;
    }
    if (discovery.ageRangeVisibility === "custom" && viewerProfile?.age) {
        if (viewerProfile.age < discovery.ageMin || viewerProfile.age > discovery.ageMax) return false;
    }
    return privacy.whoCanSeeProfile === "everyone" || privacy.whoCanSeeProfile === "matching";
};

/** May `sender` start a conversation request with the target? */
const canSendRequest = async (sender, senderProfile, t, { verifiedSender }) => {
    if (!t || t.relation !== "none" && t.relation !== "closed") return { ok: false, reason: "You already have a connection or request with this person." };
    if (!t.settings.privacy.allowConnectionRequests) return { ok: false, reason: "This member is not accepting new requests right now." };
    const rule = t.settings.chat.allowMessagesFrom;
    if (rule === "verified" && !verifiedSender) return { ok: false, reason: "This member only accepts requests from verified members." };
    if (rule === "custom") {
        const c = t.settings.chat.custom;
        if (c.verifiedOnly && !verifiedSender) return { ok: false, reason: "This member only accepts requests from verified members." };
        if (c.interactedOnly) return { ok: false, reason: "This member only accepts requests from people they have interacted with." };
    }
    return { ok: true };
};

module.exports = {
    isBlockedEitherWay, blockedIdsFor, connectionBetween, pendingRequestBetween, relationOf, fitsPreferences,
    isVerified, loadTarget, canViewProfile, canAppearInDiscover, canSendRequest
};
