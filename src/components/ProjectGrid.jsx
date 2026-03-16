import React from 'react';
import ProjectTile from './ProjectTile';

export default function ProjectGrid({
  projects,
  gitInfo,
  selectedProject,
  onSelect,
  onStatusChange,
  onAddProject,
  onRemove,
  onOpenMonitor,
  runningCount,
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Titlebar — only the empty strip is draggable, not the buttons */}
      <div
        className="flex items-center px-5 border-b border-slate-700/50"
        style={{ height: 52, minHeight: 52, WebkitAppRegion: 'drag' }}
      >
        {/* Traffic-light spacer */}
        <div style={{ width: 72, flexShrink: 0 }} />

        {/* Title */}
        <div className="flex items-center gap-2 select-none" style={{ WebkitAppRegion: 'drag' }}>
          <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-100">Dev Dashboard</span>
          <span className="text-xs text-slate-500 ml-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Spacer fills the drag region */}
        <div className="flex-1" style={{ WebkitAppRegion: 'drag' }} />

        {/* Buttons — must opt out of drag */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Project
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
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
          >
            {projects.map((project) => (
              <ProjectTile
                key={project.id}
                project={project}
                gitInfo={gitInfo[project.id]}
                isSelected={selectedProject?.id === project.id}
                onSelect={onSelect}
                onStatusChange={onStatusChange}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
