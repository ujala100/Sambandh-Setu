/**
 * Local / long-running server. On Vercel the same app runs as a function (api/index.js).
 */
const app = require("./app");
const { ensureReady, closeDb } = require("./db");

const PORT = Number(process.env.PORT || 5000);

const startServer = async () => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw Object.assign(new Error("JWT_SECRET must be at least 32 characters"), { code: "CONFIG_INVALID_JWT_SECRET" });
    }
    await ensureReady();
    return new Promise((resolve, reject) => {
        const server = app.listen(PORT, () => {
            console.log(`Sambandh Setu API on http://localhost:${PORT}`);
            resolve(server);
        });
        server.once("error", reject);
    });
};

if (require.main === module) {
    startServer()
        .then((server) => {
            const stop = () => server.close(() => closeDb().finally(() => process.exit(0)));
            process.on("SIGINT", stop);
            process.on("SIGTERM", stop);
        })
        .catch((error) => {
            console.error("Server startup failed: code=%s", error.code || "none");
            process.exitCode = 1;
        });
}

module.exports = { app, startServer };
