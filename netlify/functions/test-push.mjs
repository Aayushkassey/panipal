import { json, setup, webpush } from "../lib/push.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  if (!body?.subscription?.endpoint) return json({ error: "Missing subscription" }, 400);
  try {
    setup();
    await webpush.sendNotification(body.subscription, JSON.stringify({ title: "Pani Pal test 💧", body: "Notifications are working!" }), { TTL: 120, urgency: "high" });
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e.message || e), status: e.statusCode || 500 }, 500);
  }
};
export const config = { path: "/api/test-push" };
