# 🏆 FIFA World Cup 2026 Live Dashboard

A high-performance, real-time web application providing live scores, statistics, lineups, group standings, and tournament news for the FIFA World Cup 2026. Built with React and Vite, it delivers instant updates in the background without any page refreshes.

Live demo: **[https://worldcup.3s-soft.net](https://worldcup.3s-soft.net)**

---

## ✨ Features

- **⚡ Real-Time Live Scores**: Automatically refreshes live matches every 15 seconds.
- **📊 Detailed Match Statistics**: Click on any match card to see interactive dashboards containing:
  - **Stats**: Possession, total shots, shots on target, corners, saves, passes, fouls, cards, and more.
  - **Timeline**: Chronological events including goals (with scorer name and minute), cards, substitutions, and half/full-time markers.
  - **Lineups**: Starting XI (with formation) and substitutes for both teams.
  - **Commentary**: Live textual commentary updated in real-time.
  - **Match Info**: Venue details, attendance, match officials, TV broadcast channels, and match odds.
- **📈 Group Standings**: Displays group stage tables with automatic green highlighting for the top 2 teams qualifying for the knockout rounds. Updates in the background.
- **📰 News Hub**: Aggregates the latest tournament news and articles with direct links to full reports.
- **🔄 Zero-Refresh Dynamic Experience**:
  - All data polls automatically in the background (15s for live scores, 30s for live match details, 60s for standings, news, and inactive matches).
  - Tabs are cached in memory using CSS visibility toggling, meaning you can switch tabs instantly without losing scroll positions or showing loading skeletons.

---

## 🛠️ Tech Stack

- **Framework**: [React](https://react.dev/) (v18.3)
- **Build Tool**: [Vite](https://vite.dev/) (v6.3)
- **Styling**: Vanilla CSS (Fluid layouts, dark-mode/glassmorphic aesthetic, responsive grid)
- **Data Source**: ESPN Soccer API (dynamic integration)
- **Deployment**: GitHub Pages with custom domain support

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shauncuier/footballworldcup2026.git
   cd footballworldcup2026
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📦 Deployment to GitHub Pages

The project is configured for seamless deployment to GitHub Pages using the `gh-pages` package. 

To deploy your changes to the live site, run:
```bash
npm run deploy
```
This script will build the application and automatically push the output directory (`dist`) to the `gh-pages` branch on GitHub.

### Custom Domain

The project is configured to run at **`worldcup.3s-soft.net`**. 

- The custom domain is declared in the CNAME file at `public/CNAME` to ensure it is kept across deployments.
- In Cloudflare, a CNAME record points `worldcup` to `shauncuier.github.io` (configured as **DNS Only**).
