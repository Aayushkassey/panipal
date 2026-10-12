import webpush from "web-push";
import { createHash } from "node:crypto";

let ready = false;
export function setup() {
  if (ready) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error("VAPID keys are missing in Netlify environment variables");
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  ready = true;
}
export const keyOf = endpoint => createHash("sha256").update(endpoint).digest("hex");
export { webpush };
export const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
