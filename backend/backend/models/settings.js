/**
 * Per-user settings. Stored as one JSON document, merged over DEFAULTS on read.
 * Only keys that exist in DEFAULTS can be written, and each value must match the default's type
 * (or an allowed enum), so the client cannot store arbitrary data here.
 */
const { getDb, nowIso } = require("../db");
const { parseJson } = require("../utils/helpers");
const ApiError = require("../utils/ApiError");

const DEFAULTS = Object.freeze({
    privacy: {
        showInDiscover: true,
        whoCanSeeProfile: "matching",
        allowConnectionRequests: true,
        showOnlineStatus: false,
        showReadStatus: false,
        reviewed: false,
        sharing: {
            name: true, age: true, location: true, education: true, profession: true,
            family: false, contact: false, photos: true, religion: true
        }
    },
    discovery: {
        peopleWhoCanFindMe: "matching",
        ageRangeVisibility: "preferences",
        ageMin: 21,
        ageMax: 40,
        distanceVisibility: "anywhere",
        profileSuggestions: "balanced",
        hideProfile: false,
        hideDuration: "until_turned_off",
        hideUntil: ""
    },
    notifications: {
        push: true,
        email: true,
        inApp: true,
        frequency: "realtime",
        requests: true,
        messages: true,
        journey: true,
        guide: true,
        family: true,
        safety: true
    },
    chat: {
        allowMessagesFrom: "connections",
        readReceipts: true,
        typingIndicator: true,
        mediaSharing: true,
        custom: {
            gender: "my_preference",
            ageRange: "18-30",
            location: "200",
            education: "graduate",
            profession: "any",
            verifiedOnly: false,
            interactedOnly: false
        }
    },
    guide: {
        enabled: true,
        useChatContext: false,
        usePrivateReflections: false,
        accessProfile: false,
        accessPreferences: false,
        accessJourney: false,
        sensitiveTopics: false,
        saveHistory: true,
        tone: "empathetic"
    },
    ai: {
        personalization: true,
        improveService: false,
        retention: "strict"
    },
    app: {
        language: "en-IN",
        appearance: "light"
    }
});

const ENUMS = {
    "privacy.whoCanSeeProfile": ["everyone", "matching", "connected", "selected"],
    "discovery.peopleWhoCanFindMe": ["everyone", "matching", "verified", "nobody"],
    "discovery.ageRangeVisibility": ["everyone", "preferences", "custom"],
    "discovery.distanceVisibility": ["city", "50", "100", "200", "anywhere"],
    "discovery.profileSuggestions": ["balanced", "values", "nearby", "new"],
    "discovery.hideDuration": ["24h", "3d", "7d", "until_turned_off"],
    "notifications.frequency": ["realtime", "daily", "weekly", "important"],
    "chat.allowMessagesFrom": ["everyone", "connections", "verified", "custom"],
    "chat.custom.gender": ["my_preference", "women", "men", "anyone"],
    "chat.custom.ageRange": ["18-30", "25-35", "30-40", "any"],
    "chat.custom.location": ["50", "100", "200", "any"],
    "chat.custom.education": ["graduate", "postgraduate", "any"],
    "chat.custom.profession": ["any", "working", "business"],
    "guide.tone": ["empathetic", "direct", "gentle"],
    "ai.retention": ["strict", "30d", "90d"],
    "app.language": ["en-IN", "hi-IN", "te-IN", "ta-IN", "kn-IN", "ml-IN", "mr-IN", "bn-IN"],
    "app.appearance": ["light", "dark", "system"]
};

const isPlain = (v) => v && typeof v === "object" && !Array.isArray(v);

const deepMerge = (base, patch) => {
    const out = { ...base };
    for (const [k, v] of Object.entries(patch || {})) {
        out[k] = isPlain(v) && isPlain(base[k]) ? deepMerge(base[k], v) : v;
    }
    return out;
};

/** Validates a partial settings patch against DEFAULTS. */
const validatePatch = (patch, defaults = DEFAULTS, prefix = "") => {
    if (!isPlain(patch)) throw ApiError.badRequest("Settings must be an object");
    const clean = {};
    for (const [key, value] of Object.entries(patch)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (!(key in defaults)) throw ApiError.badRequest(`Unknown setting: ${path}`);
        const def = defaults[key];
        if (isPlain(def)) {
            clean[key] = validatePatch(value, def, path);
        } else if (ENUMS[path]) {
            if (!ENUMS[path].includes(value)) throw ApiError.badRequest(`${path} must be one of: ${ENUMS[path].join(", ")}`);
            clean[key] = value;
        } else if (typeof def === "boolean") {
            if (typeof value !== "boolean") throw ApiError.badRequest(`${path} must be true or false`);
            clean[key] = value;
        } else if (typeof def === "number") {
            if (!Number.isInteger(value) || value < 18 || value > 80) throw ApiError.badRequest(`${path} must be a whole number between 18 and 80`);
            clean[key] = value;
        } else if (typeof def === "string") {
            if (typeof value !== "string" || value.length > 40) throw ApiError.badRequest(`${path} is not valid`);
            clean[key] = value;
        }
    }
    return clean;
};

const getSettings = async (userId) => {
    const row = await getDb().prepare("SELECT data FROM user_settings WHERE user_id = ?").get(String(userId));
    const settings = deepMerge(DEFAULTS, parseJson(row?.data, {}));
    // A temporary hide expires on its own.
    if (settings.discovery.hideProfile && settings.discovery.hideUntil && Date.parse(settings.discovery.hideUntil) < Date.now()) {
        settings.discovery.hideProfile = false;
        settings.discovery.hideUntil = "";
    }
    return settings;
};

const updateSettings = async (userId, patch) => {
    const clean = validatePatch(patch);
    if (clean.discovery && clean.discovery.hideProfile === true) {
        const current = await getSettings(userId);
        const duration = clean.discovery.hideDuration || current.discovery.hideDuration;
        const ms = { "24h": 864e5, "3d": 3 * 864e5, "7d": 7 * 864e5 }[duration];
        clean.discovery.hideUntil = ms ? new Date(Date.now() + ms).toISOString() : "";
    }
    if (clean.discovery && clean.discovery.hideProfile === false) clean.discovery.hideUntil = "";
    const row = await getDb().prepare("SELECT data FROM user_settings WHERE user_id = ?").get(String(userId));
    const stored = deepMerge(parseJson(row?.data, {}), clean);
    await getDb().prepare(`INSERT INTO user_settings (user_id, data, updated_at) VALUES (?, ?, ?)
        ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`)
        .run(String(userId), JSON.stringify(stored), nowIso());
    return getSettings(userId);
};

module.exports = { DEFAULTS, ENUMS, getSettings, updateSettings, validatePatch, deepMerge };
