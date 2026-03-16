import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import CommandBlock from './CommandBlock';

export default function HistoryDropdown({ anchorRef, history = [], pins = [], onRun, onPin, onDelete, onClose }) {
  const ref = useRef(null);

  // Position the dropdown below the anchor button
  const pos = anchorRef?.current?.getBoundingClientRect?.() ?? null;

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  if (!pos) return null;

  const style = {
    position: 'fixed',
    top: pos.bottom + 4,
    left: Math.max(8, pos.right - 260),
    width: 260,
    zIndex: 9998,
  };

  return createPortal(
    <div
      ref={ref}
      style={style}
      className="bg-[#161b22] border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/60">
        <span className="text-xs font-medium text-slate-400">Command History</span>
        {history.length > 0 && (
          <span className="text-[10px] text-slate-600">{history.length} items</span>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto py-1">
        {history.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-600 text-center">No history yet</div>
        ) : (
          history.slice(0, 50).map((cmd) => (
            <CommandBlock
              key={cmd}
              command={cmd}
              onRerun={(c) => { onRun?.(c); onClose?.(); }}
              onPin={pins.includes(cmd) ? undefined : (c) => onPin?.(c)}
              onDelete={(c) => onDelete?.(c)}
            />
          ))
        )}
      </div>
    </div>,
    document.body
  );
}
