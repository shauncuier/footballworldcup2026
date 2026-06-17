import { useState, useEffect } from "react";
import { API, IDLE_REFRESH_MS, fetchJson, fmtDateTimeBD } from "../api.js";
import { Skeletons } from "./Shared.jsx";

export default function NewsTab() {
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    async function load() {
      try {
        const d = await fetchJson(`${API}/news`);
        if (!cancelled) {
          setArticles(d.articles || []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
        }
      }
      if (!cancelled) {
        timer = setTimeout(load, IDLE_REFRESH_MS);
      }
    }

    load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (error) return <div className="state-msg">Could not load news ({error}).</div>;
  if (articles === null) return <Skeletons n={4} />;
  if (!articles.length) return <div className="state-msg">No news available.</div>;
  return (
    <>
      {articles.map((a, i) => {
        const img = a.images && a.images[0] && a.images[0].url;
        const link = a.links && a.links.web && a.links.web.href;
        return (
          <div className="news-card" key={i}>
            {img && <img src={img} alt="" />}
            <div className="news-body">
              <h3>{a.headline}</h3>
              <p>{a.description}</p>
              <div className="news-meta">
                {a.published && fmtDateTimeBD(a.published)}{" "}
                {link && (
                  <>
                    ·{" "}
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      Read →
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <footer>data: ESPN</footer>
    </>
  );
}
