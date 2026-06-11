export const API = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
export const STANDINGS_API = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";

export const LIVE_REFRESH_MS = 15000;
export const IDLE_REFRESH_MS = 60000;
export const DETAIL_REFRESH_MS = 30000;

export const ymd = d =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

export const isToday = d => ymd(d) === ymd(new Date());

export const fmtKickoff = iso =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  return res.json();
}
