import { useState, useEffect, useMemo } from "react";
import { fmtTimeBD, fmtBdDateLabel, bdDateStr, fetchScheduleResults, IDLE_REFRESH_MS } from "../api.js";
import scheduleData from "../data/schedule.json";

// Stage slugs (from ESPN) -> filter buttons and friendly labels.
const STAGES = [
  { id: "ALL", label: "All" },
  { id: "group-stage", label: "Groups" },
  { id: "round-of-32", label: "R32" },
  { id: "round-of-16", label: "R16" },
  { id: "quarterfinals", label: "QF" },
  { id: "semifinals", label: "SF" },
  { id: "3rd-place-match", label: "3rd" },
  { id: "final", label: "Final" },
];
const STAGE_LABEL = Object.fromEntries(STAGES.map(s => [s.id, s.label]));

function Side({ team, align, win }) {
  return (
    <div className={align === "away" ? "sched-team away" : "sched-team"}>
      {team.logo && <img src={team.logo} alt="" loading="lazy" />}
      <span className={win ? "sched-winner" : ""}>{team.name || team.abbr || "TBD"}</span>
    </div>
  );
}

function GameRow({ fx, result }) {
  const stageLabel = STAGE_LABEL[fx.stage] || "";
  const state = result && result.state;
  const isDone = state === "post";
  const isLive = state === "in";
  const hasScore = (isDone || isLive) && result.home != null && result.away != null;

  let status, statusColor;
  if (isLive) { status = result.clock || result.detail || "LIVE"; statusColor = "var(--live)"; }
  else if (isDone) { status = result.detail || "FT"; statusColor = "var(--accent)"; }
  else { status = ""; statusColor = "var(--muted)"; }

  return (
    <div className="sched-row">
      <div className="sched-header">
        <span className="sched-badge">{stageLabel}{fx.venue ? ` · ${fx.venue}` : ""}</span>
        <span className="sched-status" style={{ color: statusColor }}>
          {isLive ? `● ${status}` : status}
        </span>
      </div>
      <div className="sched-teams">
        <Side team={fx.home} align="home" win={isDone && result.homeWinner} />
        <div className={`sched-score${hasScore ? " has-score" : ""}`}>
          {hasScore ? `${result.home} – ${result.away}` : `${fmtTimeBD(fx.utc)} BD`}
        </div>
        <Side team={fx.away} align="away" win={isDone && result.awayWinner} />
      </div>
    </div>
  );
}

export default function ScheduleTab() {
  const [stage, setStage] = useState("ALL");
  const [results, setResults] = useState({});
  const fixtures = scheduleData.fixtures;

  // Bundle renders instantly; results (scores/status) load in the background
  // from one ESPN call and refresh periodically so finished games show scores.
  useEffect(() => {
    let cancelled = false;
    let timer = null;
    async function load() {
      try {
        const map = await fetchScheduleResults();
        if (!cancelled) setResults(map);
      } catch { /* keep showing kickoff times */ }
      if (!cancelled) timer = setTimeout(load, IDLE_REFRESH_MS);
    }
    load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const filtered = useMemo(() => {
    const list = stage === "ALL" ? fixtures : fixtures.filter(f => f.stage === stage);
    return list.slice().sort((a, b) => new Date(a.utc) - new Date(b.utc));
  }, [fixtures, stage]);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const fx of filtered) {
      const key = bdDateStr(fx.utc);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(fx);
    }
    return map;
  }, [filtered]);

  return (
    <div>
      <div className="filter-bar">
        {STAGES.map(s => (
          <button key={s.id} className={stage === s.id ? "active" : ""} onClick={() => setStage(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="datebar-tz">All kickoff times in Bangladesh time (BD · UTC+6)</div>
      {[...byDate.entries()].map(([date, dayGames]) => (
        <div key={date} className="sched-day">
          <div className="sched-date-heading">{fmtBdDateLabel(date)}</div>
          {dayGames.map(fx => <GameRow key={fx.id} fx={fx} result={results[fx.id]} />)}
        </div>
      ))}
      {byDate.size === 0 && <div className="state-msg">No matches found.</div>}
      <footer>Fixtures: ESPN (bundled) · scores update live</footer>
    </div>
  );
}
