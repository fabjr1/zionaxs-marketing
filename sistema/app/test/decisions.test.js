// decisions.test.js — C-05/C-06/C-07: aprovação com digest, reprovação
// estruturada, escalação, e auditoria por commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { approve, reject, escalate } from '../lib/decisions.js';
import { registerPermalink } from '../lib/exporter.js';
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

test('reprovar DEPOIS de aprovar prevalece — status volta a reprovada', () => {
  const { ws, piece } = setup();
  approve(ws, piece(), {});
  assert.equal(piece().status, STATUS.APPROVED);
  reject(ws, piece(), { gate: 'G6', expected: 'sem runt', actual: 'runt no slide 3', correction: 'quebra autoral no contrato' });
  assert.equal(piece().status, STATUS.REJECTED, 'a decisão mais recente vence');
});

test('REJECT_TOO_LATE: peça publicada não aceita reprovação', () => {
  const { ws, piece } = setup();
  const p = piece();
  fs.mkdirSync(path.join(p.dir, 'publication'), { recursive: true });
  fs.writeFileSync(path.join(p.dir, 'publication', 'published.json'),
    JSON.stringify({ permalink: 'https://www.instagram.com/p/x/', registeredAt: '2026-08-26T00:00:00Z' }));
  assert.throws(
    () => reject(ws, piece(), { gate: 'G6', expected: 'x', actual: 'y', correction: 'z' }),
    (e) => e.code === 'REJECT_TOO_LATE');
});

test('P7: registrar permalink sem aprovação vigente é recusado', () => {
  const { ws, piece } = setup();
  const p = piece();
  assert.equal(p.status, STATUS.REVIEW);
  assert.throws(
    () => registerPermalink(ws, p, 'https://www.instagram.com/p/abc123/'),
    (e) => e.code === 'PERMALINK_REFUSED');
  // aprovada, o registro passa a valer
  approve(ws, piece(), {});
  const r = registerPermalink(ws, piece(), 'https://www.instagram.com/p/abc123/');
  assert.ok(fs.existsSync(r.file));
  assert.equal(piece().status, STATUS.PUBLISHED);
});

test('dois rejects no mesmo minuto não colidem em arquivo', () => {
  const { ws, piece } = setup();
  const a = reject(ws, piece(), { gate: 'G1', expected: 'a', actual: 'b', correction: 'c' });
  const b = reject(ws, piece(), { gate: 'G2', expected: 'a', actual: 'b', correction: 'c' });
  assert.notEqual(a.file, b.file, 'sufixo aleatório evita sobrescrita no mesmo minuto');
});
