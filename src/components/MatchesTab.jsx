import { useState, useEffect, useRef, useCallback } from "react";
import {
  LIVE_REFRESH_MS, IDLE_REFRESH_MS, fmtTimeBD,
  bdDateStr, fmtBdDateLabel, shiftBdDate, fetchScoreboardByBdDate,
} from "../api.js";
import { Skeletons } from "./Shared.jsx";
import MatchCard from "./MatchCard.jsx";
import { playGoalHorn, speak, speechSupported } from "../sound.js";

// Tournament bounds in Bangladesh dates (kickoffs run 11 June – 19 July 2026).
const FIRST_BD_DATE = "2026-06-11";
const LAST_BD_DATE = "2026-07-19";

function useScoreboard(bdDate, onMeta) {
  const [events, setEvents] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    const requested = bdDate;
    let evs = [];
    try {
      const data = await fetchScoreboardByBdDate(bdDate, bdDate === bdDateStr());
      if (requested !== bdDate) return;
      if (data.leagues && data.leagues[0]) onMeta(data.leagues[0]);
      evs = (data.events || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      setEvents(evs);
      setError(null);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message);
      setUpdatedAt(new Date());
    }
    const anyLive = evs.some(e => e.status.type.state === "in");
    clearTimeout(timerRef.current);
    // Only poll fast when something is live; idle otherwise; slow while hidden.
    const interval = document.hidden ? IDLE_REFRESH_MS : anyLive ? LIVE_REFRESH_MS : IDLE_REFRESH_MS;
    timerRef.current = setTimeout(load, interval);
  }, [bdDate, onMeta]);

  useEffect(() => {
    setEvents(null);
    load();
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { events, error, updatedAt };
}

export default function MatchesTab({ league, onMeta }) {
  const [bdDate, setBdDate] = useState(() => {
    const today = bdDateStr();
    // Clamp the initial day into the tournament window.
    if (today < FIRST_BD_DATE) return FIRST_BD_DATE;
    if (today > LAST_BD_DATE) return LAST_BD_DATE;
    return today;
  });
  const { events, error, updatedAt } = useScoreboard(bdDate, onMeta);
  const [goalSound, setGoalSound] = useState(() => {
    try { return localStorage.getItem("wc26-goal-sound") === "1"; } catch { return false; }
  });
  const prevScoresRef = useRef({});

  // Goal alert: horn + spoken score whenever a live match score changes
  useEffect(() => {
    if (!events) return;
    const next = {};
    for (const e of events) {
      const comp = e.competitions && e.competitions[0];
      const home = comp && comp.competitors && comp.competitors.find(c => c.homeAway === "home");
      const away = comp && comp.competitors && comp.competitors.find(c => c.homeAway === "away");
      if (!home || !away) continue;
      const key = `${home.score}-${away.score}`;
      next[e.id] = key;
      const prev = prevScoresRef.current[e.id];
      if (goalSound && prev !== undefined && prev !== key && e.status.type.state === "in") {
        playGoalHorn();
        if (speechSupported) {
          speak(`Goal! ${home.team.displayName} ${home.score}, ${away.team.displayName} ${away.score}.`);
        }
      }
    }
    prevScoresRef.current = next;
  }, [events, goalSound]);

  const toggleGoalSound = () => {
    setGoalSound(v => {
      const on = !v;
      try { localStorage.setItem("wc26-goal-sound", on ? "1" : "0"); } catch { /* ignore */ }
      if (on) playGoalHorn(); // user gesture unlocks audio + audible confirmation
      return on;
    });
  };

  const todayBd = bdDateStr();
  const prevDisabled = bdDate <= FIRST_BD_DATE;
  const nextDisabled = bdDate >= LAST_BD_DATE;
  const shift = n => setBdDate(d => shiftBdDate(d, n));

  const liveCount = (events || []).filter(e => e.status.type.state === "in").length;
  useEffect(() => {
    const base = league
      ? `${league.name} ${league.season ? league.season.year : ""}`.trim() + " Live Scores, Schedule & Standings"
      : document.title;
    document.title = liveCount ? `(${liveCount} LIVE) ${base}` : base;
  }, [liveCount, league]);

  return (
    <>
      <div className="datebar">
        <button onClick={() => shift(-1)} disabled={prevDisabled}>
          ← Prev
        </button>
        <div className="current-date">{fmtBdDateLabel(bdDate)}</div>
        <button onClick={() => shift(1)} disabled={nextDisabled}>
          Next →
        </button>
        <button
          className="today-btn"
          onClick={() => setBdDate(todayBd < FIRST_BD_DATE ? FIRST_BD_DATE : todayBd > LAST_BD_DATE ? LAST_BD_DATE : todayBd)}
        >
          Today
        </button>
        <button
          className={goalSound ? "sound-btn on" : "sound-btn"}
          onClick={toggleGoalSound}
          title="Play a horn and announce the score when a goal is scored"
        >
          {goalSound ? "🔔 Goal alerts ON" : "🔕 Goal alerts OFF"}
        </button>
      </div>
      <div className="datebar-tz">All times shown in Bangladesh time (BD · UTC+6)</div>
      {events === null && !error && <Skeletons />}
      {error && events === null && (
        <div className="state-msg">Could not load scores ({error}). Retrying automatically…</div>
      )}
      {events !== null && events.length === 0 && (
        <div className="state-msg">No matches on this date.</div>
      )}
      {events !== null && events.length > 0 && (
        <div className="match-list">
          {events.map(e => <MatchCard key={e.id} event={e} />)}
        </div>
      )}
      {updatedAt && (
        <footer>
          <span className="dot" style={error ? { color: "var(--live)" } : null}>
            ●
          </span>{" "}
          {error
            ? `Update failed ${fmtTimeBD(updatedAt)} BD — retrying`
            : `Updated ${fmtTimeBD(updatedAt)} BD · data: ESPN`}
        </footer>
      )}
    </>
  );
}
