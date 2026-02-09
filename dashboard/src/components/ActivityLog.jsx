const typeConfig = {
  change: { color: 'text-accent-rose', dot: 'bg-accent-rose', icon: '↗' },
  check: { color: 'text-muted', dot: 'bg-surface-4', icon: '✓' },
  error: { color: 'text-accent-amber', dot: 'bg-accent-amber', icon: '!' },
  baseline: { color: 'text-accent-cyan', dot: 'bg-accent-cyan', icon: '◉' },
};

export default function ActivityLog({ log, sites }) {
  if (!log?.length) {
    return (
      <div className="bg-surface-1 border border-surface-3 rounded-2xl p-5">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted mb-4">Activity Log</h3>
        <p className="text-xs text-muted font-mono">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-5 sticky top-8">
      <h3 className="text-xs font-mono uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Activity Log
      </h3>

      <div className="space-y-0 max-h-[600px] overflow-y-auto pr-1">
        {log.slice(0, 50).map((entry, i) => {
          const cfg = typeConfig[entry.type] || typeConfig.check;
          const siteName = sites[entry.siteId]?.name || entry.siteId;

          return (
            <div key={i} className="flex gap-3 py-2.5 border-b border-surface-2 last:border-0 group">
              {/* Timeline dot */}
              <div className="flex flex-col items-center pt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                {i < log.length - 1 && (
                  <div className="w-px flex-1 bg-surface-3 mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-mono font-medium ${cfg.color}`}>
                    {cfg.icon}
                  </span>
                  <span className="text-xs font-medium text-white/80 truncate">
                    {siteName}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted leading-relaxed">
                  {entry.detail}
                </p>
                <time className="text-[10px] font-mono text-muted/50 mt-0.5 block">
                  {formatTime(entry.timestamp)}
                </time>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
