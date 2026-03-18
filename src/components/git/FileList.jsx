import React, { useState } from 'react';

const TYPE_STYLE = {
  A: { bg: '#0d2a0d', color: '#7ee787', label: 'A' },
  D: { bg: '#2a0d0d', color: '#f85149', label: 'D' },
  M: { bg: '#0d1a2a', color: '#58a6ff', label: 'M' },
  R: { bg: '#2a200d', color: '#e3b341', label: 'R' },
  C: { bg: '#2a200d', color: '#e3b341', label: 'C' },
};

export default function FileList({ files, onClickFile, onDiscardFile }) {
  const [confirmPath, setConfirmPath] = useState(null);

  if (!files || files.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-slate-700/50 overflow-y-auto" style={{ maxHeight: 160, background: '#0d1117' }}>
      {files.map((f, i) => {
        const t = TYPE_STYLE[f.type] || TYPE_STYLE.M;
        const name = f.path.split('/').pop();
        const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '';
        const isConfirming = confirmPath === f.path;

        if (isConfirming) {
          return (
            <div
              key={i}
              className="w-full flex items-center gap-2 px-3 py-1.5"
              style={{ background: '#2a0d0d', borderLeft: '2px solid #f85149' }}
            >
              <span className="text-xs text-slate-300 flex-1 truncate">Discard changes to <span className="text-slate-100 font-medium">{name}</span>?</span>
              <button
                onClick={() => { onDiscardFile(f.path); setConfirmPath(null); }}
                className="text-[10px] font-semibold px-2 py-0.5 rounded transition-colors"
                style={{ background: '#f85149', color: '#fff' }}
              >
                Discard
              </button>
              <button
                onClick={() => setConfirmPath(null)}
                className="text-[10px] px-2 py-0.5 rounded transition-colors text-slate-400 hover:text-slate-200"
                style={{ background: '#1c2433' }}
              >
                Cancel
              </button>
            </div>
          );
        }

        return (
          <div
            key={i}
            className="group relative flex items-center w-full"
            onContextMenu={(e) => {
              e.preventDefault();
              setConfirmPath(f.path);
            }}
          >
            <button
              onClick={() => onClickFile(f.path)}
              className="flex-1 flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/50 transition-colors text-left min-w-0"
            >
              <span style={{
                width: 16, height: 16, borderRadius: 3, background: t.bg, color: t.color,
                fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {t.label}
              </span>
              <span className="flex-1 min-w-0 flex items-baseline gap-1">
                <span className="text-xs text-slate-200 truncate">{name}</span>
                {dir && <span className="text-[10px] text-slate-600 truncate">{dir}</span>}
              </span>
              {(f.added > 0 || f.deleted > 0) && (
                <span className="flex items-center gap-1 flex-shrink-0 text-[10px]">
                  {f.added > 0 && <span style={{ color: '#7ee787' }}>+{f.added}</span>}
                  {f.deleted > 0 && <span style={{ color: '#f85149' }}>-{f.deleted}</span>}
                </span>
              )}
            </button>
            {/* Hover discard button */}
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmPath(f.path); }}
              title="Discard changes"
              className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-5 h-5 rounded hover:bg-red-900/60 text-slate-500 hover:text-red-400"
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
