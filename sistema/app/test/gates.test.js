// gates.test.js — a parte pura dos 12 gates, com medições sintéticas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { evaluateGates } from '../lib/gates.js';
import { loadC4, clone, REAL_WS } from './helpers.js';

const brand = JSON.parse(readFileSync(path.join(REAL_WS, 'brand', 'brand.json'), 'utf8'));

/** Medição sintética que passa em tudo para o contrato dado. */
function greenMeasure(contract) {
  const fmt = brand.formats[contract.format];
  return {
    fonts: [{ face: '700 80px Poppins', loaded: true }],
    perSlide: contract.slides.map((s) => ({
      dims: { w: fmt.w, h: fmt.h },
      overflow: { x: 0, y: 0 },
      outOfSafe: [], contrasts: [{ text: 'x', size: 46, weight: 400, ratio: 7, need: 3, pass: true }],
      runts: [], badWrap: [], levels: [64, 46], chromeLevels: [26],
      renderedText: s.approved_visible_copy.join(' '),
    })),
  };
}

const c4 = loadC4();

test('medição verde → 12 gates passam', () => {
  const r = evaluateGates(greenMeasure(c4), c4, brand);
  assert.equal(r.pass, true, r.summary.join(' | '));
  assert.equal(r.gates.length, 12);
});

test('G1: dimensão errada reprova', () => {
  const m = greenMeasure(c4);
  m.perSlide[0].dims = { w: 1080, h: 1349 };
  const r = evaluateGates(m, c4, brand);
  assert.equal(r.gates.find((g) => g.id === 'G1').pass, false);
});

test('G2: face não carregada reprova', () => {
  const m = greenMeasure(c4);
  m.fonts.push({ face: '600 34px Archivo', loaded: false });
  assert.equal(evaluateGates(m, c4, brand).gates.find((g) => g.id === 'G2').pass, false);
});

test('G5: contraste abaixo do piso reprova', () => {
  const m = greenMeasure(c4);
  m.perSlide[2].contrasts.push({ text: 'fraco', size: 26, weight: 400, ratio: 2.1, need: 3, pass: false });
  assert.equal(evaluateGates(m, c4, brand).gates.find((g) => g.id === 'G5').pass, false);
});

test('G9: texto nos pixels fora da copy aprovada reprova', () => {
  const m = greenMeasure(c4);
  m.perSlide[0].renderedText += ' contrabando';
  const g = evaluateGates(m, c4, brand).gates.find((x) => x.id === 'G9');
  assert.equal(g.pass, false);
  assert.match(JSON.stringify(g.failures), /contrabando/);
});

test('G10: copy aprovada ausente dos pixels reprova', () => {
  const m = greenMeasure(c4);
  m.perSlide[7].renderedText = m.perSlide[7].renderedText.replace('Se não couberem, o pacote ainda não existe.', '');
  assert.equal(evaluateGates(m, c4, brand).gates.find((g) => g.id === 'G10').pass, false);
});

test('G11: rótulo interno nos pixels reprova; allowlist libera', () => {
  const m = greenMeasure(c4);
  m.perSlide[2].renderedText += ' virada';
  assert.equal(evaluateGates(m, c4, brand).gates.find((g) => g.id === 'G11').pass, false);

  // "fechamento" aparece no slide 6 e está allowlisted lá → passa
  const r2 = evaluateGates(greenMeasure(c4), c4, brand);
  assert.equal(r2.gates.find((g) => g.id === 'G11').pass, true);
});

test('G11: allowlist é por slide, não global', () => {
  const c = clone(c4);
  const m = greenMeasure(c);
  // injeta "fechamento" nos pixels do slide 2 (allowlist cobre só o 6)
  m.perSlide[1].renderedText += ' fechamento';
  assert.equal(evaluateGates(m, c, brand).gates.find((g) => g.id === 'G11').pass, false);
});

test('G12: alt fora do template reprova', () => {
  const c = clone(c4);
  c.slides[4].alt = 'Slide errado de 8. Uma descrição suficientemente longa para passar no tamanho.';
  assert.equal(evaluateGates(greenMeasure(c), c, brand).gates.find((g) => g.id === 'G12').pass, false);
});
