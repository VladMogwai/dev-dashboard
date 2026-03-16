import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllRunning, getProcessStats, stopProcess, killCommand } from '../ipc';

function formatUptime(startedAt) {
  if (!startedAt) return '—';
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function StatBar({ value, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-slate-400 w-9 text-right flex-shrink-0">
        {value != null ? `${value.toFixed(1)}%` : '—'}
      </span>
    </div>
  );
}

export default function ProcessMonitor({ onClose }) {
  const [processes, setProcesses] = useState([]);
  const [stats, setStats] = useState({});
  const [killing, setKilling] = useState(new Set());
  const tickRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const procs = await getAllRunning();
      setProcesses(procs);
      if (procs.length > 0) {
        const pids = procs.map((p) => p.pid).filter(Boolean);
        const s = await getProcessStats(pids);
        setStats(s);
      } else {
        setStats({});
      }
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    refresh();
    tickRef.current = setInterval(refresh, 2000);
    return () => clearInterval(tickRef.current);
  }, [refresh]);

  async function handleKill(proc) {
    setKilling((prev) => new Set(prev).add(proc.pid));
    try {
      if (proc.type === 'main') {
        await stopProcess(proc.projectId);
      } else {
        await killCommand(proc.projectId, proc.command);
      }
      await refresh();
    } finally {
      setKilling((prev) => {
        const n = new Set(prev);
        n.delete(proc.pid);
        return n;
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="bg-[#0d1626] border border-slate-700/60 rounded-xl shadow-2xl flex flex-col"
        style={{ width: 680, maxHeight: '80vh', minHeight: 280 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-700/60 flex-shrink-0">
          <div className="w-5 h-5 rounded-md bg-violet-600/30 border border-violet-600/40 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-100">Process Monitor</span>
          {processes.length > 0 && (
            <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-[10px] text-emerald-400 font-medium">
              {processes.length} running
            </span>
          )}
          <div className="flex-1" />
          {/* Refresh indicator */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            live
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Column headers */}
        {processes.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2 border-b border-slate-800 flex-shrink-0">
            <div className="w-2 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-[10px] text-slate-600 uppercase tracking-wider font-medium">Project / Command</div>
            <div className="w-10 text-[10px] text-slate-600 uppercase tracking-wider font-medium text-right">PID</div>
            <div className="w-28 text-[10px] text-slate-600 uppercase tracking-wider font-medium">CPU</div>
            <div className="w-28 text-[10px] text-slate-600 uppercase tracking-wider font-medium">MEM</div>
            <div className="w-16 text-[10px] text-slate-600 uppercase tracking-wider font-medium">Uptime</div>
            <div className="w-14" />
          </div>
        )}

        {/* Process list */}
        <div className="flex-1 overflow-y-auto">
          {processes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">No running processes</p>
                <p className="text-slate-600 text-xs mt-0.5">Start a project to see processes here</p>
              </div>
            </div>
          ) : (
            processes.map((proc) => {
              const procStats = stats[proc.pid];
              const isKilling = killing.has(proc.pid);
              const isMain = proc.type === 'main';
              return (
                <div
                  key={`${proc.projectId}-${proc.pid}`}
                  className="flex items-center gap-3 px-5 py-3 border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors group"
                >
                  {/* Type indicator */}
                  <div className="w-2 flex-shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${isMain ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>

                  {/* Project + command */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-slate-200 truncate">{proc.projectName}</span>
                      {!isMain && (
                        <span className="px-1 py-0.5 bg-amber-500/15 border border-amber-500/25 rounded text-[9px] text-amber-400 flex-shrink-0">cmd</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{proc.command || '—'}</div>
                  </div>

                  {/* PID */}
                  <div className="w-10 text-right">
                    <span className="text-[11px] font-mono text-slate-500">{proc.pid}</span>
                  </div>

                  {/* CPU */}
                  <div className="w-28">
                    <StatBar value={procStats?.cpu} max={100} color="bg-violet-500" />
                  </div>

                  {/* MEM */}
                  <div className="w-28">
                    <StatBar value={procStats?.mem} max={100} color="bg-sky-500" />
                  </div>

                  {/* Uptime */}
                  <div className="w-16">
                    <span className="text-[11px] font-mono text-slate-500">{formatUptime(proc.startedAt)}</span>
                  </div>

                  {/* Kill button */}
                  <div className="w-14 flex justify-end">
                    <button
                      onClick={() => handleKill(proc)}
                      disabled={isKilling}
                      className="px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 bg-red-600/20 hover:bg-red-600/40 text-red-400 border-red-600/30"
                    >
                      {isKilling ? '…' : 'Kill'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-800 flex-shrink-0 flex items-center gap-4 text-[10px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            main process
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            script / command
          </div>
        </div>
      </div>
    </div>
  );
}
