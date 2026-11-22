/**
 * Test helpers: an in-memory SQLite database and a real HTTP server on a random port.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-test-secret-test-secret-1234";
process.env.OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || "test-otp-secret-test-otp-secret-123456";
process.env.RATE_LIMIT_AUTH_IP_MAX = "1000";
process.env.RATE_LIMIT_GLOBAL_MAX = "100000";
delete process.env.DATABASE_URL;
delete process.env.GUIDE_SERVICE_URL;

const { initDb, resetDb, closeDb } = require("../db");
const app = require("../app");

const start = async () => {
    initDb(":memory:");
    await resetDb();
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const call = async (method, path, { token, body } = {}) => {
        const res = await fetch(base + path, {
            method,
            headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const json = await res.json().catch(() => ({}));
        return { status: res.status, body: json, data: json.data, error: json.error };
    };
    const stop = async () => {
        await new Promise((resolve) => server.close(resolve));
        await closeDb();
    };
    return { call, stop, base };
};

let counter = 0;
/** Creates a member who has finished onboarding. */
const member = async (call, overrides = {}) => {
    counter += 1;
    const email = overrides.email || `member${counter}@example.com`;
    const signup = await call("POST", "/auth/signup", { body: { fullName: overrides.name || `Member ${counter}`, email, password: "Setu@2026!", acceptTerms: true } });
    if (signup.status !== 201) throw new Error(`signup failed: ${JSON.stringify(signup.body)}`);
    const token = signup.data.token;
    await call("PATCH", "/me/account", { token, body: { dateOfBirth: overrides.dob || "1997-05-10", gender: overrides.gender || "Woman", location: "Hyderabad, Telangana" } });
    await call("PATCH", "/me/profile", { token, body: { interests: ["Travel", "Books", "Music"], values: ["Honesty", "Respect"], profession: "Engineer", education: "B.Tech", bio: "I value meaningful conversations and kindness." } });
    if (overrides.settings) await call("PATCH", "/me/settings", { token, body: overrides.settings });
    await call("POST", "/me/onboarding/complete", { token });
    return { token, id: signup.data.user.id, email };
};

module.exports = { start, member };
