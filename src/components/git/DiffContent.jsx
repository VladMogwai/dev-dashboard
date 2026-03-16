import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle, memo } from 'react';

const LINE_HEIGHT = 19;
const OVERSCAN = 40;

function parseDiffToRows(diffStr) {
  if (!diffStr || !diffStr.trim()) return [];
  const rows = [];
  let currentFile = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of diffStr.split('\n')) {
    if (line.startsWith('diff --git ')) {
      const m = line.match(/^diff --git a\/(.*) b\/(.*)$/);
      currentFile = m ? m[2] : line;
      rows.push({ kind: 'file-header', path: currentFile });
    } else if (line.startsWith('@@ ')) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
      oldLineNum = m ? parseInt(m[1], 10) : 1;
      newLineNum = m ? parseInt(m[2], 10) : 1;
      rows.push({ kind: 'hunk-header', raw: line });
    } else if (
      line.startsWith('--- ') || line.startsWith('+++ ') ||
      line.startsWith('index ') || line.startsWith('new file') ||
      line.startsWith('deleted file') || line.startsWith('old mode') ||
      line.startsWith('new mode') || line.startsWith('Binary files') ||
      line.startsWith('rename ') || line.startsWith('similarity ')
    ) {
      // skip git meta lines
    } else if (currentFile !== null) {
      if (line.startsWith('+')) {
        rows.push({ kind: 'line', type: 'add', content: line.slice(1), oldNum: null, newNum: newLineNum++ });
      } else if (line.startsWith('-')) {
        rows.push({ kind: 'line', type: 'del', content: line.slice(1), oldNum: oldLineNum++, newNum: null });
      } else if (!line.startsWith('\\')) {
        rows.push({ kind: 'line', type: 'ctx', content: line.startsWith(' ') ? line.slice(1) : line, oldNum: oldLineNum++, newNum: newLineNum++ });
      }
    }
  }
  return rows;
}

// Memoized — only re-renders when row object reference changes
const DiffRow = memo(function DiffRow({ row }) {
  if (row.kind === 'file-header') {
    return (
      <div style={{
        height: LINE_HEIGHT, background: '#161b22', padding: '0 12px',
        display: 'flex', alignItems: 'center',
        borderTop: '1px solid #30363d', borderBottom: '1px solid #30363d',
      }}>
        <span style={{ color: '#58a6ff', fontSize: 11, fontWeight: 600 }}>{row.path}</span>
      </div>
    );
  }
  if (row.kind === 'hunk-header') {
    return (
      <div style={{
        height: LINE_HEIGHT, background: '#1c2128', padding: '0 12px',
        display: 'flex', alignItems: 'center',
      }}>
        <span style={{ color: '#6e7681', fontSize: 11 }}>{row.raw}</span>
      </div>
    );
  }
  const bg = row.type === 'add' ? '#0d2a0d' : row.type === 'del' ? '#2a0d0d' : 'transparent';
  const color = row.type === 'add' ? '#7ee787' : row.type === 'del' ? '#f85149' : '#c9d1d9';
  const prefix = row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' ';
  return (
    // Fixed height = LINE_HEIGHT enables accurate virtual scrolling
    <div style={{ height: LINE_HEIGHT, background: bg, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <span style={{ width: 44, flexShrink: 0, textAlign: 'right', paddingRight: 8, color: '#484f58', fontSize: 10, userSelect: 'none' }}>
        {row.oldNum ?? ''}
      </span>
      <span style={{ width: 44, flexShrink: 0, textAlign: 'right', paddingRight: 8, color: '#484f58', fontSize: 10, userSelect: 'none' }}>
        {row.newNum ?? ''}
      </span>
      <span style={{ width: 16, flexShrink: 0, textAlign: 'center', color, fontSize: 11, userSelect: 'none' }}>{prefix}</span>
      <span style={{ color, whiteSpace: 'pre', paddingRight: 16, fontSize: 11, minWidth: 0 }}>{row.content}</span>
    </div>
  );
});

const DiffContent = forwardRef(function DiffContent({ diffStr }, ref) {
  const containerRef = useRef(null);
  const fileHeaderRefs = useRef({});
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH, setContainerH] = useState(400);

  const rows = useMemo(() => parseDiffToRows(diffStr), [diffStr]);
  const isVirtual = true; // fixed LINE_HEIGHT per row → accurate virtual scroll

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerH(el.clientHeight));
    ro.observe(el);
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener('scroll', onScroll); };
  }, []);

  useImperativeHandle(ref, () => ({
    scrollToFile(path) {
      const el = containerRef.current;
      if (!el) return;
      if (isVirtual) {
        const idx = rows.findIndex(r => r.kind === 'file-header' && r.path === path);
        if (idx >= 0) el.scrollTop = idx * LINE_HEIGHT;
      } else {
        fileHeaderRefs.current[path]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  }), [rows, isVirtual]);

  if (!diffStr || rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-600">
        No changes
      </div>
    );
  }

  const visStart = isVirtual ? Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN) : 0;
  const visEnd = isVirtual ? Math.min(rows.length, Math.ceil((scrollTop + containerH) / LINE_HEIGHT) + OVERSCAN) : rows.length;
  const topPad = visStart * LINE_HEIGHT;
  const bottomPad = (rows.length - visEnd) * LINE_HEIGHT;

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-auto"
      style={{ fontFamily: 'Menlo, Monaco, "Courier New", monospace', background: '#0d1117' }}
    >
      {/* min-width prevents horizontal scroll from shrinking rows */}
      <div style={{ minWidth: 'max-content' }}>
        {topPad > 0 && <div style={{ height: topPad }} />}
        {rows.slice(visStart, visEnd).map((row, i) => (
          <div
            key={visStart + i}
            ref={row.kind === 'file-header' ? el => { if (el) fileHeaderRefs.current[row.path] = el; } : undefined}
          >
            <DiffRow row={row} />
          </div>
        ))}
        {bottomPad > 0 && <div style={{ height: bottomPad }} />}
      </div>
    </div>
  );
});

export default DiffContent;
