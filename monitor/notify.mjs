/**
 * Send notifications when a site change exceeds its threshold.
 */

import { readFileSync } from 'fs';

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_TO = process.env.MAILGUN_TO;
const MAILGUN_FROM = process.env.MAILGUN_FROM || `Visual Monitor <noreply@${MAILGUN_DOMAIN}>`;

/**
 * Notify about a detected change.
 * @param {object} site - Site config from sites.json
 * @param {number} changePercent - Percentage of pixels changed
 * @param {string} dashboardUrl - URL to the dashboard (optional)
 * @param {object} screenshots - { before: path, after: path } (optional)
 */
export async function notify(site, changePercent, dashboardUrl = '', screenshots = null) {
  const promises = [];

  if (site.notifications?.mailgun !== false && MAILGUN_API_KEY && MAILGUN_DOMAIN && MAILGUN_TO) {
    promises.push(sendMailgun(site, changePercent, dashboardUrl, screenshots));
  }

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[notify] Failed:', r.reason?.message || r.reason);
    }
  }
}

async function sendMailgun(site, changePercent, dashboardUrl, screenshots) {
  const url = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
  const severity = changePercent > 20 ? 'HIGH' : changePercent > 5 ? 'MEDIUM' : 'LOW';

  const form = new FormData();
  form.append('from', MAILGUN_FROM);
  form.append('to', MAILGUN_TO);
  form.append('subject', `[${severity}] Visual Change: ${site.name} (${changePercent}%)`);

  if (screenshots?.before && screenshots?.after) {
    const html = [
      `<h2>${changePercent}% visual difference detected</h2>`,
      `<p><strong>Site:</strong> ${site.name}<br>`,
      `<strong>URL:</strong> <a href="${site.url}">${site.url}</a><br>`,
      `<strong>Threshold:</strong> ${site.threshold}%<br>`,
      `<strong>Change:</strong> ${changePercent}%</p>`,
      dashboardUrl ? `<p><a href="${dashboardUrl}">View Dashboard</a></p>` : '',
      `<h3>Before</h3>`,
      `<img src="cid:before.png" style="max-width:100%;border:1px solid #ccc;" />`,
      `<h3>After</h3>`,
      `<img src="cid:after.png" style="max-width:100%;border:1px solid #ccc;" />`,
      screenshots.diff ? `<h3>Changed Pixels</h3>` : '',
      screenshots.diff ? `<img src="cid:diff.png" style="max-width:100%;border:1px solid #ccc;" />` : '',
    ].join('\n');

    form.append('html', html);

    const beforeBuf = readFileSync(screenshots.before);
    const afterBuf = readFileSync(screenshots.after);

    form.append('inline', new Blob([beforeBuf], { type: 'image/png' }), 'before.png');
    form.append('inline', new Blob([afterBuf], { type: 'image/png' }), 'after.png');

    if (screenshots.diff) {
      const diffBuf = readFileSync(screenshots.diff);
      form.append('inline', new Blob([diffBuf], { type: 'image/png' }), 'diff.png');
    }
  } else {
    form.append('text', [
      `${changePercent}% visual difference detected.`,
      '',
      `Site: ${site.name}`,
      `URL: ${site.url}`,
      `Threshold: ${site.threshold}%`,
      `Change: ${changePercent}%`,
      ...(dashboardUrl ? ['', `Dashboard: ${dashboardUrl}`] : []),
    ].join('\n'));
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Mailgun failed: ${res.status} ${res.statusText}`);
  }

  console.log(`[notify] Mailgun notification sent for ${site.id}`);
}
