# Visual Change Monitor

A self-hosted, near-zero-cost visual change monitoring service. Screenshots web pages on a schedule, diffs them against baselines, and alerts when changes exceed a threshold.

**Cost: $0** — runs entirely on GitHub Actions (free tier) + GitHub Pages.

## Quick Start

### 1. Configure sites to monitor

Edit `sites.json` to add the URLs you want to track:

```json
[
  {
    "id": "my-site",
    "name": "My Site",
    "url": "https://example.com",
    "threshold": 1.0,
    "viewport": { "width": 1280, "height": 720 },
    "fullPage": false,
    "waitFor": "networkidle",
    "hideSelectors": [".cookie-banner", ".ad-slot"],
    "tags": ["production"],
    "notifications": { "discord": true, "slack": false }
  }
]
```

### 2. Set up notifications (optional)

Add these as GitHub Actions secrets in your repo settings:

| Secret | Description |
|--------|-------------|
| `DISCORD_WEBHOOK` | Discord channel webhook URL |
| `SLACK_WEBHOOK` | Slack incoming webhook URL |
| `NTFY_TOPIC` | ntfy.sh topic name for push notifications |

### 3. Run locally first

```bash
npm install
npx playwright install chromium --with-deps
node monitor/index.mjs
```

Check `data/state.json` and `data/screenshots/` for results.

### 4. Push to GitHub

The monitor runs automatically every 6 hours via GitHub Actions. You can also trigger it manually from the Actions tab using `workflow_dispatch`.

### 5. Deploy the dashboard

The dashboard deploys automatically to GitHub Pages when changes are pushed to `main`. Enable GitHub Pages in your repo settings (source: GitHub Actions).

To develop locally:

```bash
cd dashboard
npm install
npm run dev
```

## How It Works

1. **Capture** — Playwright takes screenshots of each configured URL
2. **Diff** — pixelmatch compares the new screenshot against the saved baseline
3. **Alert** — If the pixel diff exceeds the site's threshold, notifications fire
4. **Rotate** — The new screenshot becomes the next baseline
5. **Store** — Everything is committed back to the repo as the "database"

## Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the site |
| `name` | string | Display name |
| `url` | string | URL to monitor |
| `threshold` | number | Change percentage to trigger alerts (e.g., `1.0` = 1%) |
| `viewport` | object | `{ width, height }` for the browser viewport |
| `fullPage` | boolean | Capture full page scroll or just viewport |
| `waitFor` | string | `"networkidle"` or `"load"` |
| `hideSelectors` | string[] | CSS selectors to hide before screenshotting |
| `auth` | object | `{ type: "basic", username, password }` or `{ type: "cookies", cookies: [...] }` |
| `tags` | string[] | Tags for filtering in the dashboard |
| `notifications` | object | `{ discord: bool, slack: bool }` per-site notification toggle |

## Project Structure

```
visual-monitor/
├── monitor/          # Node.js screenshot + diff + notify scripts
├── dashboard/        # React + Vite + Tailwind static dashboard
├── data/             # Git-committed state, screenshots, baselines, diffs
├── sites.json        # Your monitoring configuration
└── .github/workflows # Cron job + dashboard deploy
```
