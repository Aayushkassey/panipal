// Pure scheduling logic (no I/O) so it is easy to test.
export function toMin(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

export function validTz(tz) {
  try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); return true; } catch { return false; }
}

export function localMinutes(date, tz) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  const h = Number(parts.find(p => p.type === "hour").value) % 24;
  const m = Number(parts.find(p => p.type === "minute").value);
  return h * 60 + m;
}

// Reminders happen at start+interval, start+2*interval ... up to and including end (overnight windows supported).
export function isSlot(minOfDay, { start, end, interval }) {
  const s = toMin(start), e = toMin(end);
  const len = e < s ? 1440 - s + e : e - s;
  const rel = (minOfDay - s + 1440) % 1440;
  return rel > 0 && rel <= len && rel % interval === 0;
}

// Look at the current minute and the 2 before it (cron can run a little late). Returns the slot time (ms) or null.
export function dueSlot(nowMs, rec) {
  const base = Math.floor(nowMs / 60000) * 60000;
  for (let k = 0; k <= 2; k++) {
    const t = base - k * 60000;
    if (t <= (rec.lastSent || 0)) break;
    if (isSlot(localMinutes(new Date(t), rec.tz), rec.settings)) return t;
  }
  return null;
}
