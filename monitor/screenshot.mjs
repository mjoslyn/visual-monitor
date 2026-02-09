import { chromium } from 'playwright';
import { join } from 'path';
import { PATHS } from './config.mjs';

/**
 * Capture a screenshot for a site config.
 * Returns the path to the saved PNG.
 */
export async function captureScreenshot(site) {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: site.viewport || { width: 1280, height: 720 },
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Handle basic auth if configured
    if (site.auth?.type === 'basic') {
      const { username, password } = site.auth;
      await context.setExtraHTTPHeaders({
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      });
    }

    // Handle cookie auth
    if (site.auth?.type === 'cookies' && Array.isArray(site.auth.cookies)) {
      await context.addCookies(site.auth.cookies);
    }

    const page = await context.newPage();

    // Navigate to the URL
    const waitUntil = site.waitFor === 'networkidle' ? 'networkidle' : 'load';
    await page.goto(site.url, {
      waitUntil,
      timeout: 60_000,
    });

    // Hide selectors to reduce false positives (default: header + footer)
    const selectors = site.hideSelectors?.length > 0 ? site.hideSelectors : ['header', 'footer'];
    const selectorsCSS = selectors
      .map((sel) => `${sel} { display: none !important; visibility: hidden !important; }`)
      .join('\n');
    await page.addStyleTag({ content: selectorsCSS });
    await page.waitForTimeout(500);

    // Capture screenshot
    const screenshotPath = join(PATHS.screenshots, `${site.id}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: site.fullPage ?? true,
    });

    return screenshotPath;
  } finally {
    await browser.close();
  }
}
