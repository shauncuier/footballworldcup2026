// GA4 measurement ID. Not a secret — safe to ship in the bundle.
// Override locally with VITE_GA_ID in .env (e.g. for a staging property).
const DEFAULT_GA_ID = "G-GCSJHWQEDH";

export function initAnalytics() {
  const id = import.meta.env.VITE_GA_ID || DEFAULT_GA_ID;
  if (!id || id === "G-XXXXXXXXXX") return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true });
}

export function trackTab(tabName) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", "tab_view", { tab_name: tabName });
}
