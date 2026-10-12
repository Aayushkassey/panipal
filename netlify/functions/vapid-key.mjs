import { json } from "../lib/push.mjs";
export default async () => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return json({ error: "VAPID_PUBLIC_KEY not set" }, 500);
  return json({ key });
};
export const config = { path: "/api/vapid-key" };
