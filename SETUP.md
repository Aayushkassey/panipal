# Pani Pal — Setup (reminders in the notification bar, Android + iPhone)

How it works: your phone subscribes to **Web Push**. A tiny server (Netlify Functions) checks every minute whether a reminder is due and pushes it. So the notification arrives even when the app is closed.

You do this **once**. Needs: a GitHub account, a Netlify account, a free cron-job.org account.

## 1. Push this folder to GitHub
Push the contents of `pani-pal-push` so that `netlify.toml`, `package.json`, `public/` and `netlify/` are at the **root** of the repo.
(Do **not** commit `NETLIFY-ENV-VALUES.txt`.)

> Drag-and-drop deploy will **not** work now, because the server functions need a Git deploy.

## 2. Deploy on Netlify
1. Netlify → **Add new site → Import an existing project → GitHub** → pick the repo.
2. Build command: empty. Publish directory: `public` (it is already in `netlify.toml`).
3. Before (or right after) the first deploy, add these 4 variables in **Site configuration → Environment variables**. Values are in `NETLIFY-ENV-VALUES.txt`:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (put your own email, like `mailto:you@gmail.com`)
   - `CRON_SECRET`
4. If you added the variables after the first deploy: **Deploys → Trigger deploy → Clear cache and deploy site**.

## 3. Add the every-minute trigger (cron-job.org)
1. Make a free account at https://cron-job.org
2. **Create cronjob** → URL: `https://YOUR-SITE.netlify.app/api/send-reminders?key=YOUR_CRON_SECRET` (full URL is in the values file).
3. Schedule: **every 1 minute**. Save.
4. Open the cronjob's history: you should see status `200`. Opening that URL in a browser should show something like `{"ok":true,"checked":0,"sent":0,...}`.

## 4. Install on phones
- **Android (Chrome):** open your site → **Install App** (or ⋮ → Install app).
- **iPhone (Safari, iOS 16.4 or newer):** open your site in **Safari** → Share → **Add to Home Screen**. **Open Pani Pal from the Home Screen icon** (not from Safari). iOS only allows push for installed apps.

## 5. Turn it on
1. Open the app → set hours + interval → **Save schedule** → **Start reminders** → **Allow** notifications.
2. Tap **Test popup**, lock the phone. A notification should come within a few seconds. If this works, the whole chain (phone → server → push) works.

## If something doesn't work
| Problem | Fix |
|---|---|
| "Server is not set up yet (VAPID key missing)" | Env variables missing → add them and redeploy (clear cache) |
| Test works but scheduled reminders don't | cron-job.org job not running / wrong `key=` → check its history for 401 |
| Nothing on iPhone | Must be iOS 16.4+, added to Home Screen, and opened from that icon. Check Settings → Notifications → Pani Pal |
| Late or missing on some Android phones | Settings → Apps → Pani Pal (or Chrome) → Battery → Unrestricted |
| Phone stops getting reminders after a long time | Open the app and press Start again (re-subscribes) |

## Changing the app later
Edit files in `public/`, bump `CACHE_NAME` in `public/sw.js` (`v5` → `v6`), push to GitHub. Netlify redeploys.

## Notes
- Reminder times use the phone's time zone (sent when you save).
- Only your subscription + schedule are stored (Netlify Blobs). No accounts, no personal data.
- Netlify now uses a monthly credit system. This app makes about 43,000 tiny calls a month (once a minute), which should be small, but check your Netlify usage page after a few days.
