const jwt = require("jsonwebtoken");
const Users = require("../models/users");
const ApiError = require("../utils/ApiError");

const ISSUER = "sambandh-setu";
const AUDIENCE = "sambandh-setu-api";

const jwtSecret = () => {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 32) throw new ApiError(500, "SERVER_CONFIGURATION_ERROR", "Authentication is not configured");
    return s;
};

/** Session token. `ver` must match users.token_version, so "log out everywhere" and password resets revoke old tokens. */
const createToken = (user) => jwt.sign({ ver: Number(user.token_version || 0) }, jwtSecret(), {
    subject: String(user.id),
    expiresIn: "30d",
    algorithm: "HS256",
    issuer: ISSUER,
    audience: AUDIENCE
});

const userFromToken = async (token) => {
    let claims;
    try {
        claims = jwt.verify(token, jwtSecret(), { algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE });
    } catch {
        return null;
    }
    if (typeof claims.sub !== "string") return null;
    const user = await Users.findById(claims.sub);
    if (!user || user.status === "deleted") return null;
    if (Number(claims.ver || 0) !== Number(user.token_version || 0)) return null;
    return user;
};

const bearer = (req) => {
    const [scheme, token] = String(req.get("authorization") || "").split(" ");
    return scheme === "Bearer" && token ? token : null;
};

const requireAuth = async (req, res, next) => {
    try {
        const token = bearer(req);
        if (!token) return next(ApiError.unauthorized("Please sign in to continue"));
        const user = await userFromToken(token);
        if (!user) return next(ApiError.unauthorized("Your session has ended. Please sign in again."));
        req.user = user;
        const last = Date.parse(user.last_active_at || 0);
        if (!last || Date.now() - last > 5 * 60 * 1000) {
            Users.updateUser(user.id, { last_active_at: new Date().toISOString() }).catch(() => {});
        }
        return next();
    } catch (error) {
        return next(error);
    }
};

/** Sets req.user when a valid token is present, otherwise continues anonymously. */
const optionalAuth = async (req, res, next) => {
    try {
        const token = bearer(req);
        if (token) req.user = (await userFromToken(token)) || undefined;
    } catch { /* anonymous */ }
    next();
};

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.optionalAuth = optionalAuth;
module.exports.createToken = createToken;
