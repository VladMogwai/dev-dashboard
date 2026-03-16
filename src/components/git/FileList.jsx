import React from 'react';

const TYPE_STYLE = {
  A: { bg: '#0d2a0d', color: '#7ee787', label: 'A' },
  D: { bg: '#2a0d0d', color: '#f85149', label: 'D' },
  M: { bg: '#0d1a2a', color: '#58a6ff', label: 'M' },
  R: { bg: '#2a200d', color: '#e3b341', label: 'R' },
  C: { bg: '#2a200d', color: '#e3b341', label: 'C' },
};

export default function FileList({ files, onClickFile }) {
  if (!files || files.length === 0) return null;
  return (
    <div className="flex-shrink-0 border-b border-slate-700/50 overflow-y-auto" style={{ maxHeight: 160, background: '#0d1117' }}>
      {files.map((f, i) => {
        const t = TYPE_STYLE[f.type] || TYPE_STYLE.M;
        const name = f.path.split('/').pop();
        const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '';
        return (
          <button
            key={i}
            onClick={() => onClickFile(f.path)}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/50 transition-colors text-left"
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
        );
      })}
    </div>
  );
}
