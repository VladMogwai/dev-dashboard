import React, { useState, useEffect } from 'react';
import { getInstalledTerminals, openInTerminal, getSettings, setSettings } from '../ipc';

const TERMINAL_ICONS = {
  warp: '⬡',
  iterm2: '⌘',
  ghostty: '◈',
  wezterm: '◆',
  alacritty: '◎',
  hyper: '⬢',
  kitty: '◉',
  terminal: '▶',
};

export default function TerminalLauncher({ projectPath, projectName }) {
  const [terminals, setTerminals] = useState([]);
  const [preferred, setPreferred] = useState(null);
  const [launching, setLaunching] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getInstalledTerminals(), getSettings()]).then(([list, s]) => {
      setTerminals(list);
      // Use saved preference, fallback to first installed
      const pref = s.preferredTerminal && list.find((t) => t.id === s.preferredTerminal)
        ? s.preferredTerminal
        : list[0]?.id ?? null;
      setPreferred(pref);
    });
  }, []);

  async function launch(terminalId) {
    setLaunching(terminalId);
    setError(null);
    const result = await openInTerminal(terminalId, projectPath);
    setLaunching(null);
    if (!result.success) setError(result.error || 'Failed to open terminal');
  }

  async function setAsDefault(terminalId) {
    setPreferred(terminalId);
    await setSettings({ preferredTerminal: terminalId });
  }

  if (terminals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <div className="text-3xl opacity-30">⌨</div>
        <p className="text-slate-400 text-sm font-medium">No terminals detected</p>
        <p className="text-slate-600 text-xs">
          Install Warp, iTerm2, Ghostty, or another terminal app.
        </p>
      </div>
    );
  }

  const preferredTerminal = terminals.find((t) => t.id === preferred);
  const otherTerminals = terminals.filter((t) => t.id !== preferred);

  return (
    <div className="flex flex-col h-full p-5 gap-5 overflow-y-auto">
      {/* Primary launch button */}
      {preferredTerminal && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Default terminal</p>
          <button
            onClick={() => launch(preferredTerminal.id)}
            disabled={!!launching}
            className="flex items-center gap-3 px-5 py-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-xl border border-slate-600 transition-colors text-left w-full disabled:opacity-60"
          >
            <span className="text-2xl text-slate-300 w-8 text-center select-none">
              {TERMINAL_ICONS[preferredTerminal.id] ?? '▶'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-100">
                {launching === preferredTerminal.id ? 'Opening…' : `Open in ${preferredTerminal.name}`}
              </div>
              <div className="text-xs text-slate-500 font-mono truncate mt-0.5">{projectPath}</div>
            </div>
            <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Other terminals */}
      {otherTerminals.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Other installed terminals</p>
          <div className="flex flex-col gap-1.5">
            {otherTerminals.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <button
                  onClick={() => launch(t.id)}
                  disabled={!!launching}
                  className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors disabled:opacity-60"
                >
                  <span className="text-lg text-slate-400 w-6 text-center select-none">
                    {TERMINAL_ICONS[t.id] ?? '▶'}
                  </span>
                  <span className="text-sm text-slate-200">
                    {launching === t.id ? 'Opening…' : t.name}
                  </span>
                </button>
                <button
                  onClick={() => setAsDefault(t.id)}
                  title="Set as default"
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-500 hover:text-violet-400 text-xs rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
                >
                  Set default
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2 border border-red-800/30">
          {error}
        </p>
      )}

      <div className="mt-auto text-xs text-slate-700 text-center">
        Terminals are detected from /Applications and CLI tools
      </div>
    </div>
  );
}
