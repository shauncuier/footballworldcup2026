import { useState, useEffect } from "react";
import { ESPN_API, IDLE_REFRESH_MS, fetchJson, ymd, fmtKickoff } from "../api.js";
import { Skeletons, StatusBadge } from "./Shared.jsx";

const WHERE_TO_WATCH = [
  {
    region: "United States",
    flag: "🇺🇸",
    options: [
      { name: "FOX / FS1 — English TV (free over-the-air)", url: "https://www.foxsports.com/live" },
      { name: "Telemundo — Spanish TV (free over-the-air)", url: "https://www.telemundo.com/en-vivo" },
      { name: "Peacock — Spanish streaming", url: "https://www.peacocktv.com" },
    ],
  },
  {
    region: "Canada",
    flag: "🇨🇦",
    options: [
      { name: "CTV — free over-the-air", url: "https://www.ctv.ca/live" },
      { name: "TSN / TSN+", url: "https://www.tsn.ca/live" },
      { name: "RDS — French", url: "https://www.rds.ca" },
    ],
  },
  {
    region: "Mexico",
    flag: "🇲🇽",
    options: [
      { name: "Canal 5 / Las Estrellas — free over-the-air", url: "https://www.televisa.com" },
      { name: "TV Azteca 7 — free over-the-air", url: "https://www.tvazteca.com/envivo" },
      { name: "ViX — streaming", url: "https://vix.com" },
    ],
  },
  {
    region: "United Kingdom",
    flag: "🇬🇧",
    options: [
      { name: "BBC iPlayer — free", url: "https://www.bbc.co.uk/iplayer" },
      { name: "ITVX — free", url: "https://www.itv.com/watch" },
    ],
  },
  {
    region: "Worldwide",
    flag: "🌍",
    options: [
      { name: "FIFA+ — free in select regions", url: "https://www.plus.fifa.com" },
      { name: "Official broadcaster list (FIFA.com)", url: "https://www.fifa.com/en/watch" },
    ],
  },
];

function fmtDuration(sec) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VideoCard({ video, onPlay }) {
  return (
    <button className="video-card" onClick={() => onPlay(video)}>
      <div className="video-thumb">
        {video.thumbnail && <img src={video.thumbnail} alt="" loading="lazy" />}
        <span className="video-play">▶</span>
        {video.duration > 0 && <span className="video-duration">{fmtDuration(video.duration)}</span>}
      </div>
      <div className="video-meta">
        <div className="video-headline">{video.headline}</div>
        {video.matchName && <div className="video-match">{video.matchName}</div>}
      </div>
    </button>
  );
}

function BroadcastRow({ event }) {
  const comp = event.competitions?.[0];
  const competitors = comp?.competitors || [];
  const home = competitors.find(c => c.homeAway === "home");
  const away = competitors.find(c => c.homeAway === "away");
  const channels = (comp?.broadcasts || []).flatMap(b => b.names || []);
  return (
    <div className="broadcast-row">
      <div className="broadcast-match">
        <span className="broadcast-teams">
          {home?.team?.shortDisplayName ?? "TBD"} vs {away?.team?.shortDisplayName ?? "TBD"}
        </span>
        <StatusBadge status={event.status} />
      </div>
      <div className="broadcast-channels">
        {event.status?.type?.state === "pre" && (
          <span className="broadcast-time">{fmtKickoff(event.date)}</span>
        )}
        {channels.length
          ? channels.map(c => <span key={c} className="channel-chip">{c}</span>)
          : <span className="channel-chip muted">Check local listings</span>}
      </div>
    </div>
  );
}

export default function WatchTab() {
  const [videos, setVideos] = useState(null);
  const [events, setEvents] = useState([]);
  const [playing, setPlaying] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    async function load() {
      try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const [sbToday, sbYesterday] = await Promise.all([
          fetchJson(`${ESPN_API}/scoreboard?dates=${ymd(today)}`),
          fetchJson(`${ESPN_API}/scoreboard?dates=${ymd(yesterday)}`),
        ]);
        const todayEvents = sbToday.events || [];
        const allEvents = [...todayEvents, ...(sbYesterday.events || [])];

        // Pull highlight clips from each match summary (live + finished first)
        const interesting = allEvents
          .filter(e => e.status?.type?.state !== "pre")
          .slice(0, 8);
        const summaries = await Promise.allSettled(
          interesting.map(e => fetchJson(`${ESPN_API}/summary?event=${e.id}`))
        );
        const seen = new Set();
        const clips = [];
        summaries.forEach((res, i) => {
          if (res.status !== "fulfilled") return;
          for (const v of res.value.videos || []) {
            if (seen.has(v.id)) continue;
            seen.add(v.id);
            clips.push({
              id: v.id,
              headline: v.headline,
              duration: v.duration,
              thumbnail: v.thumbnail,
              src: v.links?.source?.HD?.href || v.links?.source?.href,
              matchName: interesting[i]?.shortName,
            });
          }
        });

        if (!cancelled) {
          setVideos(clips.filter(c => c.src));
          setEvents(todayEvents);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
      if (!cancelled) timer = setTimeout(load, IDLE_REFRESH_MS * 5);
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const liveCount = events.filter(e => e.status?.type?.state === "in").length;

  if (error && videos === null) {
    return <div className="state-msg">Could not load watch data ({error}).</div>;
  }
  if (videos === null) return <Skeletons n={4} />;

  return (
    <div className="watch-tab">
      {liveCount > 0 && (
        <div className="watch-banner">
          🔴 {liveCount} match{liveCount > 1 ? "es" : ""} live now — follow real-time scores in
          the Matches tab, or watch on an official broadcaster below.
        </div>
      )}

      {playing && (
        <div className="video-player">
          <div className="video-player-head">
            <span>{playing.headline}</span>
            <button className="video-close" onClick={() => setPlaying(null)}>✕</button>
          </div>
          <video key={playing.id} src={playing.src} poster={playing.thumbnail} controls autoPlay playsInline />
        </div>
      )}

      <h2 className="watch-heading">🎬 Match Highlights &amp; Reactions</h2>
      {videos.length ? (
        <div className="video-grid">
          {videos.map(v => <VideoCard key={v.id} video={v} onPlay={setPlaying} />)}
        </div>
      ) : (
        <div className="state-msg">No highlight clips yet — check back after today&apos;s matches.</div>
      )}

      {events.length > 0 && (
        <>
          <h2 className="watch-heading">📡 Today&apos;s Matches on TV</h2>
          <div className="broadcast-list">
            {events.map(e => <BroadcastRow key={e.id} event={e} />)}
          </div>
        </>
      )}

      <h2 className="watch-heading">🌐 Where to Watch Live (official &amp; free options)</h2>
      <div className="wtw-grid">
        {WHERE_TO_WATCH.map(r => (
          <div key={r.region} className="wtw-card">
            <div className="wtw-region">{r.flag} {r.region}</div>
            <ul>
              {r.options.map(o => (
                <li key={o.name}>
                  <a href={o.url} target="_blank" rel="noopener noreferrer">{o.name}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <footer>
        Highlights: ESPN · Live matches are only available via official rights holders —
        availability varies by country. Over-the-air channels are free with an antenna.
      </footer>
    </div>
  );
}
