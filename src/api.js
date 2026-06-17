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

// All match times are shown in Bangladesh time (UTC+6, no DST) so they are
// identical for every visitor regardless of their device's timezone.
export const BD_TZ = 'Asia/Dhaka';

export const ymd = d =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export const isToday = d => ymd(d) === ymd(new Date());

// Format a true instant (ISO string, ms, or Date) in Bangladesh time.
export const fmtKickoff = input =>
  new Date(input).toLocaleTimeString('en-GB', {
    timeZone: BD_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  });

export const fmtTimeBD = input =>
  new Date(input).toLocaleTimeString('en-GB', {
    timeZone: BD_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  });

export const fmtDateBD = (input, opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) =>
  new Date(input).toLocaleDateString('en-GB', { timeZone: BD_TZ, ...opts });

export const fmtDateTimeBD = input =>
  new Date(input).toLocaleString('en-GB', {
    timeZone: BD_TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }) + ' BD';

// Bangladesh calendar date 'YYYY-MM-DD' for an instant (default: now).
export function bdDateStr(input = new Date()) {
  return new Date(input).toLocaleDateString('en-CA', { timeZone: BD_TZ });
}

// Long BD date label, e.g. "Wednesday, 17 June 2026".
export const fmtBdDateLabel = bdStr => {
  const [y, m, d] = bdStr.split('-').map(Number);
  // noon UTC keeps the date stable across any tz formatting
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-GB', {
    timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
};

// Shift a 'YYYY-MM-DD' string by n days, returning 'YYYY-MM-DD'.
export function shiftBdDate(bdStr, n) {
  const [y, m, d] = bdStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

const compactYmd = s => s.replace(/-/g, '');

// Fetch ESPN scoreboard for a Bangladesh calendar date. A BD day spans two US
// calendar dates, so query the US range [bd-1 .. bd+1] and keep events whose
// BD date matches the requested day. Fixes matches landing on the wrong day.
// When `includeLive` is set (the "today" view), also keep any currently-live
// match even if it kicked off the previous BD evening and runs past midnight.
export async function fetchScoreboardByBdDate(bdStr, includeLive = false) {
  const us0 = compactYmd(shiftBdDate(bdStr, -1));
  const us1 = compactYmd(shiftBdDate(bdStr, 1));
  const data = await fetchJson(`${ESPN_API}/scoreboard?dates=${us0}-${us1}`);
  const events = (data.events || []).filter(e => {
    if (bdDateStr(e.date) === bdStr) return true;
    if (includeLive && e.status && e.status.type && e.status.type.state === 'in') return true;
    return false;
  });
  return { events, leagues: data.leagues };
}

export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// worldcup26.ir is occasionally slow/unstable; retry a few times with backoff.
async function fetchJsonRetry(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetchJson(url);
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await new Promise(r => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function fetchAllGames() {
  const d = await fetchJsonRetry(`${WC26_API}/games`);
  return d.games || [];
}

export async function fetchAllTeams() {
  const d = await fetchJsonRetry(`${WC26_API}/teams`);
  return d.teams || [];
}

export async function fetchAllStadiums() {
  const d = await fetchJsonRetry(`${WC26_API}/stadiums`);
  return d.stadiums || [];
}

export async function fetchWC26Groups() {
  const d = await fetchJsonRetry(`${WC26_API}/groups`);
  return d.groups || [];
}

// Real top scorers, aggregated from ESPN scoreboard goal events across the
// whole tournament in a single call. Consistent with the live Matches tab
// (the old worldcup26.ir version showed a different, projected bracket).
export async function fetchTopScorers() {
  const data = await fetchJson(`${ESPN_API}/scoreboard?dates=20260611-20260719&limit=300`);
  const teamById = {};
  const scorers = {};
  for (const e of (data.events || [])) {
    const comp = e.competitions && e.competitions[0];
    if (!comp) continue;
    for (const c of (comp.competitors || [])) {
      if (c.team) teamById[c.team.id] = { name: c.team.displayName, logo: c.team.logo };
    }
    for (const d of (comp.details || [])) {
      if (!d.scoringPlay) continue;
      // Exclude own goals and penalty-shootout goals from a scorer's tally.
      if (d.ownGoal || d.shootout) continue;
      const a = d.athletesInvolved && d.athletesInvolved[0];
      if (!a) continue;
      const id = a.id || a.displayName;
      if (!scorers[id]) scorers[id] = { name: a.displayName, goals: 0, teamId: d.team && d.team.id, minutes: [] };
      scorers[id].goals += 1;
      const min = d.clock && d.clock.displayValue;
      if (min) scorers[id].minutes.push(min);
    }
  }
  return Object.values(scorers)
    .map(s => ({ name: s.name, goals: s.goals, minutes: s.minutes, team: teamById[s.teamId] || null }))
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
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

// IANA timezone for each worldcup26 stadium id (1-16). Each venue sits in a
// different North-American zone, so the local_date wall-clock must be read in
// the correct zone before converting to Bangladesh time.
const STADIUM_TZ_BY_ID = {
  '1':  'America/Mexico_City',   // Estadio Azteca, Mexico City
  '2':  'America/Mexico_City',   // Estadio Akron, Guadalajara
  '3':  'America/Monterrey',     // Estadio BBVA, Monterrey
  '4':  'America/Chicago',       // AT&T Stadium, Dallas
  '5':  'America/Chicago',       // NRG Stadium, Houston
  '6':  'America/Chicago',       // Arrowhead, Kansas City
  '7':  'America/New_York',      // Mercedes-Benz, Atlanta
  '8':  'America/New_York',      // Hard Rock, Miami
  '9':  'America/New_York',      // Gillette, Boston
  '10': 'America/New_York',      // Lincoln Financial, Philadelphia
  '11': 'America/New_York',      // MetLife, New York/New Jersey
  '12': 'America/Toronto',       // BMO Field, Toronto
  '13': 'America/Vancouver',     // BC Place, Vancouver
  '14': 'America/Los_Angeles',   // Lumen Field, Seattle
  '15': 'America/Los_Angeles',   // Levi's, Santa Clara
  '16': 'America/Los_Angeles',   // SoFi, Los Angeles
};

// Offset (minutes) of an IANA timezone at a given instant — positive means
// the zone is ahead of UTC.
function tzOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const hour = p.hour === '24' ? '00' : p.hour;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +hour, +p.minute, +p.second);
  return (asUTC - date.getTime()) / 60000;
}

// Interpret wall-clock components as local time in `timeZone`, return the true
// UTC instant. Two-pass to settle DST transitions.
function wallTimeToInstant(y, mo, d, h, mi, timeZone) {
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi);
  let off = tzOffsetMinutes(new Date(utcGuess), timeZone);
  let result = new Date(utcGuess - off * 60000);
  off = tzOffsetMinutes(result, timeZone);
  result = new Date(utcGuess - off * 60000);
  return result;
}

// Parse a worldcup26 game's "MM/DD/YYYY HH:mm" venue-local date into a true
// instant, using the stadium's timezone. Returns a Date (or null).
export function parseWC26GameDate(game) {
  const str = game && game.local_date;
  if (!str) return null;
  const [datePart, timePart] = str.split(' ');
  if (!datePart) return null;
  const [mm, dd, yyyy] = datePart.split('/').map(Number);
  const [h, mi] = (timePart || '00:00').split(':').map(Number);
  if (!yyyy || !mm || !dd) return null;
  const tz = STADIUM_TZ_BY_ID[String(game.stadium_id)] || 'America/New_York';
  return wallTimeToInstant(yyyy, mm, dd, h, mi, tz);
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

// ── ESPN squads (team rosters) ──────────────────────────────────────────────
// The ESPN /teams list endpoint has no CORS header, so the 48 team ids are
// baked in (stable for the tournament). Roster endpoint itself is CORS-open.

export function normalizeTeamName(name) {
  return (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\band\b/g, '')
    .replace(/[^a-z]/g, '');
}

// worldcup26.ir naming -> ESPN naming for the cases plain normalization misses
const TEAM_ALIASES = {
  drcongo: 'congodr',
  turkey: 'turkiye',
  usa: 'unitedstates',
  korearepublic: 'southkorea',
  irrepublic: 'iran',
  capeverdeislands: 'capeverde',
};

const ESPN_TEAM_IDS = {
  algeria: '624',
  argentina: '202',
  australia: '628',
  austria: '474',
  belgium: '459',
  bosniaherzegovina: '452',
  brazil: '205',
  canada: '206',
  capeverde: '2597',
  colombia: '208',
  congodr: '2850',
  croatia: '477',
  curacao: '11678',
  czechia: '450',
  ecuador: '209',
  egypt: '2620',
  england: '448',
  france: '478',
  germany: '481',
  ghana: '4469',
  haiti: '2654',
  iran: '469',
  iraq: '4375',
  ivorycoast: '4789',
  japan: '627',
  jordan: '2917',
  mexico: '203',
  morocco: '2869',
  netherlands: '449',
  newzealand: '2666',
  norway: '464',
  panama: '2659',
  paraguay: '210',
  portugal: '482',
  qatar: '4398',
  saudiarabia: '655',
  scotland: '580',
  senegal: '654',
  southafrica: '467',
  southkorea: '451',
  spain: '164',
  sweden: '466',
  switzerland: '475',
  tunisia: '659',
  turkiye: '465',
  unitedstates: '660',
  uruguay: '212',
  uzbekistan: '2570',
};

export function findEspnTeamId(wc26Name) {
  let key = normalizeTeamName(wc26Name);
  key = TEAM_ALIASES[key] || key;
  return ESPN_TEAM_IDS[key] || null;
}

export async function fetchEspnRoster(teamId) {
  const d = await fetchJson(`${ESPN_API}/teams/${teamId}/roster`);
  const coachRaw = Array.isArray(d.coach) ? d.coach[0] : d.coach;
  const coach = coachRaw
    ? (coachRaw.displayName || `${coachRaw.firstName || ''} ${coachRaw.lastName || ''}`.trim())
    : null;
  return { athletes: d.athletes || [], coach };
}

// ── Stadium weather (Open-Meteo, free, no key) ──────────────────────────────

const STADIUM_COORDS = [
  { keys: ['lumen', 'seattle'],                 lat: 47.5952, lon: -122.3316 },
  { keys: ['metlife', 'new york', 'new jersey'], lat: 40.8135, lon: -74.0745 },
  { keys: ['at&t', 'dallas', 'arlington'],      lat: 32.7473, lon: -97.0945 },
  { keys: ['arrowhead', 'kansas'],              lat: 39.0489, lon: -94.4839 },
  { keys: ['nrg', 'houston'],                   lat: 29.6847, lon: -95.4107 },
  { keys: ['mercedes', 'atlanta'],              lat: 33.7554, lon: -84.4008 },
  { keys: ['sofi', 'los angeles', 'inglewood'], lat: 33.9535, lon: -118.3392 },
  { keys: ['lincoln', 'philadelphia'],          lat: 39.9008, lon: -75.1675 },
  { keys: ['levi', 'san francisco', 'santa clara'], lat: 37.4030, lon: -121.9700 },
  { keys: ['gillette', 'boston', 'foxborough'], lat: 42.0909, lon: -71.2643 },
  { keys: ['hard rock', 'miami'],               lat: 25.9580, lon: -80.2389 },
  { keys: ['bc place', 'vancouver'],            lat: 49.2768, lon: -123.1120 },
  { keys: ['bmo', 'toronto'],                   lat: 43.6332, lon: -79.4186 },
  { keys: ['azteca', 'mexico city'],            lat: 19.3029, lon: -99.1505 },
  { keys: ['bbva', 'monterrey', 'guadalupe'],   lat: 25.6693, lon: -100.2442 },
  { keys: ['akron', 'guadalajara', 'zapopan'],  lat: 20.6817, lon: -103.4626 },
];

export function stadiumCoords(stadium) {
  const hay = [stadium.name_en, stadium.fifa_name, stadium.city_en]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return STADIUM_COORDS.find(c => c.keys.some(k => hay.includes(k))) || null;
}

export async function fetchCurrentWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto';
  const d = await fetchJson(url);
  return d.current || null;
}

// WMO weather code -> icon + label
export function weatherInfo(code) {
  if (code === 0) return { icon: '☀️', label: 'Clear' };
  if (code === 1 || code === 2) return { icon: '🌤️', label: 'Partly cloudy' };
  if (code === 3) return { icon: '☁️', label: 'Overcast' };
  if (code === 45 || code === 48) return { icon: '🌫️', label: 'Fog' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', label: 'Drizzle' };
  if (code >= 61 && code <= 67) return { icon: '🌧️', label: 'Rain' };
  if (code >= 71 && code <= 77) return { icon: '🌨️', label: 'Snow' };
  if (code >= 80 && code <= 82) return { icon: '🌧️', label: 'Showers' };
  if (code >= 95) return { icon: '⛈️', label: 'Thunderstorm' };
  return { icon: '🌡️', label: '' };
}
