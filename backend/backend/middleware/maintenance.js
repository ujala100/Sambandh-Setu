/**
 * Maintenance mode (a live feature flag). While it is on, members can read but every change is
 * refused with 503 MAINTENANCE. Sign-in, the team console, realtime and staff accounts are not
 * affected, so the team can work and switch it off again.
 */
const Features = require("../services/features");
const Rbac = require("../services/rbac");
const { userFromToken, bearer } = require("./requireAuth");
const ApiError = require("../utils/ApiError");

const OPEN_PREFIXES = ["/auth/", "/admin/", "/realtime/", "/features"];

const maintenanceGuard = async (req, res, next) => {
    try {
        if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
        if (OPEN_PREFIXES.some((p) => req.path.startsWith(p))) return next();
        const ev = await Features.evaluate(null);
        if (!ev.maintenance) return next();
        const token = bearer(req);
        const user = token ? await userFromToken(token) : null;
        if (user && (await Rbac.isStaffRole(user.role))) return next();
        return next(new ApiError(503, "MAINTENANCE", ev.maintenance.message));
    } catch (error) {
        return next(error);
    }
};

module.exports = { maintenanceGuard };
