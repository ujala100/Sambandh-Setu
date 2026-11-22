/**
 * All API routes. Mounted at /api (and /api/v1) by app.js.
 */
const express = require("express");
const { requireAuth } = require("../middleware/requireAuth");
const { otpIpRateLimiter, otpEmailRateLimiter, authIpLimiter, createUserRateLimiter } = require("../middleware/rateLimit");
const { asyncHandler: a } = require("../utils/helpers");
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

// ----- Public -----
router.get("/auth/config", auth.config);
router.post("/auth/signup", authIpLimiter, a(auth.signup));
router.post("/auth/login", authIpLimiter, a(auth.login));
router.post("/auth/login/code", ...otp, a(auth.requestLoginCode));
router.post("/auth/login/verify", ...otp, a(auth.loginWithCode));
router.post("/auth/forgot-password", ...otp, a(auth.forgotPassword));
router.post("/auth/reset-password", ...otp, a(auth.resetPassword));
router.get("/photos/:id", a(servePhoto));
router.get("/family/invitations/:token", a(family.invitation));
router.post("/family/invitations/:token/accept", a(family.accept));
router.post("/family/invitations/:token/decline", a(family.decline));

// ----- Admin (disabled unless ADMIN_API_KEY is set) -----
router.get("/admin/queue", admin.requireAdmin, a(admin.queue));
router.get("/admin/verifications/:id/docs", admin.requireAdmin, a(admin.verificationDocs));
router.post("/admin/verifications/:id/decision", admin.requireAdmin, a(admin.decideVerification));
router.post("/admin/reports/:id/close", admin.requireAdmin, a(admin.closeReport));
router.post("/admin/tickets/:id/close", admin.requireAdmin, a(admin.closeTicket));
router.post("/admin/users/:userId/suspend", admin.requireAdmin, a(admin.suspendUser));

// ----- Signed in -----
router.use(requireAuth);

router.post("/auth/verify-email", ...otp, a(auth.verifyEmail));
router.post("/auth/verify-email/resend", ...otp, a(auth.resendEmailCode));
router.post("/auth/change-password", a(auth.changePassword));
router.post("/auth/logout", a(auth.logout));
router.post("/auth/refresh", a(me.refreshSession));

router.get("/me", a(me.getMe));
router.patch("/me/account", a(me.updateAccount));
router.patch("/me/profile", a(me.updateProfile));
router.post("/me/photo", a(me.uploadPhoto));
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

router.get("/discover", a(people.discover));
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
router.get("/connections/:connectionId/reflect", a(conn.getReflect));
router.put("/connections/:connectionId/reflect/answers/:questionKey", a(conn.saveAnswer));
router.post("/connections/:connectionId/reflect/sharing", a(conn.updateSharing));

router.get("/chats", a(chat.listChats));
router.get("/chats/:chatId/messages", a(chat.listMessages));
router.post("/chats/:chatId/messages", a(chat.sendMessage));
router.post("/chats/:chatId/read", a(chat.markRead));
router.put("/chats/:chatId/mute", a(chat.setMuted));
router.get("/chats/:chatId/profile", a(chat.chatProfile));

router.get("/notifications", a(notif.listNotifications));
router.get("/notifications/unread-count", a(notif.unreadCount));
router.post("/notifications/read-all", a(notif.markAllRead));
router.post("/notifications/:notificationId/read", a(notif.markRead));

router.get("/blocks", a(safety.listBlocks));
router.post("/blocks", a(safety.block));
router.delete("/blocks/:userId", a(safety.unblock));
router.post("/reports", a(safety.report));
router.post("/support/tickets", a(safety.createTicket));

router.get("/family", a(family.list));
router.post("/family/invites", a(family.invite));
router.patch("/family/:memberId", a(family.updatePermissions));
router.delete("/family/:memberId", a(family.remove));
router.post("/family/:memberId/resend", a(family.resend));

router.get("/verification", a(verification.getStatus));
router.post("/verification", a(verification.submit));
router.delete("/verification/:id", a(verification.withdraw));

router.post("/guide/chat", guideLimiter, a(guide.chat));
router.get("/guide/conversations", a(guide.listConversations));
router.delete("/guide/conversations", a(guide.clearConversations));
router.get("/guide/conversations/:conversationId", a(guide.getConversation));
router.delete("/guide/conversations/:conversationId", a(guide.deleteConversation));

module.exports = router;
