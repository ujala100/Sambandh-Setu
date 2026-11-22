const { getDb, nowIso } = require("../db");
const Users = require("../models/users");
const Access = require("../services/access");
const J = require("../services/journey");
const H = require("../utils/helpers");

const TEXT = {
    request_received: (n) => ({ title: `${n} is interested in you`, body: "View their profile and respond when you are ready.", target: "requests" }),
    request_accepted: (n) => ({ title: `${n} accepted your interest`, body: "You are now connected. Say hello when you are ready.", target: "connection" }),
    message: (n) => ({ title: `New message from ${n}`, body: "Open the chat to reply.", target: "chat" }),
    stage_completed: (n, p) => ({ title: `${n} completed the ${stageTitle(p.stage)} stage`, body: "Complete it too when you are ready to move on together.", target: "journey" }),
    stage_advanced: (n, p) => ({ title: `You both moved to ${stageTitle(p.stage)}`, body: "A new stage of your journey is open.", target: "journey" }),
    reflection_shared: (n) => ({ title: `${n} shared reflections with you`, body: "See the answers they chose to share.", target: "journey" }),
    connection_paused: (n) => ({ title: `${n} paused your connection`, body: "They are taking some time. There is no rush.", target: "connection" }),
    connection_resumed: (n) => ({ title: `${n} resumed your connection`, body: "You can continue your journey together.", target: "connection" }),
    family_accepted: (n, p) => ({ title: `Your ${String(p.relationship || "family member").toLowerCase()} accepted your invitation`, body: "They can now view the information you selected.", target: "family" }),
    family_declined: (n, p) => ({ title: `Your ${String(p.relationship || "family member").toLowerCase()} declined the invitation`, body: "You can invite them again later.", target: "family" }),
    verification_update: (n, p) => ({ title: p.status === "verified" ? "Your verification is complete" : "Your verification needs attention", body: p.status === "verified" ? "A verified badge now shows on your profile." : "Open Verification to see what to do next.", target: "verification" })
};
const stageTitle = (key) => J.STAGES.find((s) => s.key === key)?.title || "next";

const listNotifications = async (req, res) => {
    const rows = await getDb().prepare("SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 100").all(req.user.id);
    const blocked = await Access.blockedIdsFor(req.user.id);
    const names = {};
    const items = [];
    for (const r of rows) {
        if (r.actor_id && blocked.has(r.actor_id)) continue;
        if (r.actor_id && !(r.actor_id in names)) names[r.actor_id] = Users.firstName(await Users.findById(r.actor_id));
        const fn = TEXT[r.type];
        if (!fn) continue;
        const payload = H.parseJson(r.payload, {});
        items.push({ id: r.id, type: r.type, refId: r.ref_id, actorId: r.actor_id, ...fn(names[r.actor_id] || "Someone", payload), payload, createdAt: r.created_at, read: Boolean(r.read_at) });
    }
    H.ok(res, { items, unread: items.filter((i) => !i.read).length });
};

const unreadCount = async (req, res) => {
    const r = await getDb().prepare("SELECT COUNT(*) AS n FROM notifications WHERE recipient_id = ? AND read_at IS NULL").get(req.user.id);
    H.ok(res, { unread: r.n });
};

const markRead = async (req, res) => {
    await getDb().prepare("UPDATE notifications SET read_at = ? WHERE id = ? AND recipient_id = ?").run(nowIso(), H.id(req.params.notificationId, "notificationId"), req.user.id);
    H.ok(res, { read: true });
};

const markAllRead = async (req, res) => {
    await getDb().prepare("UPDATE notifications SET read_at = ? WHERE recipient_id = ? AND read_at IS NULL").run(nowIso(), req.user.id);
    H.ok(res, { read: true });
};

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
