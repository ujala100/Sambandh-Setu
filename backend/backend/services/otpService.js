/**
 * One-time codes. Codes are stored as HMAC-SHA256 hashes, compared in constant time, expire after
 * 10 minutes and lock after 5 wrong attempts. A code is never returned in an API response and never
 * logged.
 *
 * `subject` is what the code proves control of (an email address); `purpose` scopes the code so a
 * sign-in code cannot reset a password or delete an account.
 */
const crypto = require("crypto");
const { getDb, generateId, nowIso } = require("../db");
const { sendOtpEmail, isEmailConfigured } = require("./mailer");
const ApiError = require("../utils/ApiError");

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_LOCK_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PURPOSES = ["signup", "login", "reset", "change_email", "delete_account"];

const secret = () => {
    const s = process.env.OTP_HMAC_SECRET || process.env.JWT_SECRET;
    if (!s || s.length < 32) throw new ApiError(500, "SERVER_CONFIGURATION_ERROR", "Verification is not configured");
    return s;
};

const hashCode = (subject, purpose, code) =>
    crypto.createHmac("sha256", secret()).update(`${purpose}:${subject}:${code}`).digest("hex");

const sameHash = (a, b) => {
    if (typeof a !== "string" || typeof b !== "string" || a.length !== 64 || b.length !== 64) return false;
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
};

const emailUnavailable = () => new ApiError(503, "EMAIL_UNAVAILABLE",
    "Email codes are not available yet on this server. Please use your password, or contact support.");

/**
 * Creates a code for (subject, purpose) and emails it to `target`.
 * @returns {{ expiresInSeconds:number, resendAfterSeconds:number }}
 */
const issueOtp = async ({ subject, purpose, target }) => {
    if (!PURPOSES.includes(purpose)) throw ApiError.badRequest("Unknown verification purpose");
    if (!isEmailConfigured()) throw emailUnavailable();
    const db = getDb();
    const now = Date.now();
    const existing = await db.prepare("SELECT * FROM otps WHERE subject = ? AND purpose = ?").get(subject, purpose);
    if (existing?.locked_until && Date.parse(existing.locked_until) > now) {
        const wait = Math.ceil((Date.parse(existing.locked_until) - now) / 1000);
        throw new ApiError(429, "OTP_LOCKED", `Too many incorrect attempts. Please wait ${wait} seconds.`, [{ retryAfterSeconds: wait }]);
    }
    if (existing && now - Date.parse(existing.last_sent_at) < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - Date.parse(existing.last_sent_at))) / 1000);
        throw new ApiError(429, "COOLDOWN_ACTIVE", `Please wait ${wait} seconds before requesting a new code.`, [{ retryAfterSeconds: wait }]);
    }
    const code = crypto.randomInt(100000, 1000000).toString();
    const row = [hashCode(subject, purpose, code), target, new Date(now).toISOString(), new Date(now + OTP_EXPIRY_MS).toISOString()];
    if (existing) {
        await db.prepare("UPDATE otps SET code_hash = ?, target = ?, attempts = 0, last_sent_at = ?, expires_at = ?, locked_until = NULL WHERE id = ?")
            .run(...row, existing.id);
    } else {
        await db.prepare("INSERT INTO otps (id, subject, purpose, code_hash, target, attempts, last_sent_at, expires_at, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)")
            .run(generateId(), subject, purpose, ...row, nowIso());
    }
    try {
        await sendOtpEmail(target, code, purpose);
    } catch {
        await db.prepare("DELETE FROM otps WHERE subject = ? AND purpose = ?").run(subject, purpose);
        throw new ApiError(502, "EMAIL_SEND_FAILED", "We could not send the code. Please try again in a moment.");
    }
    return { expiresInSeconds: OTP_EXPIRY_MS / 1000, resendAfterSeconds: RESEND_COOLDOWN_MS / 1000 };
};

/**
 * Checks and consumes a code. Throws ApiError on failure; returns the row (with `target`) on success.
 */
const consumeOtp = async ({ subject, purpose, code }) => {
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) throw ApiError.badRequest("Enter the 6-digit code");
    const db = getDb();
    const now = Date.now();
    const row = await db.prepare("SELECT * FROM otps WHERE subject = ? AND purpose = ?").get(subject, purpose);
    const invalid = () => new ApiError(400, "INVALID_OTP", "The code is incorrect or has expired");
    if (!row) throw invalid();
    if ((row.locked_until && Date.parse(row.locked_until) > now) || row.attempts >= MAX_ATTEMPTS) {
        throw new ApiError(429, "OTP_LOCKED", "Too many incorrect attempts. Request a new code in a few minutes.", [{ retryAfterSeconds: OTP_LOCK_MS / 1000 }]);
    }
    if (Date.parse(row.expires_at) <= now) throw invalid();
    if (!sameHash(row.code_hash, hashCode(subject, purpose, code))) {
        const attempts = row.attempts + 1;
        const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now + OTP_LOCK_MS).toISOString() : null;
        await db.prepare("UPDATE otps SET attempts = ?, locked_until = ? WHERE id = ?").run(attempts, lockedUntil, row.id);
        throw invalid();
    }
    const deleted = await db.prepare("DELETE FROM otps WHERE id = ? AND code_hash = ?").run(row.id, row.code_hash);
    if (!deleted || deleted.changes !== 1) throw invalid();
    return row;
};

module.exports = { issueOtp, consumeOtp, PURPOSES, MAX_ATTEMPTS };
