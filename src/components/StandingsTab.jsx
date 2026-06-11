import { useState, useEffect } from "react";
import { STANDINGS_API, fetchJson } from "../api.js";
import { Skeletons } from "./Shared.jsx";

function GroupTable({ group }) {
  const entries = (group.standings && group.standings.entries) || [];
  const stat = (e, name) => {
    const s = (e.stats || []).find(s => s.name === name);
    return s ? (s.displayValue ?? s.value) : "–";
  };
  const sorted = entries
    .slice()
    .sort((a, b) => (parseInt(stat(a, "rank")) || 99) - (parseInt(stat(b, "rank")) || 99));
  return (
    <table className="group-table">
      <caption>{group.name}</caption>
      <thead>
        <tr>
          <th>#</th>
          <th className="team-col">Team</th>
          <th>P</th>
          <th>W</th>
          <th>D</th>
          <th>L</th>
          <th>GF</th>
          <th>GA</th>
          <th>GD</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(e => {
          const rank = parseInt(stat(e, "rank")) || 0;
          const logo = e.team.logos && e.team.logos[0] && e.team.logos[0].href;
          return (
            <tr key={e.team.id} className={rank > 0 && rank <= 2 ? "qualifies" : ""}>
              <td>{stat(e, "rank")}</td>
              <td className="team-cell">
                {logo && <img src={logo} alt="" />}
                {e.team.displayName}
              </td>
              <td>{stat(e, "gamesPlayed")}</td>
              <td>{stat(e, "wins")}</td>
              <td>{stat(e, "ties")}</td>
              <td>{stat(e, "losses")}</td>
              <td>{stat(e, "pointsFor")}</td>
              <td>{stat(e, "pointsAgainst")}</td>
              <td>{stat(e, "pointDifferential")}</td>
              <td className="pts">{stat(e, "points")}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function StandingsTab({ league }) {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const season = (league && league.season && league.season.year) || new Date().getFullYear();
    fetchJson(`${STANDINGS_API}?season=${season}`)
      .then(d => {
        if (!cancelled) setGroups(d.children || []);
      })
      .catch(e => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [league]);

  if (error) return <div className="state-msg">Could not load standings ({error}).</div>;
  if (groups === null) return <Skeletons n={4} />;
  if (!groups.length) return <div className="state-msg">No standings available.</div>;
  return (
    <>
      {groups.map(g => (
        <GroupTable key={g.id || g.name} group={g} />
      ))}
      <footer>Top 2 in each group advance (marked green) · data: ESPN</footer>
    </>
  );
}
