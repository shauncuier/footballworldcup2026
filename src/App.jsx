import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { ESPN_API, fetchJson, fetchLiveMatches, LIVE_REFRESH_MS, IDLE_REFRESH_MS } from "./api.js";
import { trackTab } from "./analytics.js";
import MatchesTab from "./components/MatchesTab.jsx";
import LiveTab from "./components/LiveTab.jsx";
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

// The "live" tab is injected dynamically (only while matches are in progress).
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

// Poll currently-live matches. Fast cadence when something is live, slower
// otherwise (just watching for the next kickoff); backs off while hidden.
function useLiveMatches() {
  const [live, setLive] = useState([]);
  const timerRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let any = false;
      try {
        const events = await fetchLiveMatches();
        if (!cancelled) { setLive(events); any = events.length > 0; }
      } catch { /* keep last known */ }
      if (!cancelled) {
        const interval = document.hidden ? IDLE_REFRESH_MS : any ? LIVE_REFRESH_MS : IDLE_REFRESH_MS;
        timerRef.current = setTimeout(load, interval);
      }
    }
    load();
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return live;
}

// Free counter API (abacus.jasoncameron.dev) — counts one visit per
// browser per day; subsequent loads just read the current total.
const COUNTER_NS = "worldcup26-3ssoft";
const COUNTER_KEY = "visitors";

function useVisitorCount() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    let counted = false;
    try { counted = localStorage.getItem("wc26-visit-date") === today; } catch { /* private mode */ }
    const action = counted ? "get" : "hit";
    fetch(`https://abacus.jasoncameron.dev/${action}/${COUNTER_NS}/${COUNTER_KEY}`)
      .then(r => r.json())
      .then(d => {
        if (typeof d.value === "number") {
          setCount(d.value);
          try { localStorage.setItem("wc26-visit-date", today); } catch { /* ignore */ }
        }
      })
      .catch(() => {});
  }, []);
  return count;
}

// Capture the PWA install prompt so we can offer an in-app "Install" button.
function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setPromptEvent(e); };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    try { await promptEvent.userChoice; } catch { /* dismissed */ }
    setPromptEvent(null);
  };
  return [promptEvent, install];
}

const TAB_IDS = ["matches", "watch", "schedule", "groups", "scorers", "teams", "stadiums", "news"];

export default function App() {
  const [league, setLeague] = useState(null);
  const initialTab = (() => {
    try {
      const saved = localStorage.getItem("wc26-tab");
      return TAB_IDS.includes(saved) ? saved : "matches";
    } catch { return "matches"; }
  })();
  const [tab, setTab] = useState(initialTab);
  const [visited, setVisited] = useState(() => new Set([initialTab]));
  const visitors = useVisitorCount();
  const [canInstall, install] = useInstallPrompt();
  const liveEvents = useLiveMatches();
  const liveCount = liveEvents.length;
  const onMeta = useCallback(lg => setLeague(prev => prev || lg), []);

  useEffect(() => {
    fetchJson(`${ESPN_API}/scoreboard`)
      .then(d => { if (d.leagues?.[0]) onMeta(d.leagues[0]); })
      .catch(() => {});
  }, [onMeta]);

  // If the user is on the Live tab and the last live match ends, fall back.
  useEffect(() => {
    if (tab === "live" && liveCount === 0) setTab("matches");
  }, [tab, liveCount]);

  // Tab list with the Live tab prepended only while matches are in progress.
  const tabs = liveCount > 0
    ? [{ id: "live", icon: "🔴", label: "Live" }, ...TABS]
    : TABS;

  const handleTab = t => {
    setTab(t);
    setVisited(prev => (prev.has(t) ? prev : new Set(prev).add(t)));
    try { localStorage.setItem("wc26-tab", t); } catch { /* ignore */ }
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
    live:     <LiveTab liveEvents={liveEvents} />,
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
        <div className="header-badges">
          {stage && (
            <span className="stage-label">
              {stage.label}{stage.detail ? ` · ${stage.detail}` : ""}
            </span>
          )}
          {visitors !== null && (
            <span className="visitor-chip" title="Total visits">
              👀 {visitors.toLocaleString()} visitors
            </span>
          )}
          {canInstall && (
            <button className="install-chip" onClick={install} title="Install as an app">
              ⬇ Install app
            </button>
          )}
        </div>
      </header>

      <nav className="tabs">
        {tabs.map(t => {
          const isLive = t.id === "live";
          return (
            <button
              key={t.id}
              className={`${tab === t.id ? "active" : ""}${isLive ? " live-tab" : ""}`}
              onClick={() => handleTab(t.id)}
            >
              <span className="tab-ico">{t.icon}</span>
              <span className="tab-lbl">
                {t.label}{isLive ? ` ${liveCount}` : ""}
              </span>
            </button>
          );
        })}
      </nav>

      <main>
        {liveCount > 0 && (
          <div style={{ display: tab === "live" ? "block" : "none" }}>
            {panes.live}
          </div>
        )}
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
