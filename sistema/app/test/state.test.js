// state.test.js — F-01..F-06: parse/serialize, gates com ponteiro,
// um-ciclo, aprendizado obrigatório, roteamento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  parseState, serializeState, setGate, acceptGap, openCycle, closeCycle, route,
} from '../lib/state.js';
import { REAL_WS } from './helpers.js';

const realText = fs.readFileSync(path.join(REAL_WS, 'state.md'), 'utf8');

test('parse do state.md real do workspace', () => {
  const s = parseState(realText);
  assert.equal(s.brand, 'Zionaxs');
  assert.equal(s.stage, 5);
  assert.equal(s.cycle, '2026-Q3-c1');
  assert.equal(s.gates.length, 9);
  assert.equal(s.gates.find((g) => g.stage === 2).met, true);
  assert.match(s.gates.find((g) => g.stage === 2).pointer, /capacidade-antes-de-oferta/);
  assert.equal(s.gates.find((g) => g.stage === 3).met, false);
  assert.ok(s.openDecisions.length >= 2);
});

test('roundtrip parse → serialize → parse preserva o conteúdo', () => {
  const a = parseState(realText);
  const b = parseState(serializeState(a));
  assert.deepEqual(b, a);
});

test('F-04: gate não marca sem ponteiro', () => {
  const s = parseState(realText);
  assert.throws(() => setGate(s, 6, true, ''), /ponteiro/);
  setGate(s, 6, true, 'pieces/zx-20/out/render-report.json');
  assert.equal(s.gates.find((g) => g.stage === 6).met, true);
});

test('F-05: lacuna aceita exige motivo', () => {
  const s = parseState(realText);
  assert.throws(() => acceptGap(s, 3, '   '), /motivo/);
  acceptGap(s, 3, 'teste de lacuna');
  assert.match(s.acceptedGaps.at(-1), /stage 3 · teste de lacuna/);
});

test('F-03: segundo ciclo aberto é recusado', () => {
  const s = parseState(realText);
  assert.throws(() => openCycle(s, '2026-Q3-c2'), /já existe ciclo aberto/);
});

test('F-06: fechar ciclo exige aprendizado e reseta gates 4–8', () => {
  const s = parseState(realText);
  assert.throws(() => closeCycle(s, ''), /aprendizado/);
  closeCycle(s, 'hooks de processo > hooks de ferramenta, leitura direcional');
  assert.equal(s.cycle, null);
  assert.equal(s.gates.find((g) => g.stage === 4).met, false, 'gate 4 resetou');
  assert.equal(s.gates.find((g) => g.stage === 2).met, true, 'gate 2 persiste');
  assert.match(s.lastLearning, /direcional/);
});

test('roteamento: sem estado → estágio 0; ciclo aberto → retomar', () => {
  assert.equal(route(null).stage, 0);
  const s = parseState(realText);
  const r = route(s);
  assert.equal(r.action, 'resume');
  assert.equal(r.stage, 3, 'primeiro gate não cumprido é o 3 (oferta sem preço)');
});
