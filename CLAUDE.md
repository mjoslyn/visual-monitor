# CLAUDE.md — Visual Change Monitor

## What This Project Is

A self-hosted, zero-cost visual change monitoring service. It screenshots web pages on a schedule, diffs them against baselines using pixelmatch, and alerts via Mailgun when changes exceed a threshold. All state is stored in the git repo itself — no database, no object storage.

## Architecture

Three parts:

1. **Monitor** (`monitor/`) — Node.js scripts triggered by GitHub Actions via `repository_dispatch` (external cron e.g. EasyCron) or `workflow_dispatch` (manual). Playwright captures screenshots, pixelmatch computes diffs, results are written to `data/state.json` and committed back to the repo.
2. **Dashboard** (`dashboard/`) — Static React + Vite + Tailwind site deployed to GitHub Pages. Fetches `data/state.json` and images from raw.githubusercontent.com at runtime.
3. **Notifications** (`monitor/notify.mjs`) — Mailgun email with inline before/after screenshots when thresholds are exceeded.

## Project Structure

```
visual-monitor/
├── .github/workflows/
│   ├── monitor.yml              # repository_dispatch + workflow_dispatch
│   └── deploy-dashboard.yml     # Deploys dashboard to GitHub Pages on push to main
├── monitor/
│   ├── index.mjs                # Main orchestrator
│   ├── config.mjs               # Loads sites.json and state.json, path constants
│   ├── screenshot.mjs           # Playwright screenshot capture
│   ├── diff.mjs                 # pixelmatch comparison + baseline management
│   └── notify.mjs               # Mailgun email dispatch with inline images
├── tailwind.config.js           # Tailwind config (content paths point to dashboard/)
├── postcss.config.js            # PostCSS config (tailwindcss + autoprefixer)
├── dashboard/
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # Main dashboard shell: fetch state, filters, layout
│       └── components/
│           ├── StatCards.jsx     # Summary stat cards (sites, changes, errors, checks)
│           ├── SiteCard.jsx     # Expandable site row with sparkline, thumbnails, diff comparison
│           ├── Sparkline.jsx    # SVG sparkline chart
│           ├── ActivityLog.jsx  # Timeline sidebar of recent events
│           └── DiffPreview.jsx  # Before/after/diff image viewer (placeholder)
├── data/
│   ├── state.json               # Monitor output — the "database"
│   ├── baselines/               # Latest baseline PNGs per site (git-tracked)
│   ├── diffs/                   # Diff overlay PNGs — latest per site + timestamped history (git-tracked)
│   └── screenshots/             # Latest + timestamped screenshot PNGs per site (git-tracked)
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
npm run build:dashboard          # production build -> dashboard/dist/
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
- **`monitor/notify.mjs`** — To add new notification channels beyond Mailgun.
- **`dashboard/src/App.jsx`** — Dashboard layout, state fetching, filtering logic.
- **`dashboard/src/components/`** — Individual dashboard UI components.
- **`.github/workflows/monitor.yml`** — Change trigger method or environment variables.

## Data Flow

1. External cron (EasyCron) sends `repository_dispatch` event to trigger `monitor/index.mjs`, or manual trigger via `workflow_dispatch`
2. For each site in `sites.json`:
   - Playwright screenshots the URL -> `data/screenshots/{id}.png`
   - Elements with class `.ignore-vm` are automatically hidden, plus any `hideSelectors` from the site config
   - pixelmatch diffs against `data/baselines/{id}.png` -> diff % + overlay in `data/diffs/`
   - If diff >= threshold -> Mailgun notification fires with inline before/after images
   - Current screenshot promoted to new baseline **only when change exceeds threshold**
   - A "latest" diff overlay saved as `data/diffs/{id}.png` for the dashboard
3. `data/state.json` updated with all results
4. Git commit + push of `data/` directory (with retry loop using `git pull -X theirs` for binary conflict resolution)
5. Push to main triggers dashboard redeploy to GitHub Pages
6. Dashboard fetches `data/state.json` and images from `raw.githubusercontent.com` at runtime

## Baseline Management

- On first run for a site, the screenshot becomes the initial baseline
- Baselines are only promoted (replaced) when a change **exceeds the threshold** — this prevents the baseline from drifting when minor sub-threshold changes accumulate
- Baselines are git-tracked so they persist between CI runs

## Conventions

- All monitor code is ESM (`.mjs` extension, `"type": "module"`)
- Dashboard is React 18 with Vite, Tailwind v3, no component library
- Dark theme: background `#0a0a0f`, surface layers `#101018` -> `#262635`, accents cyan `#00e5ff` / rose `#ff3d71` / amber `#ffb300` / green `#00e676`
- Fonts: DM Sans (display), JetBrains Mono (code/data)
- State shape defined in `data/state.json` — sites keyed by ID, each with status, changePercent, history array, tags, error
- History entries are `{ timestamp, changePercent }` — capped at 50 per site
- Activity log entries are `{ timestamp, siteId, type, detail }` — capped at 200
- Dashboard displays sites sorted alphabetically by name
- SiteCard shows screenshot thumbnail, sparkline, and expandable before/after/diff comparison when status is `changed`

## GitHub Actions Secrets

Required for Mailgun notifications (skipped silently if not set):

- `MAILGUN_API_KEY` — Mailgun API key
- `MAILGUN_DOMAIN` — Mailgun sending domain
- `MAILGUN_TO` — Recipient email address
- `MAILGUN_FROM` — Sender address (defaults to `Visual Monitor <noreply@{domain}>`)

## Ignoring Elements

To exclude elements from visual comparison:

- **Per-site:** Add CSS selectors to `hideSelectors` in `sites.json` (e.g. `[".cookie-banner", ".ad-slot"]`)
- **Global:** Add the class `ignore-vm` to any element on a monitored page — it is automatically hidden on every capture

## Common Tasks

**Add a new site:** Add an entry to `sites.json`, commit and push. Next monitor run picks it up.

**Trigger a monitor run:** Send a `repository_dispatch` event with type `run-monitor`, or use the GitHub Actions `workflow_dispatch` trigger from the Actions tab.

**Reduce false positives:** Add CSS selectors to `hideSelectors` in `sites.json`, or add `class="ignore-vm"` to elements on the page that change every load (ads, timestamps, cookie banners).

**Add a notification channel:** Add a new async function in `monitor/notify.mjs` following the `sendMailgun` pattern, wire it into the `notify()` export.

**Build dashboard for production:** `npm run build:dashboard` — output goes to `dashboard/dist/`.
