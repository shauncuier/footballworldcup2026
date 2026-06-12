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
