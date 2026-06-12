import { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { ESPN_API, fetchJson } from "./api.js";
import { trackTab } from "./analytics.js";
import MatchesTab from "./components/MatchesTab.jsx";
import { Skeletons } from "./components/Shared.jsx";

// Code-split secondary tabs: loaded on first visit, then kept mounted so
// background polling and scroll positions survive tab switches.
const WatchTab      = lazy(() => import("./components/WatchTab.jsx"));
const ScheduleTab   = lazy(() => import("./components/ScheduleTab.jsx"));
const StandingsTab  = lazy(() => import("./components/StandingsTab.jsx"));
const TopScorersTab = lazy(() => import("./components/TopScorersTab.jsx"));
const TeamsTab      = lazy(() => import("./components/TeamsTab.jsx"));
const StadiumsTab   = lazy(() => import("./components/StadiumsTab.jsx"));
const NewsTab       = lazy(() => import("./components/NewsTab.jsx"));

const TABS = [
  { id: "matches",  icon: "⚽",  label: "Matches"  },
  { id: "watch",    icon: "📺", label: "Watch"    },
  { id: "schedule", icon: "📅", label: "Schedule" },
  { id: "groups",   icon: "🏆", label: "Groups"   },
  { id: "scorers",  icon: "👟", label: "Scorers"  },
  { id: "teams",    icon: "👥", label: "Teams"    },
  { id: "stadiums", icon: "🏟️", label: "Stadiums" },
  { id: "news",     icon: "📰", label: "News"     },
];

export default function App() {
  const [league, setLeague] = useState(null);
  const [tab, setTab] = useState("matches");
  const [visited, setVisited] = useState(() => new Set(["matches"]));
  const onMeta = useCallback(lg => setLeague(prev => prev || lg), []);

  useEffect(() => {
    fetchJson(`${ESPN_API}/scoreboard`)
      .then(d => { if (d.leagues?.[0]) onMeta(d.leagues[0]); })
      .catch(() => {});
  }, [onMeta]);

  const handleTab = t => {
    setTab(t);
    setVisited(prev => (prev.has(t) ? prev : new Set(prev).add(t)));
    trackTab(t);
  };

  const title = league
    ? `${league.name} ${league.season?.year ?? ""}`.trim()
    : "Live Scores";

  const stages = league?.calendar?.[0]?.entries ?? [];
  const now = new Date();
  const ds = new Date(now); ds.setHours(0, 0, 0, 0);
  const de = new Date(now); de.setHours(23, 59, 59, 999);
  const stage = stages.find(s => de >= new Date(s.startDate) && ds < new Date(s.endDate));

  const panes = {
    matches:  <MatchesTab league={league} onMeta={onMeta} />,
    watch:    <WatchTab />,
    schedule: <ScheduleTab />,
    groups:   <StandingsTab league={league} />,
    scorers:  <TopScorersTab />,
    teams:    <TeamsTab />,
    stadiums: <StadiumsTab />,
    news:     <NewsTab />,
  };

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
            <span className="tab-ico">{t.icon}</span>
            <span className="tab-lbl">{t.label}</span>
          </button>
        ))}
      </nav>

      <main>
        {TABS.filter(t => visited.has(t.id)).map(t => (
          <div key={t.id} style={{ display: tab === t.id ? "block" : "none" }}>
            <Suspense fallback={<Skeletons n={3} />}>{panes[t.id]}</Suspense>
          </div>
        ))}
      </main>

      <footer className="app-footer">
        <span>Created by </span>
        <a href="https://3s-soft.com" target="_blank" rel="noopener noreferrer">3s-Soft.com</a>
        <span> · Data: ESPN &amp; worldcup26.ir · Not affiliated with FIFA</span>
      </footer>
    </>
  );
}
