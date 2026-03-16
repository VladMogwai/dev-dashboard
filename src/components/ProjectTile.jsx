import React, { useState, useEffect, useRef } from 'react';
import { startProcess, stopProcess, runCommand, killCommand, onCommandStatus, getProjectScripts, updateProject } from '../ipc';
import PortBadge from './PortBadge';

const STATUS_RING = {
  running: 'border-emerald-500/40',
  stopped: 'border-slate-700',
  error: 'border-red-500/40',
};
const STATUS_DOT  = { running: 'bg-emerald-500', stopped: 'bg-slate-500', error: 'bg-red-500' };
const STATUS_TEXT = { running: 'text-emerald-400', stopped: 'text-slate-500', error: 'text-red-400' };
const STATUS_LABEL = { running: 'Running', stopped: 'Stopped', error: 'Error' };


export default function ProjectTile({ project, gitInfo, isSelected, onSelect, onStatusChange, onRemove }) {
  const status = project.status || 'stopped';
  const [scripts, setScripts] = useState(null);
  const [hidden, setHidden] = useState(() => new Set(project.hiddenScripts || []));
  const [runningScripts, setRunningScripts] = useState(new Set());
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [editingCmd, setEditingCmd] = useState(false);
  const [cmdValue, setCmdValue] = useState('');
  const addBtnRef = useRef(null);
  const addMenuRef = useRef(null);
  const [addMenuPos, setAddMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    getProjectScripts(project.id).then(setScripts).catch(() => setScripts({}));
  }, [project.id]);

  useEffect(() => {
    setHidden(new Set(project.hiddenScripts || []));
  }, [project.hiddenScripts]);

  // Listen for command start/stop events from the backend
  useEffect(() => {
    const unsub = onCommandStatus(({ projectId, command, status }) => {
      if (projectId !== project.id) return;
      setRunningScripts((prev) => {
        const next = new Set(prev);
        if (status === 'running') next.add(command);
        else next.delete(command);
        return next;
      });
    });
    return unsub;
  }, [project.id]);

  // Close add-menu on outside click
  useEffect(() => {
    if (!addMenuOpen) return;
    function handler(e) {
      if (
        addMenuRef.current && !addMenuRef.current.contains(e.target) &&
        addBtnRef.current && !addBtnRef.current.contains(e.target)
      ) setAddMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [addMenuOpen]);

  // Effective running state: main process OR a script command matching startCommand is running
  const startCmd = project.startCommand?.trim() || '';
  const effectivelyRunning = status === 'running' || runningScripts.has(startCmd);

  async function handleStart(e) {
    e.stopPropagation();
    onStatusChange(project.id, 'running');
    await startProcess(project.id);
  }

  async function handleStop(e) {
    e.stopPropagation();
    if (status === 'running') {
      onStatusChange(project.id, 'stopped');
      await stopProcess(project.id);
    } else {
      // Running via a script command that matches startCommand — kill it as a command
      await killCommand(project.id, startCmd);
    }
  }

  async function handleRunScript(e, scriptName) {
    e.stopPropagation();
    onSelect(project);
    const cmd = `npm run ${scriptName}`;
    // If this script's command matches the configured start command, route through
    // the main process (so Start/Stop button and status indicator react correctly)
    if (startCmd && startCmd === cmd) {
      onStatusChange(project.id, 'running');
      await startProcess(project.id);
    } else {
      await runCommand(project.id, cmd);
    }
  }

  async function handleKillScript(e, scriptName) {
    e.stopPropagation();
    const cmd = `npm run ${scriptName}`;
    // If this script is the main start process, stop via stopProcess
    if (status === 'running' && startCmd === cmd) {
      onStatusChange(project.id, 'stopped');
      await stopProcess(project.id);
    } else {
      await killCommand(project.id, cmd);
    }
  }

  async function hideScript(e, scriptName) {
    e.stopPropagation();
    const next = new Set(hidden);
    next.add(scriptName);
    setHidden(next);
    await updateProject(project.id, { hiddenScripts: [...next] });
  }

  async function showScript(e, scriptName) {
    e.stopPropagation();
    const next = new Set(hidden);
    next.delete(scriptName);
    setHidden(next);
    await updateProject(project.id, { hiddenScripts: [...next] });
    setAddMenuOpen(false);
  }

  function handleRemove(e) {
    e.stopPropagation();
    onRemove(project.id);
  }

  // A script is "running" if it was launched via the script button OR if the
  // main start process is running and its command matches this script.
  function isScriptRunning(scriptName) {
    const cmd = `npm run ${scriptName}`;
    return runningScripts.has(cmd) || (status === 'running' && project.startCommand?.trim() === cmd);
  }

  const extraScripts = scripts
    ? Object.keys(scripts).filter((s) => !hidden.has(s))
    : [];

  const hiddenScripts = scripts
    ? Object.keys(scripts).filter((s) => hidden.has(s))
    : [];

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
      {/* Name + status */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-100 text-sm leading-tight truncate">{project.name}</h3>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]} ${status === 'running' ? 'animate-pulse' : ''}`} />
          <span className={`text-xs ${STATUS_TEXT[status]}`}>{STATUS_LABEL[status]}</span>
        </div>
      </div>

      {/* Path */}
      <p className="text-xs text-slate-600 font-mono truncate">{project.path}</p>

      {/* Git branch + port badge */}
      <div className="flex items-center justify-between gap-2">
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
        <PortBadge
          project={project}
          isRunning={status === 'running'}
          onPortChanged={(newCmd) => {/* project data will reload */}}
        />
      </div>

      {/* Buttons row */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {/* Start / Stop + edit command — only shown when a start command is configured */}
        {startCmd && (editingCmd ? (
          <form
            className="flex items-center gap-1 w-full"
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              const v = cmdValue.trim();
              if (v) await updateProject(project.id, { startCommand: v });
              setEditingCmd(false);
            }}
          >
            <input
              autoFocus
              value={cmdValue}
              onChange={(e) => setCmdValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setEditingCmd(false); }}
              onBlur={async () => {
                const v = cmdValue.trim();
                if (v) await updateProject(project.id, { startCommand: v });
                setEditingCmd(false);
              }}
              className="flex-1 min-w-0 px-2 py-1 bg-slate-700 border border-violet-500/60 rounded-lg text-xs font-mono text-slate-200 outline-none"
              placeholder="npm run dev"
            />
            <button type="submit" className="px-2 py-1 bg-violet-600/30 text-violet-300 text-xs rounded-lg border border-violet-600/40 flex-shrink-0">✓</button>
          </form>
        ) : (
          <div className="flex items-center gap-1 group/start">
            {!effectivelyRunning ? (
              <button
                onClick={handleStart}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-600/30 transition-colors"
                title={project.startCommand}
              >
                ▶ Start
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-medium rounded-lg border border-red-600/30 transition-colors"
              >
                ■ Stop
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setCmdValue(project.startCommand || ''); setEditingCmd(true); }}
              title={`Edit start command: ${project.startCommand}`}
              className="opacity-0 group-hover/start:opacity-100 px-1.5 py-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-700 text-xs rounded-lg transition-all"
            >
              ✎
            </button>
          </div>
        ))}

        {/* npm scripts */}
        {extraScripts.map((s) => (
          <ScriptButton
            key={s}
            name={s}
            command={`npm run ${s}`}
            fullCommand={scripts?.[s]}
            isRunning={isScriptRunning(s)}
            onClick={(e) => handleRunScript(e, s)}
            onStop={(e) => handleKillScript(e, s)}
            onHide={(e) => hideScript(e, s)}
          />
        ))}

        {/* Add hidden scripts back */}
        {hiddenScripts.length > 0 && (
          <div className="relative">
            <button
              ref={addBtnRef}
              onClick={(e) => {
                e.stopPropagation();
                if (addBtnRef.current) {
                  const r = addBtnRef.current.getBoundingClientRect();
                  setAddMenuPos({ top: r.bottom + 4, left: r.left });
                }
                setAddMenuOpen((v) => !v);
              }}
              title="Show hidden scripts"
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition-colors border ${
                addMenuOpen
                  ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                  : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
              }`}
            >
              +
            </button>
            {addMenuOpen && (
              <div
                ref={addMenuRef}
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'fixed', top: addMenuPos.top, left: addMenuPos.left, zIndex: 9999, minWidth: 160 }}
                className="bg-[#161b22] border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="px-3 py-1.5 text-[10px] font-medium text-slate-600 uppercase tracking-wider border-b border-slate-700/60">
                  Hidden scripts
                </div>
                {hiddenScripts.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => showScript(e, s)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/60 transition-colors text-left group"
                  >
                    <span className="flex-1 text-xs text-slate-400 group-hover:text-slate-200 font-mono">{s}</span>
                    <span className="text-[10px] text-slate-600 group-hover:text-violet-400">show</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Remove from dashboard */}
        <button
          onClick={handleRemove}
          className="ml-auto px-2.5 py-1.5 text-slate-700 hover:text-red-400 text-xs rounded-lg transition-colors"
          title="Remove from dashboard"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ScriptButton({ name, command, fullCommand, isRunning, onClick, onStop, onHide }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div
      className="group relative flex items-center"
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      {isRunning ? (
        /* Running state: show stop button */
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 pl-2.5 pr-2.5 py-1.5 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 text-xs rounded-lg border border-orange-600/30 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          {name}
          <span className="text-[10px] text-orange-500">■</span>
        </button>
      ) : (
        /* Idle state: run button + hide × */
        <>
          <button
            onClick={onClick}
            className="pl-2.5 pr-6 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
          >
            {name}
          </button>
          <button
            onClick={onHide}
            title="Hide this script"
            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-red-400 text-[10px] leading-none w-4 h-4 flex items-center justify-center"
          >
            ×
          </button>
        </>
      )}

      {/* Tooltip */}
      {tooltipVisible && fullCommand && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          style={{ width: 200 }}
        >
          <div className="bg-[#161b22] border border-slate-700/60 rounded-lg px-2.5 py-2 shadow-xl">
            <div className="text-[10px] font-medium text-slate-500 mb-0.5 uppercase tracking-wider">Script</div>
            <div className="text-[10px] font-mono text-slate-400 break-all line-clamp-3">
              {fullCommand.length > 80 ? fullCommand.slice(0, 80) + '…' : fullCommand}
            </div>
          </div>
          <div className="w-2 h-2 bg-[#161b22] border-b border-r border-slate-700/60 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
