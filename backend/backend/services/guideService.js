/**
 * Bridge to the Python Setu Guide service (setu_ai/). Returns null when the service is not configured
 * or does not answer in time, so the caller can fall back to the built-in responder.
 */
const callService = async (payload) => {
    const base = process.env.GUIDE_SERVICE_URL;
    if (!base) return null;
    try {
        const res = await fetch(`${base.replace(/\/+$/, "")}/v1/guide/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(process.env.GUIDE_SERVICE_KEY ? { "X-Guide-Key": process.env.GUIDE_SERVICE_KEY } : {}) },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(Number(process.env.GUIDE_TIMEOUT_MS || 12000))
        });
        if (!res.ok) {
            console.warn("Setu Guide service unavailable: status=%s", res.status);
            return null;
        }
        const body = await res.json();
        return body?.data || body;
    } catch (error) {
        console.warn("Setu Guide service unreachable: name=%s", error.name || "Error");
        return null;
    }
};

module.exports = { callService };
