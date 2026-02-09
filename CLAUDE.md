# CLAUDE.md — Visual Change Monitor

## What This Project Is

A self-hosted, zero-cost visual change monitoring service. It screenshots web pages on a schedule, diffs them against baselines using pixelmatch, and alerts via Discord/Slack/ntfy.sh when changes exceed a threshold. All state is stored in the git repo itself — no database, no object storage.

## Architecture

Three parts:

1. **Monitor** (`monitor/`) — Node.js scripts run by GitHub Actions on a cron. Playwright captures screenshots, pixelmatch computes diffs, results are written to `data/state.json` and committed back to the repo.
2. **Dashboard** (`dashboard/`) — Static React + Vite + Tailwind site deployed to GitHub Pages. Reads the committed `data/state.json` to display status.
3. **Notifications** (`monitor/notify.mjs`) — Discord/Slack webhooks and ntfy.sh push when thresholds are exceeded.

## Project Structure

```
visual-monitor/
├── .github/workflows/
│   ├── monitor.yml              # Cron every 6h + manual dispatch
│   └── deploy-dashboard.yml     # Deploys dashboard to GitHub Pages
├── monitor/
│   ├── index.mjs                # Main orchestrator
│   ├── config.mjs               # Loads sites.json and state.json, path constants
│   ├── screenshot.mjs           # Playwright screenshot capture
│   ├── diff.mjs                 # pixelmatch comparison + baseline rotation
│   └── notify.mjs               # Discord, Slack, ntfy.sh dispatch
├── tailwind.config.js             # Tailwind config (content paths point to dashboard/)
├── postcss.config.js              # PostCSS config (tailwindcss + autoprefixer)
├── dashboard/
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # Main dashboard shell: fetch state, filters, layout
│       └── components/
│           ├── StatCards.jsx     # Summary stat cards (sites, changes, errors, checks)
│           ├── SiteCard.jsx     # Expandable site row with sparkline + history
│           ├── Sparkline.jsx    # SVG sparkline chart
│           ├── ActivityLog.jsx  # Timeline sidebar of recent events
│           └── DiffPreview.jsx  # Before/after/diff image viewer
├── data/
│   ├── state.json               # Monitor output — the "database"
│   ├── baselines/               # Latest baseline PNGs per site
│   ├── diffs/                   # Diff overlay PNGs (last N per site)
│   └── screenshots/             # Latest screenshot PNGs per site
├── sites.json                   # User config — URLs to monitor
├── package.json                 # Single package.json for all deps
└── CLAUDE.md                    # This file
```

## Single package.json

All dependencies live in the root `package.json`. There is no nested `dashboard/package.json`. One `npm install` gets everything — Playwright/pixelmatch for the monitor and React/Vite/Tailwind for the dashboard. The dashboard scripts pass `dashboard` as the Vite root directory. Tailwind and PostCSS configs live at the project root so PostCSS finds them from CWD.

```bash
npm install                      # all deps, one command
npm run monitor                  # node monitor/index.mjs
npm run dev                      # vite dev server for dashboard
npm run build:dashboard          # production build → dashboard/dist/
```

## How to Run Locally

```bash
npm install
npx playwright install chromium --with-deps

# Run the monitor (captures screenshots, diffs, updates data/state.json)
npm run monitor

# Run the dashboard dev server
npm run dev
```

## Key Files to Edit

- **`sites.json`** — Add/remove/edit monitored URLs. Each entry needs a unique `id`, a `url`, a `threshold` (percent), and optional `hideSelectors`, `tags`, `viewport`, `fullPage`, and notification toggles.
- **`monitor/notify.mjs`** — To add new notification channels beyond Discord/Slack/ntfy.
- **`dashboard/src/App.jsx`** — Dashboard layout, state fetching, filtering logic.
- **`dashboard/src/components/`** — Individual dashboard UI components.
- **`.github/workflows/monitor.yml`** — Change cron schedule (default: every 6 hours).

## Data Flow

1. GitHub Actions cron triggers `monitor/index.mjs`
2. For each site in `sites.json`:
   - Playwright screenshots the URL → `data/screenshots/{id}.png`
   - pixelmatch diffs against `data/baselines/{id}.png` → diff % + overlay in `data/diffs/`
   - If diff ≥ threshold → notifications fire
   - Current screenshot promoted to new baseline
3. `data/state.json` updated with all results
4. Git commit + push of `data/` directory
5. Push to main triggers dashboard redeploy to GitHub Pages
6. Dashboard fetches `data/state.json` on load

## Conventions

- All monitor code is ESM (`.mjs` extension, `"type": "module"`)
- Dashboard is React 18 with Vite, Tailwind v3, no component library
- Dark theme: background `#0a0a0f`, surface layers `#101018` → `#262635`, accents cyan `#00e5ff` / rose `#ff3d71` / amber `#ffb300` / green `#00e676`
- Fonts: DM Sans (display), JetBrains Mono (code/data)
- State shape defined in `data/state.json` — sites keyed by ID, each with status, changePercent, history array, tags, error
- History entries are `{ timestamp, changePercent }` — capped at 50 per site
- Activity log entries are `{ timestamp, siteId, type, detail }` — capped at 200

## GitHub Actions Secrets

Optional — notifications skip silently if not set:

- `DISCORD_WEBHOOK` — Discord channel webhook URL
- `SLACK_WEBHOOK` — Slack incoming webhook URL
- `NTFY_TOPIC` — ntfy.sh topic name

## Common Tasks

**Add a new site:** Add an entry to `sites.json`, commit and push. Next cron run picks it up.

**Change check frequency:** Edit the cron in `.github/workflows/monitor.yml` (default: `0 */6 * * *`).

**Reduce false positives:** Add CSS selectors to `hideSelectors` in `sites.json` for elements that change every load (ads, timestamps, cookie banners).

**Add a notification channel:** Add a new async function in `monitor/notify.mjs` following the `sendDiscord`/`sendSlack`/`sendNtfy` pattern, wire it into the `notify()` export.

**Build dashboard for production:** `npm run build:dashboard` — output goes to `dashboard/dist/`.
