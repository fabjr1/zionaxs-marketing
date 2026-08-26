// flow.test.js — F18: toda operação de fluxo vira arquivo + commit (A-01).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  setGateOp, recordGap, openCycleOp, closeCycleOp,
  abandonCycleOp, parkCycleOp, resumeParkedOp,
} from '../lib/flow.js';
import { loadState } from '../lib/state.js';
import { loadWorkspace } from '../lib/workspace.js';
import { makeTmpWorkspace } from './helpers.js';

function setup() {
  const root = makeTmpWorkspace({ git: true });
  const ws = loadWorkspace(root);
  return { root, ws };
}

function log(root) {
  return execFileSync('git', ['log', '--oneline'], { cwd: root, encoding: 'utf8' });
}

test('F-01/F18: primeira operação cria o state.md e commita', () => {
  const { root, ws } = setup();
  assert.ok(!fs.existsSync(ws.stateFile));
  const r = setGateOp(ws, 0, true, 'produto/contexto.md');
  assert.ok(fs.existsSync(ws.stateFile), 'esqueleto nasceu na primeira operação');
  assert.equal(r.git.committed, true);
  assert.match(log(root), /fluxo: gate 0 cumprido/);
  assert.equal(loadState(ws.stateFile).gates.find((g) => g.stage === 0).met, true);
});

test('F18: gate sem ponteiro é recusado e NADA é commitado', () => {
  const { root, ws } = setup();
  setGateOp(ws, 0, true, 'ctx.md');
  const before = log(root);
  assert.throws(() => setGateOp(ws, 3, true, ''), /ponteiro/);
  assert.equal(log(root), before, 'operação recusada não suja a trilha');
});

test('F18: ciclo completo — abre, lacuna, estaciona, retoma, fecha; tudo auditável', () => {
  const { root, ws } = setup();
  setGateOp(ws, 0, true, 'ctx.md');
  openCycleOp(ws, 'q1-c1', 'instagram');
  assert.throws(() => openCycleOp(ws, 'q1-c2'), (e) => e.code === 'CYCLE_OPEN');
  recordGap(ws, 3, 'sem preço definido');
  parkCycleOp(ws, 'pausa de agenda');
  assert.equal(loadState(ws.stateFile).cycle, null);
  resumeParkedOp(ws, 'q1-c1');
  assert.equal(loadState(ws.stateFile).cycle, 'q1-c1');
  closeCycleOp(ws, 'peças de audiência não dependem do preço');
  const l = log(root);
  for (const m of ['abre ciclo q1-c1', 'lacuna aceita no estágio 3', 'estaciona ciclo', 'retoma ciclo estacionado q1-c1', 'fecha ciclo com aprendizado']) {
    assert.match(l, new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('F-03: abandonar registra lacuna e commita', () => {
  const { root, ws } = setup();
  setGateOp(ws, 0, true, 'ctx.md');
  openCycleOp(ws, 'q1-c1');
  abandonCycleOp(ws, 'canal descontinuado');
  const s = loadState(ws.stateFile);
  assert.equal(s.cycle, null);
  assert.match(s.acceptedGaps.at(-1), /abandonado · canal descontinuado/);
  assert.match(log(root), /fluxo: abandona ciclo/);
});
