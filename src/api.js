// ESPN (live match detail, news, standings)
export const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
export const ESPN_STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';

// worldcup26.ir (full schedule, all 48 teams, 16 stadiums, groups)
export const WC26_API = 'https://worldcup26.ir/get';

// Keep old alias so existing components don't break
export const API = ESPN_API;

export const LIVE_REFRESH_MS   = 3_000;
export const IDLE_REFRESH_MS   = 60_000;
export const DETAIL_REFRESH_MS = 10_000;

export const ymd = d =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export const isToday = d => ymd(d) === ymd(new Date());

export const fmtKickoff = iso =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAllGames() {
  const d = await fetchJson(`${WC26_API}/games`);
  return d.games || [];
}

export async function fetchAllTeams() {
  const d = await fetchJson(`${WC26_API}/teams`);
  return d.teams || [];
}

export async function fetchAllStadiums() {
  const d = await fetchJson(`${WC26_API}/stadiums`);
  return d.stadiums || [];
}

export async function fetchWC26Groups() {
  const d = await fetchJson(`${WC26_API}/groups`);
  return d.groups || [];
}

// worldcup26.ir scorer strings use Unicode smart-quotes (U+201C/U+201D), not ASCII.
// Strip them by char-code to avoid embedding non-ASCII chars in source.
function stripSmartQuotes(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 8216 && c <= 8223) continue;
    out += s[i];
  }
  return out;
}

export function parseScorers(str) {
  if (!str || str === 'null') return [];
  const inner = stripSmartQuotes(str).replace(/^\{/, '').replace(/\}$/, '').trim();
  if (!inner) return [];
  return inner.split(',').map(s => s.replace(/\x22/g, '').trim()).filter(Boolean);
}

export function parseScorerEntry(entry) {
  const clean = stripSmartQuotes(entry).replace(/\x22/g, '').trim();
  const m = clean.match(/^(.*?)\s+(\d+\+?\d*\x27)$/);
  if (m) return { name: m[1].trim(), minute: m[2] };
  return { name: clean, minute: '' };
}

// Parse worldcup26 date "MM/DD/YYYY HH:mm" -> Date (treat as US Eastern)
export function parseWC26Date(str) {
  if (!str) return null;
  const [datePart, timePart] = str.split(' ');
  if (!datePart) return null;
  const [mm, dd, yyyy] = datePart.split('/');
  const time = timePart || '00:00';
  return new Date(`${yyyy}-${mm}-${dd}T${time}:00-04:00`);
}

// Derive top-scorers list from all games
export function computeTopScorers(games, teamMap) {
  const scorerMap = {};
  for (const g of games) {
    const homeTeam = teamMap[g.home_team_id];
    const awayTeam = teamMap[g.away_team_id];
    const addGoals = (rawStr, team) => {
      for (const entry of parseScorers(rawStr)) {
        if (/own goal/i.test(entry)) continue;
        const { name, minute } = parseScorerEntry(entry);
        if (!name) continue;
        if (!scorerMap[name]) scorerMap[name] = { name, goals: 0, team, minutes: [] };
        scorerMap[name].goals += 1;
        if (minute) scorerMap[name].minutes.push(minute);
      }
    };
    addGoals(g.home_scorers, homeTeam);
    addGoals(g.away_scorers, awayTeam);
  }
  return Object.values(scorerMap).sort((a, b) => b.goals - a.goals);
}
