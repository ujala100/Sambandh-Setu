/**
 * Home dashboard: current connection, items needing attention, journey summary and preferences.
 * Everything here is real data; nothing is filled in when it is missing.
 */
const { getDb } = require("../db");
const Users = require("../models/users");
const Access = require("../services/access");
const J = require("../services/journey");
const { cardFor, otherId, journeyView } = require("./connectionController");
const H = require("../utils/helpers");

const getHome = async (req, res) => {
    const db = getDb();
    const me = req.user;
    const blocked = await Access.blockedIdsFor(me.id);
    const conns = (await db.prepare("SELECT * FROM connections WHERE (participant_a = ? OR participant_b = ?) AND status = 'active' ORDER BY updated_at DESC").all(me.id, me.id))
        .filter((c) => !blocked.has(otherId(c, me.id)));

    let current = null;
    if (conns.length) {
        const c = conns[0];
        const person = await cardFor(me, otherId(c, me.id));
        const chat = await db.prepare("SELECT id FROM chats WHERE connection_id = ?").get(c.id);
        const journey = await journeyView(me, c);
        current = { connectionId: c.id, chatId: chat?.id || null, person, stage: c.stage, stageTitle: J.STAGES.find((s) => s.key === c.stage)?.title, journey };
    }

    const attention = [];
    const received = (await db.prepare("SELECT sender_id FROM connection_requests WHERE recipient_id = ? AND status = 'pending'").all(me.id)).filter((r) => !blocked.has(r.sender_id));
    if (received.length) {
        attention.push({ key: "requests", icon: "requests", title: `${received.length} new interest request${received.length > 1 ? "s" : ""}`, description: "Someone has shown interest in you.", target: "requests" });
    }
    const pendingFamily = (await db.prepare("SELECT COUNT(*) AS n FROM family_members WHERE owner_id = ? AND status = 'pending'").get(me.id)).n;
    if (pendingFamily) {
        attention.push({ key: "family", icon: "family", title: "Family invitation pending", description: `${pendingFamily} family member${pendingFamily > 1 ? "s have" : " has"} not responded yet.`, target: "family" });
    }
    for (const c of conns) {
        const done = await db.prepare("SELECT user_id FROM stage_completions WHERE connection_id = ? AND stage = ?").all(c.id, c.stage);
        const partner = otherId(c, me.id);
        if (done.some((d) => d.user_id === partner) && !done.some((d) => d.user_id === me.id)) {
            const name = Users.firstName(await Users.findById(partner));
            attention.push({ key: `stage-${c.id}`, icon: "journey", title: `${name} is waiting on you`, description: `They completed the ${J.STAGES.find((s) => s.key === c.stage)?.title} stage.`, target: "journey", connectionId: c.id });
        }
    }
    const unreadChats = (await db.prepare(`SELECT COUNT(DISTINCT m.chat_id) AS n FROM messages m JOIN chats ch ON ch.id = m.chat_id JOIN connections c ON c.id = ch.connection_id
        WHERE (c.participant_a = ? OR c.participant_b = ?) AND m.sender_id <> ? AND m.read_at IS NULL`).get(me.id, me.id, me.id)).n;
    if (unreadChats) attention.push({ key: "chats", icon: "chat", title: `Unread messages in ${unreadChats} chat${unreadChats > 1 ? "s" : ""}`, description: "Reply when you are ready.", target: "chats" });

    const profile = Users.expandProfile(await Users.getProfile(me.id));
    const comp = Users.completeness(me, profile);
    if (!profile.avatarPhotoId) attention.push({ key: "photo", icon: "photo", title: "Add a profile photo", description: "A clear photo helps people get to know you.", target: "photo" });

    H.ok(res, {
        firstName: Users.firstName(me),
        photoUrl: Users.photoUrl(profile.avatarPhotoId),
        current,
        activeCount: conns.length,
        attention,
        preferencesSummary: profile.preferences?.summary || "",
        hasPreferences: Object.keys(profile.preferences || {}).length > 0,
        completeness: comp,
        stages: J.STAGES.map(({ key, title, short }) => ({ key, title, short }))
    });
};

module.exports = { getHome };
