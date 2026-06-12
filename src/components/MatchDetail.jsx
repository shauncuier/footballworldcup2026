import { useState, useEffect, useRef } from "react";
import { API, DETAIL_REFRESH_MS, IDLE_REFRESH_MS, fetchJson } from "../api.js";
import { speak, stopSpeaking, speechSupported } from "../sound.js";

const STAT_LABELS = [
  ["possessionPct", "Possession %"],
  ["totalShots", "Shots"],
  ["shotsOnTarget", "Shots on target"],
  ["blockedShots", "Blocked shots"],
  ["wonCorners", "Corners"],
  ["saves", "Saves"],
  ["accuratePasses", "Accurate passes"],
  ["passPct", "Pass accuracy %"],
  ["accurateCrosses", "Crosses completed"],
  ["totalTackles", "Tackles"],
  ["interceptions", "Interceptions"],
  ["effectiveClearance", "Clearances"],
  ["foulsCommitted", "Fouls"],
  ["offsides", "Offsides"],
  ["yellowCards", "Yellow cards"],
  ["redCards", "Red cards"],
];

function eventIcon(typeText = "") {
  if (/own goal/i.test(typeText)) return "⚽(OG)";
  if (/penalty.*missed|missed.*penalty/i.test(typeText)) return "❌";
  if (/goal/i.test(typeText)) return "⚽";
  if (/yellow/i.test(typeText)) return "🟨";
  if (/red/i.test(typeText)) return "🟥";
  if (/substitution/i.test(typeText)) return "🔄";
  if (/kickoff/i.test(typeText)) return "▶️";
  if (/halftime|half-time/i.test(typeText)) return "⏸️";
  if (/full time|fulltime|end/i.test(typeText)) return "🏁";
  return "•";
}

function StatsPane({ box }) {
  const teams = box && box.teams;
  if (!teams || teams.length < 2) return <div className="state-msg">No statistics yet.</div>;
  const home = teams.find(t => t.homeAway === "home") || teams[0];
  const away = teams.find(t => t.homeAway === "away") || teams[1];
  const get = (t, name) => {
    const s = (t.statistics || []).find(s => s.name === name);
    return s ? s.displayValue : null;
  };
  const rows = STAT_LABELS
    .map(([name, label]) => ({ label, h: get(home, name), a: get(away, name) }))
    .filter(r => r.h !== null || r.a !== null);
  if (!rows.length) return <div className="state-msg">No statistics yet.</div>;
  return (
    <div>
      {rows.map(r => {
        const hv = parseFloat(r.h) || 0;
        const av = parseFloat(r.a) || 0;
        const total = hv + av || 1;
        return (
          <div className="stat-row" key={r.label}>
            <div className="stat-vals">
              <span>{r.h ?? "–"}</span>
              <span className="stat-label">{r.label}</span>
              <span>{r.a ?? "–"}</span>
            </div>
            <div className="stat-bars">
              <div className="h" style={{ width: `${(hv / total) * 100}%` }} />
              <div className="a" style={{ width: `${(av / total) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelinePane({ keyEvents }) {
  if (!keyEvents || !keyEvents.length) return <div className="state-msg">No events yet.</div>;
  return (
    <ul className="timeline">
      {keyEvents.slice().reverse().map((ev, i) => (
        <li key={ev.id || i}>
          <span className="t-clock">{(ev.clock && ev.clock.displayValue) || ""}</span>
          <span>{eventIcon(ev.type && ev.type.text)}</span>
          <span>{ev.text || (ev.type && ev.type.text) || ""}</span>
        </li>
      ))}
    </ul>
  );
}

function LineupsPane({ rosters }) {
  if (!rosters || rosters.length < 2 || !rosters.some(r => (r.roster || []).length))
    return <div className="state-msg">Lineups not available yet.</div>;
  const side = r => {
    const starters = (r.roster || [])
      .filter(p => p.starter)
      .sort((a, b) => (a.formationPlace || 99) - (b.formationPlace || 99));
    const bench = (r.roster || []).filter(p => !p.starter);
    return (
      <div key={r.homeAway}>
        <h4>
          {r.team.displayName}{" "}
          {r.formation && <span className="formation">({r.formation})</span>}
        </h4>
        <ul>
          {starters.map(p => (
            <li key={p.athlete.id || p.athlete.displayName}>
              <span className="jersey">{p.jersey}</span>
              {p.athlete.displayName}
              {p.position ? ` · ${p.position.abbreviation}` : ""}
            </li>
          ))}
        </ul>
        {bench.length > 0 && (
          <>
            <div className="bench-title">Substitutes</div>
            <ul>
              {bench.map(p => (
                <li className="bench" key={p.athlete.id || p.athlete.displayName}>
                  <span className="jersey">{p.jersey}</span>
                  {p.athlete.displayName}
                  {p.subbedIn ? " 🔄" : ""}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  };
  const home = rosters.find(r => r.homeAway === "home") || rosters[0];
  const away = rosters.find(r => r.homeAway === "away") || rosters[1];
  return (
    <div className="lineups">
      {side(home)}
      {side(away)}
    </div>
  );
}

function CommentaryPane({ commentary }) {
  if (!commentary || !commentary.length) return <div className="state-msg">No commentary yet.</div>;
  const items = commentary.slice(-30).reverse();
  return (
    <ul className="commentary">
      {items.map((c, i) => (
        <li key={c.sequence || i}>
          {c.time && c.time.displayValue && <b>{c.time.displayValue}</b>}
          {c.text}
        </li>
      ))}
    </ul>
  );
}

function InfoPane({ summary }) {
  const gi = summary.gameInfo || {};
  const venue = gi.venue;
  const officials = gi.officials || [];
  const odds = (summary.pickcenter && summary.pickcenter[0]) || (summary.odds && summary.odds[0]);
  const broadcasts =
    (summary.header && summary.header.competitions && summary.header.competitions[0].broadcasts) || [];
  const rows = [];
  if (venue)
    rows.push([
      "Venue",
      `${venue.fullName}${venue.address ? `, ${venue.address.city || ""} ${venue.address.country || ""}` : ""}`,
    ]);
  if (gi.attendance) rows.push(["Attendance", gi.attendance.toLocaleString()]);
  officials.forEach(o =>
    rows.push([(o.position && o.position.displayName) || "Official", o.displayName])
  );
  if (broadcasts.length)
    rows.push([
      "TV",
      broadcasts.map(b => (b.media && b.media.shortName) || b.shortName).filter(Boolean).join(", "),
    ]);
  if (odds && odds.details)
    rows.push(["Odds", `${odds.details}${odds.provider ? ` (${odds.provider.name})` : ""}`]);
  if (!rows.length) return <div className="state-msg">No match info.</div>;
  return (
    <div className="info-grid">
      {rows.map(([k, v], i) => (
        <div className="row" key={i}>
          <span className="k">{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

export default function MatchDetail({ eventId, live }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("stats");
  const [voice, setVoice] = useState(false);
  const lastSpokenRef = useRef(0);

  // Read newly arrived commentary lines aloud while voice mode is on
  useEffect(() => {
    if (!voice || !summary || !summary.commentary) return;
    const fresh = summary.commentary
      .filter(c => (c.sequence || 0) > lastSpokenRef.current)
      .slice(-3);
    for (const c of fresh) {
      const t = c.time && c.time.displayValue ? `${c.time.displayValue}. ` : "";
      speak(t + (c.text || ""));
      lastSpokenRef.current = Math.max(lastSpokenRef.current, c.sequence || 0);
    }
  }, [voice, summary]);

  // Stop talking when the detail panel closes
  useEffect(() => () => stopSpeaking(), []);

  const toggleVoice = () => {
    setVoice(v => {
      if (v) {
        stopSpeaking();
        return false;
      }
      const items = (summary && summary.commentary) || [];
      const maxSeq = items.reduce((m, c) => Math.max(m, c.sequence || 0), 0);
      // Speak the most recent line immediately as confirmation
      lastSpokenRef.current = Math.max(0, maxSeq - 1);
      return true;
    });
  };

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    async function go() {
      try {
        const data = await fetchJson(`${API}/summary?event=${eventId}`);
        if (cancelled) return;
        setSummary(data);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) {
        const nextPoll = live ? DETAIL_REFRESH_MS : IDLE_REFRESH_MS;
        timer = setTimeout(go, nextPoll);
      }
    }
    go();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eventId, live]);

  if (error)
    return (
      <div className="detail">
        <div className="state-msg">Could not load details ({error}).</div>
      </div>
    );
  if (!summary)
    return (
      <div className="detail">
        <div className="skeleton" style={{ height: 60 }} />
      </div>
    );

  const tabs = [
    ["stats", "Stats"],
    ["timeline", "Timeline"],
    ["lineups", "Lineups"],
    ["commentary", "Commentary"],
    ["info", "Info"],
  ];
  return (
    <div className="detail" onClick={e => e.stopPropagation()}>
      <div className="detail-tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "stats" && <StatsPane box={summary.boxscore} />}
      {tab === "timeline" && <TimelinePane keyEvents={summary.keyEvents} />}
      {tab === "lineups" && <LineupsPane rosters={summary.rosters} />}
      {tab === "commentary" && (
        <>
          {speechSupported && (
            <div className="voice-bar">
              <button className={voice ? "voice-btn on" : "voice-btn"} onClick={toggleVoice}>
                {voice ? "🔊 Voice commentary: ON" : "🔈 Voice commentary: OFF"}
              </button>
            </div>
          )}
          <CommentaryPane commentary={summary.commentary} />
        </>
      )}
      {tab === "info" && <InfoPane summary={summary} />}
    </div>
  );
}
