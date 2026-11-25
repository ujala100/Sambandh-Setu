/**
 * Sambandh Setu recommender.
 *
 * A reciprocal, explainable ranking for Discover. People only meet when BOTH are interested, so a
 * profile is ranked by how well each person fits the other's stated preferences (harmonic mean,
 * as in reciprocal recommenders), blended with:
 *   - content similarity: shared values, interests, languages, lifestyle and intent, location;
 *   - learned taste: what this member showed interest in, saved, viewed or skipped before;
 *   - collaborative signal: people who liked the same profiles as you also liked ...;
 *   - quality: recent activity, profile completeness, identity verification;
 * then re-ranked for diversity (MMR), with exploration slots for new members and damping for
 * profiles already swamped with requests, so attention is spread fairly.
 *
 * Every weight is tunable live from the team console. Members see the reasons ("You both value
 * Honesty"), never a score: Setu does not predict outcomes.
 */
const { getDb, generateId, nowIso } = require("../db");
const { parseJson } = require("../utils/helpers");
const ApiError = require("../utils/ApiError");

const DEFAULT_WEIGHTS = {
    reciprocal: 0.22, values: 0.14, interests: 0.10, lifestyle: 0.08, location: 0.10, intent: 0.08,
    language: 0.04, activity: 0.06, completeness: 0.04, verified: 0.03, taste: 0.07, collaborative: 0.04
};
const DEFAULT_TUNING = { diversity: 0.25, freshDays: 7, freshBoost: 0.04, exploreEvery: 5, popularityDamping: 0.15 };
const WEIGHT_LABELS = {
    reciprocal: "Both fit each other's preferences", values: "Shared values", interests: "Shared interests", lifestyle: "Lifestyle compatibility",
    location: "Location", intent: "Same relationship intent", language: "Shared languages", activity: "Recently active",
    completeness: "Profile completeness", verified: "Verified identity", taste: "Learned from your activity", collaborative: "Liked by people with similar taste"
};
const EVENT_WEIGHTS = { interest: 1, accept: 1, bookmark: 0.6, view: 0.15, skip: -0.8 };

// ---------------- Config ----------------

let cfgCache = { at: 0, value: null };
const getConfig = async () => {
    if (cfgCache.value && Date.now() - cfgCache.at < 5000) return cfgCache.value;
    const row = await getDb().prepare("SELECT value FROM app_config WHERE key = 'recommender'").get();
    const stored = parseJson(row?.value, {});
    const value = { weights: { ...DEFAULT_WEIGHTS, ...(stored.weights || {}) }, tuning: { ...DEFAULT_TUNING, ...(stored.tuning || {}) } };
    cfgCache = { at: Date.now(), value };
    return value;
};

const setConfig = async (input, actorId) => {
    const current = await getConfig();
    const weights = { ...current.weights };
    const tuning = { ...current.tuning };
    for (const [k, v] of Object.entries(input.weights || {})) {
        if (!(k in DEFAULT_WEIGHTS)) throw ApiError.badRequest(`Unknown weight: ${k}`);
        if (typeof v !== "number" || v < 0 || v > 1) throw ApiError.badRequest(`${k} must be between 0 and 1`);
        weights[k] = Math.round(v * 1000) / 1000;
    }
    const ranges = { diversity: [0, 0.9], freshDays: [0, 60], freshBoost: [0, 0.3], exploreEvery: [0, 20], popularityDamping: [0, 1] };
    for (const [k, v] of Object.entries(input.tuning || {})) {
        if (!(k in ranges)) throw ApiError.badRequest(`Unknown setting: ${k}`);
        const [lo, hi] = ranges[k];
        if (typeof v !== "number" || v < lo || v > hi) throw ApiError.badRequest(`${k} must be between ${lo} and ${hi}`);
        tuning[k] = k === "exploreEvery" || k === "freshDays" ? Math.round(v) : Math.round(v * 1000) / 1000;
    }
    if (input.reset === true) Object.assign(weights, DEFAULT_WEIGHTS) && Object.assign(tuning, DEFAULT_TUNING);
    if (Object.values(weights).every((w) => w === 0)) throw ApiError.badRequest("At least one weight must be above 0");
    await getDb().prepare(`INSERT INTO app_config (key, value, updated_by, updated_at) VALUES ('recommender', ?, ?, ?)
        ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
        .run(JSON.stringify({ weights, tuning }), actorId, nowIso());
    cfgCache = { at: 0, value: null };
    return getConfig();
};

// ---------------- Events ----------------

const logEvent = async (userId, targetId, type) => {
    try {
        await getDb().prepare("INSERT INTO rec_events (id, user_id, target_id, type, created_at) VALUES (?, ?, ?, ?, ?)")
            .run(generateId(), String(userId), String(targetId), type, nowIso());
    } catch { /* analytics must never break a request */ }
};

const logImpressions = async (userId, targetIds) => {
    for (const id of targetIds) await logEvent(userId, id, "impression");
};

// ---------------- Features ----------------

const lc = (s) => String(s || "").trim().toLowerCase();
const cityOf = (loc) => lc(String(loc || "").split(",")[0]);
const stateOf = (loc) => lc(String(loc || "").split(",").slice(1).join(",")) || null;
const set = (arr) => new Set((arr || []).map(lc).filter(Boolean));
const jaccard = (a, b) => {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter += 1;
    return inter / (a.size + b.size - inter);
};
const shared = (a, b) => [...a].filter((x) => b.has(x));
const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const hobbiesOf = (p) => p.lifestyle?.hobbies?.items || [];
const dietOf = (p) => lc(p.lifestyle?.food?.diet || "");
const VEG = new Set(["vegetarian", "vegan", "jain", "satvik"]);

/** Tokens describing a profile; used for taste learning, diversity and collaborative overlap. */
const tokensOf = (p) => {
    const t = new Set();
    for (const v of p.values || []) t.add(`v:${lc(v)}`);
    for (const v of [...(p.interests || []), ...hobbiesOf(p)]) t.add(`i:${lc(v)}`);
    for (const v of p.languages || []) t.add(`l:${lc(v)}`);
    if (p.location) { t.add(`c:${cityOf(p.location)}`); if (stateOf(p.location)) t.add(`s:${stateOf(p.location)}`); }
    if (p.profession) t.add(`p:${lc(p.profession)}`);
    if (p.education) t.add(`e:${lc(p.education)}`);
    if (p.intent) t.add(`n:${p.intent}`);
    if (dietOf(p)) t.add(`d:${dietOf(p)}`);
    return t;
};

const EDU = {
    graduate: ["bachelor", "b.tech", "b.e", "b.com", "b.sc", "b.a", "b.des", "mbbs", "master", "m.tech", "mba", "m.sc", "m.a", "phd", "doctorate", "llb", "ca"],
    master: ["master", "m.tech", "m.e", "mba", "m.sc", "m.a", "phd", "doctorate", "md", "ms"],
    doctorate: ["phd", "doctorate"]
};
const eduLevelOk = (pref, edu) => {
    const p = lc(pref);
    const e = lc(edu);
    if (!p || p === "any" || !e) return null;
    const list = p.includes("doctor") ? EDU.doctorate : p.includes("master") ? EDU.master : p.includes("graduate") || p.includes("bachelor") ? EDU.graduate : null;
    if (!list) return null;
    return list.some((k) => e.includes(k)) ? 1 : 0;
};

/** How well `other` fits `seeker`'s stated partner preferences, 0..1 (null when nothing is specified). */
const prefFit = (seeker, other) => {
    const prefs = seeker.preferences || {};
    const b = prefs.basic || {};
    const checks = [];
    if (other.age && (Number.isInteger(b.ageMin) || Number.isInteger(b.ageMax))) {
        const lo = Number.isInteger(b.ageMin) ? b.ageMin : 18;
        const hi = Number.isInteger(b.ageMax) ? b.ageMax : 80;
        checks.push(other.age >= lo && other.age <= hi ? 1 : Math.abs(other.age - (other.age < lo ? lo : hi)) <= 2 ? 0.5 : 0);
    }
    if (Array.isArray(b.genders) && b.genders.length && other.gender) checks.push(set(b.genders).has(lc(other.gender)) ? 1 : 0);
    if (b.maritalStatus && lc(b.maritalStatus) !== "any" && other.maritalStatus) checks.push(lc(b.maritalStatus) === lc(other.maritalStatus) ? 1 : 0);
    const loc = lc(b.location);
    if (loc && other.location && seeker.location) {
        if (loc.includes("same city")) checks.push(cityOf(seeker.location) === cityOf(other.location) ? 1 : 0);
        else if (loc.includes("same state")) checks.push(stateOf(seeker.location) && stateOf(seeker.location) === stateOf(other.location) ? 1 : 0);
        else if (loc.includes("india only")) checks.push(lc(other.location) === "outside india" ? 0 : 1);
    }
    const edu = eduLevelOk(b.education, other.education);
    if (edu !== null) checks.push(edu);
    const food = lc(prefs.lifestyle?.food);
    const wantsVeg = food.startsWith("vegetarian") || food === "vegan" || food === "jain" || (prefs.lifestyle?.tags || []).map(lc).includes("vegetarian");
    if (wantsVeg && dietOf(other)) checks.push(VEG.has(dietOf(other)) ? 1 : food.includes("open") ? 0.6 : 0);
    const famPref = lc(prefs.family?.familyType);
    if (famPref && !famPref.includes("doesn") && !famPref.includes("open") && lc(other.family?.familyType)) checks.push(lc(other.family.familyType).startsWith(famPref.split(" ")[0]) ? 1 : 0.3);
    const langPref = set(prefs.additional?.languages);
    if (langPref.size && !langPref.has("open to more") && (other.languages || []).length) checks.push(jaccard(langPref, set(other.languages)) > 0 ? 1 : 0.3);
    if (!checks.length) return null;
    return checks.reduce((a, x) => a + x, 0) / checks.length;
};

const harmonic = (a, b) => (a + b > 0 ? (2 * a * b) / (a + b) : 0);

const intentScore = (a, b) => {
    if (!a || !b) return 0.5;
    if (a === b) return 1;
    const serious = new Set(["marriage", "serious"]);
    return serious.has(a) && serious.has(b) ? 0.8 : 0.4;
};

const locationScore = (a, b) => {
    if (!a || !b) return 0.3;
    if (cityOf(a) === cityOf(b)) return 1;
    if (stateOf(a) && stateOf(a) === stateOf(b)) return 0.6;
    if (lc(a) === "outside india" || lc(b) === "outside india") return 0.1;
    return 0.25;
};

const lifestyleScore = (me, p) => {
    const parts = [];
    const d1 = dietOf(me);
    const d2 = dietOf(p);
    if (d1 && d2) parts.push(d1 === d2 ? 1 : VEG.has(d1) === VEG.has(d2) ? 0.7 : 0.3);
    const s1 = lc(me.lifestyle?.routine?.sleepPattern);
    const s2 = lc(p.lifestyle?.routine?.sleepPattern);
    if (s1 && s2) parts.push(s1 === s2 || s1 === "flexible" || s2 === "flexible" ? 1 : 0.4);
    const c1 = set(me.communication?.channels);
    const c2 = set(p.communication?.channels);
    if (c1.size && c2.size) parts.push(Math.min(1, jaccard(c1, c2) * 2));
    const st1 = set(me.communication?.styles);
    const st2 = set(p.communication?.styles);
    if (st1.size && st2.size) parts.push(Math.min(1, jaccard(st1, st2) * 2));
    return parts.length ? parts.reduce((a, x) => a + x, 0) / parts.length : 0.5;
};

const activityScore = (user) => {
    const t = Date.parse(user.last_active_at || 0);
    if (!t) return 0.1;
    return Math.exp(-((Date.now() - t) / 864e5) / 14);
};

// ---------------- Signals ----------------

/** Loads learned taste and collaborative counts for one viewer. */
const loadSignals = async (viewerId, candidateIds, profilesOf) => {
    const db = getDb();
    const since = new Date(Date.now() - 180 * 864e5).toISOString();
    const events = await db.prepare(`SELECT target_id, type FROM rec_events WHERE user_id = ? AND type IN ('interest', 'accept', 'bookmark', 'view', 'skip')
        AND created_at >= ? ORDER BY created_at DESC LIMIT 300`).all(viewerId, since);
    const taste = new Map();
    const touched = [...new Set(events.map((e) => e.target_id))];
    const touchedProfiles = touched.length ? await profilesOf(touched) : {};
    for (const e of events) {
        const p = touchedProfiles[e.target_id];
        if (!p) continue;
        const w = EVENT_WEIGHTS[e.type] || 0;
        for (const tok of tokensOf(p)) taste.set(tok, (taste.get(tok) || 0) + w);
    }
    // Collaborative: people who sent interest to the same members as me; what else did they like?
    const mine = (await db.prepare("SELECT DISTINCT recipient_id FROM connection_requests WHERE sender_id = ? LIMIT 100").all(viewerId)).map((r) => r.recipient_id);
    const co = new Map();
    if (mine.length && candidateIds.length) {
        const ph = mine.map(() => "?").join(",");
        const peers = (await db.prepare(`SELECT DISTINCT sender_id FROM connection_requests WHERE recipient_id IN (${ph}) AND sender_id <> ? LIMIT 300`).all(...mine, viewerId)).map((r) => r.sender_id);
        if (peers.length) {
            const pp = peers.map(() => "?").join(",");
            const cp = candidateIds.map(() => "?").join(",");
            const rows = await db.prepare(`SELECT recipient_id AS id, COUNT(*) AS n FROM connection_requests WHERE sender_id IN (${pp}) AND recipient_id IN (${cp}) GROUP BY recipient_id`).all(...peers, ...candidateIds);
            for (const r of rows) co.set(r.id, Number(r.n));
        }
    }
    // Pending requests each candidate already has (for fair exposure).
    const pending = new Map();
    if (candidateIds.length) {
        const cp = candidateIds.map(() => "?").join(",");
        const rows = await db.prepare(`SELECT recipient_id AS id, COUNT(*) AS n FROM connection_requests WHERE status = 'pending' AND recipient_id IN (${cp}) GROUP BY recipient_id`).all(...candidateIds);
        for (const r of rows) pending.set(r.id, Number(r.n));
    }
    return { taste, co, pending, historySize: events.length };
};

const tasteScore = (taste, toks) => {
    if (!taste.size) return 0.5;
    let sum = 0;
    for (const t of toks) sum += taste.get(t) || 0;
    const x = sum / Math.sqrt(Math.max(1, toks.size));
    return 1 / (1 + Math.exp(-1.5 * x));
};

// ---------------- Ranking ----------------

/**
 * @param viewer {user, profile, settings}
 * @param candidates [{user, profile, settings, verified, completeness}]
 * @param signals from loadSignals
 * @returns candidates sorted, each with .rec = { score, reasons[] }
 */
const rank = async (viewer, candidates, signals) => {
    const { weights: baseWeights, tuning } = await getConfig();
    const weights = { ...baseWeights };
    const bias = viewer.settings?.discovery?.profileSuggestions;
    if (bias === "values") weights.values *= 2;
    if (bias === "nearby") weights.location *= 2.5;
    const totalW = Object.values(weights).reduce((a, x) => a + x, 0) || 1;
    const me = viewer.profile;
    const myValues = set([...(me.values || []), ...(me.preferences?.values?.valueTags || [])]);
    const myInterests = set([...(me.interests || []), ...hobbiesOf(me)]);
    const myLangs = set(me.languages);
    const freshMs = tuning.freshDays * 864e5;

    const scored = candidates.map((c) => {
        const p = c.profile;
        const fitA = prefFit(me, p);
        const fitB = prefFit(p, me);
        const theirValues = set(p.values);
        const theirInterests = set([...(p.interests || []), ...hobbiesOf(p)]);
        const theirLangs = set(p.languages);
        const toks = tokensOf(p);
        const f = {
            reciprocal: harmonic(fitA ?? 0.7, fitB ?? 0.7),
            values: Math.min(1, jaccard(myValues, theirValues) * 2),
            interests: Math.min(1, jaccard(myInterests, theirInterests) * 2),
            lifestyle: lifestyleScore(me, p),
            location: locationScore(me.location, p.location),
            intent: intentScore(me.intent, p.intent),
            language: myLangs.size && theirLangs.size ? Math.min(1, jaccard(myLangs, theirLangs) * 2) : 0.3,
            activity: activityScore(c.user),
            completeness: (c.completeness ?? 50) / 100,
            verified: c.verified ? 1 : 0,
            taste: tasteScore(signals.taste, toks),
            collaborative: 1 - Math.exp(-(signals.co.get(c.user.id) || 0) / 2)
        };
        let score = 0;
        for (const k of Object.keys(weights)) score += weights[k] * (f[k] ?? 0);
        score /= totalW;
        const isNew = Date.now() - Date.parse(c.user.created_at) < freshMs;
        if (isNew) score += bias === "new" ? tuning.freshBoost * 3 : tuning.freshBoost;
        score /= 1 + tuning.popularityDamping * (signals.pending.get(c.user.id) || 0);

        // Reasons, most important first.
        const reasons = [];
        const sv = shared(myValues, theirValues);
        const si = shared(myInterests, theirInterests);
        const sl = shared(myLangs, theirLangs);
        const candidatesReasons = [
            [weights.reciprocal * f.reciprocal, fitA !== null && fitB !== null && fitA >= 0.99 && fitB >= 0.99 ? "You fit each other's partner preferences" : fitA !== null && fitA >= 0.99 ? "Fits your partner preferences" : null],
            [weights.values * f.values, sv.length ? `You both value ${sv.slice(0, 2).map(title).join(" and ")}` : null],
            [weights.interests * f.interests, si.length ? `You both enjoy ${si.slice(0, 2).map(title).join(" and ")}` : null],
            [weights.location * f.location, f.location === 1 ? `Both in ${title(cityOf(p.location))}` : null],
            [weights.intent * f.intent, f.intent === 1 && me.intent === "marriage" ? "Both looking for marriage" : f.intent === 1 && me.intent ? "Looking for the same kind of relationship" : null],
            [weights.language * f.language, sl.length ? `Both speak ${title(sl[0])}` : null],
            [weights.lifestyle * f.lifestyle, f.lifestyle >= 0.9 && dietOf(me) && dietOf(me) === dietOf(p) ? `Both ${dietOf(p)}` : null],
            [weights.verified * f.verified, c.verified ? "Verified identity" : null],
            [weights.activity * f.activity, f.activity > 0.93 ? "Active recently" : null],
            [0.001, isNew ? "New on Sambandh Setu" : null]
        ];
        for (const [, text] of candidatesReasons.filter(([, t]) => t).sort((a, b) => b[0] - a[0])) reasons.push(text);
        return { c, toks, isNew, score, features: f, reasons: reasons.slice(0, 3) };
    });

    // Diversity re-rank (maximal marginal relevance) with exploration slots for new members.
    const pool = [...scored].sort((a, b) => b.score - a.score);
    const out = [];
    const d = tuning.diversity;
    while (pool.length) {
        const slot = out.length + 1;
        let pickIdx = 0;
        if (tuning.exploreEvery > 0 && slot % tuning.exploreEvery === 0) {
            const newIdx = pool.findIndex((x) => x.isNew);
            if (newIdx >= 0) pickIdx = newIdx;
        }
        if (pickIdx === 0 && d > 0 && out.length) {
            let best = -Infinity;
            for (let i = 0; i < Math.min(pool.length, 40); i++) {
                const maxSim = Math.max(...out.slice(-8).map((o) => jaccard(o.toks, pool[i].toks)));
                const mmr = (1 - d) * pool[i].score - d * maxSim;
                if (mmr > best) { best = mmr; pickIdx = i; }
            }
        }
        out.push(pool.splice(pickIdx, 1)[0]);
    }
    return out.map((x) => Object.assign(x.c, { rec: { score: x.score, reasons: x.reasons, features: x.features } }));
};

// ---------------- Metrics (team console) ----------------

const metrics = async (days = 30) => {
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const rows = await getDb().prepare("SELECT type, COUNT(*) AS n FROM rec_events WHERE created_at >= ? GROUP BY type").all(since);
    const n = Object.fromEntries(rows.map((r) => [r.type, Number(r.n)]));
    const rate = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
    const accepted = Number((await getDb().prepare("SELECT COUNT(*) AS n FROM connection_requests WHERE status = 'accepted' AND updated_at >= ?").get(since)).n);
    const decided = Number((await getDb().prepare("SELECT COUNT(*) AS n FROM connection_requests WHERE status IN ('accepted', 'declined') AND updated_at >= ?").get(since)).n);
    return {
        days,
        counts: { impressions: n.impression || 0, views: n.view || 0, interests: n.interest || 0, bookmarks: n.bookmark || 0, skips: n.skip || 0, accepted },
        rates: {
            viewRate: rate(n.view || 0, n.impression || 0),
            interestRate: rate(n.interest || 0, n.impression || 0),
            skipRate: rate(n.skip || 0, n.impression || 0),
            acceptanceRate: rate(accepted, decided)
        }
    };
};

module.exports = {
    DEFAULT_WEIGHTS, DEFAULT_TUNING, WEIGHT_LABELS, getConfig, setConfig, logEvent, logImpressions,
    loadSignals, rank, metrics, prefFit, tokensOf, jaccard
};
