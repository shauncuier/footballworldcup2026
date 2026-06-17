import { useState, useEffect, useMemo } from "react";
import { fetchAllGames, fetchAllTeams, parseScorers, parseWC26GameDate, fmtTimeBD, fmtDateBD } from "../api.js";

const STATUS_COLOR = {
  finished: "var(--accent)",
  live: "var(--live)",
  notstarted: "var(--muted)",
};

function GameRow({ game, teamMap, stadiumMap }) {
  const home = teamMap[game.home_team_id] || { name_en: game.home_team_name_en, flag: "" };
  const away = teamMap[game.away_team_id] || { name_en: game.away_team_name_en, flag: "" };
  const isFinished = game.finished === "TRUE";
  const isLive = !isFinished && game.time_elapsed !== "notstarted" && game.time_elapsed !== "finished";
  const statusText = isFinished ? "FT" : isLive ? `LIVE ${game.time_elapsed}′` : "vs";
  const statusColor = isFinished ? STATUS_COLOR.finished : isLive ? STATUS_COLOR.live : STATUS_COLOR.notstarted;

  const homeGoals = isFinished || isLive ? parseScorers(game.home_scorers) : [];
  const awayGoals = isFinished || isLive ? parseScorers(game.away_scorers) : [];

  return (
    <div className="sched-row">
      <div className="sched-header">
        <span className="sched-badge">Group {game.group} · MD{game.matchday}</span>
        <span className="sched-status" style={{ color: statusColor }}>{isLive && "● "}{statusText}</span>
      </div>
      <div className="sched-teams">
        <div className="sched-team">
          {home.flag && <img src={home.flag} alt="" />}
          <span>{home.name_en}</span>
        </div>
        <div className="sched-score">
          {isFinished || isLive
            ? `${game.home_score} – ${game.away_score}`
            : (() => {
                const d = parseWC26GameDate(game);
                return d ? `${fmtTimeBD(d)} BD` : game.local_date;
              })()}
        </div>
        <div className="sched-team away">
          <span>{away.name_en}</span>
          {away.flag && <img src={away.flag} alt="" />}
        </div>
      </div>
      {(homeGoals.length > 0 || awayGoals.length > 0) && (
        <div className="sched-scorers">
          <div>{homeGoals.map((g, i) => <span key={i}>⚽ {g} </span>)}</div>
          <div className="right">{awayGoals.map((g, i) => <span key={i}>{g} ⚽ </span>)}</div>
        </div>
      )}
    </div>
  );
}

export default function ScheduleTab() {
  const [games, setGames] = useState(null);
  const [teams, setTeams] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAllGames(), fetchAllTeams()])
      .then(([g, t]) => {
        if (cancelled) return;
        setGames(g);
        setTeams(t);
      })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const teamMap = useMemo(() => {
    const m = {};
    for (const t of teams) m[t.id] = t;
    return m;
  }, [teams]);

  const groups = ["ALL", "A","B","C","D","E","F","G","H","I","J","K","L"];

  const filtered = useMemo(() => {
    if (!games) return [];
    const list = filter === "ALL" ? games : games.filter(g => g.group === filter);
    return list.slice().sort((a, b) => {
      const da = parseWC26GameDate(a);
      const db = parseWC26GameDate(b);
      return (da || 0) - (db || 0);
    });
  }, [games, filter]);

  const byDate = useMemo(() => {
    const map = {};
    for (const g of filtered) {
      const d = parseWC26GameDate(g);
      const key = d ? fmtDateBD(d) : g.local_date;
      if (!map[key]) map[key] = [];
      map[key].push(g);
    }
    return map;
  }, [filtered]);

  if (error) return <div className="state-msg">Could not load schedule ({error}).</div>;
  if (games === null) return (
    <div>
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton" />)}
    </div>
  );

  return (
    <div>
      <div className="filter-bar">
        {groups.map(g => (
          <button key={g} className={filter === g ? "active" : ""} onClick={() => setFilter(g)}>{g}</button>
        ))}
      </div>
      {Object.entries(byDate).map(([date, dayGames]) => (
        <div key={date} className="sched-day">
          <div className="sched-date-heading">{date}</div>
          {dayGames.map(g => (
            <GameRow key={g.id} game={g} teamMap={teamMap} stadiumMap={{}} />
          ))}
        </div>
      ))}
      {Object.keys(byDate).length === 0 && <div className="state-msg">No matches found.</div>}
      <footer>data: worldcup26.ir</footer>
    </div>
  );
}
