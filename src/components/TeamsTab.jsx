import { useState, useEffect, useMemo } from "react";
import { fetchAllTeams, fetchAllGames, findEspnTeamId, fetchEspnRoster } from "../api.js";

const POSITION_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

function SquadSection({ teamName }) {
  const [squad, setSquad] = useState(null); // null = loading, [] = unavailable
  const [coach, setCoach] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setSquad(null);
    setCoach(null);
    (async () => {
      try {
        const espnId = findEspnTeamId(teamName);
        if (!espnId) {
          if (!cancelled) setSquad([]);
          return;
        }
        const r = await fetchEspnRoster(espnId);
        if (!cancelled) {
          setSquad(r.athletes);
          setCoach(r.coach);
        }
      } catch {
        if (!cancelled) setSquad([]);
      }
    })();
    return () => { cancelled = true; };
  }, [teamName]);

  if (squad === null) return <div className="skeleton" style={{ height: 48 }} />;
  if (!squad.length) return null;

  const groups = POSITION_ORDER
    .map(pos => ({
      pos,
      players: squad
        .filter(p => p.position && p.position.name === pos)
        .sort((a, b) => (parseInt(a.jersey) || 99) - (parseInt(b.jersey) || 99)),
    }))
    .filter(g => g.players.length);
  const other = squad.filter(p => !p.position || !POSITION_ORDER.includes(p.position.name));

  return (
    <div className="squad">
      <h3 className="modal-section-title">
        Squad ({squad.length})
        {coach && <span className="coach-name"> · Coach: {coach}</span>}
      </h3>
      {groups.map(g => (
        <div key={g.pos}>
          <div className="squad-pos">{g.pos}s</div>
          <ul className="squad-list">
            {g.players.map(p => (
              <li key={p.id}>
                <span className="jersey">{p.jersey || "–"}</span>
                <span className="squad-name">{p.displayName}</span>
                {p.age ? <span className="squad-age">{p.age} yrs</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {other.length > 0 && (
        <ul className="squad-list">
          {other.map(p => (
            <li key={p.id}>
              <span className="jersey">{p.jersey || "–"}</span>
              <span className="squad-name">{p.displayName}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="squad-src">squad: ESPN</div>
    </div>
  );
}

function TeamModal({ team, games, teamMap, onClose }) {
  const teamGames = games.filter(
    g => g.home_team_id === team.id || g.away_team_id === team.id
  );
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          {team.flag && <img src={team.flag} alt="" className="modal-flag" />}
          <div>
            <h2>{team.name_en}</h2>
            <span className="modal-meta">{team.fifa_code} · Group {team.groups}</span>
          </div>
        </div>
        <h3 className="modal-section-title">Matches</h3>
        <div className="modal-games">
          {teamGames.length === 0 && <p className="state-msg" style={{padding:"16px"}}>No matches found.</p>}
          {teamGames.map(g => {
            const home = teamMap[g.home_team_id];
            const away = teamMap[g.away_team_id];
            const done = g.finished === "TRUE";
            return (
              <div key={g.id} className="modal-game-row">
                <span className="mg-teams">
                  {home?.name_en || g.home_team_name_en}
                  <strong> {done ? `${g.home_score}–${g.away_score}` : "vs"} </strong>
                  {away?.name_en || g.away_team_name_en}
                </span>
                <span className="mg-info">MD{g.matchday} · {done ? "FT" : g.local_date}</span>
              </div>
            );
          })}
        </div>
        <SquadSection teamName={team.name_en} />
      </div>
    </div>
  );
}

export default function TeamsTab() {
  const [teams, setTeams] = useState(null);
  const [games, setGames] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAllTeams(), fetchAllGames()])
      .then(([t, g]) => { if (!cancelled) { setTeams(t); setGames(g); } })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const teamMap = useMemo(() => {
    const m = {};
    for (const t of (teams || [])) m[t.id] = t;
    return m;
  }, [teams]);

  const groups = ["ALL", "A","B","C","D","E","F","G","H","I","J","K","L"];
  const filtered = useMemo(() => {
    if (!teams) return [];
    if (filterGroup === "ALL") return [...teams].sort((a,b) => a.name_en.localeCompare(b.name_en));
    return teams.filter(t => t.groups === filterGroup).sort((a,b) => a.name_en.localeCompare(b.name_en));
  }, [teams, filterGroup]);

  if (error) return <div className="state-msg">Could not load teams ({error}).</div>;
  if (!teams) return <div>{[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{height:60}} />)}</div>;

  return (
    <div>
      <div className="filter-bar">
        {groups.map(g => (
          <button key={g} className={filterGroup === g ? "active" : ""} onClick={() => setFilterGroup(g)}>{g}</button>
        ))}
      </div>
      <div className="teams-grid">
        {filtered.map(t => (
          <div key={t.id} className="team-card" onClick={() => setSelected(t)}>
            {t.flag && <img src={t.flag} alt={t.name_en} className="team-flag" />}
            <div className="team-card-name">{t.name_en}</div>
            <div className="team-card-meta">{t.fifa_code} · Grp {t.groups}</div>
          </div>
        ))}
      </div>
      {selected && (
        <TeamModal
          team={selected}
          games={games}
          teamMap={teamMap}
          onClose={() => setSelected(null)}
        />
      )}
      <footer>data: worldcup26.ir &amp; ESPN</footer>
    </div>
  );
}
