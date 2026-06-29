import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { PATHS } from './config.mjs';

/**
 * Pad a PNG image in-place to the given dimensions with white pixels.
 * Mutates the `data`, `width`, and `height` properties.
 */
function padImage(img, targetWidth, targetHeight) {
  if (img.width === targetWidth && img.height === targetHeight) return;

  const newData = Buffer.alloc(targetWidth * targetHeight * 4, 0xFF); // white fill
  for (let y = 0; y < img.height; y++) {
    const srcOffset = y * img.width * 4;
    const dstOffset = y * targetWidth * 4;
    img.data.copy(newData, dstOffset, srcOffset, srcOffset + img.width * 4);
  }
  img.data = newData;
  img.width = targetWidth;
  img.height = targetHeight;
}

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

  // Handle dimension mismatch by padding both images to the larger dimensions.
  // Full-page screenshots often vary slightly in height between runs due to
  // lazy loading, dynamic content, or font rendering — treating any size
  // difference as 100% change causes constant false alerts.
  const width = Math.max(baseline.width, screenshot.width);
  const height = Math.max(baseline.height, screenshot.height);

  if (baseline.width !== screenshot.width || baseline.height !== screenshot.height) {
    console.warn(
      `[diff] Size mismatch for ${siteId}: baseline=${baseline.width}x${baseline.height} vs current=${screenshot.width}x${screenshot.height} — padding to ${width}x${height}`
    );
    padImage(baseline, width, height);
    padImage(screenshot, width, height);
  }
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
