const { getDb, generateId, nowIso } = require("../db");
const Settings = require("../models/settings");

const CATEGORY = {
    request_received: "requests",
    request_accepted: "requests",
    message: "messages",
    stage_completed: "journey",
    stage_advanced: "journey",
    reflection_shared: "journey",
    connection_paused: "journey",
    connection_resumed: "journey",
    family_accepted: "family",
    family_declined: "family",
    verification_update: "safety",
    report_received: "safety"
};

/** Creates an in-app notification if the recipient allows that category. Never throws. */
const notify = async (recipientId, { actorId = null, type, refId = null, payload = {} }) => {
    try {
        const settings = await Settings.getSettings(recipientId);
        const category = CATEGORY[type];
        if (settings.notifications.inApp === false) return;
        if (category && settings.notifications[category] === false) return;
        await getDb().prepare(`INSERT INTO notifications (id, recipient_id, actor_id, type, ref_id, payload, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(generateId(), String(recipientId), actorId ? String(actorId) : null, type, refId, JSON.stringify(payload), nowIso());
    } catch (error) {
        console.error("Notification insert failed: type=%s code=%s", type, error.code || "none");
    }
};

module.exports = { notify };
