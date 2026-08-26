// publisher.test.js — P-04 contra um double HTTP local que implementa o
// contrato de callback do Make (nota 23). O double é infraestrutura de
// teste do protocolo, não mock em código de produto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { publishPiece, reconcileCallback, preflight, publishConfig, routeReady } from '../lib/publisher.js';
import { loadPiece, STATUS } from '../lib/pieces.js';
import { loadWorkspace } from '../lib/workspace.js';
import { approve } from '../lib/decisions.js';
import { makeTmpWorkspace, fabricatePiece } from './helpers.js';

function makeDouble(behavior) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => body += c);
      req.on('end', () => {
        const j = JSON.parse(body);
        const out = behavior(j);
        res.writeHead(out.status || 200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(out.body));
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}/hook` }));
  });
}

function setupApproved() {
  const root = makeTmpWorkspace({ git: true });
  fabricatePiece(root, 'zx-t2');
  const ws = loadWorkspace(root);
  approve(ws, loadPiece(ws, 'zx-t2'), { destination: 'instagram', account: 'zionaxs_' });
  return { root, ws };
}

function env(url) {
  process.env.MOS_WEBHOOK_URL = url;
  process.env.MOS_WEBHOOK_KEY = 'k';
  process.env.MOS_EXPECTED_ACCOUNT = 'zionaxs_';
  process.env.MOS_MEDIA_BASE_URL = 'https://cdn.example/m';
}
function clearEnv() {
  for (const k of ['MOS_WEBHOOK_URL', 'MOS_WEBHOOK_KEY', 'MOS_EXPECTED_ACCOUNT', 'MOS_MEDIA_BASE_URL']) delete process.env[k];
}

test('rota não configurada falha explícito, nunca silencioso', async () => {
  clearEnv();
  const { ws } = setupApproved();
  const p = loadPiece(ws, 'zx-t2');
  const ready = routeReady(publishConfig(ws));
  assert.equal(ready.ready, false);
  assert.ok(ready.missing.includes('MOS_WEBHOOK_URL'));
  await assert.rejects(() => publishPiece(ws, p), /não configurada/);
});

test('preflight exige dry_run + publish:false + requestId ecoado', async () => {
  const { url, srv } = await makeDouble((j) => ({ body: { status: 'dry_run', publish: false, requestId: j.requestId } }));
  env(url);
  const ok = await preflight(publishConfig({ root: '/tmp' }));
  assert.equal(ok.ok, true);
  srv.close();

  const bad = await makeDouble((j) => ({ body: { status: 'ok', publish: false, requestId: j.requestId } }));
  env(bad.url);
  const no = await preflight(publishConfig({ root: '/tmp' }));
  assert.equal(no.ok, false);
  bad.srv.close();
  clearEnv();
});

test('callback confirmando conta + postId + permalink → publicada', async () => {
  const { ws } = setupApproved();
  const { url, srv } = await makeDouble((j) => {
    if (j.dry_run) return { body: { status: 'dry_run', publish: false, requestId: j.requestId } };
    return { body: {
      ok: true, status: 'published', requestId: j.requestId,
      accountUsername: 'zionaxs_', postId: '17999', permalink: 'https://www.instagram.com/p/TESTE1/',
      publishedAt: '2026-08-26T10:00:00-03:00',
    } };
  });
  env(url);
  const r = await publishPiece(ws, loadPiece(ws, 'zx-t2'));
  assert.equal(r.outcome.state, 'published');
  const p = loadPiece(ws, 'zx-t2');
  assert.equal(p.status, STATUS.PUBLISHED);
  assert.equal(p.publication.permalink, 'https://www.instagram.com/p/TESTE1/');
  srv.close(); clearEnv();
});

test('conta divergente → bloqueada, sem retry (o incidente zx-16 é irreproduzível)', async () => {
  const { ws } = setupApproved();
  const { url, srv } = await makeDouble((j) => {
    if (j.dry_run) return { body: { status: 'dry_run', publish: false, requestId: j.requestId } };
    return { body: {
      ok: true, status: 'published', requestId: j.requestId,
      accountUsername: 'base3br', postId: '1', permalink: 'https://www.instagram.com/p/X/',
    } };
  });
  env(url);
  const r = await publishPiece(ws, loadPiece(ws, 'zx-t2'));
  assert.equal(r.outcome.state, 'blocked');
  assert.match(r.outcome.reason, /conta divergente.*base3br/);
  assert.equal(loadPiece(ws, 'zx-t2').status, STATUS.BLOCKED);
  srv.close(); clearEnv();
});

test('HTTP 200 sem confirmação completa permanece "enviada" — o incidente zx-11 é irreproduzível', async () => {
  const { ws } = setupApproved();
  const { url, srv } = await makeDouble((j) => {
    if (j.dry_run) return { body: { status: 'dry_run', publish: false, requestId: j.requestId } };
    return { body: { accepted: true } }; // 200 genérico, fora do contrato
  });
  env(url);
  const r = await publishPiece(ws, loadPiece(ws, 'zx-t2'));
  assert.equal(r.outcome.state, 'sent');
  assert.equal(loadPiece(ws, 'zx-t2').status, STATUS.SENT, 'nunca "publicada" sem permalink');
  srv.close(); clearEnv();
});

test('publicar exige aprovação com digest válido', async () => {
  const root = makeTmpWorkspace({ git: true });
  fabricatePiece(root, 'zx-t3');
  const ws = loadWorkspace(root);
  await assert.rejects(() => publishPiece(ws, loadPiece(ws, 'zx-t3')), /exige peça aprovada/);
});

test('reconciliação pura: requestId trocado bloqueia', () => {
  const cfg = { expectedAccount: 'zionaxs_' };
  const out = reconcileCallback(cfg, 'req-a', { json: { ok: true, status: 'published', requestId: 'req-b', accountUsername: 'zionaxs_', postId: '1', permalink: 'x' } });
  assert.equal(out.state, 'blocked');
  assert.match(out.reason, /requestId divergente/);
});
