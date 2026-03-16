import React from 'react';

/**
 * Shows the last-run command as a sticky bar at the top of the terminal area.
 * Appears only when `command` is non-empty.
 */
export default function StickyHeader({ command, onRerun }) {
  if (!command) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border-b border-slate-700/40 backdrop-blur-sm flex-shrink-0">
      <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider flex-shrink-0">Last</span>
      <span className="flex-1 text-xs font-mono text-slate-500 truncate" title={command}>
        {command}
      </span>
      <button
        onClick={() => onRerun?.(command)}
        title="Re-run"
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
        </svg>
      </button>
    </div>
  );
}
