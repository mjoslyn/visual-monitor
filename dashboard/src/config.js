// Which GitHub repo the dashboard reads monitor data from at runtime.
// Set VITE_GITHUB_REPO at build time, e.g.:
//   VITE_GITHUB_REPO="your-username/visual-monitor" npm run build:dashboard
// The GitHub Pages deploy workflow passes this automatically from the repo it
// runs in, so a fork works with no edits.
export const GITHUB_REPO =
  import.meta.env.VITE_GITHUB_REPO || 'your-username/visual-monitor';

const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/data`;

export const stateUrl = () => `${RAW_BASE}/state.json`;
export const screenshotUrl = (id) => `${RAW_BASE}/screenshots/${id}.png`;
export const baselineUrl = (id) => `${RAW_BASE}/baselines/${id}.png`;
export const diffUrl = (id) => `${RAW_BASE}/diffs/${id}.png`;
