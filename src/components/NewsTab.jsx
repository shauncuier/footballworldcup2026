import { useState, useEffect } from "react";
import { API, fetchJson } from "../api.js";
import { Skeletons } from "./Shared.jsx";

export default function NewsTab() {
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson(`${API}/news`)
      .then(d => {
        if (!cancelled) setArticles(d.articles || []);
      })
      .catch(e => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
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
                {a.published && new Date(a.published).toLocaleString()}{" "}
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
