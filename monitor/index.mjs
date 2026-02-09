import { writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { copyFileSync } from 'fs';
import {
  loadSites,
  loadState,
  PATHS,
  MAX_HISTORY,
  MAX_DIFFS,
  MAX_SCREENSHOTS,
  MAX_LOG_ENTRIES,
} from './config.mjs';
import { captureScreenshot } from './screenshot.mjs';
import { diffScreenshot, promoteBaseline } from './diff.mjs';
import { notify } from './notify.mjs';

async function ensureDirs() {
  await mkdir(PATHS.baselines, { recursive: true });
  await mkdir(PATHS.diffs, { recursive: true });
  await mkdir(PATHS.screenshots, { recursive: true });
}

function cleanOldDiffs(siteId) {
  const files = readdirSync(PATHS.diffs)
    .filter((f) => f.startsWith(`${siteId}-`) && f.endsWith('.png'))
    .sort()
    .reverse();

  for (const file of files.slice(MAX_DIFFS)) {
    try {
      unlinkSync(join(PATHS.diffs, file));
    } catch {
      // ignore
    }
  }
}

function cleanOldScreenshots(siteId) {
  const files = readdirSync(PATHS.screenshots)
    .filter((f) => f.startsWith(`${siteId}-`) && f.endsWith('.png'))
    .sort()
    .reverse();

  for (const file of files.slice(MAX_SCREENSHOTS)) {
    try {
      unlinkSync(join(PATHS.screenshots, file));
    } catch {
      // ignore
    }
  }
}

async function run() {
  console.log('[monitor] Starting visual change monitor...');

  await ensureDirs();

  const sites = await loadSites();
  const state = await loadState();
  const now = new Date().toISOString();

  state.lastRun = now;
  if (!state.activityLog) state.activityLog = [];

  for (const site of sites) {
    console.log(`\n[monitor] Processing: ${site.name} (${site.id})`);

    // Initialize site state if needed
    if (!state.sites[site.id]) {
      state.sites[site.id] = {
        id: site.id,
        name: site.name,
        url: site.url,
        status: 'pending',
        lastChecked: null,
        lastChanged: null,
        changePercent: 0,
        history: [],
        totalChanges: 0,
        checksToday: 0,
        tags: site.tags || [],
        error: null,
      };
    }

    const siteState = state.sites[site.id];
    siteState.name = site.name;
    siteState.url = site.url;
    siteState.tags = site.tags || [];

    try {
      // Step 1: Capture screenshot
      console.log(`[monitor]   Capturing screenshot...`);
      const screenshotPath = await captureScreenshot(site);
      console.log(`[monitor]   Screenshot saved: ${screenshotPath}`);

      // Save timestamped copy
      const ts = now.replace(/[:.]/g, '-');
      const timestampedPath = join(PATHS.screenshots, `${site.id}-${ts}.png`);
      copyFileSync(screenshotPath, timestampedPath);

      // Step 2: Diff against baseline
      console.log(`[monitor]   Computing diff...`);
      const { changePercent, diffImagePath, hasBaseline } = diffScreenshot(
        site.id,
        screenshotPath,
        now
      );

      if (!hasBaseline) {
        console.log(`[monitor]   No baseline found — saving as initial baseline.`);
        promoteBaseline(site.id, screenshotPath);
        siteState.status = 'ok';
        siteState.lastChecked = now;
        siteState.changePercent = 0;
        siteState.history.push({ timestamp: now, changePercent: 0 });

        state.activityLog.unshift({
          timestamp: now,
          siteId: site.id,
          type: 'baseline',
          detail: 'Initial baseline captured',
        });
      } else {
        console.log(`[monitor]   Change: ${changePercent}% (threshold: ${site.threshold}%)`);

        siteState.lastChecked = now;
        siteState.changePercent = changePercent;
        siteState.history.push({ timestamp: now, changePercent });

        const exceeded = changePercent >= site.threshold;

        if (exceeded) {
          siteState.status = 'changed';
          siteState.lastChanged = now;
          siteState.totalChanges = (siteState.totalChanges || 0) + 1;

          state.activityLog.unshift({
            timestamp: now,
            siteId: site.id,
            type: 'change',
            detail: `${changePercent}% visual diff detected`,
          });

          // Step 3: Notify
          console.log(`[monitor]   Threshold exceeded — sending notifications...`);
          const baselinePath = join(PATHS.baselines, `${site.id}.png`);
          const diffPath = join(PATHS.diffs, `${site.id}.png`);
          await notify(site, changePercent, '', { before: baselinePath, after: screenshotPath, diff: diffPath });

          // Promote current screenshot as new baseline only when change detected
          promoteBaseline(site.id, screenshotPath);
        } else {
          siteState.status = 'ok';

          state.activityLog.unshift({
            timestamp: now,
            siteId: site.id,
            type: 'check',
            detail: `${changePercent}% change (below ${site.threshold}% threshold)`,
          });
        }
      }

      siteState.error = null;

      // Clean old diffs and screenshots
      cleanOldDiffs(site.id);
      cleanOldScreenshots(site.id);
    } catch (err) {
      console.error(`[monitor]   ERROR: ${err.message}`);
      siteState.status = 'error';
      siteState.lastChecked = now;
      siteState.error = err.message;

      state.activityLog.unshift({
        timestamp: now,
        siteId: site.id,
        type: 'error',
        detail: err.message,
      });
    }

    // Count checks today
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    siteState.checksToday = siteState.history.filter(
      (h) => new Date(h.timestamp) >= todayStart
    ).length;

    // Trim history
    if (siteState.history.length > MAX_HISTORY) {
      siteState.history = siteState.history.slice(-MAX_HISTORY);
    }
  }

  // Trim activity log
  if (state.activityLog.length > MAX_LOG_ENTRIES) {
    state.activityLog = state.activityLog.slice(0, MAX_LOG_ENTRIES);
  }

  // Write state
  writeFileSync(PATHS.state, JSON.stringify(state, null, 2));
  console.log(`\n[monitor] State written to ${PATHS.state}`);
  console.log('[monitor] Done.');
}

run().catch((err) => {
  console.error('[monitor] Fatal error:', err);
  process.exit(1);
});
