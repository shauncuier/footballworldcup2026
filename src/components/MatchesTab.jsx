import { useState, useEffect, useRef, useCallback } from "react";
import { API, LIVE_REFRESH_MS, IDLE_REFRESH_MS, ymd, isToday, fetchJson } from "../api.js";
import { Skeletons } from "./Shared.jsx";
import MatchCard from "./MatchCard.jsx";
import { playGoalHorn, speak, speechSupported } from "../sound.js";

function useScoreboard(viewDate, onMeta) {
  const [events, setEvents] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    const requested = ymd(viewDate);
    const url = isToday(viewDate) ? `${API}/scoreboard` : `${API}/scoreboard?dates=${requested}`;
    let evs = [];
    try {
      const data = await fetchJson(url);
      if (requested !== ymd(viewDate)) return;
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
    // Slow down while the page is hidden; resume fast on return (see visibilitychange below)
    const interval = document.hidden ? IDLE_REFRESH_MS : anyLive ? LIVE_REFRESH_MS : IDLE_REFRESH_MS;
    timerRef.current = setTimeout(load, interval);
  }, [viewDate, onMeta]);

  useEffect(() => {
    setEvents(null);
    load();
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { events, error, updatedAt };
}

export default function MatchesTab({ league, onMeta }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const { events, error, updatedAt } = useScoreboard(viewDate, onMeta);
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

  const stages =
    (league && league.calendar && league.calendar[0] && league.calendar[0].entries) || [];
  const bounds = stages.length
    ? { start: new Date(stages[0].startDate), end: new Date(stages[stages.length - 1].startDate) }
    : null;

  const shift = days => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + days);
    setViewDate(d);
  };
  const prevDisabled = bounds
    ? (() => {
        const p = new Date(viewDate);
        p.setDate(p.getDate() - 1);
        p.setHours(23, 59, 59, 999);
        return p < bounds.start;
      })()
    : false;
  const nextDisabled = bounds
    ? (() => {
        const n = new Date(viewDate);
        n.setDate(n.getDate() + 1);
        n.setHours(0, 0, 0, 0);
        return n > bounds.end;
      })()
    : false;

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
        <div className="current-date">
          {viewDate.toLocaleDateString([], {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
        <button onClick={() => shift(1)} disabled={nextDisabled}>
          Next →
        </button>
        <button className="today-btn" onClick={() => setViewDate(new Date())}>
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
            ? `Update failed ${updatedAt.toLocaleTimeString()} — retrying`
            : `Updated ${updatedAt.toLocaleTimeString()} · data: ESPN`}
        </footer>
      )}
    </>
  );
}
