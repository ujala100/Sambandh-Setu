const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const { start, member, PW, NEW_PW, WRONG_PW } = require("./helpers");

let api;
before(async () => { api = await start(); });
after(async () => { await api.stop(); });

// ---------------- Auth ----------------

test("sign-up validates input and never returns a code", async () => {
    const weak = await api.call("POST", "/auth/signup", { body: { fullName: "A B", email: "weak@example.com", password: "a".repeat(12), acceptTerms: true } });
    assert.equal(weak.status, 400);
    const noTerms = await api.call("POST", "/auth/signup", { body: { fullName: "A B", email: "terms@example.com", password: PW } });
    assert.equal(noTerms.status, 400);
    const ok = await api.call("POST", "/auth/signup", { body: { fullName: "Asha Rao", email: "Asha@Example.com", password: PW, acceptTerms: true, phone: "98765 43210" } });
    assert.equal(ok.status, 201);
    assert.ok(ok.data.token);
    assert.equal(ok.data.user.email, "asha@example.com");
    assert.equal(ok.data.user.phoneVerified, false);
    assert.equal(JSON.stringify(ok.body).match(/"code"\s*:\s*"\d{6}"/), null);
    const dup = await api.call("POST", "/auth/signup", { body: { fullName: "Asha Two", email: "asha@example.com", password: PW, acceptTerms: true } });
    assert.equal(dup.status, 409);
});

test("audit #1: OTP endpoints cannot be used to take over an account", async () => {
    const victim = await member(api.call, { email: "victim@example.com" });
    // The old isPhone trick: the code was returned in the response. Email is not configured in tests,
    // so code login is refused outright and nothing is leaked.
    const req1 = await api.call("POST", "/auth/login/code", { body: { email: "victim@example.com", isPhone: true } });
    assert.equal(req1.status, 503);
    assert.equal(req1.body.data?.code, undefined);
    const verify = await api.call("POST", "/auth/login/verify", { body: { email: "victim@example.com", code: "123456", password: NEW_PW } });
    assert.notEqual(verify.status, 200);
    const login = await api.call("POST", "/auth/login", { body: { identifier: "victim@example.com", password: PW } });
    assert.equal(login.status, 200, "victim's password must be unchanged");
    const forgot = await api.call("POST", "/auth/forgot-password", { body: { email: "victim@example.com" } });
    assert.equal(forgot.status, 503);
    assert.ok(victim.token);
});

test("login works with email and rejects wrong passwords with one generic message", async () => {
    await member(api.call, { email: "login@example.com" });
    const bad = await api.call("POST", "/auth/login", { body: { identifier: "login@example.com", password: WRONG_PW } });
    const unknown = await api.call("POST", "/auth/login", { body: { identifier: "nobody@example.com", password: WRONG_PW } });
    assert.equal(bad.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(bad.error.message, unknown.error.message);
});

test("changing the password revokes other sessions", async () => {
    const m = await member(api.call);
    const changed = await api.call("POST", "/auth/change-password", { token: m.token, body: { currentPassword: PW, newPassword: NEW_PW } });
    assert.equal(changed.status, 200);
    const old = await api.call("GET", "/me", { token: m.token });
    assert.equal(old.status, 401);
    const fresh = await api.call("GET", "/me", { token: changed.data.token });
    assert.equal(fresh.status, 200);
});

test("audit #9: under-18 date of birth is refused and age uses month and day", async () => {
    const m = await member(api.call);
    const young = new Date();
    young.setUTCFullYear(young.getUTCFullYear() - 17);
    const r = await api.call("PATCH", "/me/account", { token: m.token, body: { dateOfBirth: young.toISOString().slice(0, 10) } });
    assert.equal(r.status, 400);
    const today = new Date();
    const dob = `${today.getUTCFullYear() - 30}-12-31`;
    const ok = await api.call("PATCH", "/me/account", { token: m.token, body: { dateOfBirth: dob } });
    const expected = today.getUTCMonth() === 11 && today.getUTCDate() === 31 ? 30 : 29;
    assert.equal(ok.data.user.profile.age, expected);
});

// ---------------- Discover & privacy ----------------

test("audit #6: Discover and profiles hide private fields, blocked and paused people", async () => {
    const viewer = await member(api.call, { name: "Viewer One" });
    const target = await member(api.call, { name: "Target Person", settings: { privacy: { whoCanSeeProfile: "everyone" } } });
    await api.call("PATCH", "/me/profile", { token: target.token, body: { family: { religion: "Hindu", caste: "Example", father: "Businessman" } } });

    const list = await api.call("GET", "/discover", { token: viewer.token });
    const card = list.data.items.find((p) => p.id === target.id);
    assert.ok(card, "target should be discoverable");
    assert.equal(card.name, "Target");
    assert.equal(card.email, undefined);
    assert.equal(card.family, undefined);

    const profile = await api.call("GET", `/people/${target.id}`, { token: viewer.token });
    assert.equal(profile.status, 200);
    assert.equal(profile.data.family, null, "family details are private by default");
    assert.equal(profile.data.contact, null);

    await api.call("PATCH", "/me/settings", { token: target.token, body: { discovery: { hideProfile: true, hideDuration: "7d" } } });
    const hidden = await api.call("GET", "/discover", { token: viewer.token });
    assert.equal(hidden.data.items.some((p) => p.id === target.id), false);
    await api.call("PATCH", "/me/settings", { token: target.token, body: { discovery: { hideProfile: false } } });

    await api.call("POST", "/blocks", { token: target.token, body: { userId: viewer.id } });
    const afterBlock = await api.call("GET", "/discover", { token: viewer.token });
    assert.equal(afterBlock.data.items.some((p) => p.id === target.id), false);
    const blockedProfile = await api.call("GET", `/people/${target.id}`, { token: viewer.token });
    assert.equal(blockedProfile.status, 404);
});

test("settings reject unknown keys and wrong values", async () => {
    const m = await member(api.call);
    assert.equal((await api.call("PATCH", "/me/settings", { token: m.token, body: { privacy: { whoCanSeeProfile: "aliens" } } })).status, 400);
    assert.equal((await api.call("PATCH", "/me/settings", { token: m.token, body: { hacker: true } })).status, 400);
    const ok = await api.call("PATCH", "/me/settings", { token: m.token, body: { notifications: { frequency: "weekly" } } });
    assert.equal(ok.data.settings.notifications.frequency, "weekly");
    assert.equal(ok.data.settings.notifications.push, true, "other settings keep their values");
});

// ---------------- Requests, journey, chat ----------------

const connectPair = async () => {
    const a = await member(api.call, { name: "Aanya Sharma", settings: { privacy: { whoCanSeeProfile: "everyone" } } });
    const b = await member(api.call, { name: "Rohan Verma", gender: "Man", settings: { privacy: { whoCanSeeProfile: "everyone" } } });
    const sent = await api.call("POST", "/requests", { token: a.token, body: { recipientId: b.id, message: "Hello!" } });
    assert.equal(sent.status, 201);
    const dup = await api.call("POST", "/requests", { token: a.token, body: { recipientId: b.id } });
    assert.equal(dup.status, 409);
    const reqs = await api.call("GET", "/requests", { token: b.token });
    assert.equal(reqs.data.received.length, 1);
    const accepted = await api.call("POST", `/requests/${sent.data.id}/accept`, { token: b.token });
    assert.equal(accepted.status, 200);
    return { a, b, connectionId: accepted.data.connectionId, chatId: accepted.data.chatId };
};

test("audit #12: a stage advances only when both people complete it", async () => {
    const { a, b, connectionId } = await connectPair();
    const one = await api.call("POST", `/connections/${connectionId}/stages/connect/complete`, { token: a.token });
    assert.equal(one.data.advanced, false);
    assert.equal(one.data.journey.currentStage, "connect");
    const skip = await api.call("POST", `/connections/${connectionId}/stages/understand/complete`, { token: a.token });
    assert.equal(skip.status, 409, "cannot jump ahead alone");
    const two = await api.call("POST", `/connections/${connectionId}/stages/connect/complete`, { token: b.token });
    assert.equal(two.data.advanced, true);
    assert.equal(two.data.journey.currentStage, "understand");
});

test("Reflect answers stay private unless shared, and need all questions", async () => {
    const { a, b, connectionId } = await connectPair();
    for (const stage of ["connect", "understand"]) {
        await api.call("POST", `/connections/${connectionId}/stages/${stage}/complete`, { token: a.token });
        await api.call("POST", `/connections/${connectionId}/stages/${stage}/complete`, { token: b.token });
    }
    const early = await api.call("POST", `/connections/${connectionId}/stages/reflect/complete`, { token: a.token });
    assert.equal(early.status, 400);
    const r = await api.call("GET", `/connections/${connectionId}/reflect`, { token: a.token });
    assert.equal(r.data.questions.length, 10);
    const sample = { single: (q) => q.options[0], multi: (q) => [q.options[0]], scale: () => 4, text: () => "Honesty and kindness." };
    for (const [i, q] of r.data.questions.entries()) {
        const res = await api.call("PUT", `/connections/${connectionId}/reflect/answers/${q.key}`, { token: a.token, body: { value: sample[q.type](q), sharing: i === 0 ? "share" : "keep_private" } });
        assert.equal(res.status, 200, JSON.stringify(res.body));
    }
    const bad = await api.call("PUT", `/connections/${connectionId}/reflect/answers/q3_career_importance`, { token: a.token, body: { value: 9 } });
    assert.equal(bad.status, 400);
    assert.equal((await api.call("POST", `/connections/${connectionId}/stages/reflect/complete`, { token: a.token })).status, 200);
    const seen = await api.call("GET", `/connections/${connectionId}/reflect`, { token: b.token });
    const theirs = seen.data.partner.answers;
    assert.equal(theirs.q1_marriage_priorities.shared, true);
    assert.deepEqual(theirs.q1_marriage_priorities.value, [r.data.questions[0].options[0]]);
    assert.equal(theirs.q2_where_to_live.shared, false);
    assert.equal(theirs.q2_where_to_live.value, undefined);
});

test("audit #11: chat history is in time order and blocked people cannot message", async () => {
    const { a, b, chatId } = await connectPair();
    for (const text of ["one", "two", "three"]) await api.call("POST", `/chats/${chatId}/messages`, { token: a.token, body: { text } });
    await api.call("POST", `/chats/${chatId}/messages`, { token: b.token, body: { text: "four" } });
    const msgs = await api.call("GET", `/chats/${chatId}/messages`, { token: b.token });
    assert.deepEqual(msgs.data.items.map((m) => m.text), ["one", "two", "three", "four"]);
    const list = await api.call("GET", "/chats", { token: b.token });
    assert.equal(list.data.items[0].unread, 3);
    await api.call("POST", "/blocks", { token: b.token, body: { userId: a.id } });
    const blocked = await api.call("POST", `/chats/${chatId}/messages`, { token: a.token, body: { text: "hello?" } });
    assert.equal(blocked.status, 404);
});

test("people outside a connection cannot read its chat or journey", async () => {
    const { chatId, connectionId } = await connectPair();
    const stranger = await member(api.call);
    assert.equal((await api.call("GET", `/chats/${chatId}/messages`, { token: stranger.token })).status, 404);
    assert.equal((await api.call("GET", `/connections/${connectionId}/journey`, { token: stranger.token })).status, 404);
    assert.equal((await api.call("GET", `/connections/${connectionId}/reflect`, { token: stranger.token })).status, 404);
});

// ---------------- Family, verification, reports, guide ----------------

test("family invitations: link works, permissions apply, removal revokes", async () => {
    const m = await member(api.call);
    const inv = await api.call("POST", "/family/invites", { token: m.token, body: { method: "link", relationship: "Mother", permissions: { partnerPreferences: false } } });
    assert.equal(inv.status, 201);
    const token = inv.data.link.split("/family/invite/")[1];
    const preview = await api.call("GET", `/family/invitations/${token}`);
    assert.equal(preview.data.status, "pending");
    assert.equal(preview.data.profile, undefined, "nothing is shown before acceptance");
    const accepted = await api.call("POST", `/family/invitations/${token}/accept`);
    assert.equal(accepted.data.status, "active");
    assert.ok(accepted.data.profile);
    assert.equal(accepted.data.partnerPreferences, undefined);
    await api.call("DELETE", `/family/${inv.data.member.id}`, { token: m.token });
    assert.equal((await api.call("GET", `/family/invitations/${token}`)).status, 404);
});

test("verification stays in review until a person decides", async () => {
    const m = await member(api.call);
    const png = "data:image/png;base64," + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString("base64");
    const sub = await api.call("POST", "/verification", { token: m.token, body: { type: "identity", docType: "Aadhaar Card", images: [png], details: { fullName: "Member", idLast4: "1234" } } });
    assert.equal(sub.status, 201);
    assert.equal(sub.data.status, "in_review");
    const again = await api.call("POST", "/verification", { token: m.token, body: { type: "identity", docType: "Passport", images: [png] } });
    assert.equal(again.status, 409);
    const fake = await api.call("POST", "/verification", { token: m.token, body: { type: "professional", docType: "Salary slip", images: ["data:image/png;base64,AAAA"] } });
    assert.equal(fake.status, 400);
    assert.equal((await api.call("GET", "/admin/overview")).status, 404, "the team console is hidden from the public");
});

test("audit #10: deleting an account really deletes it", async () => {
    const m = await member(api.call, { email: "leaving@example.com" });
    const wrong = await api.call("DELETE", "/me", { token: m.token, body: { password: WRONG_PW, confirm: "DELETE" } });
    assert.equal(wrong.status, 400);
    const ok = await api.call("DELETE", "/me", { token: m.token, body: { password: PW, confirm: "DELETE" } });
    assert.equal(ok.status, 200);
    assert.equal((await api.call("GET", "/me", { token: m.token })).status, 401);
    assert.equal((await api.call("POST", "/auth/login", { body: { identifier: "leaving@example.com", password: PW } })).status, 401);
    const again = await api.call("POST", "/auth/signup", { body: { fullName: "New Me", email: "leaving@example.com", password: PW, acceptTerms: true } });
    assert.equal(again.status, 201);
});

test("data export contains the member's own data", async () => {
    const m = await member(api.call);
    const r = await api.call("GET", "/me/export", { token: m.token });
    assert.equal(r.status, 200);
    assert.equal(r.data.account.email, m.email);
    assert.ok(r.data.settings.privacy);
});

test("Setu Guide answers, applies safety rules with Indian helplines, and history can be cleared", async () => {
    const { a, connectionId } = await connectPair();
    const ideas = await api.call("POST", "/guide/chat", { token: a.token, body: { message: "Can you suggest questions about his lifestyle and daily routine?", connectionId } });
    assert.equal(ideas.status, 200);
    assert.equal(ideas.data.intent, "conversation_ideas");
    assert.ok(ideas.data.questions.length >= 3);
    const predict = await api.call("POST", "/guide/chat", { token: a.token, body: { message: "Are we compatible? Will we get married?" } });
    assert.match(predict.data.reply, /can't predict/);
    const crisis = await api.call("POST", "/guide/chat", { token: a.token, body: { message: "I want to end my life" } });
    assert.match(crisis.data.reply, /14416/);
    const hist = await api.call("GET", "/guide/conversations", { token: a.token });
    assert.ok(hist.data.items.length >= 1);
    await api.call("DELETE", "/guide/conversations", { token: a.token });
    assert.equal((await api.call("GET", "/guide/conversations", { token: a.token })).data.items.length, 0);
    await api.call("PATCH", "/me/settings", { token: a.token, body: { guide: { enabled: false } } });
    assert.equal((await api.call("POST", "/guide/chat", { token: a.token, body: { intent: "next_steps" } })).status, 403);
});

test("reports are accepted with a known reason only", async () => {
    const a = await member(api.call);
    const b = await member(api.call);
    assert.equal((await api.call("POST", "/reports", { token: a.token, body: { userId: b.id, reason: "Made up" } })).status, 400);
    const ok = await api.call("POST", "/reports", { token: a.token, body: { userId: b.id, reason: "Fake or misleading profile", details: "Photos look copied." } });
    assert.equal(ok.status, 201);
    const ticket = await api.call("POST", "/support/tickets", { token: a.token, body: { kind: "support", category: "Account & Login", message: "I cannot change my email address." } });
    assert.equal(ticket.status, 201);
    assert.match(ticket.data.reference, /^SS-/);
});
