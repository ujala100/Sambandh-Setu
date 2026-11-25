/**
 * Interest requests, connections and the shared Setu journey (stages + Reflect).
 */
const { getDb, generateId, nowIso } = require("../db");
const Users = require("../models/users");
const Access = require("../services/access");
const J = require("../services/journey");
const { notify } = require("../services/notify");
const { personCard } = require("../services/views");
const Rec = require("../services/recommender");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const otherId = (conn, me) => (conn.participant_a === String(me) ? conn.participant_b : conn.participant_a);

const cardFor = async (viewer, userId) => {
    const target = await Users.findById(userId);
    if (!target) return null;
    const profile = Users.expandProfile(await Users.getProfile(userId));
    const settings = await require("../models/settings").getSettings(userId);
    const relation = await Access.relationOf(viewer.id, userId);
    return personCard({ user: target, profile, settings, relation }, { verified: await Access.isVerified(userId) });
};

/** Loads a connection the viewer belongs to, or 404. */
const myConnection = async (req) => {
    const id = H.id(req.params.connectionId, "connectionId");
    const conn = await getDb().prepare("SELECT * FROM connections WHERE id = ?").get(id);
    if (!conn || (conn.participant_a !== req.user.id && conn.participant_b !== req.user.id)) throw ApiError.notFound("Connection not found");
    if (await Access.isBlockedEitherWay(conn.participant_a, conn.participant_b)) throw ApiError.notFound("Connection not found");
    return conn;
};

// ---------------- Requests ----------------

const listRequests = async (req, res) => {
    const db = getDb();
    const blocked = await Access.blockedIdsFor(req.user.id);
    const received = [];
    for (const r of await db.prepare("SELECT * FROM connection_requests WHERE recipient_id = ? AND status = 'pending' ORDER BY created_at DESC").all(req.user.id)) {
        if (blocked.has(r.sender_id)) continue;
        const person = await cardFor(req.user, r.sender_id);
        if (person) received.push({ id: r.id, person, message: r.message, createdAt: r.created_at });
    }
    const sent = [];
    for (const r of await db.prepare("SELECT * FROM connection_requests WHERE sender_id = ? AND status = 'pending' ORDER BY created_at DESC").all(req.user.id)) {
        if (blocked.has(r.recipient_id)) continue;
        const person = await cardFor(req.user, r.recipient_id);
        if (person) sent.push({ id: r.id, person, message: r.message, createdAt: r.created_at });
    }
    H.ok(res, { received, sent });
};

const sendRequest = async (req, res) => {
    const me = req.user;
    const recipientId = H.id(req.body?.recipientId, "recipientId");
    if (recipientId === me.id) throw ApiError.badRequest("You cannot send interest to yourself");
    const message = H.str(req.body?.message, "message", { max: 300, optional: true }) || "";
    const myProfile = Users.expandProfile(await Users.getProfile(me.id));
    if (!me.onboarding_completed) throw ApiError.badRequest("Please complete your profile before sending interest");
    const t = await Access.loadTarget(me, recipientId);
    if (!t || !(await Access.canViewProfile(me, myProfile, t))) throw ApiError.notFound("This profile is not available");
    const check = await Access.canSendRequest(me, myProfile, t, { verifiedSender: await Access.isVerified(me.id) });
    if (!check.ok) throw ApiError.conflict(check.reason);
    const id = generateId();
    const now = nowIso();
    await getDb().prepare("INSERT INTO connection_requests (id, sender_id, recipient_id, pair_key, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)")
        .run(id, me.id, recipientId, H.pairKey(me.id, recipientId), message, now, now);
    await notify(recipientId, { actorId: me.id, type: "request_received", refId: id });
    await Rec.logEvent(me.id, recipientId, "interest");
    H.ok(res, { id, status: "pending" }, 201);
};

const pendingRequest = async (req, role) => {
    const id = H.id(req.params.requestId, "requestId");
    const r = await getDb().prepare("SELECT * FROM connection_requests WHERE id = ?").get(id);
    const mine = r && (role === "recipient" ? r.recipient_id : r.sender_id) === req.user.id;
    if (!r || !mine || r.status !== "pending") throw ApiError.notFound("Request not found");
    return r;
};

const acceptRequest = async (req, res) => {
    const r = await pendingRequest(req, "recipient");
    if (await Access.isBlockedEitherWay(r.sender_id, r.recipient_id)) throw ApiError.notFound("Request not found");
    const db = getDb();
    const now = nowIso();
    const updated = await db.prepare("UPDATE connection_requests SET status = 'accepted', updated_at = ? WHERE id = ? AND status = 'pending'").run(now, r.id);
    if (!updated || updated.changes !== 1) throw ApiError.conflict("This request was already answered");
    let conn = await db.prepare("SELECT * FROM connections WHERE pair_key = ?").get(r.pair_key);
    if (conn) {
        // A previously closed connection starts again from the beginning.
        await db.prepare("UPDATE connections SET status = 'active', stage = 'connect', paused_by = NULL, paused_at = NULL, closed_at = NULL, updated_at = ? WHERE id = ?").run(now, conn.id);
        await db.prepare("DELETE FROM stage_completions WHERE connection_id = ?").run(conn.id);
        await db.prepare("DELETE FROM reflection_answers WHERE connection_id = ?").run(conn.id);
    } else {
        const id = generateId();
        await db.prepare("INSERT INTO connections (id, participant_a, participant_b, pair_key, status, stage, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', 'connect', ?, ?)")
            .run(id, r.sender_id, r.recipient_id, r.pair_key, now, now);
        conn = { id };
    }
    let chat = await db.prepare("SELECT id FROM chats WHERE connection_id = ?").get(conn.id);
    if (!chat) {
        chat = { id: generateId() };
        await db.prepare("INSERT INTO chats (id, connection_id, created_at) VALUES (?, ?, ?)").run(chat.id, conn.id, now);
    }
    await notify(r.sender_id, { actorId: r.recipient_id, type: "request_accepted", refId: conn.id });
    await Rec.logEvent(r.recipient_id, r.sender_id, "accept");
    H.ok(res, { connectionId: conn.id, chatId: chat.id });
};

const declineRequest = async (req, res) => {
    const r = await pendingRequest(req, "recipient");
    await getDb().prepare("UPDATE connection_requests SET status = 'declined', updated_at = ? WHERE id = ?").run(nowIso(), r.id);
    H.ok(res, { status: "declined" });
};

const withdrawRequest = async (req, res) => {
    const r = await pendingRequest(req, "sender");
    await getDb().prepare("UPDATE connection_requests SET status = 'withdrawn', updated_at = ? WHERE id = ?").run(nowIso(), r.id);
    H.ok(res, { status: "withdrawn" });
};

// ---------------- Connections ----------------

const connectionItem = async (viewer, conn) => {
    const person = await cardFor(viewer, otherId(conn, viewer.id));
    if (!person) return null;
    const chat = await getDb().prepare("SELECT id, last_message_at FROM chats WHERE connection_id = ?").get(conn.id);
    return {
        id: conn.id,
        person,
        status: conn.status,
        stage: conn.stage,
        stageIndex: J.STAGE_KEYS.indexOf(conn.stage),
        stageTitle: J.STAGES.find((s) => s.key === conn.stage)?.title || "",
        pausedAt: conn.paused_at,
        pausedByMe: conn.paused_by === viewer.id,
        closedAt: conn.closed_at,
        createdAt: conn.created_at,
        chatId: chat?.id || null,
        lastMessageAt: chat?.last_message_at || null
    };
};

const listConnections = async (req, res) => {
    const rows = await getDb().prepare("SELECT * FROM connections WHERE participant_a = ? OR participant_b = ? ORDER BY updated_at DESC").all(req.user.id, req.user.id);
    const blocked = await Access.blockedIdsFor(req.user.id);
    const out = { active: [], paused: [], closed: [] };
    for (const c of rows) {
        if (blocked.has(otherId(c, req.user.id))) continue;
        const item = await connectionItem(req.user, c);
        if (item) (out[c.status] || out.active).push(item);
    }
    H.ok(res, out);
};

const getConnection = async (req, res) => H.ok(res, await connectionItem(req.user, await myConnection(req)));

const pauseConnection = async (req, res) => {
    const conn = await myConnection(req);
    if (conn.status !== "active") throw ApiError.conflict("Only an active connection can be paused");
    await getDb().prepare("UPDATE connections SET status = 'paused', paused_by = ?, paused_at = ?, updated_at = ? WHERE id = ?").run(req.user.id, nowIso(), nowIso(), conn.id);
    await notify(otherId(conn, req.user.id), { actorId: req.user.id, type: "connection_paused", refId: conn.id });
    H.ok(res, { status: "paused" });
};

const resumeConnection = async (req, res) => {
    const conn = await myConnection(req);
    if (conn.status !== "paused") throw ApiError.conflict("This connection is not paused");
    if (conn.paused_by && conn.paused_by !== req.user.id) throw ApiError.forbidden("Only the person who paused can resume. You can send them a message.");
    await getDb().prepare("UPDATE connections SET status = 'active', paused_by = NULL, paused_at = NULL, updated_at = ? WHERE id = ?").run(nowIso(), conn.id);
    await notify(otherId(conn, req.user.id), { actorId: req.user.id, type: "connection_resumed", refId: conn.id });
    H.ok(res, { status: "active" });
};

const closeConnection = async (req, res) => {
    const conn = await myConnection(req);
    if (conn.status === "closed") return H.ok(res, { status: "closed" });
    await getDb().prepare("UPDATE connections SET status = 'closed', closed_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), conn.id);
    H.ok(res, { status: "closed" });
};

// ---------------- Journey ----------------

const completionsFor = async (connId) => {
    const rows = await getDb().prepare("SELECT stage, user_id FROM stage_completions WHERE connection_id = ?").all(connId);
    const map = {};
    for (const r of rows) (map[r.stage] = map[r.stage] || new Set()).add(r.user_id);
    return map;
};

const journeyView = async (viewer, conn) => {
    const partner = otherId(conn, viewer.id);
    const done = await completionsFor(conn.id);
    const currentIdx = J.STAGE_KEYS.indexOf(conn.stage);
    const stages = J.STAGES.map((s, i) => {
        const set = done[s.key] || new Set();
        const both = set.has(viewer.id) && set.has(partner);
        let status = i < currentIdx || both ? "completed" : i === currentIdx ? "current" : "locked";
        return { ...s, index: i, status, myDone: set.has(viewer.id), partnerDone: set.has(partner) };
    });
    const completed = stages.filter((s) => s.status === "completed").length;
    return {
        connection: await connectionItem(viewer, conn),
        stages,
        currentStage: conn.stage,
        progress: { completed, total: J.STAGES.length, percent: Math.round((completed / J.STAGES.length) * 100) }
    };
};

const getJourney = async (req, res) => H.ok(res, await journeyView(req.user, await myConnection(req)));

const getStageContent = async (req, res) => {
    const stage = H.oneOf(req.params.stage, "stage", J.STAGE_KEYS);
    const meta = J.STAGES.find((s) => s.key === stage);
    H.ok(res, { ...meta, index: J.STAGE_KEYS.indexOf(stage), ...J.STAGE_CONTENT[stage] });
};

const answeredCount = async (connId, userId, stage) => (await getDb()
    .prepare("SELECT COUNT(*) AS n FROM reflection_answers WHERE connection_id = ? AND author_id = ? AND stage = ?").get(connId, userId, stage)).n;

const completeStage = async (req, res) => {
    const conn = await myConnection(req);
    const stage = H.oneOf(req.params.stage, "stage", J.STAGE_KEYS);
    if (conn.status !== "active") throw ApiError.conflict("Resume this connection to continue the journey");
    if (stage !== conn.stage) throw ApiError.conflict("You can only complete the current stage");
    const qs = J.questionsFor(stage);
    if (qs.length && (await answeredCount(conn.id, req.user.id, stage)) < qs.length) {
        throw ApiError.badRequest(`Please answer all ${qs.length} questions first`);
    }
    const db = getDb();
    await db.prepare("INSERT INTO stage_completions (connection_id, stage, user_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (connection_id, stage, user_id) DO NOTHING")
        .run(conn.id, stage, req.user.id, nowIso());
    const partner = otherId(conn, req.user.id);
    const done = (await completionsFor(conn.id))[stage] || new Set();
    let advanced = false;
    if (done.has(partner)) {
        const nextIdx = J.STAGE_KEYS.indexOf(stage) + 1;
        if (nextIdx < J.STAGE_KEYS.length) {
            const r = await db.prepare("UPDATE connections SET stage = ?, updated_at = ? WHERE id = ? AND stage = ?").run(J.STAGE_KEYS[nextIdx], nowIso(), conn.id, stage);
            advanced = Boolean(r && r.changes === 1);
        }
        if (advanced) {
            for (const uid of [req.user.id, partner]) await notify(uid, { actorId: null, type: "stage_advanced", refId: conn.id, payload: { stage: J.STAGE_KEYS[nextIdx] } });
        }
    } else {
        await notify(partner, { actorId: req.user.id, type: "stage_completed", refId: conn.id, payload: { stage } });
    }
    const fresh = await db.prepare("SELECT * FROM connections WHERE id = ?").get(conn.id);
    H.ok(res, { advanced, waitingForPartner: !done.has(partner), journey: await journeyView(req.user, fresh) });
};

// ---------------- Reflect ----------------

const reflectStage = (req) => H.oneOf(req.query.stage || req.body?.stage || "reflect", "stage", ["reflect", "reflect_again"]);

const getReflect = async (req, res) => {
    const conn = await myConnection(req);
    const stage = reflectStage(req);
    const partner = otherId(conn, req.user.id);
    const db = getDb();
    const rows = await db.prepare("SELECT * FROM reflection_answers WHERE connection_id = ? AND stage = ?").all(conn.id, stage);
    const done = (await completionsFor(conn.id))[stage] || new Set();
    const mine = {};
    const theirs = {};
    let partnerAnswered = 0;
    for (const r of rows) {
        const answer = { value: H.parseJson(r.value, r.value), otherText: r.other_text, sharing: r.sharing, updatedAt: r.updated_at };
        if (r.author_id === req.user.id) mine[r.question_key] = answer;
        else if (r.author_id === partner) {
            partnerAnswered += 1;
            // A partner's answer is visible only once they finished the stage and chose to share it.
            theirs[r.question_key] = done.has(partner) && r.sharing === "share" ? { value: answer.value, otherText: answer.otherText, shared: true } : { shared: false };
        }
    }
    const partnerUser = await Users.findById(partner);
    H.ok(res, {
        stage,
        questions: J.questionsFor(stage),
        answers: mine,
        partner: { id: partner, name: Users.firstName(partnerUser), answered: partnerAnswered, completed: done.has(partner), answers: theirs },
        completed: done.has(req.user.id),
        total: J.questionsFor(stage).length
    });
};

const saveAnswer = async (req, res) => {
    const conn = await myConnection(req);
    const stage = reflectStage(req);
    if (conn.status !== "active") throw ApiError.conflict("Resume this connection to continue");
    const stageIdx = J.STAGE_KEYS.indexOf(stage);
    if (J.STAGE_KEYS.indexOf(conn.stage) < stageIdx) throw ApiError.conflict("This stage is not open yet");
    const q = J.questionsFor(stage).find((x) => x.key === req.params.questionKey);
    if (!q) throw ApiError.notFound("Question not found");
    let value;
    try {
        value = J.validateAnswer(q, req.body?.value, req.body?.otherText);
    } catch (e) {
        throw ApiError.badRequest(e.message);
    }
    const sharing = H.oneOf(req.body?.sharing || "keep_private", "sharing", J.SHARING);
    const otherText = H.str(req.body?.otherText, "otherText", { max: 200, optional: true }) || "";
    await getDb().prepare(`INSERT INTO reflection_answers (connection_id, author_id, question_key, stage, value, other_text, sharing, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (connection_id, author_id, stage, question_key) DO UPDATE SET value = excluded.value, other_text = excluded.other_text, sharing = excluded.sharing, updated_at = excluded.updated_at`)
        .run(conn.id, req.user.id, q.key, stage, JSON.stringify(value), otherText, sharing, nowIso());
    H.ok(res, { saved: true, answered: await answeredCount(conn.id, req.user.id, stage), total: J.questionsFor(stage).length });
};

/** Bulk-update sharing choices (used for answers marked "Share later"). */
const updateSharing = async (req, res) => {
    const conn = await myConnection(req);
    const stage = reflectStage(req);
    const choices = H.plainObject(req.body?.sharing, "sharing");
    const keys = new Set(J.questionsFor(stage).map((q) => q.key));
    for (const [key, sharing] of Object.entries(choices)) {
        if (!keys.has(key)) continue;
        H.oneOf(sharing, "sharing", J.SHARING);
        await getDb().prepare("UPDATE reflection_answers SET sharing = ?, updated_at = ? WHERE connection_id = ? AND author_id = ? AND stage = ? AND question_key = ?")
            .run(sharing, nowIso(), conn.id, req.user.id, stage, key);
    }
    const partner = otherId(conn, req.user.id);
    if (Object.values(choices).includes("share")) await notify(partner, { actorId: req.user.id, type: "reflection_shared", refId: conn.id, payload: { stage } });
    H.ok(res, { updated: true });
};

module.exports = {
    listRequests, sendRequest, acceptRequest, declineRequest, withdrawRequest,
    listConnections, getConnection, pauseConnection, resumeConnection, closeConnection,
    getJourney, getStageContent, completeStage, getReflect, saveAnswer, updateSharing,
    myConnection, otherId, cardFor, journeyView
};
