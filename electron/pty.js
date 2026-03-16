'use strict';

const { spawn } = require('child_process');

let pty;
try {
  pty = require('node-pty');
} catch (e) {
  console.error('node-pty not available:', e.message);
  pty = null;
}

// ─── Shell env capture ────────────────────────────────────────────────────────

let capturedEnvPromise = null;

/**
 * Spawn `$SHELL -l -c env` once and parse output into a plain object.
 * Captures PATH additions from nvm, fnm, pyenv, rbenv, pnpm, cargo, go, etc.
 * Also ensures SSH_AUTH_SOCK is inherited (it lives in the shell env).
 * Result is cached; subsequent calls return the same Promise.
 */
function captureShellEnv() {
  if (capturedEnvPromise) return capturedEnvPromise;

  capturedEnvPromise = new Promise((resolve) => {
    const shell = process.env.SHELL || '/bin/zsh';

    const child = spawn(shell, ['-l', '-c', 'env'], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('close', () => {
      const env = {};
      for (const line of output.split('\n')) {
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;
        const key = line.slice(0, eqIdx);
        const value = line.slice(eqIdx + 1);
        if (key) env[key] = value;
      }
      resolve(env);
    });

    child.on('error', () => {
      // If the shell spawn fails, resolve with empty object — callers must handle fallback
      resolve({});
    });

    // Safety timeout — if shell takes > 5 s, continue without it
    setTimeout(() => resolve({}), 5000);
  });

  return capturedEnvPromise;
}

/**
 * Returns the cached shell env synchronously (or {} if not yet resolved).
 * Useful for processes.js which can't easily await on every spawn.
 */
let _cachedEnv = {};
captureShellEnv().then((env) => {
  _cachedEnv = env;
});

function getCapturedEnv() {
  return _cachedEnv;
}

// ─── Env builder ──────────────────────────────────────────────────────────────

function buildEnv(shellEnv, extraEnv) {
  return {
    // Start with the captured login-shell env (nvm, fnm, pyenv paths, etc.)
    ...shellEnv,
    // Layer process.env on top (Electron-specific vars, etc.)
    ...process.env,
    // Terminal identity
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    // User identity — always from process.env
    HOME: process.env.HOME,
    USER: process.env.USER,
    LOGNAME: process.env.LOGNAME,
    SHELL: process.env.SHELL || '/bin/zsh',
    // SSH agent — prefer the one the login shell knows about
    ...(shellEnv.SSH_AUTH_SOCK ? { SSH_AUTH_SOCK: shellEnv.SSH_AUTH_SOCK } : {}),
    // Force colour output in programs that check this
    FORCE_COLOR: '1',
    // Caller-provided overrides come last
    ...extraEnv,
  };
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

// sessionId -> { ptyProcess }
const sessions = new Map();

// ─── Public API ───────────────────────────────────────────────────────────────

async function create(sessionId, cwd, onData, cols, rows) {
  if (!pty) {
    console.error('node-pty not loaded');
    return;
  }

  if (sessions.has(sessionId)) {
    destroy(sessionId);
  }

  // Ensure shell env is captured before spawning
  const shellEnv = await captureShellEnv();

  const shell = process.env.SHELL || '/bin/zsh';
  const shellArgs = [];

  try {
    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: cols || 120,
      rows: rows || 30,
      cwd,
      env: buildEnv(shellEnv, {}),
    });

    ptyProcess.onData(onData);
    ptyProcess.onExit(() => sessions.delete(sessionId));

    sessions.set(sessionId, { ptyProcess });
  } catch (e) {
    console.error('Failed to create PTY session:', e.message);
  }
}

function write(sessionId, data) {
  const s = sessions.get(sessionId);
  if (s) {
    try { s.ptyProcess.write(data); } catch (_) {}
  }
}

function resize(sessionId, cols, rows) {
  const s = sessions.get(sessionId);
  if (s) {
    try { s.ptyProcess.resize(Math.max(cols, 10), Math.max(rows, 5)); } catch (_) {}
  }
}

function destroy(sessionId) {
  const s = sessions.get(sessionId);
  if (s) {
    try { s.ptyProcess.kill(); } catch (_) {}
    sessions.delete(sessionId);
  }
}

function destroyForProject(projectId) {
  for (const [id] of sessions) {
    if (id.startsWith(projectId + '-')) destroy(id);
  }
}

function destroyAll() {
  for (const [id] of sessions) destroy(id);
}

module.exports = {
  create,
  write,
  resize,
  destroy,
  destroyForProject,
  destroyAll,
  getCapturedEnv,
  captureShellEnv,
};
