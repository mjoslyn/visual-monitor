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

    // Hide selectors to reduce false positives
    const selectors = [...(site.hideSelectors || []), '.ignore-vm'];
    if (selectors.length > 0) {
      const selectorsCSS = selectors
        .map((sel) => `${sel} { display: none !important; visibility: hidden !important; }`)
        .join('\n');
      await page.addStyleTag({ content: selectorsCSS });
    }
    // Scroll through the page to trigger lazy-loaded images
    if (site.fullPage ?? true) {
      await page.evaluate(async () => {
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));
        const step = window.innerHeight;
        const maxScroll = document.body.scrollHeight;
        for (let y = 0; y < maxScroll; y += step) {
          window.scrollTo(0, y);
          await delay(150);
        }
        window.scrollTo(0, 0);
      });
    }

    // Wait for all images to finish loading
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        imgs
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
                setTimeout(resolve, 5000);
              })
          )
      );
    });

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
