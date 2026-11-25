/**
 * One-to-one chats between connected members. A chat exists for every connection; messages can only
 * be sent while the connection is active and neither person has blocked the other.
 */
const { getDb, generateId, nowIso } = require("../db");
const Users = require("../models/users");
const Settings = require("../models/settings");
const Access = require("../services/access");
const J = require("../services/journey");
const { notify } = require("../services/notify");
const { cardFor, otherId } = require("./connectionController");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const loadChat = async (req) => {
    const id = H.id(req.params.chatId, "chatId");
    const db = getDb();
    const chat = await db.prepare("SELECT * FROM chats WHERE id = ?").get(id);
    if (!chat) throw ApiError.notFound("Chat not found");
    const conn = await db.prepare("SELECT * FROM connections WHERE id = ?").get(chat.connection_id);
    if (!conn || (conn.participant_a !== req.user.id && conn.participant_b !== req.user.id)) throw ApiError.notFound("Chat not found");
    const partnerId = otherId(conn, req.user.id);
    if (await Access.isBlockedEitherWay(req.user.id, partnerId)) throw ApiError.notFound("Chat not found");
    return { chat, conn, partnerId };
};

const listChats = async (req, res) => {
    const db = getDb();
    const conns = await db.prepare("SELECT * FROM connections WHERE (participant_a = ? OR participant_b = ?) AND status <> 'closed'").all(req.user.id, req.user.id);
    const blocked = await Access.blockedIdsFor(req.user.id);
    const items = [];
    for (const conn of conns) {
        const partnerId = otherId(conn, req.user.id);
        if (blocked.has(partnerId)) continue;
        const chat = await db.prepare("SELECT * FROM chats WHERE connection_id = ?").get(conn.id);
        if (!chat) continue;
        const person = await cardFor(req.user, partnerId);
        if (!person) continue;
        const last = await db.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC, id DESC LIMIT 1").get(chat.id);
        const unread = (await db.prepare("SELECT COUNT(*) AS n FROM messages WHERE chat_id = ? AND sender_id <> ? AND read_at IS NULL").get(chat.id, req.user.id)).n;
        items.push({
            id: chat.id,
            connectionId: conn.id,
            connectionStatus: conn.status,
            stage: conn.stage,
            stageTitle: J.STAGES.find((s) => s.key === conn.stage)?.title || "",
            person,
            lastMessage: last ? { text: last.text, at: last.created_at, mine: last.sender_id === req.user.id, read: Boolean(last.read_at) } : null,
            unread,
            muted: H.parseJson(chat.muted_by, []).includes(req.user.id),
            createdAt: chat.created_at
        });
    }
    items.sort((a, b) => String(b.lastMessage?.at || b.createdAt).localeCompare(String(a.lastMessage?.at || a.createdAt)));
    H.ok(res, { items });
};

const listMessages = async (req, res) => {
    const { chat, partnerId } = await loadChat(req);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const before = typeof req.query.before === "string" && !Number.isNaN(Date.parse(req.query.before)) ? req.query.before : null;
    const rows = before
        ? await getDb().prepare("SELECT * FROM messages WHERE chat_id = ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT ?").all(chat.id, before, limit)
        : await getDb().prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at DESC, id DESC LIMIT ?").all(chat.id, limit);
    const partnerSettings = await Settings.getSettings(partnerId);
    const mySettings = await Settings.getSettings(req.user.id);
    // Read receipts are shown only when both people have them switched on.
    const showRead = partnerSettings.chat.readReceipts && mySettings.chat.readReceipts;
    const items = rows.reverse().map((m) => ({
        id: m.id, text: m.text, at: m.created_at, mine: m.sender_id === req.user.id,
        read: showRead && m.sender_id === req.user.id ? Boolean(m.read_at) : undefined
    }));
    H.ok(res, { items, hasMore: rows.length === limit });
};

const sendMessage = async (req, res) => {
    const { chat, conn, partnerId } = await loadChat(req);
    if (conn.status !== "active") throw ApiError.conflict(conn.status === "paused" ? "This connection is paused. Resume it to send messages." : "This connection is closed");
    const text = H.str(req.body?.text, "text", { max: 2000 });
    const now = nowIso();
    const id = generateId();
    const db = getDb();
    await db.prepare("INSERT INTO messages (id, chat_id, sender_id, text, created_at) VALUES (?, ?, ?, ?, ?)").run(id, chat.id, req.user.id, text, now);
    await db.prepare("UPDATE chats SET last_message_at = ? WHERE id = ?").run(now, chat.id);
    if (!H.parseJson(chat.muted_by, []).includes(partnerId)) {
        await notify(partnerId, { actorId: req.user.id, type: "message", refId: chat.id });
    }
    H.ok(res, { id, text, at: now, mine: true }, 201);
};

const markRead = async (req, res) => {
    const { chat } = await loadChat(req);
    await getDb().prepare("UPDATE messages SET read_at = ? WHERE chat_id = ? AND sender_id <> ? AND read_at IS NULL").run(nowIso(), chat.id, req.user.id);
    await getDb().prepare("UPDATE notifications SET read_at = ? WHERE recipient_id = ? AND type = 'message' AND ref_id = ? AND read_at IS NULL").run(nowIso(), req.user.id, chat.id);
    H.ok(res, { read: true });
};

const setMuted = async (req, res) => {
    const { chat } = await loadChat(req);
    const muted = req.body?.muted === true;
    const list = new Set(H.parseJson(chat.muted_by, []));
    if (muted) list.add(req.user.id); else list.delete(req.user.id);
    await getDb().prepare("UPDATE chats SET muted_by = ? WHERE id = ?").run(JSON.stringify([...list]), chat.id);
    H.ok(res, { muted });
};

const chatProfile = async (req, res) => {
    const { chat, conn, partnerId } = await loadChat(req);
    const person = await cardFor(req.user, partnerId);
    const mine = Users.expandProfile(await Users.getProfile(req.user.id));
    const theirs = Users.expandProfile(await Users.getProfile(partnerId));
    const lower = new Set((mine.interests || []).map((x) => x.toLowerCase()));
    const shared = (theirs.interests || []).filter((x) => lower.has(x.toLowerCase()));
    const partner = await Users.findById(partnerId);
    const partnerSettings = await Settings.getSettings(partnerId);
    H.ok(res, {
        chatId: chat.id,
        connectionId: conn.id,
        connectionStatus: conn.status,
        person,
        stage: conn.stage,
        stageTitle: J.STAGES.find((s) => s.key === conn.stage)?.title || "",
        connectedOn: conn.created_at,
        lastActive: partnerSettings.privacy.showOnlineStatus ? partner.last_active_at : null,
        sharedInterests: shared,
        muted: H.parseJson(chat.muted_by, []).includes(req.user.id)
    });
};

module.exports = { listChats, listMessages, sendMessage, markRead, setMuted, chatProfile };
