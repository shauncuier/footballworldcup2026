import { useState, useEffect, useCallback } from "react";
import { ESPN_API, fetchJson } from "./api.js";
import { trackTab } from "./analytics.js";
import MatchesTab    from "./components/MatchesTab.jsx";
import StandingsTab  from "./components/StandingsTab.jsx";
import ScheduleTab   from "./components/ScheduleTab.jsx";
import TopScorersTab from "./components/TopScorersTab.jsx";
import TeamsTab      from "./components/TeamsTab.jsx";
import StadiumsTab   from "./components/StadiumsTab.jsx";
import NewsTab       from "./components/NewsTab.jsx";
import WatchTab      from "./components/WatchTab.jsx";

const TABS = [
  { id: "matches",  label: "⚽ Matches"    },
  { id: "watch",    label: "📺 Watch"      },
  { id: "schedule", label: "📅 Schedule"   },
  { id: "groups",   label: "🏆 Groups"     },
  { id: "scorers",  label: "👟 Scorers"    },
  { id: "teams",    label: "👥 Teams"      },
  { id: "stadiums", label: "🏟️ Stadiums"  },
  { id: "news",     label: "📰 News"       },
];

export default function App() {
  const [league, setLeague] = useState(null);
  const [tab, setTab] = useState("matches");
  const onMeta = useCallback(lg => setLeague(prev => prev || lg), []);

  useEffect(() => {
    fetchJson(`${ESPN_API}/scoreboard`)
      .then(d => { if (d.leagues?.[0]) onMeta(d.leagues[0]); })
      .catch(() => {});
  }, [onMeta]);

  const handleTab = t => { setTab(t); trackTab(t); };

  const title = league
    ? `${league.name} ${league.season?.year ?? ""}`.trim()
    : "Live Scores";

  const stages = league?.calendar?.[0]?.entries ?? [];
  const now = new Date();
  const ds = new Date(now); ds.setHours(0, 0, 0, 0);
  const de = new Date(now); de.setHours(23, 59, 59, 999);
  const stage = stages.find(s => de >= new Date(s.startDate) && ds < new Date(s.endDate));

  return (
    <>
      <header>
        <h1><span className="trophy">🏆</span>{title}</h1>
        <div className="sub">
          {league ? "Live scores · auto-refreshing" : "Loading tournament…"}
        </div>
        {stage && (
          <span className="stage-label">
            {stage.label}{stage.detail ? ` · ${stage.detail}` : ""}
          </span>
        )}
      </header>

      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => handleTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        <div style={{ display: tab === "matches"  ? "block" : "none" }}><MatchesTab league={league} onMeta={onMeta} /></div>
        <div style={{ display: tab === "watch"    ? "block" : "none" }}><WatchTab /></div>
        <div style={{ display: tab === "schedule" ? "block" : "none" }}><ScheduleTab /></div>
        <div style={{ display: tab === "groups"   ? "block" : "none" }}><StandingsTab league={league} /></div>
        <div style={{ display: tab === "scorers"  ? "block" : "none" }}><TopScorersTab /></div>
        <div style={{ display: tab === "teams"    ? "block" : "none" }}><TeamsTab /></div>
        <div style={{ display: tab === "stadiums" ? "block" : "none" }}><StadiumsTab /></div>
        <div style={{ display: tab === "news"     ? "block" : "none" }}><NewsTab /></div>
      </main>

      <footer className="app-footer">
        <span>Created by </span>
        <a href="https://3s-soft.com" target="_blank" rel="noopener noreferrer">3s-Soft.com</a>
        <span> · Data: ESPN &amp; worldcup26.ir · Not affiliated with FIFA</span>
      </footer>
    </>
  );
}
