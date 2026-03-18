'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// macOS 1Password SSH agent socket locations
const OP_AGENT_SOCKETS = [
  path.join(os.homedir(), '.1password', 'agent.sock'),
  path.join(
    os.homedir(),
    'Library',
    'Group Containers',
    '2BUA8C4S2C.com.1password',
    't',
    'agent.sock',
  ),
];

// Returns the active 1Password SSH agent socket path, or null if not found
function detectSSHAgentSocket() {
  for (const sock of OP_AGENT_SOCKETS) {
    try {
      fs.accessSync(sock, fs.constants.F_OK);
      return sock;
    } catch {}
  }
  return null;
}

// Cached availability check — result won't change within a session
let _opAvailable = null;

async function isOpAvailable() {
  if (_opAvailable !== null) return _opAvailable;
  try {
    await execFileAsync('op', ['--version'], { timeout: 3000 });
    _opAvailable = true;
  } catch {
    _opAvailable = false;
  }
  return _opAvailable;
}

// Resolve op:// secret references in a flat { key: value } env vars object.
// Returns a new object; unresolvable refs are left as-is (so the process still
// gets something and the user sees an error in the app rather than a silent blank).
async function resolveOpRefs(envVars) {
  const hasRefs = Object.values(envVars).some(
    (v) => typeof v === 'string' && v.startsWith('op://'),
  );
  if (!hasRefs) return envVars;

  const available = await isOpAvailable();
  if (!available) return envVars;

  const resolved = { ...envVars };
  await Promise.all(
    Object.entries(envVars).map(async ([key, value]) => {
      if (typeof value === 'string' && value.startsWith('op://')) {
        try {
          const { stdout } = await execFileAsync('op', ['read', '--no-newline', value], {
            timeout: 10000,
          });
          resolved[key] = stdout;
        } catch {
          // keep original op:// ref on resolution failure
        }
      }
    }),
  );
  return resolved;
}

module.exports = { detectSSHAgentSocket, isOpAvailable, resolveOpRefs };
