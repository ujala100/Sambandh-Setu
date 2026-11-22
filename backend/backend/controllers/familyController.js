/**
 * Family Access: a member can invite trusted family to view selected parts of their profile.
 *
 * An invitation is a random token (only its hash is stored). Whoever holds the link can see what the
 * member chose to share, accept or decline. The member can change permissions or remove access at
 * any time; a removed or declined link stops working immediately. Family members never get an
 * account and can never message anyone.
 */
const crypto = require("crypto");
const { getDb, generateId, nowIso } = require("../db");
const Users = require("../models/users");
const { isEmailConfigured, sendFamilyInviteEmail } = require("../services/mailer");
const { notify } = require("../services/notify");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const RELATIONSHIPS = ["Mother", "Father", "Elder Sister", "Younger Sister", "Elder Brother", "Younger Brother", "Grandparent", "Uncle", "Aunt", "Cousin", "Guardian", "Other"];
const PERMISSION_KEYS = ["basicProfile", "photos", "partnerPreferences", "communicationSupport"];
const DEFAULT_PERMISSIONS = { basicProfile: true, photos: true, partnerPreferences: true, communicationSupport: false };
const MAX_MEMBERS = 10;

const hashToken = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

const appUrl = (req) => (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");

const cleanPermissions = (input) => {
    const out = { ...DEFAULT_PERMISSIONS };
    if (input && typeof input === "object") for (const k of PERMISSION_KEYS) if (typeof input[k] === "boolean") out[k] = input[k];
    return out;
};

const view = (r) => ({
    id: r.id, relationship: r.relationship, method: r.method, contact: r.contact, status: r.status,
    permissions: H.parseJson(r.permissions, DEFAULT_PERMISSIONS), acceptedAt: r.accepted_at, createdAt: r.created_at
});

const list = async (req, res) => {
    const rows = await getDb().prepare("SELECT * FROM family_members WHERE owner_id = ? AND status IN ('pending', 'active') ORDER BY created_at").all(req.user.id);
    H.ok(res, { items: rows.map(view), relationships: RELATIONSHIPS });
};

const invite = async (req, res) => {
    const b = req.body || {};
    const method = H.oneOf(b.method, "method", ["link", "phone", "email"]);
    const relationship = H.oneOf(b.relationship, "relationship", RELATIONSHIPS);
    const message = H.str(b.message, "message", { max: 250, optional: true }) || "";
    let contact = "";
    if (method === "phone") contact = H.indianPhone(b.contact, "contact");
    if (method === "email") contact = H.email(b.contact, "contact");
    const count = (await getDb().prepare("SELECT COUNT(*) AS n FROM family_members WHERE owner_id = ? AND status IN ('pending', 'active')").get(req.user.id)).n;
    if (count >= MAX_MEMBERS) throw ApiError.badRequest(`You can add up to ${MAX_MEMBERS} family members`);

    const token = crypto.randomBytes(24).toString("base64url");
    const id = generateId();
    const now = nowIso();
    await getDb().prepare(`INSERT INTO family_members (id, owner_id, relationship, method, contact, message, token_hash, status, permissions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`)
        .run(id, req.user.id, relationship, method, contact, message, hashToken(token), JSON.stringify(cleanPermissions(b.permissions)), now, now);
    const link = `${appUrl(req)}/family/invite/${token}`;

    // Delivery: email is sent when configured. SMS is not available yet, so phone invitations
    // return the link for the member to send from their own phone (shown in the app).
    let delivered = false;
    if (method === "email" && isEmailConfigured()) {
        try {
            await sendFamilyInviteEmail(contact, { inviterName: req.user.display_name || Users.firstName(req.user), relationship, link, message });
            delivered = true;
        } catch { delivered = false; }
    }
    H.ok(res, { member: view(await getDb().prepare("SELECT * FROM family_members WHERE id = ?").get(id)), link, delivered }, 201);
};

const ownMember = async (req) => {
    const r = await getDb().prepare("SELECT * FROM family_members WHERE id = ? AND owner_id = ?").get(H.id(req.params.memberId, "memberId"), req.user.id);
    if (!r || r.status === "removed" || r.status === "declined") throw ApiError.notFound("Family member not found");
    return r;
};

const updatePermissions = async (req, res) => {
    const r = await ownMember(req);
    const permissions = cleanPermissions({ ...H.parseJson(r.permissions, {}), ...(req.body?.permissions || {}) });
    await getDb().prepare("UPDATE family_members SET permissions = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(permissions), nowIso(), r.id);
    H.ok(res, { member: view({ ...r, permissions: JSON.stringify(permissions) }) });
};

const remove = async (req, res) => {
    const r = await ownMember(req);
    await getDb().prepare("UPDATE family_members SET status = 'removed', updated_at = ? WHERE id = ?").run(nowIso(), r.id);
    H.ok(res, { removed: true });
};

/** New link for a pending invitation (the old link stops working). */
const resend = async (req, res) => {
    const r = await ownMember(req);
    if (r.status !== "pending") throw ApiError.badRequest("This invitation was already accepted");
    const token = crypto.randomBytes(24).toString("base64url");
    await getDb().prepare("UPDATE family_members SET token_hash = ?, updated_at = ? WHERE id = ?").run(hashToken(token), nowIso(), r.id);
    const link = `${appUrl(req)}/family/invite/${token}`;
    let delivered = false;
    if (r.method === "email" && isEmailConfigured()) {
        try {
            await sendFamilyInviteEmail(r.contact, { inviterName: req.user.display_name, relationship: r.relationship, link, message: r.message });
            delivered = true;
        } catch { delivered = false; }
    }
    H.ok(res, { link, delivered });
};

// ---------- Public, token-based (the family member's side) ----------

const byToken = async (token) => {
    if (typeof token !== "string" || token.length < 20 || token.length > 64) return null;
    return getDb().prepare("SELECT * FROM family_members WHERE token_hash = ?").get(hashToken(token));
};

const sharedView = async (r) => {
    const owner = await Users.findById(r.owner_id);
    if (!owner || owner.status !== "active") return null;
    const p = Users.expandProfile(await Users.getProfile(owner.id));
    const perms = H.parseJson(r.permissions, DEFAULT_PERMISSIONS);
    const out = { ownerFirstName: Users.firstName(owner), relationship: r.relationship, status: r.status, permissions: perms, message: r.message };
    if (r.status !== "active") return out;
    if (perms.basicProfile) {
        out.profile = { name: owner.display_name, age: p.age, location: p.location, education: p.education, profession: p.profession, bio: p.bio, languages: p.languages, values: p.values, interests: p.interests };
    }
    if (perms.photos) out.photoUrl = Users.photoUrl(p.avatarPhotoId);
    if (perms.partnerPreferences) out.partnerPreferences = p.preferences;
    return out;
};

const invitation = async (req, res) => {
    const r = await byToken(req.params.token);
    if (!r || r.status === "removed" || r.status === "declined") throw ApiError.notFound("This invitation is no longer valid");
    const v = await sharedView(r);
    if (!v) throw ApiError.notFound("This invitation is no longer valid");
    H.ok(res, v);
};

const respond = (accept) => async (req, res) => {
    const r = await byToken(req.params.token);
    if (!r || r.status !== "pending") throw ApiError.notFound("This invitation is no longer valid");
    await getDb().prepare("UPDATE family_members SET status = ?, accepted_at = ?, updated_at = ? WHERE id = ?")
        .run(accept ? "active" : "declined", accept ? nowIso() : null, nowIso(), r.id);
    await notify(r.owner_id, { type: accept ? "family_accepted" : "family_declined", refId: r.id, payload: { relationship: r.relationship } });
    const fresh = await getDb().prepare("SELECT * FROM family_members WHERE id = ?").get(r.id);
    H.ok(res, accept ? await sharedView(fresh) : { status: "declined" });
};

module.exports = { list, invite, updatePermissions, remove, resend, invitation, accept: respond(true), decline: respond(false), RELATIONSHIPS };
