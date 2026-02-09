/**
 * Send notifications when a site change exceeds its threshold.
 */

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK;
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_TO = process.env.MAILGUN_TO;
const MAILGUN_FROM = process.env.MAILGUN_FROM || `Visual Monitor <noreply@${MAILGUN_DOMAIN}>`;

/**
 * Notify about a detected change.
 * @param {object} site - Site config from sites.json
 * @param {number} changePercent - Percentage of pixels changed
 * @param {string} dashboardUrl - URL to the dashboard (optional)
 */
export async function notify(site, changePercent, dashboardUrl = '') {
  const promises = [];

  if (site.notifications?.discord !== false && DISCORD_WEBHOOK) {
    promises.push(sendDiscord(site, changePercent, dashboardUrl));
  }

  if (site.notifications?.slack && SLACK_WEBHOOK) {
    promises.push(sendSlack(site, changePercent, dashboardUrl));
  }

  if (NTFY_TOPIC) {
    promises.push(sendNtfy(site, changePercent, dashboardUrl));
  }

  if (site.notifications?.mailgun !== false && MAILGUN_API_KEY && MAILGUN_DOMAIN && MAILGUN_TO) {
    promises.push(sendMailgun(site, changePercent, dashboardUrl));
  }

  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[notify] Failed:', r.reason?.message || r.reason);
    }
  }
}

async function sendDiscord(site, changePercent, dashboardUrl) {
  const color = changePercent > 20 ? 0xff4444 : changePercent > 5 ? 0xffaa00 : 0x00ccff;

  const payload = {
    embeds: [
      {
        title: `🔍 Change Detected: ${site.name}`,
        description: `**${changePercent}%** visual difference detected on [${site.url}](${site.url})`,
        color,
        fields: [
          { name: 'Site ID', value: site.id, inline: true },
          { name: 'Threshold', value: `${site.threshold}%`, inline: true },
          { name: 'Change', value: `${changePercent}%`, inline: true },
        ],
        footer: { text: 'Visual Change Monitor' },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  if (dashboardUrl) {
    payload.embeds[0].url = dashboardUrl;
  }

  const res = await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Discord webhook failed: ${res.status} ${res.statusText}`);
  }

  console.log(`[notify] Discord notification sent for ${site.id}`);
}

async function sendSlack(site, changePercent, dashboardUrl) {
  const emoji = changePercent > 20 ? '🔴' : changePercent > 5 ? '🟡' : '🔵';

  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} Visual Change: ${site.name}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*URL:*\n<${site.url}>` },
          { type: 'mrkdwn', text: `*Change:*\n${changePercent}%` },
          { type: 'mrkdwn', text: `*Threshold:*\n${site.threshold}%` },
          { type: 'mrkdwn', text: `*Site ID:*\n${site.id}` },
        ],
      },
    ],
  };

  if (dashboardUrl) {
    payload.blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Dashboard' },
          url: dashboardUrl,
        },
      ],
    });
  }

  const res = await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status} ${res.statusText}`);
  }

  console.log(`[notify] Slack notification sent for ${site.id}`);
}

async function sendNtfy(site, changePercent, dashboardUrl) {
  const url = `https://ntfy.sh/${NTFY_TOPIC}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Title: `Visual Change: ${site.name} (${changePercent}%)`,
      Priority: changePercent > 20 ? 'high' : 'default',
      Tags: 'mag,warning',
      ...(dashboardUrl ? { Click: dashboardUrl } : {}),
    },
    body: `${changePercent}% visual diff detected on ${site.url}. Threshold: ${site.threshold}%`,
  });

  if (!res.ok) {
    throw new Error(`ntfy.sh failed: ${res.status} ${res.statusText}`);
  }

  console.log(`[notify] ntfy.sh notification sent for ${site.id}`);
}

async function sendMailgun(site, changePercent, dashboardUrl) {
  const url = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
  const severity = changePercent > 20 ? 'HIGH' : changePercent > 5 ? 'MEDIUM' : 'LOW';

  const body = new URLSearchParams({
    from: MAILGUN_FROM,
    to: MAILGUN_TO,
    subject: `[${severity}] Visual Change: ${site.name} (${changePercent}%)`,
    text: [
      `${changePercent}% visual difference detected.`,
      '',
      `Site: ${site.name}`,
      `URL: ${site.url}`,
      `Threshold: ${site.threshold}%`,
      `Change: ${changePercent}%`,
      ...(dashboardUrl ? ['', `Dashboard: ${dashboardUrl}`] : []),
    ].join('\n'),
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Mailgun failed: ${res.status} ${res.statusText}`);
  }

  console.log(`[notify] Mailgun notification sent for ${site.id}`);
}
