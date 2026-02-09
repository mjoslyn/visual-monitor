import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

export const PATHS = {
  root: ROOT,
  sites: join(ROOT, 'sites.json'),
  state: join(ROOT, 'data', 'state.json'),
  baselines: join(ROOT, 'data', 'baselines'),
  diffs: join(ROOT, 'data', 'diffs'),
  screenshots: join(ROOT, 'data', 'screenshots'),
};

export async function loadSites() {
  const raw = await readFile(PATHS.sites, 'utf-8');
  return JSON.parse(raw);
}

export async function loadState() {
  try {
    const raw = await readFile(PATHS.state, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      lastRun: null,
      sites: {},
      activityLog: [],
    };
  }
}

/** Maximum number of history entries per site */
export const MAX_HISTORY = 50;

/** Maximum number of diff images retained per site */
export const MAX_DIFFS = 10;

/** Maximum activity log entries */
export const MAX_LOG_ENTRIES = 200;
