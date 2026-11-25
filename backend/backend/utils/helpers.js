const ApiError = require("./ApiError");

const parseJson = (value, fallback) => {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "object") return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

/** Age in whole years from an ISO date (YYYY-MM-DD), counting month and day. */
const ageFromDob = (dob, today = new Date()) => {
    if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
    const [y, m, d] = dob.split("-").map(Number);
    let age = today.getUTCFullYear() - y;
    const beforeBirthday = today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d);
    if (beforeBirthday) age -= 1;
    return age;
};

const pairKey = (a, b) => [String(a), String(b)].sort().join(":");

const str = (value, field, { max = 200, min = 0, optional = false } = {}) => {
    if (value === undefined || value === null) {
        if (optional) return undefined;
        throw ApiError.badRequest(`${field} is required`, [{ field }]);
    }
    if (typeof value !== "string") throw ApiError.badRequest(`${field} must be text`, [{ field }]);
    const v = value.trim();
    if (!optional && v.length < Math.max(1, min)) throw ApiError.badRequest(`${field} is required`, [{ field }]);
    if (v.length > max) throw ApiError.badRequest(`${field} must be at most ${max} characters`, [{ field }]);
    if (min && v.length < min) throw ApiError.badRequest(`${field} must be at least ${min} characters`, [{ field }]);
    return v;
};

const oneOf = (value, field, allowed, { optional = false } = {}) => {
    if ((value === undefined || value === null || value === "") && optional) return undefined;
    if (!allowed.includes(value)) {
        throw ApiError.badRequest(`${field} must be one of: ${allowed.join(", ")}`, [{ field }]);
    }
    return value;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const email = (value, field = "email") => {
    const v = str(value, field, { max: 254 }).toLowerCase();
    if (!EMAIL_RE.test(v)) throw ApiError.badRequest("Please enter a valid email address", [{ field }]);
    return v;
};

/** Indian mobile numbers: 10 digits starting 6-9, stored as +91XXXXXXXXXX. */
const indianPhone = (value, field = "phone") => {
    const digits = String(value || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (!/^[6-9]\d{9}$/.test(digits)) {
        throw ApiError.badRequest("Please enter a valid 10-digit Indian mobile number", [{ field }]);
    }
    return `+91${digits}`;
};

const PASSWORD_RULES = "Use at least 8 characters with a letter, a number and a special character.";
const password = (value, field = "password") => {
    if (typeof value !== "string" || value.length < 8 || value.length > 128 ||
        !/[A-Za-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
        throw ApiError.badRequest(PASSWORD_RULES, [{ field }]);
    }
    return value;
};

const strArray = (value, field, { maxItems = 30, maxLen = 60 } = {}) => {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) throw ApiError.badRequest(`${field} must be a list`, [{ field }]);
    if (value.length > maxItems) throw ApiError.badRequest(`${field} has too many items`, [{ field }]);
    return value.map((v) => str(v, field, { max: maxLen }));
};

/** Plain JSON object with bounded size, for flexible profile sections. */
const plainObject = (value, field, { maxBytes = 8000 } = {}) => {
    if (value === undefined) return undefined;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw ApiError.badRequest(`${field} must be an object`, [{ field }]);
    }
    if (JSON.stringify(value).length > maxBytes) throw ApiError.badRequest(`${field} is too large`, [{ field }]);
    return value;
};

const ID_RE = /^[0-9a-f]{24}$/;
const id = (value, field = "id") => {
    if (typeof value !== "string" || !ID_RE.test(value)) throw ApiError.badRequest(`${field} is not valid`, [{ field }]);
    return value;
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ok = (res, data, status = 200) => res.status(status).json({ data });

module.exports = {
    parseJson, ageFromDob, pairKey, str, oneOf, email, indianPhone, password, PASSWORD_RULES,
    strArray, plainObject, id, asyncHandler, ok
};
