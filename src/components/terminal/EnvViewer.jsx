import React, { useState, useEffect } from 'react';
import { envLoad } from '../../ipc';

export default function EnvViewer({ projectId, onClose }) {
  const [vars, setVars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [revealed, setRevealed] = useState(new Set());

  useEffect(() => {
    setLoading(true);
    envLoad(projectId)
      .then((result) => {
        const arr = Object.entries(result || {}).map(([key, info]) => ({ key, ...info }));
        setVars(arr);
      })
      .catch(() => setVars([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const filtered = vars.filter((v) => {
    const q = search.toLowerCase();
    return !q || v.key.toLowerCase().includes(q) || (!v.isSecret && v.value.toLowerCase().includes(q));
  });

  function toggleReveal(key) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-t border-slate-700/60">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/60 flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
        <span className="text-xs font-medium text-slate-400 flex-1">Environment Variables</span>
        {!loading && (
          <span className="text-[10px] text-slate-600">{vars.length} vars</span>
        )}
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-400 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      {!loading && vars.length > 0 && (
        <div className="px-3 py-1.5 border-b border-slate-700/60 flex-shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter variables…"
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-md px-2 py-1 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-violet-500/40"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-xs text-slate-600 text-center">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-xs text-slate-600 text-center">
            {vars.length === 0 ? 'No .env file found in this project' : 'No matching variables'}
          </div>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {filtered.map((v) => (
                <tr key={v.key} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors group">
                  <td className="px-3 py-1.5 font-mono text-violet-400 font-medium align-top whitespace-nowrap w-0">
                    {v.key}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-slate-400 break-all">
                    {v.isSecret ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 select-none">
                          {revealed.has(v.key) ? v.value : '••••••••'}
                        </span>
                        <button
                          onClick={() => toggleReveal(v.key)}
                          className="text-slate-700 hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          {revealed.has(v.key) ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">{v.value || <span className="text-slate-700 italic">empty</span>}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
