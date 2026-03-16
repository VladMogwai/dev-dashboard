'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Subdirectories where env files are commonly stored
const ENV_DIRS = ['', 'env', 'envs', 'config', '.config', 'environments', 'configs'];

// A file is treated as an env file if its name starts with '.env' or ends with '.env'
function isEnvFile(name) {
  return name.startsWith('.env') || name.endsWith('.env');
}

const SECRET_RE = /key|secret|token|password|pwd|auth|credential/i;

/**
 * Collect all env file paths under projectPath by:
 * 1. Scanning root and known subdirectories for .env* files
 * 2. Using a single explicitly-configured envFilePath (highest priority)
 */
function collectEnvFiles(projectPath) {
  const found = []; // { absPath, relLabel }

  for (const dir of ENV_DIRS) {
    const dirAbs = dir ? path.join(projectPath, dir) : projectPath;
    if (!fs.existsSync(dirAbs)) continue;
    let entries;
    try { entries = fs.readdirSync(dirAbs); } catch { continue; }
    for (const entry of entries) {
      if (!isEnvFile(entry)) continue;
      const abs = path.join(dirAbs, entry);
      try {
        if (!fs.statSync(abs).isFile()) continue;
      } catch { continue; }
      const label = dir ? `${dir}/${entry}` : entry;
      found.push({ absPath: abs, label });
    }
  }

  return found;
}

function loadEnv(projectPath, envFilePath) {
  const result = {};

  // Explicitly configured env file takes priority
  if (envFilePath) {
    const abs = path.isAbsolute(envFilePath) ? envFilePath : path.join(projectPath, envFilePath);
    if (fs.existsSync(abs)) {
      try {
        const parsed = dotenv.parse(fs.readFileSync(abs));
        for (const [k, v] of Object.entries(parsed)) {
          result[k] = { value: v, source: path.basename(abs), isSecret: SECRET_RE.test(k) };
        }
      } catch {}
    }
  }

  // Scan known dirs for any .env* files
  const envFiles = collectEnvFiles(projectPath);
  for (const { absPath, label } of envFiles) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(absPath));
      for (const [k, v] of Object.entries(parsed)) {
        if (!result[k]) result[k] = { value: v, source: label, isSecret: SECRET_RE.test(k) };
      }
    } catch {}
  }

  return result;
}

module.exports = { loadEnv };
