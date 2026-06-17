import { useState, useEffect } from "react";
import { fetchTopScorers, IDLE_REFRESH_MS } from "../api.js";

export default function TopScorersTab() {
  const [scorers, setScorers] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    async function load() {
      try {
        const list = await fetchTopScorers();
        if (!cancelled) { setScorers(list); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) timer = setTimeout(load, IDLE_REFRESH_MS);
    }
    load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  if (error && scorers === null) return <div className="state-msg">Could not load scorers ({error}).</div>;
  if (scorers === null) return (
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
          <div key={s.name + i} className={`scorers-row ${i < 3 ? "top-" + (i + 1) : ""}`}>
            <span className="rank">{i + 1}</span>
            <span className="player-name">
              {i === 0 && "🥇 "}
              {i === 1 && "🥈 "}
              {i === 2 && "🥉 "}
              {s.name}
              <span className="scorer-mins">{s.minutes.join(", ")}</span>
            </span>
            <span className="scorer-team">
              {s.team?.logo && <img src={s.team.logo} alt="" className="team-flag-sm" />}
              {s.team?.name || "—"}
            </span>
            <span className="goals-count">{s.goals}</span>
          </div>
        ))}
      </div>
      <footer>data: ESPN · own goals excluded</footer>
    </div>
  );
}
