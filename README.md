# Visual Change Monitor

A self-hosted, near-zero-cost visual change monitoring service. Screenshots web pages on a schedule, diffs them against baselines, and alerts via email when changes exceed a threshold.

**Cost: $0** — runs entirely on GitHub Actions (free tier) + GitHub Pages. All state (config, screenshots, baselines, diffs) lives in the repo itself — no database, no object storage, no servers.

## Setup

### 1. Get the code into your own GitHub repo

Fork this repo, or push a copy to a new repo of your own:

```bash
git init
git add -A
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Everything below assumes the code lives at `https://github.com/<your-username>/<your-repo>`. No source edits are needed to point things at your repo — the workflows and dashboard pick up the repo name automatically.

### 2. Try it locally first (recommended)

```bash
npm install
npx playwright install chromium --with-deps
npm run monitor          # captures screenshots, diffs, writes data/state.json
npm run dev              # open the dashboard against your local data
```

The first run for any site just stores a baseline. Check `data/state.json` and `data/screenshots/` for results.

### 3. Configure the sites to monitor

Edit `sites.json`. The repo ships with one `example.com` entry — replace it with the URLs you want to track:

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

Each `id` must be unique — it's used as the filename for that site's screenshots, baselines, and diffs. Commit and push; the next monitor run picks up the changes.

### 4. Enable GitHub Pages for the dashboard

In your repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The `deploy-dashboard.yml` workflow builds the dashboard and points it at your repo automatically — it passes `VITE_GITHUB_REPO=${{ github.repository }}` at build time, so the dashboard fetches state and images from *your* `raw.githubusercontent.com` with no code changes. It redeploys on every push to `main` that touches `dashboard/`, and can be run manually from the Actions tab.

(For local dev against a deployed repo's data, set `VITE_GITHUB_REPO="<your-username>/<your-repo>"` before `npm run dev`. The default fallback is `your-username/visual-monitor`.)

### 5. Set up notifications (optional)

Add these as GitHub Actions secrets (**Settings → Secrets and variables → Actions**). If they're unset, notifications are silently skipped.

| Secret | Description |
|--------|-------------|
| `MAILGUN_API_KEY` | Mailgun API key |
| `MAILGUN_DOMAIN` | Mailgun sending domain |
| `MAILGUN_TO` | Recipient email address |
| `MAILGUN_FROM` | Sender address (optional, defaults to `Visual Monitor <noreply@{domain}>`) |

Emails include inline before/after screenshots when a change exceeds the threshold.

### 6. Schedule the monitor

The `Visual Monitor` workflow runs on `repository_dispatch` (type: `run-monitor`) or `workflow_dispatch` (manual, from the Actions tab). It needs no scheduling to test — just trigger it manually first.

For recurring runs, point a free external cron service such as [EasyCron](https://www.easycron.com/) at the GitHub API to fire a `repository_dispatch` event. Configure it to POST:

```
POST https://api.github.com/repos/<your-username>/<your-repo>/dispatches
Authorization: Bearer <a GitHub personal access token with "repo" scope>
Accept: application/vnd.github+json

{ "event_type": "run-monitor" }
```

> Why an external cron instead of GitHub's built-in `schedule:`? GitHub's scheduled workflows are throttled and frequently delayed by many minutes on the free tier; an external trigger fires on time. If you don't mind the imprecision, you can add a `schedule:` block to `.github/workflows/monitor.yml` instead and skip the external service.

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

## License

MIT — see [LICENSE](LICENSE).
