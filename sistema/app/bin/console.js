#!/usr/bin/env node
// console.js — sobe o console. Uso: node bin/console.js [--root <ws>] [--port N]
import { start } from '../console/server.js';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}

start({
  root: arg('--root'),
  port: arg('--port') ? Number(arg('--port')) : undefined,
});
