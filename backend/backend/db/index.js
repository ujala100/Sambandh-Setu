/**
 * Database access for Sambandh Setu.
 *
 * One small adapter with the same API over two engines:
 *   - PostgreSQL (Neon / any Postgres) when DATABASE_URL is a postgres:// URL. Used in production.
 *   - SQLite (node:sqlite) for local development and tests.
 *
 * Every query goes through `db.prepare(sql).get|all|run(...params)` with `?` placeholders.
 * The Postgres adapter rewrites `?` to `$1..$n`, so SQL must never contain a literal `?`.
 * Always `await` the calls: they return promises on Postgres and plain values on SQLite.
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

let dbInstance = null;
let currentDbTarget = null;
let readyPromise = null;

const generateId = () => crypto.randomBytes(12).toString("hex");
const nowIso = () => new Date().toISOString();

const isPostgresUrl = (url) =>
    typeof url === "string" && (url.startsWith("postgres://") || url.startsWith("postgresql://"));

const toPgSql = (sql) => {
    let idx = 0;
    return sql.replace(/\?/g, () => `$${++idx}`);
};

const clean = (params) => params.map((p) => (p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p));

function createPgAdapter(pool) {
    return {
        type: "postgres",
        isPostgres: true,
        prepare(sql) {
            const pgSql = toPgSql(sql);
            return {
                async get(...params) {
                    const res = await pool.query(pgSql, clean(params));
                    return res.rows[0] || null;
                },
                async all(...params) {
                    const res = await pool.query(pgSql, clean(params));
                    return res.rows;
                },
                async run(...params) {
                    const res = await pool.query(pgSql, clean(params));
                    return { changes: res.rowCount };
                }
            };
        },
        exec(sql) {
            return pool.query(sql);
        },
        close() {
            return pool.end();
        }
    };
}

function createSqliteAdapter(sqliteDb) {
    return {
        type: "sqlite",
        isPostgres: false,
        prepare(sql) {
            const stmt = sqliteDb.prepare(sql);
            return {
                get: (...params) => stmt.get(...clean(params)) || null,
                all: (...params) => stmt.all(...clean(params)),
                run: (...params) => stmt.run(...clean(params))
            };
        },
        exec(sql) {
            return sqliteDb.exec(sql);
        },
        close() {
            return sqliteDb.close();
        }
    };
}

// Schema. Portable SQL: TEXT ids, ISO-8601 TEXT timestamps, INTEGER booleans, JSON stored as TEXT.
const TABLES = [
    "rec_events", "app_config", "feature_flags", "roles", "admin_audit", "guide_messages", "guide_conversations", "data_requests", "support_tickets",
    "verifications", "family_members", "reports", "blocks", "skips", "bookmarks", "photos",
    "user_settings", "stage_completions", "reflection_answers", "notifications", "messages", "chats",
    "connection_requests", "connections", "otps", "profiles", "users"
];

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    display_name TEXT NOT NULL DEFAULT '',
    password_hash TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    phone_verified INTEGER NOT NULL DEFAULT 0,
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    token_version INTEGER NOT NULL DEFAULT 0,
    is_seeded INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'member',
    last_active_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth TEXT,
    gender TEXT NOT NULL DEFAULT '',
    height_cm INTEGER,
    marital_status TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    education TEXT NOT NULL DEFAULT '',
    profession TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    intent TEXT NOT NULL DEFAULT '',
    avatar_photo_id TEXT,
    profile_status TEXT NOT NULL DEFAULT 'active',
    languages TEXT NOT NULL DEFAULT '[]',
    interests TEXT NOT NULL DEFAULT '[]',
    values_list TEXT NOT NULL DEFAULT '[]',
    lifestyle TEXT NOT NULL DEFAULT '{}',
    family TEXT NOT NULL DEFAULT '{}',
    preferences TEXT NOT NULL DEFAULT '{}',
    communication TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    mime TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id, kind);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS otps (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    purpose TEXT NOT NULL,
    target TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_sent_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    locked_until TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (subject, purpose)
);

CREATE TABLE IF NOT EXISTS connection_requests (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pair_key TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_recipient ON connection_requests(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_sender ON connection_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_pair ON connection_requests(pair_key, status);

CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    participant_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pair_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    stage TEXT NOT NULL DEFAULT 'connect',
    paused_by TEXT,
    paused_at TEXT,
    closed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_connections_a ON connections(participant_a);
CREATE INDEX IF NOT EXISTS idx_connections_b ON connections(participant_b);

CREATE TABLE IF NOT EXISTS stage_completions (
    connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (connection_id, stage, user_id)
);

CREATE TABLE IF NOT EXISTS reflection_answers (
    connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'reflect',
    value TEXT NOT NULL,
    other_text TEXT NOT NULL DEFAULT '',
    sharing TEXT NOT NULL DEFAULT 'keep_private',
    updated_at TEXT NOT NULL,
    PRIMARY KEY (connection_id, author_id, stage, question_key)
);

CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL UNIQUE REFERENCES connections(id) ON DELETE CASCADE,
    muted_by TEXT NOT NULL DEFAULT '[]',
    last_message_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    read_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    ref_id TEXT,
    payload TEXT NOT NULL DEFAULT '{}',
    read_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at);

CREATE TABLE IF NOT EXISTS bookmarks (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, target_id)
);

CREATE TABLE IF NOT EXISTS skips (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, target_id)
);

CREATE TABLE IF NOT EXISTS blocks (
    blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    content_type TEXT NOT NULL DEFAULT 'user',
    content_ref TEXT,
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    photo_ids TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    method TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    token_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    permissions TEXT NOT NULL DEFAULT '{}',
    accepted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_family_owner ON family_members(owner_id);

CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_review',
    details TEXT NOT NULL DEFAULT '{}',
    photo_ids TEXT NOT NULL DEFAULT '[]',
    reviewer_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);

CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ready',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guide_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    connection_id TEXT REFERENCES connections(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT '',
    topic TEXT NOT NULL DEFAULT 'general',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guide_conv_user ON guide_conversations(user_id, updated_at);

CREATE TABLE IF NOT EXISTS guide_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES guide_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guide_msg_conv ON guide_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS roles (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    permissions TEXT NOT NULL DEFAULT '[]',
    built_in INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    rollout INTEGER NOT NULL DEFAULT 100,
    roles TEXT NOT NULL DEFAULT '[]',
    config TEXT NOT NULL DEFAULT '{}',
    updated_by TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_by TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rec_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rec_events_user ON rec_events(user_id, type, created_at);
CREATE INDEX IF NOT EXISTS idx_rec_events_target ON rec_events(target_id, type);
CREATE INDEX IF NOT EXISTS idx_rec_events_time ON rec_events(created_at);

CREATE TABLE IF NOT EXISTS admin_audit (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    action TEXT NOT NULL,
    ref_id TEXT,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
`;

/** Columns added after the first release. Applied on start; each is a no-op when present. */
const MIGRATIONS = [
    { table: "users", column: "role", ddl: "TEXT NOT NULL DEFAULT 'member'" },
    { table: "admin_audit", column: "actor_id", ddl: "TEXT" }
];

const migratePg = async (pool) => {
    for (const m of MIGRATIONS) await pool.query(`ALTER TABLE ${m.table} ADD COLUMN IF NOT EXISTS ${m.column} ${m.ddl}`);
};

const migrateSqlite = (sqlite) => {
    for (const m of MIGRATIONS) {
        const cols = sqlite.prepare(`PRAGMA table_info(${m.table})`).all().map((c) => c.name);
        if (!cols.includes(m.column)) sqlite.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.ddl}`);
    }
};

const resolveTarget = (target) => {
    if (target) return target;
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
    if (isPostgresUrl(url)) return url;
    if (process.env.SQLITE_DB_PATH) return process.env.SQLITE_DB_PATH;
    if (process.env.NODE_ENV === "test") return ":memory:";
    if (process.env.VERCEL) {
        // Serverless file systems are read-only except /tmp, and /tmp is wiped between instances.
        if (process.env.ALLOW_EPHEMERAL_DB === "true") return "/tmp/sambandh_setu.db";
        return null;
    }
    return path.join(__dirname, "..", "data", "sambandh_setu.db");
};

const initDb = (target) => {
    const resolved = resolveTarget(target);
    if (!resolved) {
        const error = new Error("DATABASE_URL is not configured");
        error.code = "DB_NOT_CONFIGURED";
        throw error;
    }
    if (dbInstance && currentDbTarget === resolved) return dbInstance;
    if (dbInstance) {
        try { dbInstance.close(); } catch { /* already closed */ }
        dbInstance = null;
        readyPromise = null;
    }
    currentDbTarget = resolved;

    if (isPostgresUrl(resolved)) {
        const { Pool, types } = require("pg");
        types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));
        const pool = new Pool({
            connectionString: resolved,
            // Verify the server certificate by default. Set PGSSL_REJECT_UNAUTHORIZED=false only for
            // providers that use a private CA you cannot pin.
            ssl: { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== "false" },
            max: Number(process.env.PG_POOL_MAX || (process.env.VERCEL ? 3 : 10)),
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 10000
        });
        pool.on("error", (err) => console.error("Postgres idle client error: code=%s", err.code || "none"));
        dbInstance = createPgAdapter(pool);
        readyPromise = pool.query(SCHEMA_DDL).then(() => migratePg(pool)).then(() => true);
        readyPromise.catch((err) => {
            console.error("Postgres schema init failed: code=%s", err.code || "none");
            readyPromise = null;
        });
        return dbInstance;
    }

    const { DatabaseSync } = require("node:sqlite");
    if (resolved !== ":memory:") {
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
    }
    const sqlite = new DatabaseSync(resolved);
    sqlite.exec("PRAGMA foreign_keys = ON;");
    if (resolved !== ":memory:") {
        try { sqlite.exec("PRAGMA journal_mode = WAL;"); } catch { /* optional */ }
    }
    sqlite.exec(SCHEMA_DDL);
    migrateSqlite(sqlite);
    dbInstance = createSqliteAdapter(sqlite);
    readyPromise = Promise.resolve(true);
    return dbInstance;
};

const getDb = () => dbInstance || initDb();

/** Resolves once the schema exists. Safe to call on every request. */
const ensureReady = async () => {
    getDb();
    if (!readyPromise) {
        // A previous init failed: retry once by re-running the DDL.
        const db = getDb();
        readyPromise = Promise.resolve(db.exec(SCHEMA_DDL)).then(() => true);
    }
    return readyPromise;
};

const closeDb = async () => {
    if (dbInstance) {
        try { await dbInstance.close(); } catch { /* ignore */ }
    }
    dbInstance = null;
    currentDbTarget = null;
    readyPromise = null;
};

const isReady = () => dbInstance !== null;

/** Test helper: empties every table. */
const resetDb = async () => {
    const db = getDb();
    await ensureReady();
    if (db.isPostgres) {
        await db.exec(`TRUNCATE ${TABLES.join(", ")} CASCADE;`);
    } else {
        db.exec("PRAGMA foreign_keys = OFF;");
        for (const table of TABLES) db.exec(`DELETE FROM ${table};`);
        db.exec("PRAGMA foreign_keys = ON;");
    }
};

module.exports = { initDb, getDb, ensureReady, closeDb, isReady, resetDb, generateId, nowIso, isPostgresUrl, SCHEMA_DDL };
