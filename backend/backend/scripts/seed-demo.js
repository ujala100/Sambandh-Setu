/**
 * Local demo data for design review. Refuses to run against Postgres or in production.
 *
 *   npm run seed:demo
 *
 * Creates "you" (demo@sambandhsetu.local) plus a few clearly fictional members, one accepted
 * connection with chat history and one pending request. Prints the sign-in password.
 */
require("dotenv").config({ quiet: true });
const crypto = require("crypto");

if (process.env.NODE_ENV === "production" || /^postgres/.test(process.env.DATABASE_URL || "")) {
    console.error("seed-demo only runs against the local SQLite database.");
    process.exit(1);
}

const { initDb, ensureReady, getDb, generateId, nowIso } = require("../db");
const Users = require("../models/users");
const Settings = require("../models/settings");

const PEOPLE = [
    { name: "Rohan Verma", gender: "Man", dob: "1998-03-14", location: "Hyderabad, Telangana", profession: "Software Engineer", education: "B.Tech, Computer Science", bio: "I value meaningful conversations, family and personal growth. Looking for a kind and supportive partner.", interests: ["Travel", "Reading", "Music", "Cricket"], values: ["Honesty", "Respect", "Family-oriented"] },
    { name: "Karthik Iyer", gender: "Man", dob: "1997-08-02", location: "Bengaluru, Karnataka", profession: "Product Manager", education: "MBA", bio: "I enjoy exploring new places, good food and meaningful discussions.", interests: ["Travel", "Food", "Fitness"], values: ["Kindness", "Personal Growth"] },
    { name: "Arjun Nair", gender: "Man", dob: "1996-11-21", location: "Chennai, Tamil Nadu", profession: "Data Scientist", education: "M.Sc, Statistics", bio: "Looking for a kind and supportive partner to grow together.", interests: ["Reading", "Fitness", "Movies"], values: ["Honesty", "Open Communication"] },
    { name: "Varun Joshi", gender: "Man", dob: "1998-06-30", location: "Pune, Maharashtra", profession: "Product Designer", education: "B.Des", bio: "I enjoy meaningful conversations and value honesty.", interests: ["Design", "Music", "Travel"], values: ["Respect", "Emotional Maturity"] }
];

const PASSWORD = `Demo@${crypto.randomInt(1000, 9999)}!`;

(async () => {
    initDb();
    await ensureReady();
    const db = getDb();
    if (await Users.findByEmail("demo@sambandhsetu.local")) {
        console.log("Demo data already exists. Delete backend/backend/data/sambandh_setu.db to start again.");
        process.exit(0);
    }
    const hash = await Users.hashPassword(PASSWORD);
    const make = async (p, email) => {
        const u = await Users.createUser({ email, displayName: p.name, passwordHash: hash, emailVerified: true, isSeeded: true });
        await Users.updateProfile(u.id, {
            date_of_birth: p.dob, gender: p.gender, location: p.location, profession: p.profession, education: p.education,
            bio: p.bio, interests: p.interests, values_list: p.values, intent: "marriage", languages: ["English", "Hindi"],
            lifestyle: { food: { style: "Mix of home-cooked & eating out" }, fitness: { activities: ["Walking", "Yoga"] } },
            family: { familyType: "Nuclear Family", father: "Businessman", mother: "Homemaker", values: "Traditional with modern outlook" }
        });
        await Settings.updateSettings(u.id, { privacy: { whoCanSeeProfile: "everyone", showOnlineStatus: true } });
        await Users.updateUser(u.id, { onboarding_completed: 1 });
        return u;
    };
    const me = await make({ name: "Aanya Sharma", gender: "Woman", dob: "1999-06-12", location: "Hyderabad, Telangana", profession: "Product Designer", education: "Bachelor of Design", bio: "I value meaningful conversations, personal growth, and a supportive partnership.", interests: ["Travel", "Reading", "Music", "Classical Music"], values: ["Honesty", "Respect", "Family-oriented"] }, "demo@sambandhsetu.local");
    const others = [];
    for (const [i, p] of PEOPLE.entries()) others.push(await make(p, `demo${i + 1}@sambandhsetu.local`));

    const now = nowIso();
    // Rohan: connected, in Understand, with a short chat.
    const rohan = others[0];
    const connId = generateId();
    const pk = [me.id, rohan.id].sort().join(":");
    await db.prepare("INSERT INTO connection_requests (id, sender_id, recipient_id, pair_key, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'accepted', ?, ?)").run(generateId(), rohan.id, me.id, pk, now, now);
    await db.prepare("INSERT INTO connections (id, participant_a, participant_b, pair_key, status, stage, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', 'understand', ?, ?)").run(connId, rohan.id, me.id, pk, now, now);
    for (const uid of [me.id, rohan.id]) await db.prepare("INSERT INTO stage_completions (connection_id, stage, user_id, created_at) VALUES (?, 'connect', ?, ?)").run(connId, uid, now);
    const chatId = generateId();
    await db.prepare("INSERT INTO chats (id, connection_id, created_at, last_message_at) VALUES (?, ?, ?, ?)").run(chatId, connId, now, now);
    const lines = [[rohan.id, "Hi! It was great connecting with you here. I liked your interest in travel and books."], [me.id, "Hi Rohan! Thank you. Yes, travel and reading are two things I really enjoy."], [rohan.id, "That's wonderful! Do you have a favourite travel destination so far?"], [me.id, "I loved my trip to Himachal. The mountains were so calm. How about you?"]];
    for (const [i, [sender, text]] of lines.entries()) {
        await db.prepare("INSERT INTO messages (id, chat_id, sender_id, text, created_at) VALUES (?, ?, ?, ?, ?)").run(generateId(), chatId, sender, text, new Date(Date.now() - (lines.length - i) * 60000).toISOString());
    }
    // Karthik: has sent interest to you.
    const k = others[1];
    await db.prepare("INSERT INTO connection_requests (id, sender_id, recipient_id, pair_key, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)")
        .run(generateId(), k.id, me.id, [me.id, k.id].sort().join(":"), "I'd like to get to know you.", now, now);

    console.log("\nDemo data created (local only).");
    console.log("  Sign in:  demo@sambandhsetu.local");
    console.log(`  Password: ${PASSWORD}\n`);
    process.exit(0);
})().catch((e) => {
    console.error("Seeding failed:", e.code || e.name);
    process.exit(1);
});
