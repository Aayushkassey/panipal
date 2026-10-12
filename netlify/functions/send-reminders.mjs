import { getStore } from "@netlify/blobs";
import { json, setup, webpush } from "../lib/push.mjs";
import { dueSlot } from "../lib/slots.mjs";

// Called every minute by an external cron (cron-job.org): GET /api/send-reminders?key=<CRON_SECRET>
export default async (req) => {
  const secret = process.env.CRON_SECRET;
  const given = new URL(req.url).searchParams.get("key") || req.headers.get("x-cron-key");
  if (!secret || given !== secret) return json({ error: "Unauthorized" }, 401);

  try { setup(); } catch (e) { return json({ error: String(e.message) }, 500); }
  const store = getStore("subscriptions");
  const now = Date.now();
  const { blobs } = await store.list();
  let sent = 0, removed = 0, failed = 0;

  for (let i = 0; i < blobs.length; i += 20) {
    await Promise.all(blobs.slice(i, i + 20).map(async ({ key }) => {
      try {
        const rec = await store.get(key, { type: "json" });
        if (!rec) return;
        const slot = dueSlot(now, rec);
        if (slot === null) return;
        try {
          await webpush.sendNotification(rec.subscription, JSON.stringify({
            title: "Time to drink water! 💧",
            body: "Take a few sips now. Your body will thank you."
          }), { TTL: 600, urgency: "high" });
          rec.lastSent = slot;
          await store.setJSON(key, rec);
          sent++;
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) { await store.delete(key); removed++; }
          else { failed++; console.error("push failed", e.statusCode, e.message); }
        }
      } catch (e) { failed++; console.error(e); }
    }));
  }
  return json({ ok: true, checked: blobs.length, sent, removed, failed });
};
export const config = { path: "/api/send-reminders" };
