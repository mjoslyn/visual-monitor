import { useState } from 'react';

/**
 * Overlay viewer for diff images.
 * Expects basePath to be the data directory URL.
 */
export default function DiffPreview({ siteId, basePath = './data' }) {
  const [mode, setMode] = useState('diff'); // 'diff' | 'current' | 'baseline'

  const paths = {
    current: `${basePath}/screenshots/${siteId}.png`,
    baseline: `${basePath}/baselines/${siteId}.png`,
    diff: `${basePath}/diffs/${siteId}-latest.png`,
  };

  return (
    <div className="bg-surface-2 rounded-xl border border-surface-3 overflow-hidden">
      <div className="flex items-center gap-1 p-2 border-b border-surface-3">
        {['diff', 'current', 'baseline'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all ${
              mode === m
                ? 'bg-surface-4 text-white'
                : 'text-muted hover:text-white/60'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="relative aspect-video bg-surface-0">
        <img
          src={paths[mode]}
          alt={`${mode} view for ${siteId}`}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div
          className="absolute inset-0 items-center justify-center text-muted text-xs font-mono"
          style={{ display: 'none' }}
        >
          No {mode} image available
        </div>
      </div>
    </div>
  );
}
