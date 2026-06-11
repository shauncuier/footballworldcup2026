import { useState } from "react";
import { fmtKickoff } from "../api.js";
import { StatusBadge, TeamSide } from "./Shared.jsx";
import MatchDetail from "./MatchDetail.jsx";

function Scorers({ competition, homeId, awayId }) {
  const goals = (competition.details || []).filter(d => d.scoringPlay);
  if (!goals.length) return null;
  const line = (g, i) => {
    const who =
      g.athletesInvolved && g.athletesInvolved[0] ? g.athletesInvolved[0].displayName : "Goal";
    const og = g.type && /own goal/i.test(g.type.text || "") ? " (OG)" : "";
    const pen = g.type && /penalty/i.test(g.type.text || "") ? " (P)" : "";
    return (
      <div key={i}>
        <span>⚽ </span>
        {who} {g.clock ? g.clock.displayValue : ""}
        {og}
        {pen}
      </div>
    );
  };
  return (
    <div className="scorers">
      <div className="home-goals">{goals.filter(g => g.team && g.team.id === homeId).map(line)}</div>
      <div className="away-goals">{goals.filter(g => g.team && g.team.id === awayId).map(line)}</div>
    </div>
  );
}

export default function MatchCard({ event }) {
  const [open, setOpen] = useState(false);
  const comp = event.competitions[0];
  const home = comp.competitors.find(c => c.homeAway === "home");
  const away = comp.competitors.find(c => c.homeAway === "away");
  const state = event.status.type.state;
  const started = state !== "pre";
  const venue = comp.venue
    ? `${comp.venue.fullName}${comp.venue.address && comp.venue.address.city ? ", " + comp.venue.address.city : ""}`
    : "";
  const note = (comp.notes && comp.notes[0] && comp.notes[0].headline) || "";

  return (
    <div className={`match-card${open ? " open" : ""}`} onClick={() => setOpen(o => !o)}>
      <div className="match-meta">
        <span>{note || venue}</span>
        <StatusBadge status={event.status} />
      </div>
      <div className="teams-row">
        <TeamSide competitor={home} side="home" />
        <div className="score">
          {started ? (
            `${home.score ?? 0} – ${away.score ?? 0}`
          ) : (
            <span className="vs">{fmtKickoff(event.date)}</span>
          )}
        </div>
        <TeamSide competitor={away} side="away" />
      </div>
      {started && <Scorers competition={comp} homeId={home.team.id} awayId={away.team.id} />}
      {!open && <div className="expand-hint">tap for stats, lineups, timeline ▾</div>}
      {open && <MatchDetail eventId={event.id} live={state === "in"} />}
    </div>
  );
}
