import { useState } from 'react';
import Sparkline from './Sparkline.jsx';

const statusConfig = {
  changed: {
    label: 'Changed',
    dotClass: 'bg-accent-rose',
    glowClass: 'shadow-[0_0_6px_rgba(255,61,113,0.4)]',
    badgeBg: 'bg-accent-rose/10',
    badgeText: 'text-accent-rose',
    sparkColor: '#ff3d71',
  },
  ok: {
    label: 'OK',
    dotClass: 'bg-accent-green',
    glowClass: 'shadow-[0_0_6px_rgba(0,230,118,0.4)]',
    badgeBg: 'bg-accent-green/10',
    badgeText: 'text-accent-green',
    sparkColor: '#00e5ff',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-accent-amber',
    glowClass: 'shadow-[0_0_6px_rgba(255,179,0,0.4)]',
    badgeBg: 'bg-accent-amber/10',
    badgeText: 'text-accent-amber',
    sparkColor: '#ffb300',
  },
  pending: {
    label: 'Pending',
    dotClass: 'bg-muted',
    glowClass: '',
    badgeBg: 'bg-surface-3',
    badgeText: 'text-muted',
    sparkColor: '#6b7094',
  },
};

export default function SiteCard({ site }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[site.status] || statusConfig.pending;

  return (
    <div
      className="group bg-surface-1 border border-surface-3 rounded-2xl hover:border-surface-4 transition-all cursor-pointer overflow-hidden"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left side */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-2 h-2 rounded-full ${config.dotClass} ${config.glowClass} flex-shrink-0`} />
              <h3 className="text-sm font-semibold text-white truncate">{site.name}</h3>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider ${config.badgeBg} ${config.badgeText} flex-shrink-0`}>
                {config.label}
              </span>
            </div>

            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-mono text-muted hover:text-accent-cyan truncate block transition-colors mb-3"
            >
              {site.url}
            </a>

            <div className="flex items-center gap-4 text-xs font-mono text-muted">
              <span>
                Diff: <span className={site.changePercent > 0 ? 'text-accent-rose' : 'text-accent-green'}>
                  {site.changePercent}%
                </span>
              </span>
              <span>
                Changes: <span className="text-white/60">{site.totalChanges}</span>
              </span>
              <span>
                Checked: <span className="text-white/60">{formatRelative(site.lastChecked)}</span>
              </span>
            </div>
          </div>

          {/* Thumbnail */}
          <div className="flex-shrink-0 hidden sm:block">
            <img
              src={`https://raw.githubusercontent.com/mjoslyn/visual-monitor/main/data/screenshots/${site.id}.png`}
              alt={`${site.name} screenshot`}
              className="w-32 h-20 object-cover object-top rounded-lg border border-surface-3 bg-surface-2"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>

          {/* Sparkline */}
          <div className="flex-shrink-0 pt-1">
            <Sparkline
              data={site.history}
              width={140}
              height={36}
              color={config.sparkColor}
            />
          </div>
        </div>

        {/* Tags */}
        {site.tags?.length > 0 && (
          <div className="flex gap-1.5 mt-3">
            {site.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-surface-3 text-[10px] font-mono text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-surface-3 px-5 py-4 bg-surface-0/50">
          {site.error ? (
            <div className="text-xs font-mono text-accent-amber bg-accent-amber/5 border border-accent-amber/10 rounded-lg p-3">
              {site.error}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Last Changed" value={formatRelative(site.lastChanged)} />
                <MiniStat label="Total Changes" value={site.totalChanges} />
                <MiniStat label="Checks Today" value={site.checksToday} />
                <MiniStat label="Current Diff" value={`${site.changePercent}%`} />
              </div>

              {/* History table */}
              <div className="mt-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-2">Recent History</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1">
                  {site.history.slice(-12).reverse().map((h, i) => (
                    <div key={i} className="flex justify-between text-xs font-mono">
                      <span className="text-muted">{formatTimestamp(h.timestamp)}</span>
                      <span className={h.changePercent > 0 ? 'text-accent-rose' : 'text-muted/50'}>
                        {h.changePercent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-surface-2 rounded-xl px-3 py-2">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-0.5">{label}</div>
      <div className="text-sm font-mono text-white">{value}</div>
    </div>
  );
}

function formatRelative(iso) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
