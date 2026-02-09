import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { PATHS } from './config.mjs';

/**
 * Compare a screenshot against the baseline for a site.
 * Returns { changePercent, diffImagePath, hasBaseline }
 */
export function diffScreenshot(siteId, screenshotPath, timestamp) {
  const baselinePath = join(PATHS.baselines, `${siteId}.png`);

  // No baseline yet — this is the first run
  if (!existsSync(baselinePath)) {
    return { changePercent: 0, diffImagePath: null, hasBaseline: false };
  }

  // Read both images
  const baselineBuffer = readFileSync(baselinePath);
  const screenshotBuffer = readFileSync(screenshotPath);

  const baseline = PNG.sync.read(baselineBuffer);
  const screenshot = PNG.sync.read(screenshotBuffer);

  // Handle dimension mismatch
  if (baseline.width !== screenshot.width || baseline.height !== screenshot.height) {
    console.warn(
      `[diff] Size mismatch for ${siteId}: baseline=${baseline.width}x${baseline.height} vs current=${screenshot.width}x${screenshot.height}`
    );
    // If dimensions differ significantly, treat as 100% changed
    return { changePercent: 100, diffImagePath: null, hasBaseline: true };
  }

  const { width, height } = baseline;
  const totalPixels = width * height;
  const diffOutput = new PNG({ width, height });

  const diffPixels = pixelmatch(
    baseline.data,
    screenshot.data,
    diffOutput.data,
    width,
    height,
    {
      threshold: 0.1,
      includeAA: false,
      alpha: 0.1,
    }
  );

  const changePercent = parseFloat(((diffPixels / totalPixels) * 100).toFixed(2));

  // Save diff overlay image
  const diffPng = PNG.sync.write(diffOutput);
  const ts = timestamp.replace(/[:.]/g, '-');
  const diffImagePath = join(PATHS.diffs, `${siteId}-${ts}.png`);
  writeFileSync(diffImagePath, diffPng);

  // Save a "latest" copy for the dashboard
  const latestDiffPath = join(PATHS.diffs, `${siteId}.png`);
  writeFileSync(latestDiffPath, diffPng);

  return { changePercent, diffImagePath, hasBaseline: true };
}

/**
 * Promote the current screenshot to become the new baseline.
 */
export function promoteBaseline(siteId, screenshotPath) {
  const baselinePath = join(PATHS.baselines, `${siteId}.png`);
  const data = readFileSync(screenshotPath);
  writeFileSync(baselinePath, data);
}
