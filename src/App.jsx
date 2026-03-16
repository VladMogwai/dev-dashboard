import React, { useState, useEffect } from 'react';
import ProjectGrid from './components/ProjectGrid';
import DetailPanel from './components/DetailPanel';
import AddProjectModal from './components/AddProjectModal';
import { useProjects } from './hooks/useProjects';

export default function App() {
  const { projects, gitInfo, loading, addProject, removeProject, updateProjectStatus } = useProjects();
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [xcodeBannerVisible, setXcodeBannerVisible] = useState(false);

  const liveSelected = selectedProject
    ? projects.find((p) => p.id === selectedProject.id) || null
    : null;

  // Listen for Xcode CLT missing notification from main process
  useEffect(() => {
    if (!window.electronAPI?.onXcodeCltMissing) return;
    const unsub = window.electronAPI.onXcodeCltMissing(() => {
      setXcodeBannerVisible(true);
    });
    return () => unsub();
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
        {/* Left pane — shrinks to make room for the detail panel */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            width: liveSelected ? 'calc(100% - 460px)' : '100%',
            transition: 'width 180ms ease',
            minWidth: liveSelected ? 280 : 0,
          }}
        >
          <ProjectGrid
            projects={projects}
            gitInfo={gitInfo}
            selectedProject={liveSelected}
            onSelect={setSelectedProject}
            onStatusChange={updateProjectStatus}
            onAddProject={() => setShowAddModal(true)}
          />
        </div>

        {/* Right pane — fixed 460px detail panel */}
        <div
          className="flex-shrink-0 overflow-hidden flex flex-col border-l border-slate-700/60"
          style={{
            width: liveSelected ? 460 : 0,
            transition: 'width 180ms ease',
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
    </div>
  );
}
