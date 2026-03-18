import React, { useState, useRef, useEffect } from 'react';
import ProjectTile from './ProjectTile';
import { getAppVersion, checkForUpdates } from '../ipc';

export default function ProjectGrid({
  projects,
  gitInfo,
  selectedProject,
  onSelect,
  onStatusChange,
  onUpdateProject,
  onAddProject,
  onRemove,
  onReorder,
  onOpenMonitor,
  onOpenSettings,
  onRebuildInstall,
  runningCount,
  updateState,
  sidebarFixed,
  onToggleSidebarFixed,
}) {
  const [rebuilding, setRebuilding] = useState(false);
  const [checking, setChecking] = useState(false);
  const appVersion = getAppVersion();
  const [dragOverId, setDragOverId] = useState(null);
  const dragIdRef = useRef(null);
  const titlebarRef = useRef(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const el = titlebarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setIsNarrow(entry.contentRect.width < 420);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="flex flex-col h-full">
      {/* Titlebar — only the empty strip is draggable, not the buttons */}
      <div
        ref={titlebarRef}
        className="flex items-center px-5 border-b border-slate-700/50"
        style={{ height: 52, minHeight: 52, WebkitAppRegion: 'drag' }}
      >
        {/* Traffic-light spacer */}
        <div style={{ width: 72, flexShrink: 0 }} />

        {/* Title */}
        <div className="flex items-center gap-2 select-none" style={{ WebkitAppRegion: 'drag', minWidth: 0, overflow: 'hidden' }}>
          <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-100 flex-shrink-0">Polvoo</span>
          <span className="text-xs text-slate-500 ml-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Spacer fills the drag region */}
        <div className="flex-1" style={{ WebkitAppRegion: 'drag' }} />

        {/* Buttons — must opt out of drag */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag', flexShrink: 0 }}>
          {/* Fixed sidebar toggle */}
          <button
            onClick={onToggleSidebarFixed}
            title={sidebarFixed ? 'Sidebar: fixed width (click to make flexible)' : 'Sidebar: flexible width (click to fix)'}
            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
              sidebarFixed
                ? 'bg-violet-600/20 text-violet-400 border-violet-700 hover:bg-violet-600/30'
                : 'bg-slate-800 text-slate-600 border-slate-700 hover:bg-slate-700 hover:text-slate-300'
            }`}
          >
            {sidebarFixed ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            )}
          </button>

          {/* Rebuild & install */}
          {onRebuildInstall && (
            <button
              onClick={async () => {
                setRebuilding(true);
                await onRebuildInstall();
                // App will be killed by the script — no need to reset state
              }}
              disabled={rebuilding}
              title="Rebuild & install (dev-install.sh)"
              className="flex items-center justify-center w-7 h-7 bg-slate-800 hover:bg-amber-600/20 text-slate-500 hover:text-amber-400 rounded-lg border border-slate-700 hover:border-amber-600/40 transition-colors disabled:opacity-40"
            >
              {rebuilding ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
                </svg>
              )}
            </button>
          )}
          {/* Settings button */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (checking) return;
              setChecking(true);
              onOpenSettings();
              await checkForUpdates();
              setTimeout(() => setChecking(false), 3000);
            }}
            title={
              updateState === 'available' || updateState === 'downloaded'
                ? `Settings — update available!`
                : appVersion
                  ? `Settings (v${appVersion})`
                  : 'Settings'
            }
            className={`flex items-center justify-center w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-lg border transition-colors ${
              updateState === 'available' || updateState === 'downloaded'
                ? 'text-violet-400 hover:text-violet-300 border-violet-700 hover:border-violet-500'
                : 'text-slate-600 hover:text-slate-300 border-slate-700 hover:border-slate-600'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Process monitor button */}
          <button
            onClick={onOpenMonitor}
            className="relative flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
            Processes
            {runningCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center leading-none">
                {runningCount > 9 ? '9+' : runningCount}
              </span>
            )}
          </button>
          <button
            onClick={onAddProject}
            title="Add Project"
            className={`flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors ${
              isNarrow ? 'w-7 h-7' : 'gap-1.5 px-3 py-1.5'
            }`}
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {!isNarrow && <span className="whitespace-nowrap">Add Project</span>}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
              </svg>
            </div>
            <div>
              <p className="text-slate-300 font-medium text-sm">No projects yet</p>
              <p className="text-slate-500 text-xs mt-1">Add a project to start managing your dev stack</p>
            </div>
            <button
              onClick={onAddProject}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add your first project
            </button>
          </div>
        ) : (
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gridTemplateRows: 'masonry', // progressive enhancement — Firefox 87+
              alignItems: 'start',         // fallback: top-align cards, no height stretching
              gap: 12,
            }}
          >
            {projects.map((project) => (
              <div
                key={project.id}
                draggable
                onDragStart={(e) => {
                  dragIdRef.current = project.id;
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  dragIdRef.current = null;
                  setDragOverId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragIdRef.current && dragIdRef.current !== project.id) {
                    setDragOverId(project.id);
                  }
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromId = dragIdRef.current;
                  if (!fromId || fromId === project.id) return;
                  const ids = projects.map((p) => p.id);
                  const fromIdx = ids.indexOf(fromId);
                  const toIdx = ids.indexOf(project.id);
                  const reordered = [...ids];
                  reordered.splice(fromIdx, 1);
                  reordered.splice(toIdx, 0, fromId);
                  setDragOverId(null);
                  onReorder?.(reordered);
                }}
                style={{
                  opacity: dragIdRef.current === project.id ? 0.4 : 1,
                  outline: dragOverId === project.id ? '2px solid rgba(139,92,246,0.6)' : 'none',
                  borderRadius: 12,
                  transition: 'opacity 120ms',
                  cursor: 'grab',
                }}
              >
                <ProjectTile
                  project={project}
                  gitInfo={gitInfo[project.id]}
                  isSelected={selectedProject?.id === project.id}
                  onSelect={onSelect}
                  onStatusChange={onStatusChange}
                  onUpdateProject={onUpdateProject}
                  onRemove={onRemove}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
