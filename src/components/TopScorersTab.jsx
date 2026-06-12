import { useState, useEffect, useMemo } from "react";
import { fetchAllGames, fetchAllTeams, computeTopScorers } from "../api.js";

export default function TopScorersTab() {
  const [games, setGames] = useState(null);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAllGames(), fetchAllTeams()])
      .then(([g, t]) => {
        if (cancelled) return;
        setGames(g.filter(x => x.finished === "TRUE"));
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

  const scorers = useMemo(() => {
    if (!games) return [];
    return computeTopScorers(games, teamMap);
  }, [games, teamMap]);

  if (error) return <div className="state-msg">Could not load data ({error}).</div>;
  if (games === null) return (
    <div>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" />)}</div>
  );
  if (!scorers.length) return (
    <div className="state-msg">No goals scored yet. Check back during matches.</div>
  );

  return (
    <div>
      <div className="scorers-table">
        <div className="scorers-head">
          <span>#</span><span>Player</span><span>Team</span><span>G</span>
        </div>
        {scorers.map((s, i) => (
          <div key={s.name} className={`scorers-row ${i < 3 ? "top-" + (i + 1) : ""}`}>
            <span className="rank">{i + 1}</span>
            <span className="player-name">
              {i === 0 && "🥇 "}
              {i === 1 && "🥈 "}
              {i === 2 && "🥉 "}
              {s.name}
              <span className="scorer-mins">
                {s.minutes.join(", ")}
              </span>
            </span>
            <span className="scorer-team">
              {s.team?.flag && <img src={s.team.flag} alt="" className="team-flag-sm" />}
              {s.team?.name_en || "—"}
            </span>
            <span className="goals-count">{s.goals}</span>
          </div>
        ))}
      </div>
      <footer>data: worldcup26.ir · own goals excluded</footer>
    </div>
  );
}
