import React, { useRef, useState, useEffect, useCallback } from 'react';
import AuthorAvatar from './AuthorAvatar';
import FileList from './FileList';
import DiffContent from './DiffContent';

const SKELETON_WIDTHS = [85, 72, 60, 90, 55, 78, 65, 88, 45, 70, 80, 50, 75, 68, 92];
const MIN_FILE_HEIGHT = 40;
const MAX_FILE_HEIGHT = 400;
const DEFAULT_FILE_HEIGHT = 160;

export default function DiffViewer({ commit, files, diff, loading, isChanges, onReady, onDiscardFile }) {
  const diffContentRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [fileListHeight, setFileListHeight] = useState(DEFAULT_FILE_HEIGHT);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    if (onReady) onReady((path) => diffContentRef.current?.scrollToFile(path));
  }, [onReady]);

  const onDragMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = fileListHeight;
  }, [fileListHeight]);

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return;
      const delta = e.clientY - startY.current;
      setFileListHeight(Math.min(MAX_FILE_HEIGHT, Math.max(MIN_FILE_HEIGHT, startHeight.current + delta)));
    }
    function onMouseUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function copyHash() {
    if (commit?.hash) {
      navigator.clipboard.writeText(commit.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const totalAdded = files ? files.reduce((s, f) => s + (f.added || 0), 0) : 0;
  const totalDeleted = files ? files.reduce((s, f) => s + (f.deleted || 0), 0) : 0;
  const hasFiles = files && files.length > 0;

  if (!commit) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-600">
        Select a commit to view diff
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700/50" style={{ background: '#0d1117' }}>
        {isChanges ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-200">Working Tree Changes</span>
            {(totalAdded > 0 || totalDeleted > 0) && (
              <span className="flex items-center gap-1.5 text-xs ml-2">
                {totalAdded > 0 && <span style={{ color: '#7ee787' }}>+{totalAdded}</span>}
                {totalDeleted > 0 && <span style={{ color: '#f85149' }}>-{totalDeleted}</span>}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <AuthorAvatar name={commit.author} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100 leading-snug">{commit.message}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                <span className="text-xs text-slate-400">{commit.author}</span>
                <span className="text-slate-700">·</span>
                <span className="text-xs text-slate-500">{commit.dateRel}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <code className="text-[10px] text-violet-400 font-mono bg-violet-900/20 px-1.5 py-0.5 rounded">
                  {commit.hash.slice(0, 9)}
                </code>
                {commit.hash && (
                  <button onClick={copyHash} className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors">
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
                {(totalAdded > 0 || totalDeleted > 0) && (
                  <span className="flex items-center gap-1 text-[10px]">
                    {totalAdded > 0 && <span style={{ color: '#7ee787' }}>+{totalAdded}</span>}
                    {totalDeleted > 0 && <span style={{ color: '#f85149' }}>-{totalDeleted}</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File list — only for commit history, not working tree */}
      {hasFiles && !isChanges && (
        <>
          <div style={{ height: fileListHeight, minHeight: MIN_FILE_HEIGHT, flexShrink: 0, overflow: 'hidden' }}>
            <FileList files={files} onClickFile={(path) => diffContentRef.current?.scrollToFile(path)} onDiscardFile={onDiscardFile} />
          </div>

          {/* Horizontal drag handle */}
          <div
            onMouseDown={onDragMouseDown}
            className="h-1 flex-shrink-0 cursor-row-resize group relative flex items-center justify-center transition-colors hover:bg-violet-500/30"
            style={{ background: '#1e2a3a' }}
          >
            <div className="absolute -top-1.5 -bottom-1.5 left-0 right-0" />
            <div className="flex flex-row gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {[0,1,2].map(i => (
                <div key={i} className="w-1 h-1 rounded-full bg-violet-400" />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Diff content or skeleton */}
      {loading ? (
        <div className="flex-1 p-4 space-y-1 overflow-hidden" style={{ background: '#0d1117' }}>
          {SKELETON_WIDTHS.map((w, i) => (
            <div key={i} className="h-4 rounded animate-pulse" style={{ width: `${w}%`, background: '#161b22' }} />
          ))}
        </div>
      ) : (
        <DiffContent ref={diffContentRef} diffStr={diff} />
      )}
    </div>
  );
}
