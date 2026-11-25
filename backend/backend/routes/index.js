/**
 * All API routes. Mounted at /api (and /api/v1) by app.js.
 *
 * Features that admins can switch off live are wrapped in requireFeature(key); maintenance mode
 * is applied to every write by maintenanceGuard. Team console routes name the permission they need.
 */
const express = require("express");
const { requireAuth, optionalAuth } = require("../middleware/requireAuth");
const { otpIpRateLimiter, otpEmailRateLimiter, authIpLimiter, createUserRateLimiter } = require("../middleware/rateLimit");
const { maintenanceGuard } = require("../middleware/maintenance");
const { requireFeature: feature, evaluate } = require("../services/features");
const realtime = require("../services/realtime");
const { asyncHandler: a, ok } = require("../utils/helpers");
const auth = require("../controllers/authController");
const me = require("../controllers/meController");
const people = require("../controllers/peopleController");
const conn = require("../controllers/connectionController");
const chat = require("../controllers/chatController");
const notif = require("../controllers/notificationController");
const home = require("../controllers/homeController");
const safety = require("../controllers/safetyController");
const family = require("../controllers/familyController");
const verification = require("../controllers/verificationController");
const guide = require("../controllers/guideController");
const admin = require("../controllers/adminController");
const { servePhoto } = require("../services/photos");

const router = express.Router();
const otp = [otpIpRateLimiter, otpEmailRateLimiter];
const guideLimiter = createUserRateLimiter({ windowMs: 60 * 1000, maxRequests: Number(process.env.GUIDE_RATE_PER_MINUTE || 20) });

router.use(maintenanceGuard);

// ----- Public -----
router.get("/auth/config", auth.config);
router.get("/features", optionalAuth, a(async (req, res) => {
    res.set("Cache-Control", "no-store");
    ok(res, await evaluate(req.user || null));
}));
router.post("/auth/signup", authIpLimiter, feature("signups"), a(auth.signup));
router.post("/auth/login", authIpLimiter, a(auth.login));
router.post("/auth/login/code", ...otp, a(auth.requestLoginCode));
router.post("/auth/login/verify", ...otp, a(auth.loginWithCode));
router.post("/auth/forgot-password", ...otp, a(auth.forgotPassword));
router.post("/auth/reset-password", ...otp, a(auth.resetPassword));
router.get("/photos/:id", a(servePhoto));
router.get("/family/invitations/:token", feature("family_access"), a(family.invitation));
router.post("/family/invitations/:token/accept", feature("family_access"), a(family.accept));
router.post("/family/invitations/:token/decline", feature("family_access"), a(family.decline));

// ----- Team console (permission-based; the X-Admin-Key header acts as super admin) -----
const P = admin.perm;
router.get("/admin/me", P(), a(admin.me));
router.get("/admin/overview", P("overview.view"), a(admin.overview));
router.get("/admin/analytics", P("analytics.view"), a(admin.analytics));
router.get("/admin/verifications", P("verifications.review"), a(admin.listVerifications));
router.get("/admin/verifications/:id/docs", P("verifications.review"), a(admin.verificationDocs));
router.post("/admin/verifications/:id/decision", P("verifications.review"), a(admin.decideVerification));
router.get("/admin/reports", P("reports.review"), a(admin.listReports));
router.get("/admin/reports/:id/images", P("reports.review"), a(admin.reportImages));
router.post("/admin/reports/:id/close", P("reports.review"), a(admin.closeReport));
router.get("/admin/tickets", P("tickets.handle"), a(admin.listTickets));
router.post("/admin/tickets/:id/close", P("tickets.handle"), a(admin.closeTicket));
router.get("/admin/members", P("members.view"), a(admin.listMembers));
router.get("/admin/members/:userId", P("members.view"), a(admin.getMember));
router.post("/admin/members/:userId/suspend", P("members.suspend"), a(admin.suspendMember));
router.post("/admin/members/:userId/reactivate", P("members.suspend"), a(admin.reactivateMember));
router.post("/admin/members/:userId/role", P("members.roles"), a(admin.setRole));
router.get("/admin/roles", P("roles.manage", "members.roles"), a(admin.listRoles));
router.post("/admin/roles", P("roles.manage"), a(admin.createRole));
router.patch("/admin/roles/:key", P("roles.manage"), a(admin.updateRole));
router.delete("/admin/roles/:key", P("roles.manage"), a(admin.deleteRole));
router.get("/admin/features", P("features.manage"), a(admin.listFeatures));
router.patch("/admin/features/:key", P("features.manage"), a(admin.updateFeature));
router.get("/admin/recommendations", P("recommendations.manage", "analytics.view"), a(admin.getRecommender));
router.patch("/admin/recommendations", P("recommendations.manage"), a(admin.updateRecommender));
router.get("/admin/audit", P("audit.view"), a(admin.listAudit));

// ----- Signed in -----
router.use(requireAuth);

router.post("/auth/verify-email", ...otp, a(auth.verifyEmail));
router.post("/auth/verify-email/resend", ...otp, a(auth.resendEmailCode));
router.post("/auth/change-password", a(auth.changePassword));
router.post("/auth/logout", a(auth.logout));
router.post("/auth/refresh", a(me.refreshSession));
router.post("/admin/claim", ...otp, a(admin.claim));

router.get("/realtime/poll", a(realtime.poll));
router.get("/realtime/stream", feature("realtime_stream"), a(realtime.stream));

router.get("/me", a(me.getMe));
router.patch("/me/account", a(me.updateAccount));
router.patch("/me/profile", a(me.updateProfile));
router.post("/me/photo", feature("photo_uploads"), a(me.uploadPhoto));
router.delete("/me/photo", a(me.removePhoto));
router.get("/me/settings", a(me.getSettings));
router.patch("/me/settings", a(me.updateSettings));
router.post("/me/onboarding/complete", a(me.completeOnboarding));
router.post("/me/email/change", ...otp, a(me.requestEmailChange));
router.post("/me/email/confirm", ...otp, a(me.confirmEmailChange));
router.patch("/me/phone", a(me.updatePhone));
router.get("/me/export", a(me.downloadData));
router.post("/me/delete/code", ...otp, a(me.requestDeleteCode));
router.post("/me/deactivate", a(me.deactivate));
router.delete("/me", a(me.deleteAccount));

router.get("/home", a(home.getHome));

router.get("/discover", feature("discover"), a(people.discover));
router.get("/bookmarks", a(people.listBookmarks));
router.get("/people/:userId", a(people.getPerson));
router.post("/people/:userId/bookmark", a(people.bookmark));
router.delete("/people/:userId/bookmark", a(people.unbookmark));
router.post("/people/:userId/skip", a(people.skip));

router.get("/requests", a(conn.listRequests));
router.post("/requests", a(conn.sendRequest));
router.post("/requests/:requestId/accept", a(conn.acceptRequest));
router.post("/requests/:requestId/decline", a(conn.declineRequest));
router.delete("/requests/:requestId", a(conn.withdrawRequest));

router.get("/connections", a(conn.listConnections));
router.get("/stages/:stage", a(conn.getStageContent));
router.get("/connections/:connectionId", a(conn.getConnection));
router.post("/connections/:connectionId/pause", a(conn.pauseConnection));
router.post("/connections/:connectionId/resume", a(conn.resumeConnection));
router.post("/connections/:connectionId/close", a(conn.closeConnection));
router.get("/connections/:connectionId/journey", a(conn.getJourney));
router.post("/connections/:connectionId/stages/:stage/complete", a(conn.completeStage));
router.get("/connections/:connectionId/reflect", feature("reflect"), a(conn.getReflect));
router.put("/connections/:connectionId/reflect/answers/:questionKey", feature("reflect"), a(conn.saveAnswer));
router.post("/connections/:connectionId/reflect/sharing", feature("reflect"), a(conn.updateSharing));

router.get("/chats", feature("chat"), a(chat.listChats));
router.get("/chats/:chatId/messages", feature("chat"), a(chat.listMessages));
router.post("/chats/:chatId/messages", feature("chat"), a(chat.sendMessage));
router.post("/chats/:chatId/read", feature("chat"), a(chat.markRead));
router.put("/chats/:chatId/mute", feature("chat"), a(chat.setMuted));
router.get("/chats/:chatId/profile", feature("chat"), a(chat.chatProfile));

router.get("/notifications", a(notif.listNotifications));
router.get("/notifications/unread-count", a(notif.unreadCount));
router.post("/notifications/read-all", a(notif.markAllRead));
router.post("/notifications/:notificationId/read", a(notif.markRead));

router.get("/blocks", a(safety.listBlocks));
router.post("/blocks", a(safety.block));
router.delete("/blocks/:userId", a(safety.unblock));
router.post("/reports", a(safety.report));
router.post("/support/tickets", a(safety.createTicket));

router.get("/family", feature("family_access"), a(family.list));
router.post("/family/invites", feature("family_access"), a(family.invite));
router.patch("/family/:memberId", feature("family_access"), a(family.updatePermissions));
router.delete("/family/:memberId", a(family.remove));
router.post("/family/:memberId/resend", feature("family_access"), a(family.resend));

router.get("/verification", a(verification.getStatus));
router.post("/verification", feature("verification"), a(verification.submit));
router.delete("/verification/:id", a(verification.withdraw));

router.post("/guide/chat", feature("setu_guide"), guideLimiter, a(guide.chat));
router.get("/guide/conversations", a(guide.listConversations));
router.delete("/guide/conversations", a(guide.clearConversations));
router.get("/guide/conversations/:conversationId", a(guide.getConversation));
router.delete("/guide/conversations/:conversationId", a(guide.deleteConversation));

module.exports = router;
