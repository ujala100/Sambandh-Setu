/**
 * Photos are stored in the database (bounded size) and served through short-lived signed URLs,
 * because <img> tags cannot send the session header. A URL is only produced in responses where the
 * viewer is allowed to see the photo. Verification documents are never served.
 */
const crypto = require("crypto");
const { getDb, generateId, nowIso } = require("../db");
const ApiError = require("../utils/ApiError");

const MAX_BYTES = 1.5 * 1024 * 1024;
const MIME = { "image/jpeg": [0xff, 0xd8, 0xff], "image/png": [0x89, 0x50, 0x4e, 0x47], "image/webp": [0x52, 0x49, 0x46, 0x46] };
const DAY = 24 * 60 * 60;

const key = () => process.env.JWT_SECRET || "dev-only-photo-signing-key-change-me-0000";

const sign = (photoId, exp) => crypto.createHmac("sha256", key()).update(`photo:${photoId}:${exp}`).digest("hex").slice(0, 32);

/** Signed URL valid until the end of the next UTC day (stable within a day so browsers can cache). */
const signedUrl = (photoId) => {
    if (!photoId) return null;
    const exp = (Math.floor(Date.now() / 1000 / DAY) + 2) * DAY;
    return `/api/photos/${photoId}?exp=${exp}&sig=${sign(photoId, exp)}`;
};

const verifySignature = (photoId, exp, sig) => {
    const e = Number(exp);
    if (!Number.isInteger(e) || e < Date.now() / 1000 || typeof sig !== "string" || sig.length !== 32) return false;
    return crypto.timingSafeEqual(Buffer.from(sign(photoId, e)), Buffer.from(sig));
};

/** Parses and checks a data URL. Returns { mime, base64 }. */
const parseDataUrl = (dataUrl) => {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
    if (!m) throw ApiError.badRequest("Please choose a JPG, PNG or WebP image");
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > MAX_BYTES) throw ApiError.badRequest("The image is too large. Please choose one under 1.5 MB.");
    const magic = MIME[m[1]];
    if (!magic.every((b, i) => buf[i] === b)) throw ApiError.badRequest("The file does not look like a valid image");
    return { mime: m[1], base64: m[2] };
};

const savePhoto = async (userId, kind, dataUrl) => {
    const { mime, base64 } = parseDataUrl(dataUrl);
    const id = generateId();
    await getDb().prepare("INSERT INTO photos (id, user_id, kind, mime, data, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, String(userId), kind, mime, base64, nowIso());
    return id;
};

const deletePhoto = (userId, photoId) => getDb().prepare("DELETE FROM photos WHERE id = ? AND user_id = ?").run(photoId, String(userId));

/** GET /api/photos/:id */
const servePhoto = async (req, res) => {
    const { id } = req.params;
    if (!/^[0-9a-f]{24}$/.test(id) || !verifySignature(id, req.query.exp, req.query.sig)) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Photo not found", details: [] } });
    }
    const row = await getDb().prepare("SELECT mime, data, kind FROM photos WHERE id = ?").get(id);
    if (!row || row.kind === "verification" || row.kind === "report") {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Photo not found", details: [] } });
    }
    res.set("Content-Type", row.mime);
    res.set("Cache-Control", "private, max-age=86400");
    res.set("X-Content-Type-Options", "nosniff");
    return res.send(Buffer.from(row.data, "base64"));
};

module.exports = { signedUrl, savePhoto, deletePhoto, servePhoto, parseDataUrl };
