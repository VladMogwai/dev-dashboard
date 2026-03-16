'use strict';

const fs = require('fs');
const path = require('path');

const MAX_HISTORY = 500;

function getHistoryPath(userDataPath, projectId) {
  const dir = path.join(userDataPath, 'history');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${projectId}.json`);
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
  let h = load(userDataPath, projectId).filter(c => c !== command);
  h.push(command);
  if (h.length > MAX_HISTORY) h = h.slice(-MAX_HISTORY);
  save(userDataPath, projectId, h);
}

function deleteCmd(userDataPath, projectId, command) {
  save(userDataPath, projectId, load(userDataPath, projectId).filter(c => c !== command));
}

function clear(userDataPath, projectId) {
  save(userDataPath, projectId, []);
}

module.exports = { load, add, deleteCmd, clear };
