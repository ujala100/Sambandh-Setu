/**
 * Response shapes. Anything about another member is built here, so the sharing switches in
 * Privacy & Visibility ("Profile information sharing") are honoured everywhere.
 */
const Users = require("../models/users");

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const isOnline = (user, settings) => Boolean(settings?.privacy?.showOnlineStatus) &&
    Boolean(user.last_active_at) && Date.now() - Date.parse(user.last_active_at) < ONLINE_WINDOW_MS;

const displayNameFor = (user, sharing) => {
    const first = Users.firstName(user);
    return sharing?.name === false ? `${first.charAt(0)}.` : first;
};

/** Small card used in Discover, requests, connections and chat lists. */
const personCard = (t, { verified = false, bookmarked = false } = {}) => {
    const { user, profile, settings } = t;
    const s = settings.privacy.sharing;
    return {
        id: user.id,
        name: displayNameFor(user, s),
        age: s.age === false ? null : profile.age,
        location: s.location === false ? "" : profile.location,
        profession: s.profession === false ? "" : profile.profession,
        education: s.education === false ? "" : profile.education,
        bio: profile.bio,
        interests: (profile.interests || []).slice(0, 6),
        values: (profile.values || []).slice(0, 6),
        photoUrl: s.photos === false && t.relation !== "connected" ? null : Users.photoUrl(profile.avatarPhotoId),
        verified,
        online: isOnline(user, settings),
        bookmarked
    };
};

/** Full profile page of another member (tabs: Overview, About, Lifestyle, Family). */
const personProfile = (t, extra = {}) => {
    const card = personCard(t, extra);
    const { user, profile, settings, relation } = t;
    const s = settings.privacy.sharing;
    const family = profile.family || {};
    const showFamily = s.family === true;
    const religion = s.religion === false ? null : { religion: family.religion || "", caste: family.caste || "" };
    return {
        ...card,
        relation,
        heightCm: profile.heightCm,
        maritalStatus: profile.maritalStatus,
        intent: profile.intent,
        languages: profile.languages,
        lifestyle: profile.lifestyle,
        communication: profile.communication,
        religion,
        family: showFamily ? family : null,
        familyShared: showFamily,
        relocation: profile.preferences?.additional?.relocation || "",
        income: s.contact === true ? profile.lifestyle?.income || "" : "",
        contact: relation === "connected" && s.contact === true ? { email: user.email, phone: user.phone || "" } : null,
        memberSince: user.created_at,
        ...extra.links
    };
};

const meView = (user, profile, settings, { verification = {}, photoCount = 0 } = {}) => {
    const comp = Users.completeness(user, profile, { privacyReviewed: settings?.privacy?.reviewed });
    return {
        id: user.id,
        name: user.display_name,
        firstName: Users.firstName(user),
        email: user.email,
        phone: user.phone || "",
        emailVerified: Boolean(user.email_verified),
        phoneVerified: Boolean(user.phone_verified),
        onboardingCompleted: Boolean(user.onboarding_completed),
        status: user.status,
        role: user.role || "member",
        hasPassword: Boolean(user.password_hash),
        createdAt: user.created_at,
        photoUrl: Users.photoUrl(profile?.avatarPhotoId),
        profile,
        completeness: comp,
        verification,
        photoCount
    };
};

module.exports = { personCard, personProfile, meView, isOnline };
