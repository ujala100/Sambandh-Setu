/**
 * The signed-in member's own account, profile, settings and data rights
 * (download, deactivate, delete).
 */
const { getDb, generateId, nowIso } = require("../db");
const Users = require("../models/users");
const Settings = require("../models/settings");
const Photos = require("../services/photos");
const { issueOtp, consumeOtp } = require("../services/otpService");
const { isEmailConfigured } = require("../services/mailer");
const { meView } = require("../services/views");
const { session } = require("./authController");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer to self-describe", "Prefer not to say"];
const MARITAL = ["Never Married", "Divorced", "Widowed", "Awaiting Divorce", "Annulled"];
const INTENTS = ["marriage", "serious", "getting_to_know", "friendship", "exploring"];

const verificationSummary = async (userId) => {
    const rows = await getDb().prepare("SELECT type, status, doc_type, updated_at FROM verifications WHERE user_id = ? ORDER BY updated_at DESC").all(String(userId));
    const summary = {};
    for (const r of rows) if (!summary[r.type]) summary[r.type] = { status: r.status, docType: r.doc_type, updatedAt: r.updated_at };
    return summary;
};

const buildMe = async (user) => {
    const profile = Users.expandProfile(await Users.getProfile(user.id));
    const settings = await Settings.getSettings(user.id);
    return meView(user, profile, settings, { verification: await verificationSummary(user.id) });
};

const getMe = async (req, res) => {
    const settings = await Settings.getSettings(req.user.id);
    H.ok(res, { user: await buildMe(req.user), settings });
};

const updateAccount = async (req, res) => {
    const b = req.body || {};
    const userFields = {};
    const profileFields = {};
    if (b.fullName !== undefined) userFields.display_name = H.str(b.fullName, "fullName", { min: 2, max: 80 });
    if (b.dateOfBirth !== undefined) {
        const dob = H.str(b.dateOfBirth, "dateOfBirth", { max: 10 });
        const age = H.ageFromDob(dob);
        if (age === null) throw ApiError.badRequest("Enter your date of birth as DD/MM/YYYY", [{ field: "dateOfBirth" }]);
        if (age < 18) throw ApiError.badRequest("You must be at least 18 years old to use Sambandh Setu", [{ field: "dateOfBirth" }]);
        if (age > 100) throw ApiError.badRequest("Please check your date of birth", [{ field: "dateOfBirth" }]);
        profileFields.date_of_birth = dob;
    }
    if (b.gender !== undefined) profileFields.gender = H.oneOf(b.gender, "gender", GENDERS);
    if (b.maritalStatus !== undefined) profileFields.marital_status = H.oneOf(b.maritalStatus, "maritalStatus", MARITAL);
    if (b.heightCm !== undefined) {
        if (b.heightCm !== null && (!Number.isInteger(b.heightCm) || b.heightCm < 120 || b.heightCm > 230)) {
            throw ApiError.badRequest("Height must be between 120 and 230 cm", [{ field: "heightCm" }]);
        }
        profileFields.height_cm = b.heightCm;
    }
    if (b.location !== undefined) profileFields.location = H.str(b.location, "location", { max: 80, optional: true }) || "";
    if (Object.keys(userFields).length) await Users.updateUser(req.user.id, userFields);
    if (Object.keys(profileFields).length) await Users.updateProfile(req.user.id, profileFields);
    H.ok(res, { user: await buildMe(await Users.findById(req.user.id)) });
};

const updateProfile = async (req, res) => {
    const b = req.body || {};
    const f = {};
    const optStr = (key, max) => { if (b[key] !== undefined) f[key] = H.str(b[key], key, { max, optional: true }) || ""; };
    optStr("education", 100);
    optStr("profession", 100);
    optStr("location", 80);
    if (b.bio !== undefined) f.bio = H.str(b.bio, "bio", { max: 300, optional: true }) || "";
    if (b.intent !== undefined) f.intent = H.oneOf(b.intent, "intent", INTENTS);
    if (b.languages !== undefined) f.languages = H.strArray(b.languages, "languages", { maxItems: 15 });
    if (b.interests !== undefined) f.interests = H.strArray(b.interests, "interests", { maxItems: 30 });
    if (b.values !== undefined) f.values_list = H.strArray(b.values, "values", { maxItems: 20 });
    for (const section of ["lifestyle", "family", "communication"]) {
        if (b[section] !== undefined) f[section] = H.plainObject(b[section], section);
    }
    if (b.preferences !== undefined) {
        const prefs = H.plainObject(b.preferences, "preferences", { maxBytes: 12000 });
        const basic = prefs.basic || {};
        for (const k of ["ageMin", "ageMax"]) {
            if (basic[k] !== undefined && (!Number.isInteger(basic[k]) || basic[k] < 18 || basic[k] > 80)) {
                throw ApiError.badRequest("Age range must be between 18 and 80", [{ field: `preferences.basic.${k}` }]);
            }
        }
        if (basic.ageMin && basic.ageMax && basic.ageMin > basic.ageMax) throw ApiError.badRequest("Minimum age must not exceed maximum age");
        f.preferences = prefs;
    }
    // Merge object sections so one screen can save its part without wiping the others.
    const current = Users.expandProfile(await Users.getProfile(req.user.id));
    for (const section of ["lifestyle", "family", "preferences", "communication"]) {
        if (f[section] && b.replace !== true) f[section] = Settings.deepMerge(current[section] || {}, f[section]);
    }
    await Users.updateProfile(req.user.id, f);
    H.ok(res, { user: await buildMe(req.user) });
};

const uploadPhoto = async (req, res) => {
    const current = await Users.getProfile(req.user.id);
    const photoId = await Photos.savePhoto(req.user.id, "avatar", req.body?.dataUrl);
    await Users.updateProfile(req.user.id, { avatar_photo_id: photoId });
    if (current?.avatar_photo_id) await Photos.deletePhoto(req.user.id, current.avatar_photo_id);
    H.ok(res, { photoUrl: Photos.signedUrl(photoId) }, 201);
};

const removePhoto = async (req, res) => {
    const current = await Users.getProfile(req.user.id);
    if (current?.avatar_photo_id) {
        await Users.updateProfile(req.user.id, { avatar_photo_id: null });
        await Photos.deletePhoto(req.user.id, current.avatar_photo_id);
    }
    H.ok(res, { photoUrl: null });
};

const getSettings = async (req, res) => H.ok(res, { settings: await Settings.getSettings(req.user.id) });
const updateSettings = async (req, res) => H.ok(res, { settings: await Settings.updateSettings(req.user.id, req.body || {}) });

const completeOnboarding = async (req, res) => {
    const profile = Users.expandProfile(await Users.getProfile(req.user.id));
    const missing = [];
    if (!profile.dateOfBirth) missing.push("date of birth");
    if (!profile.gender) missing.push("gender");
    if (missing.length) throw ApiError.badRequest(`Please add your ${missing.join(" and ")} first`);
    const user = await Users.updateUser(req.user.id, { onboarding_completed: 1 });
    H.ok(res, { user: await buildMe(user) });
};

// ----- Email and phone -----

const requestEmailChange = async (req, res) => {
    const newEmail = H.email(req.body?.newEmail, "newEmail");
    if (newEmail === req.user.email) throw ApiError.badRequest("This is already your email address");
    if (req.user.password_hash && !(await Users.checkPassword(req.user, req.body?.password))) {
        throw ApiError.badRequest("Your password is incorrect", [{ field: "password" }]);
    }
    if (await Users.findByEmail(newEmail)) throw ApiError.conflict("This email is already used by another account");
    if (!isEmailConfigured()) throw new ApiError(503, "EMAIL_UNAVAILABLE", "Changing your email needs email verification, which is not available yet. Please contact support.");
    H.ok(res, { ...(await issueOtp({ subject: req.user.id, purpose: "change_email", target: newEmail })), sentTo: newEmail });
};

const confirmEmailChange = async (req, res) => {
    const row = await consumeOtp({ subject: req.user.id, purpose: "change_email", code: String(req.body?.code || "") });
    if (await Users.findByEmail(row.target)) throw ApiError.conflict("This email is already used by another account");
    const user = await Users.updateUser(req.user.id, { email: row.target, email_verified: 1 });
    H.ok(res, { user: await buildMe(user) });
};

const updatePhone = async (req, res) => {
    const phone = req.body?.phone ? H.indianPhone(req.body.phone) : null;
    if (phone) {
        const other = await Users.findByPhone(phone);
        if (other && other.id !== req.user.id) throw ApiError.conflict("This mobile number is linked to another account");
    }
    // No SMS provider is configured, so the number is saved as unverified and never used to sign in
    // until it has been verified.
    const user = await Users.updateUser(req.user.id, { phone, phone_verified: 0 });
    H.ok(res, { user: await buildMe(user), smsVerification: false });
};

// ----- Data rights -----

const exportData = async (userId) => {
    const db = getDb();
    const u = await Users.findById(userId);
    const all = (sql) => db.prepare(sql).all(String(userId));
    const strip = ({ data, ...rest }) => rest;
    return {
        exportedAt: nowIso(),
        account: { id: u.id, name: u.display_name, email: u.email, phone: u.phone, createdAt: u.created_at, emailVerified: Boolean(u.email_verified) },
        profile: Users.expandProfile(await Users.getProfile(userId)),
        settings: await Settings.getSettings(userId),
        photos: (await all("SELECT id, kind, mime, created_at FROM photos WHERE user_id = ?")).map(strip),
        requests: await db.prepare("SELECT id, sender_id, recipient_id, status, message, created_at FROM connection_requests WHERE sender_id = ? OR recipient_id = ?").all(String(userId), String(userId)),
        connections: await db.prepare("SELECT id, participant_a, participant_b, status, stage, created_at FROM connections WHERE participant_a = ? OR participant_b = ?").all(String(userId), String(userId)),
        messagesSent: await all("SELECT chat_id, text, created_at FROM messages WHERE sender_id = ?"),
        reflections: await all("SELECT connection_id, stage, question_key, value, other_text, sharing, updated_at FROM reflection_answers WHERE author_id = ?"),
        family: (await all("SELECT id, relationship, method, contact, status, permissions, created_at FROM family_members WHERE owner_id = ?")).map((r) => ({ ...r, permissions: H.parseJson(r.permissions, {}) })),
        verifications: await all("SELECT id, type, doc_type, status, created_at FROM verifications WHERE user_id = ?"),
        reports: await all("SELECT id, content_type, reason, details, status, created_at FROM reports WHERE reporter_id = ?"),
        supportTickets: await all("SELECT id, kind, category, subject, message, status, created_at FROM support_tickets WHERE user_id = ?"),
        guideConversations: await all("SELECT id, title, topic, created_at FROM guide_conversations WHERE user_id = ?"),
        blocks: await all("SELECT blocked_id, created_at FROM blocks WHERE blocker_id = ?")
    };
};

const downloadData = async (req, res) => {
    await getDb().prepare("INSERT INTO data_requests (id, user_id, status, created_at) VALUES (?, ?, 'ready', ?)").run(generateId(), req.user.id, nowIso());
    res.set("Content-Disposition", `attachment; filename="sambandh-setu-data-${new Date().toISOString().slice(0, 10)}.json"`);
    H.ok(res, await exportData(req.user.id));
};

const confirmIdentity = async (user, body) => {
    if (user.password_hash) {
        if (!(await Users.checkPassword(user, body?.password))) throw ApiError.badRequest("Your password is incorrect", [{ field: "password" }]);
        return;
    }
    // Accounts without a password confirm with an emailed code.
    await consumeOtp({ subject: user.id, purpose: "delete_account", code: String(body?.code || "") });
};

const requestDeleteCode = async (req, res) => {
    H.ok(res, await issueOtp({ subject: req.user.id, purpose: "delete_account", target: req.user.email }));
};

const deactivate = async (req, res) => {
    await confirmIdentity(req.user, req.body);
    await Users.updateUser(req.user.id, { status: "deactivated", token_version: Number(req.user.token_version || 0) + 1 });
    H.ok(res, { status: "deactivated" });
};

const deleteAccount = async (req, res) => {
    if (req.body?.confirm !== "DELETE") throw ApiError.badRequest("Type DELETE to confirm");
    await confirmIdentity(req.user, req.body);
    await Users.deleteUserCompletely(req.user.id);
    H.ok(res, { deleted: true });
};

const refreshSession = async (req, res) => H.ok(res, await session(req.user));

module.exports = {
    getMe, updateAccount, updateProfile, uploadPhoto, removePhoto, getSettings, updateSettings, completeOnboarding,
    requestEmailChange, confirmEmailChange, updatePhone, downloadData, requestDeleteCode, deactivate, deleteAccount,
    refreshSession, exportData, GENDERS, MARITAL, INTENTS
};
