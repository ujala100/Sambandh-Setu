/**
 * Sign-up, sign-in and password recovery.
 *
 * Fixes from the audit (docs/SECURITY.md):
 *  - a code is never returned to the client, whatever the client claims about itself;
 *  - verifying a code never changes an existing account's password;
 *  - phone numbers are stored as unverified until an SMS provider is configured;
 *  - password resets and "log out everywhere" revoke older sessions (token_version).
 */
const Users = require("../models/users");
const Settings = require("../models/settings");
const { issueOtp, consumeOtp } = require("../services/otpService");
const { isEmailConfigured } = require("../services/mailer");
const { createToken } = require("../middleware/requireAuth");
const { meView } = require("../services/views");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const session = async (user) => {
    const profile = Users.expandProfile(await Users.getProfile(user.id));
    const settings = await Settings.getSettings(user.id);
    return { token: createToken(user), user: meView(user, profile, settings) };
};

const config = (req, res) => H.ok(res, {
    emailCodes: isEmailConfigured(),
    smsCodes: false,
    googleSignIn: Boolean(process.env.GOOGLE_CLIENT_ID),
    passwordRules: H.PASSWORD_RULES
});

const signup = async (req, res) => {
    const displayName = H.str(req.body?.fullName, "fullName", { max: 80, min: 2 });
    const email = H.email(req.body?.email);
    const password = H.password(req.body?.password);
    const phone = req.body?.phone ? H.indianPhone(req.body.phone) : null;
    if (req.body?.acceptTerms !== true) throw ApiError.badRequest("Please accept the Terms of Service and Privacy Policy", [{ field: "acceptTerms" }]);

    if (await Users.findByEmail(email)) throw ApiError.conflict("An account with this email already exists. Please log in instead.");
    if (phone && await Users.findByPhone(phone)) throw ApiError.conflict("This mobile number is already linked to another account.");

    const user = await Users.createUser({ email, displayName, phone, passwordHash: await Users.hashPassword(password) });

    // Email confirmation: required when email is configured, otherwise the account starts unconfirmed
    // and the Account page offers to confirm it later.
    let verification = { required: false, sent: false };
    if (isEmailConfigured()) {
        verification = { required: true, sent: false };
        try {
            Object.assign(verification, await issueOtp({ subject: user.id, purpose: "signup", target: email }), { sent: true });
        } catch {
            verification.sent = false;
        }
    }
    H.ok(res, { ...(await session(user)), verification }, 201);
};

const verifyEmail = async (req, res) => {
    const user = req.user;
    if (user.email_verified) return H.ok(res, await session(user));
    await consumeOtp({ subject: user.id, purpose: "signup", code: String(req.body?.code || "") });
    const updated = await Users.updateUser(user.id, { email_verified: 1 });
    H.ok(res, await session(updated));
};

const resendEmailCode = async (req, res) => {
    if (req.user.email_verified) throw ApiError.badRequest("Your email is already confirmed");
    H.ok(res, await issueOtp({ subject: req.user.id, purpose: "signup", target: req.user.email }));
};

const login = async (req, res) => {
    const identifier = H.str(req.body?.identifier ?? req.body?.email, "identifier", { max: 254 });
    const pass = H.str(req.body?.password, "password", { max: 128 });
    const user = identifier.includes("@")
        ? await Users.findByEmail(identifier)
        : await Users.findByPhone(H.indianPhone(identifier, "identifier"));
    const valid = user && user.status !== "deleted" && await Users.checkPassword(user, pass);
    if (!valid) throw ApiError.unauthorized("Incorrect email, mobile number or password");
    let current = user;
    if (user.status === "deactivated") current = await Users.updateUser(user.id, { status: "active" });
    H.ok(res, { ...(await session(current)), reactivated: user.status === "deactivated" });
};

/** Sign-in with an emailed code (only when email is configured). */
const requestLoginCode = async (req, res) => {
    const email = H.email(req.body?.email);
    const user = await Users.findByEmail(email);
    // Same answer whether or not the account exists.
    if (!isEmailConfigured()) await issueOtp({ subject: "x", purpose: "login", target: email });
    if (user && user.status !== "deleted") {
        try { await issueOtp({ subject: user.id, purpose: "login", target: email }); } catch (e) { if (e.code === "COOLDOWN_ACTIVE" || e.code === "OTP_LOCKED") throw e; }
    }
    H.ok(res, { message: "If an account exists for this email, we have sent a 6-digit code.", resendAfterSeconds: 30 });
};

const loginWithCode = async (req, res) => {
    const email = H.email(req.body?.email);
    const user = await Users.findByEmail(email);
    if (!user || user.status === "deleted") throw new ApiError(400, "INVALID_OTP", "The code is incorrect or has expired");
    await consumeOtp({ subject: user.id, purpose: "login", code: String(req.body?.code || "") });
    const updated = await Users.updateUser(user.id, { email_verified: 1, status: user.status === "deactivated" ? "active" : user.status });
    H.ok(res, await session(updated));
};

const forgotPassword = async (req, res) => {
    const email = H.email(req.body?.email);
    if (!isEmailConfigured()) {
        throw new ApiError(503, "EMAIL_UNAVAILABLE", "Password reset by email is not available yet. Please contact support from the Help page.");
    }
    const user = await Users.findByEmail(email);
    if (user && user.status !== "deleted") {
        try { await issueOtp({ subject: user.id, purpose: "reset", target: email }); } catch (e) { if (e.code === "COOLDOWN_ACTIVE" || e.code === "OTP_LOCKED") throw e; }
    }
    H.ok(res, { message: "If an account exists for this email, we have sent a code to reset your password.", resendAfterSeconds: 30 });
};

const resetPassword = async (req, res) => {
    const email = H.email(req.body?.email);
    const newPassword = H.password(req.body?.newPassword, "newPassword");
    const user = await Users.findByEmail(email);
    if (!user || user.status === "deleted") throw new ApiError(400, "INVALID_OTP", "The code is incorrect or has expired");
    await consumeOtp({ subject: user.id, purpose: "reset", code: String(req.body?.code || "") });
    const updated = await Users.updateUser(user.id, {
        password_hash: await Users.hashPassword(newPassword),
        token_version: Number(user.token_version || 0) + 1,
        email_verified: 1
    });
    H.ok(res, await session(updated));
};

const changePassword = async (req, res) => {
    const newPassword = H.password(req.body?.newPassword, "newPassword");
    if (req.user.password_hash && !(await Users.checkPassword(req.user, req.body?.currentPassword))) {
        throw ApiError.badRequest("Your current password is incorrect", [{ field: "currentPassword" }]);
    }
    const updated = await Users.updateUser(req.user.id, {
        password_hash: await Users.hashPassword(newPassword),
        token_version: Number(req.user.token_version || 0) + 1
    });
    // Other devices are signed out; this device gets a fresh token.
    H.ok(res, await session(updated));
};

const logout = async (req, res) => {
    if (req.body?.everywhere === true) {
        await Users.updateUser(req.user.id, { token_version: Number(req.user.token_version || 0) + 1 });
    }
    H.ok(res, { loggedOut: true });
};

module.exports = { config, signup, verifyEmail, resendEmailCode, login, requestLoginCode, loginWithCode, forgotPassword, resetPassword, changePassword, logout, session };
