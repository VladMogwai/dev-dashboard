import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import '@xterm/xterm/css/xterm.css';

export default function Terminal({ projectId, type, active, onReady }) {
  const containerRef = useRef(null);
  const { dispose, sendInput, fit } = useTerminal(containerRef, projectId, type, active, { onReady });

  // ── Context menu state ─────────────────────────────────────────────────────
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0 });
  const menuRef = useRef(null);

  // Re-fit whenever the tab becomes active
  useEffect(() => {
    if (active) fit();
  }, [active, fit]);

  // Dispose on unmount
  useEffect(() => {
    return () => dispose();
  }, [dispose]);

  // Hide context menu on outside click
  useEffect(() => {
    if (!menu.visible) return;

    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenu((m) => ({ ...m, visible: false }));
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menu.visible]);

  // ── Context menu handlers ─────────────────────────────────────────────────

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setMenu({ visible: true, x: e.clientX, y: e.clientY });
  }, []);

  const handleMenuCopy = useCallback(() => {
    // xterm manages its own selection — read it from the DOM selection as fallback
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      navigator.clipboard.writeText(sel.toString()).catch(() => {});
    }
    setMenu((m) => ({ ...m, visible: false }));
  }, []);

  const handleMenuPaste = useCallback(() => {
    navigator.clipboard.readText().then((text) => {
      if (text) sendInput(text);
    }).catch(() => {});
    setMenu((m) => ({ ...m, visible: false }));
  }, [sendInput]);

  const handleMenuClear = useCallback(() => {
    // Cmd+K equivalent
    sendInput('\x1b[H\x1b[2J');
    setMenu((m) => ({ ...m, visible: false }));
  }, [sendInput]);

  const hasDomSelection = Boolean(window.getSelection()?.toString());

  return (
    <>
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 0,
          background: '#0d1117',
          overflow: 'hidden',
        }}
      />

      {/* Context menu */}
      {menu.visible && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menu.y,
            left: menu.x,
            zIndex: 9999,
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 6,
            padding: '4px 0',
            minWidth: 140,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            userSelect: 'none',
          }}
        >
          {hasDomSelection && (
            <button
              onClick={handleMenuCopy}
              style={menuItemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Copy
            </button>
          )}
          <button
            onClick={handleMenuPaste}
            style={menuItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Paste
          </button>
          <div style={{ borderTop: '1px solid #30363d', margin: '4px 0' }} />
          <button
            onClick={handleMenuClear}
            style={menuItemStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#21262d')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Clear
          </button>
        </div>
      )}
    </>
  );
}

const menuItemStyle = {
  display: 'block',
  width: '100%',
  padding: '6px 14px',
  background: 'transparent',
  border: 'none',
  color: '#e6edf3',
  fontSize: 12,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'background 80ms',
};
