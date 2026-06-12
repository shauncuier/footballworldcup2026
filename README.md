# FIFA World Cup 2026 Live Scores

Real-time web app tracking all 104 matches of the 2026 FIFA World Cup across USA, Canada, and Mexico.

**Live:** [worldcup.3s-soft.net](https://worldcup.3s-soft.net)

## Features

- **Live Scores** — auto-refreshes every 15 s during matches, 60 s otherwise
- **Full Schedule** — all 104 games with dates, times, venues, and group filter (A-L)
- **Group Standings** — live tables for all 12 groups, top-2 qualification highlighted
- **Top Scorers** — leaderboard derived from live match goal data
- **Teams** — all 48 qualified nations with flags; click for individual schedules
- **Stadiums** — all 16 venues with capacity and match-load progress bar
- **News** — latest headlines from ESPN

## Tech Stack

| Layer | Choice |
|-------|--------|
| UI | React 18 + Vite 6 |
| Styling | Plain CSS (no framework) |
| Live data | ESPN public API |
| Schedule / Teams / Venues | worldcup26.ir |
| Analytics | Google Analytics 4 |
| Hosting | GitHub Pages + custom domain |

## Data Sources

- **ESPN** (`site.api.espn.com`) — live scoreboard, match detail, standings, news (no API key)
- **worldcup26.ir** — complete fixture list, 48 teams, 16 stadiums, group data (no API key)

Both APIs support CORS and are free without authentication.

## Local Development

```bash
npm install
npm run dev        # http://localhost:5173
```

Optional: copy `.env.example` to `.env` and set your GA4 measurement ID:

```
VITE_GA_ID=G-XXXXXXXXXX
```

## Build & Deploy

```bash
npm run build      # output in dist/
```

Deployment is automated via GitHub Actions on every push to `main`. The workflow builds the app and publishes `dist/` to GitHub Pages.

## Project Structure

```
src/
  api.js                  # All API calls and data helpers
  analytics.js            # GA4 integration
  App.jsx                 # 7-tab shell + header/footer
  index.css               # All styles
  main.jsx                # Entry point
  components/
    MatchesTab.jsx         # Live scores with date navigation
    MatchCard.jsx          # Individual match card + scorer list
    MatchDetail.jsx        # Stats, timeline, lineups, commentary
    ScheduleTab.jsx        # Full 104-game schedule
    StandingsTab.jsx       # Group tables
    TopScorersTab.jsx      # Goal leaderboard
    TeamsTab.jsx           # 48-team grid + modals
    StadiumsTab.jsx        # 16 venues
    NewsTab.jsx            # ESPN headlines
    Shared.jsx             # StatusBadge, TeamSide, skeleton loaders
```

## Credits

Created by [3s-Soft.com](https://3s-soft.com)

Data provided by ESPN and worldcup26.ir. Not affiliated with FIFA.
