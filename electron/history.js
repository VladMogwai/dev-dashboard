'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_HISTORY = 500;

function getHistoryDir(userDataPath) {
  const dir = path.join(userDataPath, 'history');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getHistoryPath(userDataPath, projectId) {
  return path.join(getHistoryDir(userDataPath), `${projectId}.json`);
}

function getLimitPath(userDataPath) {
  return path.join(userDataPath, 'history-settings.json');
}

function getLimit(userDataPath) {
  try {
    const data = JSON.parse(fs.readFileSync(getLimitPath(userDataPath), 'utf8'));
    return data.maxEntries ?? DEFAULT_MAX_HISTORY;
  } catch {
    return DEFAULT_MAX_HISTORY;
  }
}

function setLimit(userDataPath, maxEntries) {
  try {
    fs.writeFileSync(getLimitPath(userDataPath), JSON.stringify({ maxEntries }), 'utf8');
  } catch {}
}

function load(userDataPath, projectId) {
  try {
    const p = getHistoryPath(userDataPath, projectId);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return [];
}

function save(userDataPath, projectId, history) {
  try {
    fs.writeFileSync(getHistoryPath(userDataPath, projectId), JSON.stringify(history), 'utf8');
  } catch {}
}

function add(userDataPath, projectId, command) {
  const limit = getLimit(userDataPath);
  let h = load(userDataPath, projectId).filter(c => c !== command);
  h.push(command);
  if (limit > 0 && h.length > limit) h = h.slice(-limit);
  save(userDataPath, projectId, h);
}

function deleteCmd(userDataPath, projectId, command) {
  save(userDataPath, projectId, load(userDataPath, projectId).filter(c => c !== command));
}

function clear(userDataPath, projectId) {
  save(userDataPath, projectId, []);
}

function clearAll(userDataPath) {
  try {
    const dir = getHistoryDir(userDataPath);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const f of files) {
      fs.writeFileSync(path.join(dir, f), '[]', 'utf8');
    }
  } catch {}
}

function getStats(userDataPath) {
  try {
    const dir = getHistoryDir(userDataPath);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    let totalEntries = 0;
    for (const f of files) {
      try {
        const entries = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        if (Array.isArray(entries)) totalEntries += entries.length;
      } catch {}
    }
    return { totalEntries, projectCount: files.length };
  } catch {
    return { totalEntries: 0, projectCount: 0 };
  }
}

module.exports = { load, add, deleteCmd, clear, clearAll, getStats, getLimit, setLimit };
