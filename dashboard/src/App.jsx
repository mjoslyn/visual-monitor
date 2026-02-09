import { useState, useEffect } from 'react';
import StatCards from './components/StatCards.jsx';
import SiteCard from './components/SiteCard.jsx';
import ActivityLog from './components/ActivityLog.jsx';

const STATE_URL = './data/state.json';

export default function App() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    fetch(STATE_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setState)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-surface-2 border border-surface-4 rounded-2xl p-8 max-w-md text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-accent-rose/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-accent-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Failed to load state</h2>
          <p className="text-muted text-sm font-mono">{error}</p>
          <p className="text-muted text-xs mt-3">Make sure <code className="text-accent-cyan">data/state.json</code> exists and is accessible.</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted">
          <div className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse-glow" />
          <span className="font-mono text-sm tracking-wide">Loading monitor data…</span>
        </div>
      </div>
    );
  }

  const sites = Object.values(state.sites).sort((a, b) => a.name.localeCompare(b.name));
  const filteredSites = sites.filter((s) => {
    if (filter === 'changed' && s.status !== 'changed') return false;
    if (filter === 'ok' && s.status !== 'ok') return false;
    if (filter === 'error' && s.status !== 'error') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen relative">
      {/* Background texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top glow accent */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,229,255,0.15), transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
                Visual Change Monitor
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-muted">
            <span>Last run</span>
            <span className="text-white/70">{formatRelative(state.lastRun)}</span>
            <button
              onClick={() => setShowLog(!showLog)}
              className="ml-2 px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-surface-4 text-muted hover:text-white transition-colors border border-surface-4"
            >
              {showLog ? 'Hide' : 'Show'} Log
            </button>
          </div>
        </header>

        {/* Stat Cards */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <StatCards sites={sites} lastRun={state.lastRun} />
        </div>

        {/* Main content */}
        <div className={`grid gap-6 ${showLog ? 'lg:grid-cols-[1fr_340px]' : ''}`}>
          <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-surface-3">
                {['all', 'changed', 'ok', 'error'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                      filter === f
                        ? 'bg-surface-4 text-white shadow-sm'
                        : 'text-muted hover:text-white/70'
                    }`}
                  >
                    {f}
                    {f !== 'all' && (
                      <span className="ml-1.5 opacity-50">
                        {sites.filter((s) =>
                          f === 'changed' ? s.status === 'changed' :
                          f === 'ok' ? s.status === 'ok' :
                          s.status === 'error'
                        ).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 max-w-xs">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search sites…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-2 border border-surface-3 rounded-xl text-sm text-white placeholder-muted focus:outline-none focus:border-accent-cyan/30 focus:ring-1 focus:ring-accent-cyan/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Site Cards */}
            <div className="grid gap-4">
              {filteredSites.length === 0 ? (
                <div className="text-center py-16 text-muted font-mono text-sm">
                  No sites match the current filter.
                </div>
              ) : (
                filteredSites.map((site, i) => (
                  <div
                    key={site.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${0.25 + i * 0.05}s` }}
                  >
                    <SiteCard site={site} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Log Sidebar */}
          {showLog && (
            <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
              <ActivityLog log={state.activityLog} sites={state.sites} />
            </div>
          )}
        </div>
      </div>
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
