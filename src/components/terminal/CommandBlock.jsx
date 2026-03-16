import React, { useState } from 'react';

export default function CommandBlock({ command, onRerun, onPin, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-800/60 transition-colors cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-slate-500 text-xs select-none flex-shrink-0">$</span>
      <span
        className="flex-1 text-xs font-mono text-slate-300 truncate cursor-pointer"
        onClick={() => onRerun?.(command)}
        title={command}
      >
        {command}
      </span>

      {hovered && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onRerun?.(command)}
            title="Run"
            className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
            </svg>
          </button>
          <button
            onClick={() => onPin?.(command)}
            title="Pin"
            className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-violet-400 hover:bg-slate-700 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete?.(command)}
              title="Delete"
              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
