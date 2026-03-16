import React, { useState, useEffect, useRef } from 'react';
import { updatePort, getRunningPorts, restartProcess } from '../ipc';

const TYPE_STYLES = {
  client: { label: 'Client', color: 'text-sky-400', bg: 'bg-sky-900/30', border: 'border-sky-700/40' },
  server: { label: 'Server', color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-700/40' },
};

export default function PortBadge({ project, isRunning, onPortChanged }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [runningPorts, setRunningPorts] = useState([]);
  const inputRef = useRef(null);

  // Parse port and type from startCommand
  const cmd = project.startCommand || '';
  const configuredPort = parsePortFromCmd(cmd);
  const type = detectTypeFromCmd(cmd);
  const typeStyle = type ? TYPE_STYLES[type] : null;

  // Fetch actual running ports when process is running
  useEffect(() => {
    if (!isRunning) { setRunningPorts([]); return; }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await getRunningPorts(project.id);
        if (!cancelled && res?.ports) setRunningPorts(res.ports);
      } catch {}
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [isRunning, project.id]);

  function startEdit() {
    setValue(String(runningPorts[0] || configuredPort || ''));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 20);
  }

  async function applyPort() {
    const port = parseInt(value);
    if (!port || port < 1 || port > 65535) { setEditing(false); return; }
    try {
      const res = await updatePort(project.id, port);
      if (res?.success) {
        onPortChanged?.(res.startCommand);
        if (isRunning) await restartProcess(project.id);
      }
    } catch {}
    setEditing(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') applyPort();
    if (e.key === 'Escape') setEditing(false);
  }

  const displayPort = runningPorts[0] || configuredPort;

  if (!displayPort && !editing) return null;

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <span className="text-slate-500 text-xs">:</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          onKeyDown={onKeyDown}
          onBlur={applyPort}
          className="w-16 px-1.5 py-0.5 bg-slate-700 border border-violet-500/60 rounded text-xs font-mono text-slate-200 outline-none"
          maxLength={5}
          autoFocus
        />
        <button
          onClick={applyPort}
          className="px-1.5 py-0.5 bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 text-[10px] rounded border border-violet-600/40 transition-colors"
        >
          {isRunning ? '↺' : '✓'}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded border cursor-pointer transition-colors hover:border-violet-500/40 ${
        typeStyle ? `${typeStyle.bg} ${typeStyle.border}` : 'bg-slate-800/60 border-slate-700/40'
      }`}
      onClick={(e) => { e.stopPropagation(); startEdit(); }}
      title="Click to change port"
    >
      {isRunning && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
      )}
      <span className="text-xs font-mono text-slate-300">:{displayPort}</span>
      {typeStyle && (
        <span className={`text-[10px] font-medium ${typeStyle.color}`}>{typeStyle.label}</span>
      )}
      {runningPorts.length > 1 && (
        <span className="text-[10px] text-slate-600">+{runningPorts.length - 1}</span>
      )}
    </div>
  );
}

function parsePortFromCmd(cmd) {
  if (!cmd) return null;
  const m1 = cmd.match(/--port[= ](\d{2,5})/);
  if (m1) return parseInt(m1[1]);
  const m2 = cmd.match(/(?:^|\s)-p\s+(\d{2,5})/);
  if (m2) return parseInt(m2[1]);
  const m3 = cmd.match(/\bPORT=(\d{2,5})/);
  if (m3) return parseInt(m3[1]);
  return null;
}

function detectTypeFromCmd(cmd) {
  if (!cmd) return null;
  const lower = cmd.toLowerCase();
  const clientKw = ['next', 'vite', 'react-scripts', 'vue-cli', 'webpack-dev', 'parcel', 'nuxt', 'gatsby'];
  const serverKw = ['nodemon', 'ts-node', 'nest', 'deno', 'fastify', 'express', 'koa'];
  if (clientKw.some(k => lower.includes(k))) return 'client';
  if (serverKw.some(k => lower.includes(k))) return 'server';
  if (/\bnode\s/.test(lower)) return 'server';
  return null;
}
