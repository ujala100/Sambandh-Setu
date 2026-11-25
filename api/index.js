/**
 * Vercel Function: the whole Express API (backend/backend/app.js) behind /api/*.
 * The web app is served as static files from the same deployment, so the browser calls
 * the API on the same origin.
 */
module.exports = require("../backend/backend/app");
