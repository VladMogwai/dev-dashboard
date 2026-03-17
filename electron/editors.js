'use strict';

const { execSync, exec, execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const FULL_ENV = {
  ...process.env,
  PATH: [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    process.env.PATH || '',
  ].join(':'),
};

function checkCli(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore', timeout: 3000, env: FULL_ENV });
    return true;
  } catch {
    return false;
  }
}

function checkApp(appPath) {
  return fs.existsSync(appPath);
}

const EDITORS = [
  { id: 'vscode', name: 'VS Code', paths: [
    '/Applications/Visual Studio Code.app',
    `${os.homedir()}/Applications/Visual Studio Code.app`,
  ]},
  { id: 'cursor', name: 'Cursor', paths: [
    '/Applications/Cursor.app',
    `${os.homedir()}/Applications/Cursor.app`,
  ]},
  { id: 'windsurf', name: 'Windsurf', paths: [
    '/Applications/Windsurf.app',
    `${os.homedir()}/Applications/Windsurf.app`,
  ]},
  { id: 'zed', name: 'Zed', paths: [
    '/Applications/Zed.app',
    `${os.homedir()}/Applications/Zed.app`,
  ]},
  { id: 'webstorm', name: 'WebStorm', paths: [
    '/Applications/WebStorm.app',
    `${os.homedir()}/Applications/WebStorm.app`,
  ]},
  { id: 'sublime', name: 'Sublime Text', paths: [
    '/Applications/Sublime Text.app',
    `${os.homedir()}/Applications/Sublime Text.app`,
  ]},
];

function getInstalled() {
  return EDITORS
    .filter((e) => e.paths.some((p) => fs.existsSync(p)))
    .map((e) => ({ id: e.id, name: e.name }));
}

const EDITOR_APP_NAMES = {
  vscode: 'Visual Studio Code',
  cursor: 'Cursor',
  zed: 'Zed',
  webstorm: 'WebStorm',
  windsurf: 'Windsurf',
};

// Bring editor app to front via AppleScript
async function activate(editor) {
  const appName = EDITOR_APP_NAMES[editor];
  if (!appName) return;
  // Use execFileAsync to avoid shell layer (appName is from hardcoded map, but good practice)
  await execFileAsync(
    'osascript', ['-e', `tell application "${appName}" to activate`],
    { env: FULL_ENV, timeout: 3000 }
  ).catch(() => {});
}

async function open(editor, projectPath) {
  // Use execFileAsync for all editor launches to avoid shell injection via projectPath

  switch (editor) {
    case 'vscode':
      if (checkCli('code')) {
        await execFileAsync('code', ['-r', projectPath], { env: FULL_ENV });
      } else {
        await execFileAsync('open', ['-a', 'Visual Studio Code', projectPath], { env: FULL_ENV });
      }
      break;
    case 'cursor':
      if (checkCli('cursor')) {
        await execFileAsync('cursor', ['-r', projectPath], { env: FULL_ENV });
      } else {
        await execFileAsync('open', ['-a', 'Cursor', projectPath], { env: FULL_ENV });
      }
      break;
    case 'zed':
      if (checkCli('zed')) {
        await execFileAsync('zed', [projectPath], { env: FULL_ENV });
      } else {
        await execFileAsync('open', ['-a', 'Zed', projectPath], { env: FULL_ENV });
      }
      break;
    case 'webstorm':
      await execFileAsync('open', ['-a', 'WebStorm', projectPath], { env: FULL_ENV });
      break;
    case 'windsurf':
      if (checkCli('windsurf')) {
        await execFileAsync('windsurf', [projectPath], { env: FULL_ENV });
      } else {
        await execFileAsync('open', ['-a', 'Windsurf', projectPath], { env: FULL_ENV });
      }
      break;
    case 'sublime':
      await execFileAsync('open', ['-a', 'Sublime Text', projectPath], { env: FULL_ENV });
      break;
    default:
      throw new Error(`Unknown editor: ${editor}`);
  }

  // Always bring the editor window to the front
  await activate(editor);
}

// ─── Claude / terminal helpers ────────────────────────────────────────────────

// Scan a directory for a binary — returns the full path if found, null otherwise
function findInDir(dir, bin) {
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const p = path.join(dir, entry, 'bin', bin);
      if (fs.existsSync(p)) return p;
    }
  } catch {}
  return null;
}

async function checkClaude() {
  const home = os.homedir();

  // 1. Try the captured login-shell env PATH first (picks up nvm/fnm active version)
  try {
    const ptyManager = require('./pty');
    const shellEnv = ptyManager.getCapturedEnv();
    if (shellEnv && shellEnv.PATH) {
      for (const dir of shellEnv.PATH.split(':')) {
        if (fs.existsSync(path.join(dir, 'claude'))) return true;
      }
    }
  } catch {}

  // 2. which with extended PATH
  if (checkCli('claude')) return true;

  // 3. Well-known absolute paths
  const knownPaths = [
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${home}/.npm-global/bin/claude`,
    `${home}/.local/bin/claude`,
  ];
  for (const p of knownPaths) {
    if (fs.existsSync(p)) return true;
  }

  // 4. Scan nvm versions
  const nvmFound = findInDir(path.join(home, '.nvm', 'versions', 'node'), 'claude');
  if (nvmFound) return true;

  // 5. Scan fnm versions
  const fnmDirs = [
    path.join(home, '.local', 'share', 'fnm', 'node-versions'),
    path.join(home, '.fnm', 'node-versions'),
  ];
  for (const dir of fnmDirs) {
    const found = findInDir(dir, 'claude');
    if (found) return true;
  }

  // 6. npm global root
  try {
    const { stdout } = await execAsync('npm root -g', { env: FULL_ENV, timeout: 4000 });
    const resolved = path.resolve(stdout.trim(), '..', 'bin', 'claude');
    if (fs.existsSync(resolved)) return true;
  } catch {}

  return false;
}

async function openClaudeExternal(projectPath) {
  // Escape path for AppleScript string literals
  const appleEscaped = projectPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const claudeAvailable = await checkClaude();

  // Detect preferred terminal: Warp > iTerm2 > Terminal.app
  if (checkApp('/Applications/Warp.app')) {
    // Build the shell command to keystroke; quoted form of handles spaces/special chars
    const appleCmd = claudeAvailable
      ? `"cd " & quoted form of "${appleEscaped}" & " && claude"`
      : `"cd " & quoted form of "${appleEscaped}"`;
    const script = `
      tell application "Warp"
        activate
      end tell
      delay 0.5
      tell application "System Events"
        tell process "Warp"
          keystroke "t" using command down
        end tell
      end tell
      delay 0.3
      tell application "System Events"
        tell process "Warp"
          keystroke ${appleCmd}
          key code 36
        end tell
      end tell
    `;
    // Use execFileAsync to avoid shell layer
    await execFileAsync('osascript', ['-e', script], { env: FULL_ENV }).catch(() => {
      execFileAsync('open', ['-a', 'Warp'], { env: FULL_ENV });
    });
    return;
  }

  if (checkApp('/Applications/iTerm.app')) {
    const appleCmd = claudeAvailable
      ? `"cd " & quoted form of "${appleEscaped}" & " && claude"`
      : `"cd " & quoted form of "${appleEscaped}"`;
    const script = `tell application "iTerm2"
  activate
  tell current window
    create tab with default profile
    tell current session
      write text ${appleCmd}
    end tell
  end tell
end tell`;
    await execFileAsync('osascript', ['-e', script], { env: FULL_ENV });
    return;
  }

  // Terminal.app fallback
  const appleCmd = claudeAvailable
    ? `"cd " & quoted form of "${appleEscaped}" & " && claude"`
    : `"cd " & quoted form of "${appleEscaped}"`;
  const script = `tell app "Terminal" to do script ${appleCmd}`;
  await execFileAsync('osascript', ['-e', script], { env: FULL_ENV });
}

module.exports = { getInstalled, open, checkClaude, openClaudeExternal };
