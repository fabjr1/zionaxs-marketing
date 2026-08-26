// decisions.test.js — C-05/C-06/C-07: aprovação com digest, reprovação
// estruturada, escalação, e auditoria por commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { approve, reject, escalate } from '../lib/decisions.js';
import { loadPiece, STATUS, canApprove } from '../lib/pieces.js';
import { loadWorkspace } from '../lib/workspace.js';
import { makeTmpWorkspace, fabricatePiece } from './helpers.js';

function setup({ pass = true } = {}) {
  const root = makeTmpWorkspace({ git: true });
  fabricatePiece(root, 'zx-t1', { pass });
  const ws = loadWorkspace(root);
  return { root, ws, piece: () => loadPiece(ws, 'zx-t1') };
}

test('aprovar exige gates verdes — botão não existe com gate vermelho (C-05)', () => {
  const { ws, piece } = setup({ pass: false });
  const p = piece();
  assert.equal(canApprove(p).ok, false);
  assert.throws(() => approve(ws, p, {}), /aprovação recusada/);
});

test('aprovar emite Publication Contract com digest e commita (C-05, P-03, N-03)', () => {
  const { root, ws, piece } = setup();
  const r = approve(ws, piece(), { destination: 'instagram', account: 'zionaxs_' });
  const yaml = fs.readFileSync(r.file, 'utf8');
  assert.match(yaml, /effect: publish/);
  assert.match(yaml, /approval_source: user/);
  assert.match(yaml, /approval_scope: this_piece/);
  assert.match(yaml, /gates_snapshot: deadbeef/);
  assert.match(yaml, /requires_preflight: true/);
  assert.equal(r.git.committed, true);
  const log = execFileSync('git', ['log', '--oneline'], { cwd: root, encoding: 'utf8' });
  assert.match(log, /aprova zx-t1/);
  assert.equal(piece().status, STATUS.APPROVED);
});

test('regeneração invalida a aprovação — digest divergente vira STALE', () => {
  const { root, ws, piece } = setup();
  approve(ws, piece(), {});
  // simula nova geração: digest muda
  const rep = path.join(root, 'pieces', 'zx-t1', 'out', 'render-report.json');
  const j = JSON.parse(fs.readFileSync(rep, 'utf8'));
  j.digest = 'ff'.repeat(32);
  fs.writeFileSync(rep, JSON.stringify(j));
  const p = piece();
  assert.equal(p.status, STATUS.STALE);
  assert.equal(canApprove(p).ok, true, 'STALE permite nova aprovação do digest novo');
});

test('reprovação exige os 4 campos estruturados (C-06)', () => {
  const { ws, piece } = setup();
  assert.throws(() => reject(ws, piece(), { gate: 'G6', expected: 'x', actual: 'y', correction: '' }), /correction/);
  const r = reject(ws, piece(), {
    gate: 'G6 runt', expected: 'sem fragmento isolado',
    actual: '"folha." sozinho em 17%', correction: 'quebra autoral no closing do slide 4',
  });
  assert.match(fs.readFileSync(r.file, 'utf8'), /decision: reject/);
  assert.equal(piece().status, STATUS.REJECTED, 'reprovada volta ao contrato');
});

test('escalação valida tópico do Agent Contract e exige nota (C-07)', () => {
  const { ws, piece } = setup();
  assert.throws(() => escalate(ws, piece(), { topic: 'qualquer coisa', note: 'x' }), /tópico/);
  assert.throws(() => escalate(ws, piece(), { topic: 'preço', note: '  ' }), /nota/);
  const r = escalate(ws, piece(), { topic: 'preço', note: 'peça cita diagnóstico; preço não definido' });
  assert.match(fs.readFileSync(r.file, 'utf8'), /topic: "?pre/);
});
