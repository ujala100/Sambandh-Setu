/**
 * Realtime updates without a separate socket server (the API runs as serverless functions).
 *
 * GET /api/realtime/stream keeps an HTTP response open for up to ~25 seconds and writes a
 * Server-Sent Events "update" whenever the member's state changes (new notification, new message,
 * new request, feature flags or announcement changed). The client reconnects straight away, so
 * updates arrive within a couple of seconds. GET /api/realtime/poll returns the same snapshot for
 * clients that cannot stream (native apps, or when the "Live updates" feature is off).
 */
const { getDb } = require("../db");
const Features = require("./features");

const STREAM_MS = Number(process.env.REALTIME_STREAM_MS || 25000);
const TICK_MS = Number(process.env.REALTIME_TICK_MS || 2000);

/** Small, cheap snapshot of what can change for a member. */
const snapshot = async (user) => {
    const db = getDb();
    const notif = await db.prepare("SELECT COUNT(*) AS n, MAX(created_at) AS latest FROM notifications WHERE recipient_id = ? AND read_at IS NULL").get(user.id);
    const chats = await db.prepare(`SELECT COUNT(*) AS n, MAX(m.created_at) AS latest FROM messages m JOIN chats ch ON ch.id = m.chat_id
        JOIN connections c ON c.id = ch.connection_id
        WHERE (c.participant_a = ? OR c.participant_b = ?) AND m.sender_id <> ? AND m.read_at IS NULL`).get(user.id, user.id, user.id);
    const lastMsg = await db.prepare(`SELECT MAX(ch.last_message_at) AS latest FROM chats ch JOIN connections c ON c.id = ch.connection_id
        WHERE c.participant_a = ? OR c.participant_b = ?`).get(user.id, user.id);
    const reqs = await db.prepare("SELECT COUNT(*) AS n FROM connection_requests WHERE recipient_id = ? AND status = 'pending'").get(user.id);
    const ev = await Features.evaluate(user);
    return {
        notifications: { unread: Number(notif?.n || 0), latest: notif?.latest || null },
        messages: { unread: Number(chats?.n || 0), latest: lastMsg?.latest || null },
        requests: { pending: Number(reqs?.n || 0) },
        features: { version: ev.version },
        announcement: ev.announcement,
        maintenance: ev.maintenance
    };
};

const poll = async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ data: { ...(await snapshot(req.user)), at: new Date().toISOString(), transport: "poll" } });
};

const stream = async (req, res) => {
    res.status(200);
    res.set({
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
    });
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    let closed = false;
    req.on("close", () => { closed = true; });
    const write = (chunk) => { if (!closed) res.write(chunk); };
    write(`retry: 1500\n\n`);
    let last = "";
    const started = Date.now();
    let lastPing = Date.now();
    while (!closed && Date.now() - started < STREAM_MS) {
        try {
            const snap = await snapshot(req.user);
            const json = JSON.stringify(snap);
            if (json !== last) {
                last = json;
                write(`event: update\ndata: ${JSON.stringify({ ...snap, at: new Date().toISOString(), transport: "stream" })}\n\n`);
            } else if (Date.now() - lastPing > 10000) {
                write(`: ping\n\n`);
                lastPing = Date.now();
            }
        } catch {
            write(`event: error\ndata: {}\n\n`);
            break;
        }
        await new Promise((r) => setTimeout(r, TICK_MS));
    }
    if (!closed) res.end();
};

module.exports = { snapshot, poll, stream };
