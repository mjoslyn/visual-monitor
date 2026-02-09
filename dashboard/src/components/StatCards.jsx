export default function StatCards({ sites, lastRun }) {
  const total = sites.length;
  const changed = sites.filter((s) => s.status === 'changed').length;
  const errors = sites.filter((s) => s.status === 'error').length;
  const totalChecks = sites.reduce((sum, s) => sum + (s.checksToday || 0), 0);

  const cards = [
    {
      label: 'Monitored Sites',
      value: total,
      accent: 'cyan',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      ),
    },
    {
      label: 'Changes Detected',
      value: changed,
      accent: changed > 0 ? 'rose' : 'green',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      ),
    },
    {
      label: 'Errors',
      value: errors,
      accent: errors > 0 ? 'amber' : 'green',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      label: 'Checks Today',
      value: totalChecks,
      accent: 'cyan',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
        </svg>
      ),
    },
  ];

  const accentMap = {
    cyan: { bg: 'bg-accent-cyan/10', text: 'text-accent-cyan', border: 'border-accent-cyan/20' },
    rose: { bg: 'bg-accent-rose/10', text: 'text-accent-rose', border: 'border-accent-rose/20' },
    amber: { bg: 'bg-accent-amber/10', text: 'text-accent-amber', border: 'border-accent-amber/20' },
    green: { bg: 'bg-accent-green/10', text: 'text-accent-green', border: 'border-accent-green/20' },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => {
        const a = accentMap[card.accent];
        return (
          <div
            key={card.label}
            className={`group relative bg-surface-1 border border-surface-3 rounded-2xl p-5 hover:border-opacity-60 transition-all hover:bg-surface-2`}
          >
            <div className={`w-9 h-9 rounded-xl ${a.bg} flex items-center justify-center mb-3 ${a.text}`}>
              {card.icon}
            </div>
            <div className={`text-2xl font-bold font-mono ${a.text} mb-1`}>
              {card.value}
            </div>
            <div className="text-xs text-muted font-mono uppercase tracking-wider">
              {card.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
