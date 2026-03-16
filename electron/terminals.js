'use strict';

const { execSync, exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');

const execAsync = promisify(exec);

// All known terminal apps, in preference order
const KNOWN_TERMINALS = [
  {
    id: 'warp',
    name: 'Warp',
    appPath: '/Applications/Warp.app',
    cli: null,
  },
  {
    id: 'iterm2',
    name: 'iTerm2',
    appPath: '/Applications/iTerm.app',
    cli: null,
  },
  {
    id: 'ghostty',
    name: 'Ghostty',
    appPath: '/Applications/Ghostty.app',
    cli: null,
  },
  {
    id: 'wezterm',
    name: 'WezTerm',
    appPath: '/Applications/WezTerm.app',
    cli: 'wezterm',
  },
  {
    id: 'alacritty',
    name: 'Alacritty',
    appPath: '/Applications/Alacritty.app',
    cli: null,
  },
  {
    id: 'hyper',
    name: 'Hyper',
    appPath: '/Applications/Hyper.app',
    cli: null,
  },
  {
    id: 'kitty',
    name: 'kitty',
    appPath: '/Applications/kitty.app',
    cli: 'kitty',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    appPath: '/System/Applications/Utilities/Terminal.app',
    cli: null,
  },
];

function checkApp(appPath) {
  return fs.existsSync(appPath);
}

function checkCli(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

function getInstalled() {
  return KNOWN_TERMINALS.filter((t) => {
    if (t.appPath && checkApp(t.appPath)) return true;
    if (t.cli && checkCli(t.cli)) return true;
    return false;
  }).map(({ id, name }) => ({ id, name }));
}

async function openInTerminal(terminalId, projectPath) {
  const escaped = projectPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const terminal = KNOWN_TERMINALS.find((t) => t.id === terminalId);
  if (!terminal) throw new Error(`Unknown terminal: ${terminalId}`);

  switch (terminalId) {
    case 'warp':
      // Warp opens the given directory in a new window
      await execAsync(`open -a Warp "${escaped}"`);
      break;

    case 'iterm2': {
      const script = `
tell application "iTerm2"
  activate
  tell current window
    create tab with default profile
    tell current session
      write text "cd \\"${escaped}\\""
    end tell
  end tell
end tell`;
      await execAsync(`osascript << 'APPLESCRIPT'\n${script}\nAPPLESCRIPT`).catch(async () => {
        // fallback: just open iTerm with path
        await execAsync(`open -a iTerm "${escaped}"`);
      });
      break;
    }

    case 'ghostty':
      await execAsync(`open -a Ghostty "${escaped}"`);
      break;

    case 'wezterm':
      await execAsync(`wezterm start --cwd "${escaped}"`);
      break;

    case 'alacritty':
      await execAsync(`open -a Alacritty --args --working-directory "${escaped}"`).catch(async () => {
        await execAsync(`open -a Alacritty "${escaped}"`);
      });
      break;

    case 'hyper':
      await execAsync(`open -a Hyper "${escaped}"`);
      break;

    case 'kitty':
      await execAsync(`kitty --directory "${escaped}"`).catch(async () => {
        await execAsync(`open -a kitty "${escaped}"`);
      });
      break;

    case 'terminal':
    default: {
      const script2 = `tell app "Terminal" to do script "cd \\"${escaped}\\""`;
      await execAsync(`osascript -e '${script2.replace(/'/g, "'\\''")}'`);
      break;
    }
  }
}

module.exports = { getInstalled, openInTerminal };
