/**
 * Verification requests. Members upload documents; the Sambandh Setu team reviews them
 * (admin endpoint). Nothing is auto-approved: a request stays "in review" until a person decides.
 * Documents are never shown to other members and are deleted when the account is deleted.
 */
const { getDb, generateId, nowIso } = require("../db");
const Photos = require("../services/photos");
const ApiError = require("../utils/ApiError");
const H = require("../utils/helpers");

const DOC_TYPES = {
    identity: ["Aadhaar Card", "Passport", "PAN Card", "Driving License", "Voter ID"],
    professional: ["Employment letter", "Company ID card", "Salary slip", "Business / Self-employed proof", "Degree certificate"],
    additional: ["Address proof", "Education certificate", "Other document"]
};

const view = (r) => ({
    id: r.id, type: r.type, docType: r.doc_type, status: r.status, details: H.parseJson(r.details, {}),
    reviewerNote: r.reviewer_note, createdAt: r.created_at, updatedAt: r.updated_at
});

const getStatus = async (req, res) => {
    const rows = await getDb().prepare("SELECT * FROM verifications WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
    const latest = {};
    for (const r of rows) if (!latest[r.type]) latest[r.type] = view(r);
    H.ok(res, { identity: latest.identity || null, professional: latest.professional || null, additional: latest.additional || null, history: rows.map(view), docTypes: DOC_TYPES });
};

const submit = async (req, res) => {
    const b = req.body || {};
    const type = H.oneOf(b.type, "type", Object.keys(DOC_TYPES));
    const docType = H.oneOf(b.docType, "docType", DOC_TYPES[type]);
    const existing = await getDb().prepare("SELECT id FROM verifications WHERE user_id = ? AND type = ? AND status IN ('in_review', 'verified')").get(req.user.id, type);
    if (existing) throw ApiError.conflict("You already have this verification in review or completed");
    const images = Array.isArray(b.images) ? b.images : [];
    if (!images.length || images.length > 2) throw ApiError.badRequest("Please upload one or two clear photos of the document");
    const details = {};
    for (const k of ["fullName", "dateOfBirth", "idLast4", "address", "organisation", "role"]) {
        if (b.details?.[k] !== undefined) details[k] = H.str(b.details[k], `details.${k}`, { max: 120, optional: true }) || "";
    }
    if (details.idLast4 && !/^\d{4}$/.test(details.idLast4)) throw ApiError.badRequest("Enter only the last 4 digits of the ID number");
    const photoIds = [];
    for (const img of images) photoIds.push(await Photos.savePhoto(req.user.id, "verification", img));
    const id = generateId();
    const now = nowIso();
    await getDb().prepare(`INSERT INTO verifications (id, user_id, type, doc_type, status, details, photo_ids, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'in_review', ?, ?, ?, ?)`).run(id, req.user.id, type, docType, JSON.stringify(details), JSON.stringify(photoIds), now, now);
    H.ok(res, view(await getDb().prepare("SELECT * FROM verifications WHERE id = ?").get(id)), 201);
};

/** A request that "needs action" can be withdrawn so the member can try again. */
const withdraw = async (req, res) => {
    const r = await getDb().prepare("SELECT * FROM verifications WHERE id = ? AND user_id = ?").get(H.id(req.params.id), req.user.id);
    if (!r || r.status === "verified") throw ApiError.notFound("Verification not found");
    for (const pid of H.parseJson(r.photo_ids, [])) await Photos.deletePhoto(req.user.id, pid);
    await getDb().prepare("DELETE FROM verifications WHERE id = ?").run(r.id);
    H.ok(res, { withdrawn: true });
};

module.exports = { getStatus, submit, withdraw, DOC_TYPES };
