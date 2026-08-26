// contract.test.js — validação do Piece Contract (G-07).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { validateContract } from '../lib/contract.js';
import { getTemplate } from '../lib/templates/index.js';
import { loadC4, clone, REAL_WS } from './helpers.js';

const brand = JSON.parse(readFileSync(path.join(REAL_WS, 'brand', 'brand.json'), 'utf8'));
const tpl = getTemplate('carousel-4x5');

test('o contrato real da C4 é válido', () => {
  const v = validateContract(loadC4(), brand, tpl);
  assert.deepEqual(v.errors, []);
  assert.equal(v.ok, true);
});

test('campo obrigatório ausente reprova', () => {
  const c = clone(loadC4());
  delete c.tese;
  const v = validateContract(c, brand, tpl);
  assert.equal(v.ok, false);
  assert.match(v.errors[0].msg, /tese/);
});

test('evidência E sem fonte reprova — proibição dura', () => {
  const c = clone(loadC4());
  c.research_brief.evidencia[0].fonte = null;
  const v = validateContract(c, brand, tpl);
  assert.ok(v.errors.some((e) => /E sem fonte/.test(e.msg)));
});

test('alt ausente ou sem posição reprova (G12 antecipado)', () => {
  const c = clone(loadC4());
  c.slides[2].alt = 'curto';
  const v = validateContract(c, brand, tpl);
  assert.ok(v.errors.some((e) => e.where === 'slide 3' && /alt/.test(e.msg)));

  const c2 = clone(loadC4());
  c2.slides[0].alt = 'Uma descrição longa o bastante mas sem a posição obrigatória no começo do texto.';
  const v2 = validateContract(c2, brand, tpl);
  assert.ok(v2.errors.some((e) => /Slide 1 de 8/.test(e.msg)));
});

test('copy de slot fora da approved_visible_copy reprova', () => {
  const c = clone(loadC4());
  c.slides[0].copy.sub = 'Frase que ninguém aprovou.';
  const v = validateContract(c, brand, tpl);
  assert.ok(v.errors.some((e) => /não aprovada/.test(e.msg)));
});

test('copy aprovada sem lugar no layout reprova (G10 antecipado)', () => {
  const c = clone(loadC4());
  c.slides[0].approved_visible_copy.push('Aprovada mas órfã de slot.');
  const v = validateContract(c, brand, tpl);
  assert.ok(v.errors.some((e) => /sem lugar no layout/.test(e.msg)));
});

test('rótulo interno na copy aprovada exige allowlist (G11 antecipado)', () => {
  const c = clone(loadC4());
  // "fechamento" está allowlisted só no slide 6; no slide 3 deve reprovar
  c.slides[2].copy.closing = 'O fechamento não descreve o mês.';
  c.slides[2].approved_visible_copy.push('O fechamento não descreve o mês.');
  const v = validateContract(c, brand, tpl);
  assert.ok(v.errors.some((e) => e.where === 'slide 3' && /fechamento/.test(e.msg)));
});

test('valores de controle (state/dark/big) não contam como copy', () => {
  const v = validateContract(loadC4(), brand, tpl);
  assert.ok(!v.errors.some((e) => /"on"|"off"/.test(e.msg)));
});

test('paginação e wordmark precisam estar aprovadas — são pixels', () => {
  const c = clone(loadC4());
  c.slides[4].approved_visible_copy = c.slides[4].approved_visible_copy.filter((x) => x !== '05/08');
  const v = validateContract(c, brand, tpl);
  assert.ok(v.errors.some((e) => /05\/08/.test(e.msg)));
});

test('layout desconhecido reprova', () => {
  const c = clone(loadC4());
  c.slides[1].layout = 'inexistente';
  const v = validateContract(c, brand, tpl);
  assert.ok(v.errors.some((e) => /layout desconhecido/.test(e.msg)));
});
