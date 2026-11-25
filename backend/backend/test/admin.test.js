const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { before, after, test } = require("node:test");
const { start, member, PW } = require("./helpers");

const KEY = crypto.randomBytes(24).toString("hex");
let api;
before(async () => {
    process.env.ADMIN_API_KEY = KEY;
    api = await start();
});
after(async () => { await api.stop(); });

const png = "data:image/png;base64," + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString("base64");
// Claims are rate limited (they guard the master key), so the tests share one super admin.
let boss = null;
const superAdmin = async () => {
    if (boss) return boss;
    const m = await member(api.call);
    const r = await api.call("POST", "/admin/claim", { token: m.token, body: { key: KEY } });
    assert.equal(r.status, 200);
    boss = m;
    return m;
};

test("the console is invisible to members; the setup key makes a super admin", async () => {
    const m = await member(api.call);
    assert.equal((await api.call("GET", "/admin/overview", { token: m.token })).status, 404);
    assert.equal((await api.call("GET", "/admin/me", { token: m.token })).status, 404);
    assert.equal((await api.call("POST", "/admin/claim", { token: m.token, body: { key: "wrong-key-wrong-key-wrong-key-wrong-key" } })).status, 403);
    assert.equal((await api.call("POST", "/admin/claim", { token: m.token, body: { key: KEY } })).status, 200);
    assert.equal((await api.call("GET", "/me", { token: m.token })).data.user.role, "super_admin");
    const who = await api.call("GET", "/admin/me", { token: m.token });
    assert.ok(who.data.permissions.includes("roles.manage"));
    assert.ok((await api.call("GET", "/admin/overview", { token: m.token })).data.members.total >= 1);
});

test("RBAC: built-in roles, custom roles, no escalation, last super admin protected", async () => {
    const boss = await superAdmin();
    const roles = await api.call("GET", "/admin/roles", { token: boss.token });
    for (const k of ["member", "support", "verifier", "moderator", "analyst", "admin", "super_admin"]) assert.ok(roles.data.roles.some((r) => r.key === k), k);
    const created = await api.call("POST", "/admin/roles", { token: boss.token, body: { key: "safety_lead", name: "Safety lead", permissions: ["reports.review", "members.view", "members.roles"] } });
    assert.equal(created.status, 201);
    assert.equal((await api.call("POST", "/admin/roles", { token: boss.token, body: { key: "bad", name: "Bad", permissions: ["everything"] } })).status, 400);
    assert.equal((await api.call("PATCH", "/admin/roles/super_admin", { token: boss.token, body: { permissions: [] } })).status, 400);

    const lead = await member(api.call);
    assert.equal((await api.call("POST", `/admin/members/${lead.id}/role`, { token: boss.token, body: { role: "safety_lead" } })).status, 200);
    assert.equal((await api.call("GET", "/admin/reports", { token: lead.token })).status, 200);
    assert.equal((await api.call("GET", "/admin/verifications", { token: lead.token })).status, 403, "not in this role");
    const other = await member(api.call);
    assert.equal((await api.call("POST", `/admin/members/${other.id}/role`, { token: lead.token, body: { role: "admin" } })).status, 403, "cannot grant more than you hold");
    assert.equal((await api.call("POST", `/admin/members/${other.id}/role`, { token: lead.token, body: { role: "safety_lead" } })).status, 200, "can grant a role you fully hold");
    assert.equal((await api.call("POST", `/admin/members/${boss.id}/role`, { token: boss.token, body: { role: "member" } })).status, 400, "not your own role");
    assert.equal((await api.call("POST", `/admin/members/${boss.id}/suspend`, { token: lead.token })).status, 403);

    assert.equal((await api.call("DELETE", "/admin/roles/safety_lead", { token: boss.token })).status, 200);
    assert.equal((await api.call("GET", "/me", { token: lead.token })).data.user.role, "member", "holders fall back to member");
    assert.equal((await api.call("GET", "/admin/reports", { token: lead.token })).status, 404);
});

test("moderators review verifications; the member is notified; audit records it", async () => {
    const boss = await superAdmin();
    const mod = await member(api.call);
    await api.call("POST", `/admin/members/${mod.id}/role`, { token: boss.token, body: { role: "moderator" } });
    const m = await member(api.call);
    const sub = await api.call("POST", "/verification", { token: m.token, body: { type: "identity", docType: "Passport", images: [png], details: { fullName: "Member" } } });
    const item = (await api.call("GET", "/admin/verifications", { token: mod.token })).data.items.find((v) => v.id === sub.data.id);
    assert.ok(item);
    assert.equal((await api.call("GET", `/admin/verifications/${item.id}/docs`, { token: mod.token })).data.docs.length, 1);
    assert.equal((await api.call("POST", `/admin/verifications/${item.id}/decision`, { token: mod.token, body: { status: "needs_action" } })).status, 400);
    assert.equal((await api.call("POST", `/admin/verifications/${item.id}/decision`, { token: mod.token, body: { status: "verified" } })).status, 200);
    assert.equal((await api.call("GET", "/verification", { token: m.token })).data.identity.status, "verified");
    assert.ok((await api.call("GET", "/notifications", { token: m.token })).data.items.some((n) => n.type === "verification_update"));
    assert.equal((await api.call("GET", "/admin/audit", { token: mod.token })).status, 403);
    const log = (await api.call("GET", "/admin/audit", { token: boss.token })).data.items;
    assert.ok(log.some((e) => e.action === "verification_verified"));
    const roleChange = log.find((e) => e.action === "set_role" && e.refId === mod.id);
    assert.ok(roleChange && roleChange.target && roleChange.actor !== "Admin key", "the log names who acted and on whom");
});

test("closing a report can suspend the member; suspension blocks sign-in until reactivated", async () => {
    const boss = await superAdmin();
    const reporter = await member(api.call);
    const bad = await member(api.call, { email: "reported@example.com" });
    const rep = await api.call("POST", "/reports", { token: reporter.token, body: { userId: bad.id, reason: "Scam or suspicious activity", details: "Asked for money." } });
    assert.ok((await api.call("GET", "/admin/reports", { token: boss.token })).data.items.some((r) => r.id === rep.data.id && r.reported.id === bad.id));
    assert.equal((await api.call("POST", `/admin/reports/${rep.data.id}/close`, { token: boss.token, body: { action: "suspend", note: "Confirmed scam" } })).status, 200);
    assert.equal((await api.call("GET", "/me", { token: bad.token })).status, 401);
    const login = await api.call("POST", "/auth/login", { body: { identifier: "reported@example.com", password: PW } });
    assert.equal(login.status, 403);
    assert.equal(login.error.code, "ACCOUNT_SUSPENDED");
    assert.ok((await api.call("GET", "/notifications", { token: reporter.token })).data.items.some((n) => n.type === "report_reviewed"));
    assert.equal((await api.call("POST", `/admin/members/${bad.id}/reactivate`, { token: boss.token })).status, 200);
    assert.equal((await api.call("POST", "/auth/login", { body: { identifier: "reported@example.com", password: PW } })).status, 200);
});

test("support replies reach the member; member search escapes wildcards; chats are never exposed", async () => {
    const boss = await superAdmin();
    const m = await member(api.call, { email: "needs.help@example.com", name: "Needs Help" });
    const t = await api.call("POST", "/support/tickets", { token: m.token, body: { kind: "support", category: "Account & Login", message: "I cannot change my email address." } });
    assert.equal((await api.call("POST", `/admin/tickets/${t.data.id}/close`, { token: boss.token, body: { reply: "Email change is now available." } })).status, 200);
    const reply = (await api.call("GET", "/notifications", { token: m.token })).data.items.find((n) => n.type === "support_reply");
    assert.ok(reply && reply.body.includes("Email change"));
    const found = await api.call("GET", "/admin/members?q=needs.help", { token: boss.token });
    assert.equal(found.data.items.length, 1);
    assert.equal((await api.call("GET", "/admin/members?q=%25", { token: boss.token })).data.items.length, 0, "% is a literal, not a wildcard");
    const detail = await api.call("GET", `/admin/members/${m.id}`, { token: boss.token });
    assert.equal(detail.data.messages, undefined);
});

test("live features: switching chat off is enforced at once; rollout and roles target members; maintenance blocks writes", async () => {
    const boss = await superAdmin();
    const a = await member(api.call, { settings: { privacy: { whoCanSeeProfile: "everyone" } } });
    const b = await member(api.call, { gender: "Man", settings: { privacy: { whoCanSeeProfile: "everyone" } } });
    const sent = await api.call("POST", "/requests", { token: a.token, body: { recipientId: b.id } });
    const acc = await api.call("POST", `/requests/${sent.data.id}/accept`, { token: b.token });

    assert.equal((await api.call("PATCH", "/admin/features/chat", { token: boss.token, body: { enabled: false } })).status, 200);
    const off = await api.call("POST", `/chats/${acc.data.chatId}/messages`, { token: a.token, body: { text: "hi" } });
    assert.equal(off.status, 403);
    assert.equal(off.error.code, "FEATURE_OFF");
    assert.equal((await api.call("GET", "/features", { token: a.token })).data.features.chat, false);

    await api.call("PATCH", "/admin/features/chat", { token: boss.token, body: { enabled: true, roles: ["super_admin"] } });
    assert.equal((await api.call("GET", "/features", { token: a.token })).data.features.chat, false, "only targeted roles");
    assert.equal((await api.call("GET", "/features", { token: boss.token })).data.features.chat, true);
    await api.call("PATCH", "/admin/features/chat", { token: boss.token, body: { roles: [], rollout: 0 } });
    assert.equal((await api.call("GET", "/features", { token: a.token })).data.features.chat, false, "0% rollout");
    await api.call("PATCH", "/admin/features/chat", { token: boss.token, body: { rollout: 100 } });
    assert.equal((await api.call("POST", `/chats/${acc.data.chatId}/messages`, { token: a.token, body: { text: "hi" } })).status, 201);

    await api.call("PATCH", "/admin/features/announcement", { token: boss.token, body: { enabled: true, config: { text: "New: Family Access", tone: "info" } } });
    assert.equal((await api.call("GET", "/features")).data.announcement.text, "New: Family Access");

    await api.call("PATCH", "/admin/features/maintenance", { token: boss.token, body: { enabled: true } });
    const blocked = await api.call("PATCH", "/me/profile", { token: a.token, body: { bio: "Trying to change during maintenance." } });
    assert.equal(blocked.status, 503);
    assert.equal(blocked.error.code, "MAINTENANCE");
    assert.equal((await api.call("GET", "/me", { token: a.token })).status, 200, "reading still works");
    assert.equal((await api.call("PATCH", "/me/profile", { token: boss.token, body: { bio: "Staff can still work during maintenance." } })).status, 200);
    await api.call("PATCH", "/admin/features/maintenance", { token: boss.token, body: { enabled: false } });

    await api.call("PATCH", "/admin/features/signups", { token: boss.token, body: { enabled: false } });
    assert.equal((await api.call("POST", "/auth/signup", { body: { fullName: "Late Comer", email: "late@example.com", password: PW, acceptTerms: true } })).status, 403);
    await api.call("PATCH", "/admin/features/signups", { token: boss.token, body: { enabled: true } });
    assert.equal((await api.call("PATCH", "/admin/features/nope", { token: boss.token, body: { enabled: true } })).status, 404);
});

test("realtime: the snapshot changes with new messages and the stream pushes it", async () => {
    const a = await member(api.call, { settings: { privacy: { whoCanSeeProfile: "everyone" } } });
    const b = await member(api.call, { gender: "Man", settings: { privacy: { whoCanSeeProfile: "everyone" } } });
    const sent = await api.call("POST", "/requests", { token: a.token, body: { recipientId: b.id } });
    const before1 = await api.call("GET", "/realtime/poll", { token: b.token });
    assert.equal(before1.data.requests.pending, 1);
    const acc = await api.call("POST", `/requests/${sent.data.id}/accept`, { token: b.token });
    await api.call("POST", `/chats/${acc.data.chatId}/messages`, { token: a.token, body: { text: "Hello" } });
    const after1 = await api.call("GET", "/realtime/poll", { token: b.token });
    assert.equal(after1.data.messages.unread, 1);

    process.env.REALTIME_STREAM_MS = "1500";
    const ctrl = new AbortController();
    const res = await fetch(`${api.base}/realtime/stream`, { headers: { authorization: `Bearer ${b.token}` }, signal: ctrl.signal });
    assert.equal(res.headers.get("content-type").startsWith("text/event-stream"), true);
    const reader = res.body.getReader();
    let text = "";
    while (!text.includes("event: update")) {
        const { value, done } = await reader.read();
        if (done) break;
        text += Buffer.from(value).toString();
    }
    ctrl.abort();
    assert.match(text, /"unread":1/);
});

test("recommendations: reciprocal fit ranks first, reasons are given, skips and impressions are learned", async () => {
    const boss = await superAdmin();
    const viewer = await member(api.call, { name: "Viewer Person", settings: { privacy: { whoCanSeeProfile: "everyone" } } });
    await api.call("PATCH", "/me/profile", { token: viewer.token, body: { values: ["Honesty", "Family Values"], interests: ["Travel", "Music"], intent: "marriage", preferences: { basic: { ageMin: 25, ageMax: 32 } } } });
    const good = await member(api.call, { name: "Good Fit", gender: "Man", dob: "1995-01-01", settings: { privacy: { whoCanSeeProfile: "everyone" } } });
    await api.call("PATCH", "/me/profile", { token: good.token, body: { profession: "Cartographer", values: ["Honesty", "Family Values"], interests: ["Travel", "Music"], intent: "marriage", preferences: { basic: { ageMin: 24, ageMax: 32 } } } });
    // Visible to everyone (otherwise their own preferences would hide them from this viewer).
    const poor = await member(api.call, { name: "Poor Fit", gender: "Man", dob: "1980-01-01", settings: { privacy: { whoCanSeeProfile: "everyone" }, discovery: { peopleWhoCanFindMe: "everyone" } } });
    await api.call("PATCH", "/me/profile", { token: poor.token, body: { profession: "Cartographer", values: ["Adventure"], interests: ["Gaming"], intent: "friendship", preferences: { basic: { ageMin: 40, ageMax: 50 } } } });

    const list = await api.call("GET", "/discover?q=Cartographer", { token: viewer.token });
    const ids = list.data.items.map((p) => p.id);
    assert.ok(ids.indexOf(good.id) >= 0 && ids.indexOf(poor.id) >= 0);
    assert.ok(ids.indexOf(good.id) < ids.indexOf(poor.id), "the reciprocal fit is ranked higher");
    const goodCard = list.data.items.find((p) => p.id === good.id);
    assert.ok(goodCard.reasons.some((r) => /value/i.test(r)), JSON.stringify(goodCard.reasons));
    assert.equal(goodCard.score, undefined, "no score is shown to members");

    await api.call("POST", `/people/${poor.id}/skip`, { token: viewer.token });
    assert.equal((await api.call("GET", "/discover?q=Cartographer", { token: viewer.token })).data.items.some((p) => p.id === poor.id), false);

    const tuned = await api.call("PATCH", "/admin/recommendations", { token: boss.token, body: { weights: { location: 0.3 }, tuning: { diversity: 0.4 } } });
    assert.equal(tuned.data.weights.location, 0.3);
    assert.equal((await api.call("PATCH", "/admin/recommendations", { token: boss.token, body: { weights: { location: 3 } } })).status, 400);
    const rec = await api.call("GET", "/admin/recommendations", { token: boss.token });
    assert.ok(rec.data.metrics.counts.impressions >= 2);
    assert.ok(rec.data.metrics.counts.skips >= 1);
    const an = await api.call("GET", "/admin/analytics?days=7", { token: boss.token });
    assert.equal(an.data.rows.length, 7);
});

test("the admin key works for scripts", async () => {
    const res = await fetch(`${api.base}/admin/overview`, { headers: { "x-admin-key": KEY } });
    assert.equal(res.status, 200);
});
