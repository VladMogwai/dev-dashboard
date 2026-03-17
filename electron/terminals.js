'use strict';

const { execSync, execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const settings = require('./settings');

const execFileAsync = promisify(execFile);

const FULL_ENV = {
  ...process.env,
  PATH: [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/bin',
    '/bin',
    process.env.PATH || '',
  ].join(':'),
};

// Built-in known terminals
const KNOWN_TERMINALS = [
  { id: 'warp',      name: 'Warp',      appPath: '/Applications/Warp.app' },
  { id: 'iterm2',    name: 'iTerm2',    appPath: '/Applications/iTerm.app' },
  { id: 'ghostty',   name: 'Ghostty',   appPath: '/Applications/Ghostty.app' },
  { id: 'wezterm',   name: 'WezTerm',   appPath: '/Applications/WezTerm.app', cli: 'wezterm' },
  { id: 'alacritty', name: 'Alacritty', appPath: '/Applications/Alacritty.app' },
  { id: 'hyper',     name: 'Hyper',     appPath: '/Applications/Hyper.app' },
  { id: 'kitty',     name: 'kitty',     appPath: '/Applications/kitty.app', cli: 'kitty' },
  { id: 'terminal',  name: 'Terminal',  appPath: '/System/Applications/Utilities/Terminal.app' },
];

function checkApp(p) { return fs.existsSync(p); }
function checkCli(cmd) {
  try { execSync(`which ${cmd}`, { stdio: 'ignore', timeout: 2000, env: FULL_ENV }); return true; }
  catch { return false; }
}

function getInstalled() {
  const autoDetected = KNOWN_TERMINALS
    .filter((t) => (t.appPath && checkApp(t.appPath)) || (t.cli && checkCli(t.cli)))
    .map(({ id, name }) => ({ id, name, isCustom: false }));

  const custom = (settings.get().customTerminals || []).map((t) => ({
    id: t.id,
    name: t.name,
    appPath: t.appPath,
    extraPath: t.extraPath || '',
    isCustom: true,
  }));

  return [...autoDetected, ...custom];
}

async function openInTerminal(terminalId, projectPath) {
  // Escape path for AppleScript string literals: backslash then double-quote
  const appleEscaped = projectPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Check custom terminals first
  const custom = (settings.get().customTerminals || []).find((t) => t.id === terminalId);
  if (custom) {
    // Build env with any extra PATH the user specified
    const extraPath = custom.extraPath ? custom.extraPath.split(':').filter(Boolean) : [];
    const envWithExtra = {
      ...FULL_ENV,
      PATH: [...extraPath, FULL_ENV.PATH].join(':'),
    };

    if (custom.openCommand) {
      // User-provided command template: {path} is replaced (user configured this intentionally)
      const cmd = custom.openCommand.replace(/{path}/g, appleEscaped);
      await execFileAsync('/bin/sh', ['-c', cmd], { env: envWithExtra });
    } else if (custom.appPath) {
      // Use execFileAsync('open') to avoid shell injection via appPath/projectPath
      await execFileAsync('open', ['-a', custom.appPath, projectPath], { env: envWithExtra });
    } else {
      throw new Error(`Custom terminal "${custom.name}" has no appPath or openCommand`);
    }
    return;
  }

  // Built-in terminals
  const env = FULL_ENV;
  switch (terminalId) {
    case 'warp':
      // Use execFile to avoid shell injection via projectPath
      await execFileAsync('open', ['-a', 'Warp', projectPath], { env });
      break;

    case 'iterm2': {
      // Use execFileAsync('osascript') to avoid shell layer; quoted form of handles shell quoting inside do script
      const script = `tell application "iTerm2"
  activate
  tell current window
    create tab with default profile
    tell current session
      write text "cd " & quoted form of "${appleEscaped}"
    end tell
  end tell
end tell`;
      await execFileAsync('osascript', ['-e', script], { env }).catch(async () => {
        await execFileAsync('open', ['-a', 'iTerm', projectPath], { env });
      });
      break;
    }

    case 'ghostty':
      await execFileAsync('open', ['-a', 'Ghostty', projectPath], { env });
      break;

    case 'wezterm':
      await execFileAsync('wezterm', ['start', '--cwd', projectPath], { env }).catch(async () => {
        await execFileAsync('open', ['-a', 'WezTerm', projectPath], { env });
      });
      break;

    case 'alacritty':
      await execFileAsync('open', ['-a', 'Alacritty', projectPath], { env });
      break;

    case 'hyper':
      await execFileAsync('open', ['-a', 'Hyper', projectPath], { env });
      break;

    case 'kitty':
      await execFileAsync('kitty', ['--directory', projectPath], { env }).catch(async () => {
        await execFileAsync('open', ['-a', 'kitty', projectPath], { env });
      });
      break;

    case 'terminal':
    default: {
      // Use execFileAsync to avoid shell layer; quoted form of handles shell quoting inside do script
      const script2 = `tell app "Terminal" to do script "cd " & quoted form of "${appleEscaped}"`;
      await execFileAsync('osascript', ['-e', script2], { env });
      break;
    }
  }
}

module.exports = { getInstalled, openInTerminal };
