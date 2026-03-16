'use strict';

const CLIENT_KEYWORDS = ['next', 'vite', 'react-scripts', 'vue-cli-service', 'ng serve', 'webpack-dev-server', 'parcel', 'nuxt', 'gatsby', 'svelte-kit'];
const SERVER_KEYWORDS = ['nodemon', 'ts-node', 'nest', 'deno', 'bun ', 'fastify', 'express', 'koa', 'hapi'];

function parsePort(cmd) {
  if (!cmd) return null;
  // --port 4009 or --port=4009
  const m1 = cmd.match(/--port[= ](\d{2,5})/);
  if (m1) return parseInt(m1[1]);
  // -p 4009
  const m2 = cmd.match(/(?:^|\s)-p\s+(\d{2,5})/);
  if (m2) return parseInt(m2[1]);
  // PORT=3000
  const m3 = cmd.match(/\bPORT=(\d{2,5})/);
  if (m3) return parseInt(m3[1]);
  return null;
}

function detectType(cmd) {
  if (!cmd) return null;
  const lower = cmd.toLowerCase();
  if (CLIENT_KEYWORDS.some(k => lower.includes(k))) return 'client';
  if (SERVER_KEYWORDS.some(k => lower.includes(k))) return 'server';
  // plain "node something.js" → server
  if (/\bnode\s/.test(lower)) return 'server';
  return null;
}

function setPort(cmd, port) {
  if (!cmd) return cmd;
  if (/--port[= ]\d+/.test(cmd)) return cmd.replace(/--port[= ]\d+/, `--port ${port}`);
  if (/(?:^|\s)-p\s+\d+/.test(cmd)) return cmd.replace(/(-p\s+)\d+/, `$1${port}`);
  if (/\bPORT=\d+/.test(cmd)) return cmd.replace(/\bPORT=\d+/, `PORT=${port}`);
  // add port based on detected framework
  const lower = cmd.toLowerCase();
  if (lower.includes('next')) return `${cmd} -p ${port}`;
  if (lower.includes('vite') || lower.includes('webpack')) return `${cmd} --port ${port}`;
  if (lower.includes('react-scripts')) return `PORT=${port} ${cmd}`;
  return `PORT=${port} ${cmd}`;
}

module.exports = { parsePort, detectType, setPort };
