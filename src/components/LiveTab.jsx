import MatchCard from "./MatchCard.jsx";

// Shows only currently in-progress matches. The tab itself is mounted by App
// solely while at least one match is live, so this never renders an empty list
// in normal use — but guard anyway in case the last match just ended.
export default function LiveTab({ liveEvents }) {
  if (!liveEvents || liveEvents.length === 0) {
    return <div className="state-msg">No matches are live right now.</div>;
  }
  return (
    <>
      <div className="live-banner">
        🔴 {liveEvents.length} match{liveEvents.length > 1 ? "es" : ""} live now ·
        auto-refreshing
      </div>
      <div className="match-list">
        {liveEvents.map(e => <MatchCard key={e.id} event={e} />)}
      </div>
    </>
  );
}
