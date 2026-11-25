const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { getDb, generateId, nowIso } = require("../db");
const { parseJson, ageFromDob } = require("../utils/helpers");

const findById = (id) => getDb().prepare("SELECT * FROM users WHERE id = ?").get(String(id));
const findByEmail = (email) => getDb().prepare("SELECT * FROM users WHERE email = ?").get(String(email).toLowerCase());
const findByPhone = (phone) => getDb().prepare("SELECT * FROM users WHERE phone = ?").get(phone);

const hashPassword = async (plain) => bcrypt.hash(plain, 11);
const checkPassword = async (user, plain) => Boolean(user?.password_hash) && bcrypt.compare(String(plain || ""), user.password_hash);

const createUser = async ({ email, displayName, phone = null, passwordHash = null, emailVerified = false, isSeeded = false }) => {
    const db = getDb();
    const id = generateId();
    const now = nowIso();
    const username = `u${crypto.randomBytes(6).toString("hex")}`;
    await db.prepare(`INSERT INTO users (id, username, email, phone, display_name, password_hash, email_verified, is_seeded, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, username, email, phone, displayName, passwordHash, emailVerified ? 1 : 0, isSeeded ? 1 : 0, now, now);
    await db.prepare("INSERT INTO profiles (user_id, updated_at) VALUES (?, ?)").run(id, now);
    return findById(id);
};

const USER_COLUMNS = new Set(["email", "phone", "display_name", "password_hash", "email_verified", "phone_verified",
    "onboarding_completed", "status", "token_version", "last_active_at", "role"]);

const updateUser = async (id, fields) => {
    const keys = Object.keys(fields).filter((k) => USER_COLUMNS.has(k));
    if (!keys.length) return findById(id);
    const sets = keys.map((k) => `${k} = ?`).join(", ");
    await getDb().prepare(`UPDATE users SET ${sets}, updated_at = ? WHERE id = ?`).run(...keys.map((k) => fields[k]), nowIso(), String(id));
    return findById(id);
};

const getProfile = (userId) => getDb().prepare("SELECT * FROM profiles WHERE user_id = ?").get(String(userId));

const PROFILE_SCALARS = ["date_of_birth", "gender", "height_cm", "marital_status", "location", "education", "profession", "bio", "intent", "avatar_photo_id", "profile_status"];
const PROFILE_JSON = ["languages", "interests", "values_list", "lifestyle", "family", "preferences", "communication"];

const updateProfile = async (userId, fields) => {
    const keys = Object.keys(fields).filter((k) => PROFILE_SCALARS.includes(k) || PROFILE_JSON.includes(k));
    if (!keys.length) return getProfile(userId);
    const values = keys.map((k) => (PROFILE_JSON.includes(k) ? JSON.stringify(fields[k]) : fields[k]));
    const sets = keys.map((k) => `${k} = ?`).join(", ");
    await getDb().prepare(`UPDATE profiles SET ${sets}, updated_at = ? WHERE user_id = ?`).run(...values, nowIso(), String(userId));
    return getProfile(userId);
};

/** Expands a profile row into an object (JSON columns parsed, age derived). */
const expandProfile = (row) => {
    if (!row) return null;
    return {
        dateOfBirth: row.date_of_birth || null,
        age: ageFromDob(row.date_of_birth),
        gender: row.gender || "",
        heightCm: row.height_cm || null,
        maritalStatus: row.marital_status || "",
        location: row.location || "",
        education: row.education || "",
        profession: row.profession || "",
        bio: row.bio || "",
        intent: row.intent || "",
        avatarPhotoId: row.avatar_photo_id || null,
        profileStatus: row.profile_status || "active",
        languages: parseJson(row.languages, []),
        interests: parseJson(row.interests, []),
        values: parseJson(row.values_list, []),
        lifestyle: parseJson(row.lifestyle, {}),
        family: parseJson(row.family, {}),
        preferences: parseJson(row.preferences, {}),
        communication: parseJson(row.communication, {}),
        updatedAt: row.updated_at
    };
};

const photoUrl = (photoId) => require("../services/photos").signedUrl(photoId);

const firstName = (user) => String(user?.display_name || "").trim().split(/\s+/)[0] || "Member";

/** Completeness out of 100, with the items still missing (drives "Profile completeness"). */
const completeness = (user, profile, extra = {}) => {
    const p = profile || {};
    const checks = [
        ["Add a profile photo", Boolean(p.avatarPhotoId), "photo"],
        ["Add your basic details", Boolean(p.dateOfBirth && p.gender && p.location), "basics"],
        ["Add education and profession", Boolean(p.education && p.profession), "career"],
        ["Write a short introduction", Boolean(p.bio && p.bio.length >= 30), "about"],
        ["Complete interests", (p.interests || []).length >= 3, "interests"],
        ["Share your values", (p.values || []).length >= 2, "values"],
        ["Add lifestyle details", Object.keys(p.lifestyle || {}).length >= 2, "lifestyle"],
        ["Add family background", Object.keys(p.family || {}).length >= 2, "family"],
        ["Set partner preferences", Object.keys(p.preferences || {}).length >= 1, "preferences"],
        ["Review privacy settings", Boolean(extra.privacyReviewed), "privacy"]
    ];
    const done = checks.filter(([, ok]) => ok).length;
    return {
        percent: Math.round((done / checks.length) * 100),
        missing: checks.filter(([, ok]) => !ok).map(([label, , key]) => ({ key, label }))
    };
};

const deleteUserCompletely = async (userId) => {
    // Foreign keys cascade: profile, photos, settings, requests, connections, chats, messages,
    // reflections, notifications, family invites, verifications, tickets and guide history.
    await getDb().prepare("DELETE FROM users WHERE id = ?").run(String(userId));
};

module.exports = {
    findById, findByEmail, findByPhone, hashPassword, checkPassword, createUser, updateUser,
    getProfile, updateProfile, expandProfile, photoUrl, firstName, completeness, deleteUserCompletely
};
