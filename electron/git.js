'use strict';

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// When Electron launches it can have a stripped PATH — add all common locations
const GIT_ENV = {
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

async function run(cmd, cwd) {
  const { stdout } = await execAsync(cmd, {
    cwd,
    env: GIT_ENV,
    timeout: 5000,
  });
  return stdout.trim();
}

async function getInfo(projectPath) {
  // 1. Confirm it's inside a git repo
  try {
    await run('git rev-parse --git-dir', projectPath);
  } catch {
    return { branch: null, lastCommit: null, isRepo: false };
  }

  // 2. Get branch — symbolic-ref is what git uses internally (same as GitHub Desktop)
  let branch = null;
  try {
    branch = await run('git symbolic-ref --short HEAD', projectPath);
  } catch {
    // Detached HEAD → show short commit hash instead
    try {
      branch = await run('git rev-parse --short HEAD', projectPath);
    } catch {
      branch = null;
    }
  }

  // 3. Get last commit
  let lastCommit = null;
  try {
    // %x00 as separator to handle messages with | in them
    const raw = await run('git log -1 --format=%H%x00%s%x00%an%x00%ar', projectPath);
    const [hash, message, author, date] = raw.split('\x00');
    lastCommit = {
      hash: hash ? hash.slice(0, 7) : '',
      message: message || '',
      author: author || '',
      date: date || '',
    };
  } catch {
    // non-fatal
  }

  return { branch, lastCommit, isRepo: true };
}

module.exports = { getInfo };
