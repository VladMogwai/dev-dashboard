import React, { useState, useEffect, useRef, useCallback } from 'react';
import ProjectGrid from './components/ProjectGrid';
import DetailPanel from './components/DetailPanel';
import AddProjectModal from './components/AddProjectModal';
import ProcessMonitor from './components/ProcessMonitor';
import { useProjects } from './hooks/useProjects';
import { onProcessStatusUpdate } from './ipc';

const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 860;
const DEFAULT_PANEL_WIDTH = 460;

export default function App() {
  const { projects, gitInfo, loading, addProject, removeProject, updateProjectStatus } = useProjects();
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [runningCount, setRunningCount] = useState(0);
  const [xcodeBannerVisible, setXcodeBannerVisible] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const liveSelected = selectedProject
    ? projects.find((p) => p.id === selectedProject.id) || null
    : null;

  // Track running count for the Processes badge
  useEffect(() => {
    const count = projects.filter((p) => p.status === 'running').length;
    setRunningCount(count);
  }, [projects]);

  // Also listen for real-time status updates to keep badge accurate
  useEffect(() => {
    const unsub = onProcessStatusUpdate(({ status }) => {
      if (status === 'running') setRunningCount((n) => n + 1);
      else setRunningCount((n) => Math.max(0, n - 1));
    });
    return () => unsub();
  }, []);

  // Listen for Xcode CLT missing notification from main process
  useEffect(() => {
    if (!window.electronAPI?.onXcodeCltMissing) return;
    const unsub = window.electronAPI.onXcodeCltMissing(() => {
      setXcodeBannerVisible(true);
    });
    return () => unsub();
  }, []);

  const onDragMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth]);

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return;
      const delta = dragStartX.current - e.clientX;
      const next = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, dragStartWidth.current + delta));
      setPanelWidth(next);
    }
    function onMouseUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  async function handleRemoveProject(id) {
    await removeProject(id);
    if (selectedProject?.id === id) setSelectedProject(null);
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-slate-900">
      {/* Xcode CLT warning banner */}
      {xcodeBannerVisible && (
        <div
          style={{
            flexShrink: 0,
            background: '#78350f',
            borderBottom: '1px solid #92400e',
            padding: '7px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
            color: '#fef3c7',
          }}
        >
          <span style={{ flexShrink: 0 }}>⚠</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            Xcode Command Line Tools not found — git, make, and other tools may not work.
            {' '}Install with:
            {' '}
            <code
              style={{
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: 3,
                padding: '1px 6px',
                color: '#fde68a',
              }}
            >
              xcode-select --install
            </code>
          </span>
          <button
            onClick={() => setXcodeBannerVisible(false)}
            style={{
              flexShrink: 0,
              padding: '2px 10px',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              color: '#fef3c7',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left pane */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            width: liveSelected ? `calc(100% - ${panelWidth}px - 5px)` : '100%',
            transition: dragging.current ? 'none' : 'width 180ms ease',
            minWidth: liveSelected ? 240 : 0,
          }}
        >
          <ProjectGrid
            projects={projects}
            gitInfo={gitInfo}
            selectedProject={liveSelected}
            onSelect={setSelectedProject}
            onStatusChange={updateProjectStatus}
            onAddProject={() => setShowAddModal(true)}
            onRemove={handleRemoveProject}
            onOpenMonitor={() => setShowMonitor(true)}
            runningCount={runningCount}
          />
        </div>

        {/* Drag handle */}
        {liveSelected && (
          <div
            onMouseDown={onDragMouseDown}
            style={{
              width: 5,
              flexShrink: 0,
              cursor: 'col-resize',
              background: 'transparent',
              position: 'relative',
              zIndex: 10,
            }}
            className="group"
          >
            {/* Visible dragger line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 2,
                width: 1,
                background: 'rgba(100,116,139,0.3)',
                transition: 'background 120ms',
              }}
              className="group-hover:!bg-violet-500/70"
            />
            {/* Center dot indicator */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 16,
                height: 40,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                opacity: 0,
                transition: 'opacity 120ms',
              }}
              className="group-hover:!opacity-100"
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(139,92,246,0.8)' }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Right pane — detail panel */}
        <div
          className="flex-shrink-0 overflow-hidden flex flex-col border-l border-slate-700/60"
          style={{
            width: liveSelected ? panelWidth : 0,
            transition: dragging.current ? 'none' : 'width 180ms ease',
            minWidth: 0,
          }}
        >
          {liveSelected && (
            <DetailPanel
              project={liveSelected}
              gitInfo={gitInfo[liveSelected.id]}
              onClose={() => setSelectedProject(null)}
              onRemove={handleRemoveProject}
            />
          )}
        </div>
      </div>

      {showAddModal && (
        <AddProjectModal
          onAdd={addProject}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showMonitor && (
        <ProcessMonitor onClose={() => setShowMonitor(false)} />
      )}
    </div>
  );
}
