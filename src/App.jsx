import { useState, useEffect, useCallback } from "react";
import { API, fetchJson } from "./api.js";
import MatchesTab from "./components/MatchesTab.jsx";
import StandingsTab from "./components/StandingsTab.jsx";
import NewsTab from "./components/NewsTab.jsx";

export default function App() {
  const [league, setLeague] = useState(null);
  const [tab, setTab] = useState("matches");
  const onMeta = useCallback(lg => setLeague(prev => prev || lg), []);

  // league metadata even if the user lands on a non-matches tab first
  useEffect(() => {
    fetchJson(`${API}/scoreboard`)
      .then(d => {
        if (d.leagues && d.leagues[0]) onMeta(d.leagues[0]);
      })
      .catch(() => {});
  }, [onMeta]);

  const title = league
    ? `${league.name} ${league.season ? league.season.year : ""}`.trim()
    : "Live Scores";
  const stages =
    (league && league.calendar && league.calendar[0] && league.calendar[0].entries) || [];
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);
  const stage = stages.find(s => dayEnd >= new Date(s.startDate) && dayStart < new Date(s.endDate));

  return (
    <>
      <header>
        <h1>
          <span className="trophy">🏆</span>
          {title}
        </h1>
        <div className="sub">{league ? "Live scores · auto-refreshing" : "Loading tournament…"}</div>
        {stage && (
          <div>
            <span className="stage-label">
              {stage.label}
              {stage.detail ? ` · ${stage.detail}` : ""}
            </span>
          </div>
        )}
      </header>
      <div className="tabs">
        <button className={tab === "matches" ? "active" : ""} onClick={() => setTab("matches")}>
          Matches
        </button>
        <button className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>
          Groups
        </button>
        <button className={tab === "news" ? "active" : ""} onClick={() => setTab("news")}>
          News
        </button>
      </div>
      <main>
        {tab === "matches" && <MatchesTab league={league} onMeta={onMeta} />}
        {tab === "groups" && <StandingsTab league={league} />}
        {tab === "news" && <NewsTab />}
      </main>
    </>
  );
}
