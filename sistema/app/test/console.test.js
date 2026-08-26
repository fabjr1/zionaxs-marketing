// console.test.js — smoke do servidor: fila, tela de peça, decisões via POST,
// auth por token, e path-safety dos assets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../console/server.js';
import { makeTmpWorkspace, fabricatePiece } from './helpers.js';
import fs from 'node:fs';
import path from 'node:path';

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

async function boot({ token = null } = {}) {
  const root = makeTmpWorkspace({ git: true });
  fabricatePiece(root, 'zx-c1');
  fs.writeFileSync(path.join(root, 'state.md'), [
    '# Marketing OS — Teste', '', 'stage: 5', 'cycle: t-c1', 'open_since: 2026-08-26', 'channel: instagram-carousel', '',
    '## Gates met', '- [x] 0 foundation   → ctx.md', '- [ ] 5 production', '',
    '## Accepted gaps', '', '## Open decisions', '', '## Last learning', '',
  ].join('\n'));
  if (token) process.env.MOS_TOKEN = token; else delete process.env.MOS_TOKEN;
  const { server } = createServer({ root, token });
  const base = await listen(server);
  return { root, server, base };
}

test('fila lista a peça com estado derivado e o ciclo', async () => {
  const { server, base } = await boot();
  const html = await (await fetch(base + '/')).text();
  assert.match(html, /zx-c1/);
  assert.match(html, /em revisão/);
  assert.match(html, /t-c1/);
  server.close();
});

test('tela da peça: gates, evidência, diff e formulários de decisão', async () => {
  const { server, base } = await boot();
  const html = await (await fetch(base + '/piece/zx-c1')).text();
  assert.match(html, /Gates/);
  assert.match(html, /Copy aprovada × renderizada/);
  assert.match(html, /Evidência/);
  assert.match(html, /Aprovar — emite Publication Contract/);
  assert.match(html, /Reprovar \(motivo estruturado/);
  assert.match(html, /Escalar/);
  server.close();
});

test('POST reprovar sem campos vira flash de erro, não 500', async () => {
  const { server, base } = await boot();
  const res = await fetch(base + '/piece/zx-c1/reject', {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'gate=G6&expected=x&actual=y&correction=',
  });
  assert.equal(res.status, 303);
  assert.match(res.headers.get('location'), /k=err/);
  server.close();
});

test('POST aprovar → contrato emitido e status muda na fila', async () => {
  const { server, base } = await boot();
  const res = await fetch(base + '/piece/zx-c1/approve', { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: '' });
  assert.equal(res.status, 303);
  const html = await (await fetch(base + '/piece/zx-c1')).text();
  assert.match(html, /aprovada/);
  assert.match(html, /Baixar pacote de exportação/);
  server.close();
});

test('token: sem ele 403, com ele 200 (N-06)', async () => {
  const { server, base } = await boot({ token: 'segredo' });
  assert.equal((await fetch(base + '/')).status, 403);
  assert.equal((await fetch(base + '/?t=segredo')).status, 200);
  delete process.env.MOS_TOKEN;
  server.close();
});

test('asset com traversal é bloqueado', async () => {
  const { server, base } = await boot();
  const res = await fetch(base + '/asset/zx-c1/..%2f..%2f..%2fconfig.json');
  assert.notEqual(res.status, 200);
  server.close();
});

test('biblioteca e fluxo respondem', async () => {
  const { server, base } = await boot();
  assert.equal((await fetch(base + '/library')).status, 200);
  const st = await (await fetch(base + '/state')).text();
  assert.match(st, /Gates do fluxo/);
  assert.match(st, /sem ponteiro não é gate/);
  server.close();
});
