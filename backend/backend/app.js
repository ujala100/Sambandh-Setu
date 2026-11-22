/**
 * Express application. Used by server.js (long-running) and by api/index.js (Vercel function).
 */
require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { corsOptions } = require("./config/cors");
const { initSentry, captureException } = require("./config/sentry");
const { globalLimiter } = require("./middleware/rateLimit");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");
const { ensureReady, isReady } = require("./db");
const apiRoutes = require("./routes");
const ApiError = require("./utils/ApiError");

initSentry();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

if (process.env.NODE_ENV !== "test" && process.env.LOG_REQUESTS !== "false") {
    app.use((req, res, next) => {
        const start = Date.now();
        // Path only: query strings can carry personal data.
        res.on("finish", () => console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`));
        next();
    });
}

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
// Photos are sent as data URLs (max 1.5 MB each, up to 2 per verification request).
app.use(express.json({ limit: "4mb" }));

const health = async (req, res) => {
    try {
        await ensureReady();
        res.json({ data: { status: "ok", database: isReady() ? "ready" : "starting" } });
    } catch (error) {
        res.status(503).json({ error: { code: "NOT_READY", message: error.code === "DB_NOT_CONFIGURED" ? "Database is not configured" : "Database is not reachable", details: [] } });
    }
};
app.get(["/health", "/health/live", "/health/ready", "/api/health"], health);

// Make sure the schema exists before any API call (first request on a cold serverless instance).
app.use(["/api", "/api/v1"], async (req, res, next) => {
    try {
        await ensureReady();
        next();
    } catch (error) {
        next(error.code === "DB_NOT_CONFIGURED"
            ? new ApiError(503, "DB_NOT_CONFIGURED", "The service is not fully configured yet. Please try again later.")
            : error);
    }
});
app.use(["/api", "/api/v1"], globalLimiter);
app.use("/api/v1", apiRoutes);
app.use("/api", apiRoutes);

app.get("/", (req, res) => res.json({ data: { name: "Sambandh Setu API", docs: "/api/health" } }));

app.use(notFoundHandler);
app.use((error, req, res, next) => {
    captureException(error, req);
    next(error);
});
app.use(errorHandler);

module.exports = app;
