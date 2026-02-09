# Visual Change Monitor

A self-hosted, near-zero-cost visual change monitoring service. Screenshots web pages on a schedule, diffs them against baselines, and alerts via email when changes exceed a threshold.

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
    "threshold": 3.0,
    "viewport": { "width": 1280, "height": 720 },
    "fullPage": true,
    "waitFor": "networkidle",
    "hideSelectors": [".cookie-banner", ".ad-slot"],
    "tags": ["production"],
    "notifications": { "mailgun": true }
  }
]
```

### 2. Set up notifications (optional)

Add these as GitHub Actions secrets in your repo settings:

| Secret | Description |
|--------|-------------|
| `MAILGUN_API_KEY` | Mailgun API key |
| `MAILGUN_DOMAIN` | Mailgun sending domain |
| `MAILGUN_TO` | Recipient email address |
| `MAILGUN_FROM` | Sender address (optional, defaults to `Visual Monitor <noreply@{domain}>`) |

Emails include inline before/after screenshots when a change is detected.

### 3. Set up the trigger

The monitor runs via `repository_dispatch` (type: `run-monitor`) or `workflow_dispatch`. Use an external cron service like [EasyCron](https://www.easycron.com/) to send a `repository_dispatch` event on your desired schedule, or trigger manually from the GitHub Actions tab.

Example `repository_dispatch` payload:

```json
{ "event_type": "run-monitor" }
```

### 4. Run locally first

```bash
npm install
npx playwright install chromium --with-deps
npm run monitor
```

Check `data/state.json` and `data/screenshots/` for results.

### 5. Deploy the dashboard

The dashboard deploys automatically to GitHub Pages when changes are pushed to `main`. Enable GitHub Pages in your repo settings (source: GitHub Actions).

To develop locally:

```bash
npm run dev
```

## How It Works

1. **Capture** — Playwright takes full-page screenshots of each configured URL
2. **Hide** — Elements with class `.ignore-vm` are always hidden, plus `header`/`footer` by default
3. **Diff** — pixelmatch compares the new screenshot against the saved baseline
4. **Alert** — If the pixel diff exceeds the site's threshold, a Mailgun email fires with inline before/after images
5. **Rotate** — The new screenshot becomes the next baseline **only when the threshold is exceeded**
6. **Store** — Everything is committed back to the repo as the "database"

The dashboard fetches state and images directly from `raw.githubusercontent.com` at runtime, so it always reflects the latest monitor run.

## Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the site |
| `name` | string | Display name |
| `url` | string | URL to monitor |
| `threshold` | number | Change percentage to trigger alerts (e.g., `3.0` = 3%) |
| `viewport` | object | `{ width, height }` for the browser viewport |
| `fullPage` | boolean | Capture full page scroll or just viewport |
| `waitFor` | string | `"networkidle"` or `"load"` |
| `hideSelectors` | string[] | CSS selectors to hide before screenshotting |
| `auth` | object | `{ type: "basic", username, password }` or `{ type: "cookies", cookies: [...] }` |
| `tags` | string[] | Tags for filtering in the dashboard |
| `notifications` | object | `{ mailgun: bool }` per-site notification toggle |

## Ignoring Elements

To exclude elements from visual comparison and reduce false positives:

- **Per-site:** Add CSS selectors to `hideSelectors` in `sites.json`
- **Global:** Add the class `ignore-vm` to any element on the monitored page — it is automatically hidden on every capture

## Dashboard

The dashboard shows:

- Summary stats (total sites, changes, errors, checks today)
- Site cards with screenshot thumbnails, sparkline history, and status badges
- Expandable details with before/after/diff pixel comparison when a change is detected
- Activity log timeline of recent events

## Project Structure

```
visual-monitor/
├── monitor/          # Node.js screenshot + diff + notify scripts
├── dashboard/        # React + Vite + Tailwind static dashboard
├── data/             # Git-committed state, screenshots, baselines, diffs
├── sites.json        # Your monitoring configuration
└── .github/workflows # Monitor trigger + dashboard deploy
```
