import { useState, useEffect, useMemo } from "react";
import { fetchAllStadiums, fetchAllGames } from "../api.js";

const REGION_COLORS = {
  Eastern: "#2dd47f",
  Western: "#4a90d9",
  Canada:  "#ff9f40",
};

export default function StadiumsTab() {
  const [stadiums, setStadiums] = useState(null);
  const [games, setGames] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAllStadiums(), fetchAllGames()])
      .then(([s, g]) => { if (!cancelled) { setStadiums(s); setGames(g); } })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const gamesByStadium = useMemo(() => {
    const m = {};
    for (const g of games) {
      if (!m[g.stadium_id]) m[m[g.stadium_id] = g.stadium_id, g.stadium_id] = [];
      if (!m[g.stadium_id]) m[g.stadium_id] = [];
      m[g.stadium_id].push(g);
    }
    return m;
  }, [games]);

  if (error) return <div className="state-msg">Could not load stadiums ({error}).</div>;
  if (!stadiums) return <div>{[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{height:100}} />)}</div>;

  const sorted = [...stadiums].sort((a, b) => a.name_en.localeCompare(b.name_en));

  return (
    <div>
      <div className="stadiums-grid">
        {sorted.map(s => {
          const sgames = gamesByStadium[s.id] || [];
          const played = sgames.filter(g => g.finished === "TRUE").length;
          const total = sgames.length;
          const regionColor = REGION_COLORS[s.region] || "var(--muted)";
          return (
            <div key={s.id} className="stadium-card">
              <div className="stadium-top">
                <span className="stadium-region" style={{ color: regionColor }}>
                  🏟️ {s.region || "USA"}
                </span>
                <span className="stadium-capacity">
                  {s.capacity ? s.capacity.toLocaleString() + " cap." : ""}
                </span>
              </div>
              <div className="stadium-name">{s.fifa_name || s.name_en}</div>
              <div className="stadium-official">{s.name_en}</div>
              <div className="stadium-city">
                📍 {s.city_en}, {s.country_en}
              </div>
              {total > 0 && (
                <div className="stadium-games">
                  <div className="sg-bar">
                    <div className="sg-fill" style={{ width: `${(played / total) * 100}%` }} />
                  </div>
                  <span>{played}/{total} matches played</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <footer>data: worldcup26.ir</footer>
    </div>
  );
}
