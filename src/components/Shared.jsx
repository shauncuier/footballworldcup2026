export function StatusBadge({ status }) {
  const state = status.type.state;
  if (state === "in")
    return <span className="status-badge live">● LIVE {status.displayClock || ""}</span>;
  if (state === "post")
    return <span className="status-badge ft">{status.type.shortDetail || "FT"}</span>;
  return <span className="status-badge">Scheduled</span>;
}

export function TeamSide({ competitor, side }) {
  const t = competitor.team;
  return (
    <div className={`team ${side}`}>
      <img src={t.logo || ""} alt="" onError={e => (e.target.style.visibility = "hidden")} />
      <span className="name">{t.displayName}</span>
    </div>
  );
}

export function Skeletons({ n = 3 }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </>
  );
}
