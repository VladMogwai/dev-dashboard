import React from 'react';

export default function PinnedCommands({ pins = [], onRun, onUnpin }) {
  if (!pins.length) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-700/60 flex-wrap bg-[#0d1117]">
      <span className="text-slate-600 text-[10px] font-medium flex-shrink-0 mr-0.5">PINNED</span>
      {pins.map((cmd) => (
        <div key={cmd} className="group flex items-center gap-0 rounded-md overflow-hidden border border-slate-700/60 hover:border-violet-500/40 transition-colors">
          <button
            onClick={() => onRun?.(cmd)}
            className="px-2 py-0.5 text-xs font-mono text-slate-400 hover:text-violet-300 bg-slate-800/60 hover:bg-violet-950/40 transition-colors max-w-[140px] truncate"
            title={cmd}
          >
            {cmd}
          </button>
          <button
            onClick={() => onUnpin?.(cmd)}
            className="px-1 py-0.5 text-slate-600 hover:text-red-400 bg-slate-800/60 hover:bg-red-950/40 transition-colors opacity-0 group-hover:opacity-100 border-l border-slate-700/60"
            title="Unpin"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
