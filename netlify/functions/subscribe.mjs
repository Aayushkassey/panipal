import { getStore } from "@netlify/blobs";
import { json, keyOf } from "../lib/push.mjs";
import { validTz } from "../lib/slots.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const { subscription, settings, tz } = body || {};
  if (!subscription?.endpoint || !subscription?.keys) return json({ error: "Missing subscription" }, 400);
  const ok = settings && /^\d{2}:\d{2}$/.test(settings.start) && /^\d{2}:\d{2}$/.test(settings.end)
    && Number.isFinite(settings.interval) && settings.interval >= 5 && settings.interval <= 720;
  if (!ok) return json({ error: "Bad settings" }, 400);
  if (!tz || !validTz(tz)) return json({ error: "Bad timezone" }, 400);

  const store = getStore("subscriptions");
  const key = keyOf(subscription.endpoint);
  const old = await store.get(key, { type: "json" }).catch(() => null);
  await store.setJSON(key, {
    subscription,
    settings: { start: settings.start, end: settings.end, interval: Math.round(settings.interval) },
    tz,
    lastSent: old?.lastSent || 0,
    updated: Date.now()
  });
  return json({ ok: true });
};
export const config = { path: "/api/subscribe" };
