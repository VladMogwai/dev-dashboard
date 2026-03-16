import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function CommandPalette({ history = [], pins = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();

  const pinnedMatches = pins.filter(
    (cmd) => !q || cmd.toLowerCase().includes(q)
  );

  const historyMatches = history
    .filter((cmd) => !pins.includes(cmd))
    .filter((cmd) => !q || cmd.toLowerCase().includes(q))
    .slice(0, 30);

  function handleSelect(cmd) {
    onSelect?.(cmd);
    onClose?.();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="w-full max-w-lg bg-[#161b22] border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60">
          <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (query.trim()) handleSelect(query.trim());
              }
            }}
            placeholder="Search commands or type a new one…"
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none font-mono"
          />
          <kbd className="text-[10px] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5 flex-shrink-0">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {pinnedMatches.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-medium text-slate-600 uppercase tracking-wider">Pinned</div>
              {pinnedMatches.map((cmd) => (
                <CommandRow key={cmd} cmd={cmd} badge="pin" onClick={() => handleSelect(cmd)} />
              ))}
            </div>
          )}

          {historyMatches.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-medium text-slate-600 uppercase tracking-wider mt-1">History</div>
              {historyMatches.map((cmd) => (
                <CommandRow key={cmd} cmd={cmd} onClick={() => handleSelect(cmd)} />
              ))}
            </div>
          )}

          {pinnedMatches.length === 0 && historyMatches.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-600">
              {q ? (
                <>
                  <div>No matches for <span className="font-mono text-slate-500">"{q}"</span></div>
                  <div className="text-xs mt-1 text-slate-700">Press Enter to run</div>
                </>
              ) : (
                'Start typing a command…'
              )}
            </div>
          )}
        </div>

        <div className="border-t border-slate-700/60 px-4 py-2 flex items-center gap-4 text-[10px] text-slate-600">
          <span><kbd className="border border-slate-700 rounded px-1 py-0.5 mr-1">↵</kbd>Run</span>
          <span><kbd className="border border-slate-700 rounded px-1 py-0.5 mr-1">ESC</kbd>Close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CommandRow({ cmd, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/60 transition-colors text-left group"
    >
      <span className="text-slate-600 text-xs font-mono flex-shrink-0">$</span>
      <span className="flex-1 text-xs font-mono text-slate-300 truncate group-hover:text-slate-100">{cmd}</span>
      {badge === 'pin' && (
        <svg className="w-3 h-3 text-violet-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      )}
    </button>
  );
}
