import React from 'react';
import { startProcess, stopProcess } from '../ipc';

const STATUS_RING = {
  running: 'border-emerald-500/40',
  stopped: 'border-slate-700',
  error: 'border-red-500/40',
};
const STATUS_DOT = {
  running: 'bg-emerald-500',
  stopped: 'bg-slate-500',
  error: 'bg-red-500',
};
const STATUS_TEXT = {
  running: 'text-emerald-400',
  stopped: 'text-slate-500',
  error: 'text-red-400',
};
const STATUS_LABEL = { running: 'Running', stopped: 'Stopped', error: 'Error' };

export default function ProjectTile({ project, gitInfo, isSelected, onSelect, onStatusChange }) {
  const status = project.status || 'stopped';

  async function handleStart(e) {
    e.stopPropagation();
    onStatusChange(project.id, 'running');
    await startProcess(project.id);
  }

  async function handleStop(e) {
    e.stopPropagation();
    onStatusChange(project.id, 'stopped');
    await stopProcess(project.id);
  }

  return (
    <div
      onClick={() => onSelect(project)}
      style={{ WebkitAppRegion: 'no-drag', cursor: 'pointer' }}
      className={`
        flex flex-col gap-2.5 p-4 rounded-xl border select-none
        transition-all duration-150
        ${isSelected
          ? 'bg-slate-700/70 border-violet-500/50 shadow-lg shadow-violet-900/20'
          : `bg-slate-800/80 ${STATUS_RING[status]} hover:border-slate-600 hover:bg-slate-700/50`}
      `}
    >
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-100 text-sm leading-tight truncate">{project.name}</h3>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]} ${status === 'running' ? 'animate-pulse' : ''}`}
          />
          <span className={`text-xs ${STATUS_TEXT[status]}`}>{STATUS_LABEL[status]}</span>
        </div>
      </div>

      {/* Path */}
      <p className="text-xs text-slate-600 font-mono truncate">{project.path}</p>

      {/* Git branch */}
      {gitInfo?.branch ? (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <svg className="w-3 h-3 text-slate-500 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
          </svg>
          <span className="font-mono truncate">{gitInfo.branch}</span>
        </div>
      ) : (
        <div className="text-xs text-slate-700">no git</div>
      )}

      {/* Start command */}
      <p className="text-xs text-slate-700 font-mono truncate">{project.startCommand}</p>

      {/* Action button */}
      <div className="flex gap-1.5 pt-0.5">
        {status !== 'running' ? (
          <button
            onClick={handleStart}
            className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-600/30 transition-colors"
          >
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex-1 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-medium rounded-lg border border-red-600/30 transition-colors"
          >
            Stop
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(project); }}
          title="Open logs & terminal"
          className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 text-xs rounded-lg transition-colors"
        >
          Logs
        </button>
      </div>
    </div>
  );
}
