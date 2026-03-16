'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let settingsPath = null;
let cache = null;

const DEFAULTS = {
  preferredTerminal: null, // auto-select first available
};

function getPath() {
  if (!settingsPath) {
    settingsPath = path.join(app.getPath('userData'), 'settings.json');
  }
  return settingsPath;
}

function load() {
  try {
    if (fs.existsSync(getPath())) {
      cache = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(getPath(), 'utf8')) };
    } else {
      cache = { ...DEFAULTS };
    }
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

function get() {
  if (!cache) load();
  return cache;
}

function set(updates) {
  cache = { ...get(), ...updates };
  try {
    fs.writeFileSync(getPath(), JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save settings:', e.message);
  }
  return cache;
}

module.exports = { get, set, load };
