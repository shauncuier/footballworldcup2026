import { useState, useMemo } from "react";
import { fmtTimeBD, fmtBdDateLabel, bdDateStr } from "../api.js";
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

function Side({ team, align }) {
  return (
    <div className={align === "away" ? "sched-team away" : "sched-team"}>
      {team.logo && <img src={team.logo} alt="" loading="lazy" />}
      <span>{team.name || team.abbr || "TBD"}</span>
    </div>
  );
}

function GameRow({ fx }) {
  const today = bdDateStr();
  const fxDate = bdDateStr(fx.utc);
  const isPast = fxDate < today;
  const isLiveDay = fxDate === today;
  const stageLabel = STAGE_LABEL[fx.stage] || "";
  return (
    <div className="sched-row">
      <div className="sched-header">
        <span className="sched-badge">{stageLabel}{fx.venue ? ` · ${fx.venue}` : ""}</span>
        <span className="sched-status" style={{ color: isLiveDay ? "var(--live)" : "var(--muted)" }}>
          {isLiveDay ? "TODAY" : isPast ? "FT" : ""}
        </span>
      </div>
      <div className="sched-teams">
        <Side team={fx.home} align="home" />
        <div className="sched-score">{`${fmtTimeBD(fx.utc)} BD`}</div>
        <Side team={fx.away} align="away" />
      </div>
    </div>
  );
}

export default function ScheduleTab() {
  const [stage, setStage] = useState("ALL");
  const fixtures = scheduleData.fixtures;

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
          {dayGames.map(fx => <GameRow key={fx.id} fx={fx} />)}
        </div>
      ))}
      {byDate.size === 0 && <div className="state-msg">No matches found.</div>}
      <footer>Fixtures: ESPN (bundled) · live scores in the Matches tab</footer>
    </div>
  );
}
