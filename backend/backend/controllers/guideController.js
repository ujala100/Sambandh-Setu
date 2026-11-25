/**
 * Setu Guide chat and conversation history.
 *
 * Consent: only the fields the member switched on in Settings > Setu Guide are sent to the AI
 * service. About the other person, only their first name and interests the member can already see
 * on their profile are used. History is saved only while "save history" is on, and can be deleted
 * per conversation or all at once.
 */
const { getDb, generateId, nowIso } = require("../db");
const Users = require("../models/users");
const Settings = require("../models/settings");
const Engine = require("../services/guideEngine");
const { callService } = require("../services/guideService");
const { myConnection, otherId } = require("./connectionController");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const INTENTS = ["conversation_ideas", "help_me_understand", "next_steps", "privacy_safety"];

const chat = async (req, res) => {
    const settings = await Settings.getSettings(req.user.id);
    if (!settings.guide.enabled) throw ApiError.forbidden("Setu Guide is turned off. You can turn it on in Settings > Setu Guide.");
    const message = H.str(req.body?.message, "message", { max: 500, optional: true }) || "";
    const intent = H.oneOf(req.body?.intent, "intent", INTENTS, { optional: true });
    if (!message && !intent) throw ApiError.badRequest("Type a message or pick a topic");

    let stage = "understand";
    let partnerName = "";
    let connectionId = null;
    const viewer = {};
    const match = {};
    if (req.body?.connectionId) {
        req.params.connectionId = req.body.connectionId;
        const conn = await myConnection(req);
        connectionId = conn.id;
        stage = conn.stage;
        const partnerId = otherId(conn, req.user.id);
        const partner = await Users.findById(partnerId);
        partnerName = Users.firstName(partner);
        match.first_name = partnerName;
        const partnerProfile = Users.expandProfile(await Users.getProfile(partnerId));
        // Interests are already visible on their profile card; nothing else about them is sent.
        match.interests = (partnerProfile.interests || []).slice(0, 8);
    }
    const mine = Users.expandProfile(await Users.getProfile(req.user.id));
    if (settings.guide.accessProfile) Object.assign(viewer, { interests: mine.interests, values: mine.values, languages: mine.languages });
    if (settings.guide.accessPreferences) viewer.preferences = mine.preferences?.basic || {};

    // Safety runs here first, whatever the AI service does.
    const flags = Engine.checkInput(message);
    let result = null;
    if (!flags.length) {
        result = await callService({
            user_id: req.user.id, match_id: connectionId || "none", stage, intent, message: message || undefined,
            context: { viewer, match }
        });
        if (result && typeof result.reply !== "string") result = null;
    }
    if (!result) result = Engine.respond({ message, intent, stage, partnerName });

    let conversationId = null;
    if (settings.guide.saveHistory) {
        const db = getDb();
        const now = nowIso();
        conversationId = req.body?.conversationId ? H.id(req.body.conversationId, "conversationId") : null;
        if (conversationId) {
            const conv = await db.prepare("SELECT id FROM guide_conversations WHERE id = ? AND user_id = ?").get(conversationId, req.user.id);
            if (!conv) conversationId = null;
        }
        if (!conversationId) {
            conversationId = generateId();
            const title = (message || result.title || intent || "Conversation").slice(0, 80);
            await db.prepare("INSERT INTO guide_conversations (id, user_id, connection_id, title, topic, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .run(conversationId, req.user.id, connectionId, title, result.intent || "general", now, now);
        }
        await db.prepare("INSERT INTO guide_messages (id, conversation_id, role, text, payload, created_at) VALUES (?, ?, 'user', ?, '{}', ?)")
            .run(generateId(), conversationId, message || `[${intent}]`, now);
        await db.prepare("INSERT INTO guide_messages (id, conversation_id, role, text, payload, created_at) VALUES (?, ?, 'guide', ?, ?, ?)")
            .run(generateId(), conversationId, result.reply, JSON.stringify({ title: result.title, questions: result.questions, intent: result.intent }), new Date(Date.now() + 1).toISOString());
        await db.prepare("UPDATE guide_conversations SET updated_at = ? WHERE id = ?").run(now, conversationId);
    }
    H.ok(res, { ...result, conversationId, stage });
};

const listConversations = async (req, res) => {
    const rows = await getDb().prepare(`SELECT c.*, (SELECT COUNT(*) FROM guide_messages m WHERE m.conversation_id = c.id) AS message_count
        FROM guide_conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC LIMIT 100`).all(req.user.id);
    H.ok(res, { items: rows.map((r) => ({ id: r.id, title: r.title, topic: r.topic, connectionId: r.connection_id, messageCount: r.message_count, createdAt: r.created_at, updatedAt: r.updated_at })) });
};

const getConversation = async (req, res) => {
    const id = H.id(req.params.conversationId, "conversationId");
    const conv = await getDb().prepare("SELECT * FROM guide_conversations WHERE id = ? AND user_id = ?").get(id, req.user.id);
    if (!conv) throw ApiError.notFound("Conversation not found");
    const msgs = await getDb().prepare("SELECT * FROM guide_messages WHERE conversation_id = ? ORDER BY created_at").all(id);
    H.ok(res, {
        id: conv.id, title: conv.title, topic: conv.topic, connectionId: conv.connection_id, createdAt: conv.created_at,
        messages: msgs.map((m) => ({ id: m.id, role: m.role, text: m.text, ...H.parseJson(m.payload, {}), at: m.created_at }))
    });
};

const deleteConversation = async (req, res) => {
    await getDb().prepare("DELETE FROM guide_conversations WHERE id = ? AND user_id = ?").run(H.id(req.params.conversationId, "conversationId"), req.user.id);
    H.ok(res, { deleted: true });
};

const clearConversations = async (req, res) => {
    await getDb().prepare("DELETE FROM guide_conversations WHERE user_id = ?").run(req.user.id);
    H.ok(res, { deleted: true });
};

module.exports = { chat, listConversations, getConversation, deleteConversation, clearConversations };
