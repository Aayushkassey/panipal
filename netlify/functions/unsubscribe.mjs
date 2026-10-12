import { getStore } from "@netlify/blobs";
import { json, keyOf } from "../lib/push.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  if (!body?.endpoint) return json({ error: "Missing endpoint" }, 400);
  await getStore("subscriptions").delete(keyOf(body.endpoint));
  return json({ ok: true });
};
export const config = { path: "/api/unsubscribe" };
