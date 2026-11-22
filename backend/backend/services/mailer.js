/**
 * Outgoing email (Brevo). Email is optional: when it is not configured, features that need it
 * report `EMAIL_UNAVAILABLE` instead of pretending a message was sent.
 *
 * Local development can set EMAIL_PROVIDER=console to print messages to the server log.
 * The console provider is refused in production.
 */
const provider = () => String(process.env.EMAIL_PROVIDER || "").toLowerCase();

const isEmailConfigured = () => {
    if (provider() === "brevo") return Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_FROM);
    if (provider() === "console") return process.env.NODE_ENV !== "production";
    return false;
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const sendEmail = async ({ to, subject, text, html }) => {
    if (!isEmailConfigured()) {
        const error = new Error("Email is not configured");
        error.code = "EMAIL_UNAVAILABLE";
        throw error;
    }
    if (provider() === "console") {
        console.info(`[email:console] to=${to} subject="${subject}"\n${text}`);
        return;
    }
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { accept: "application/json", "api-key": process.env.EMAIL_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({
            sender: { name: process.env.EMAIL_FROM_NAME || "Sambandh Setu", email: process.env.EMAIL_FROM },
            to: [{ email: to }],
            subject,
            textContent: text,
            htmlContent: html || `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`
        }),
        signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
        // Never log the address, body or provider response.
        console.error("Email provider failed: status=%s", response.status);
        const error = new Error("Email could not be sent");
        error.code = "EMAIL_SEND_FAILED";
        throw error;
    }
};

const PURPOSE_TEXT = {
    signup: "confirm your email address",
    login: "sign in",
    reset: "reset your password",
    change_email: "confirm your new email address",
    delete_account: "confirm that you want to delete your account"
};

const sendOtpEmail = (to, code, purpose = "signup") => {
    const action = PURPOSE_TEXT[purpose] || "continue";
    return sendEmail({
        to,
        subject: "Your Sambandh Setu verification code",
        text: `Use ${code} to ${action} on Sambandh Setu. The code expires in 10 minutes.\n\nIf you did not ask for this, you can ignore this email.`,
        html: `<p>Use this code to ${escapeHtml(action)} on Sambandh Setu:</p><h2 style="letter-spacing:4px">${code}</h2><p>The code expires in 10 minutes. If you did not ask for this, you can ignore this email.</p>`
    });
};

const sendFamilyInviteEmail = (to, { inviterName, relationship, link, message }) => sendEmail({
    to,
    subject: `${inviterName} invited you to Sambandh Setu`,
    text: `${inviterName} has invited you, as their ${relationship.toLowerCase()}, to view selected parts of their Sambandh Setu profile.\n\n${message ? `Their note: "${message}"\n\n` : ""}Open the invitation: ${link}\n\nYou can accept or decline on that page.`
});

module.exports = { isEmailConfigured, sendEmail, sendOtpEmail, sendFamilyInviteEmail };
