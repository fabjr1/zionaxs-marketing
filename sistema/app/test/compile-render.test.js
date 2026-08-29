// compile-render.test.js — o pipeline real: compilação, render offline e
// DETERMINISMO byte a byte (G-05, N-02). Usa Chromium de verdade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { compile, compileToFile } from '../lib/compile.js';
import { renderPiece } from '../lib/render.js';
import { sha256 } from '../lib/util.js';
import { makeTmpWorkspace, loadC4, clone, REAL_WS } from './helpers.js';

const brand = JSON.parse(fs.readFileSync(path.join(REAL_WS, 'brand', 'brand.json'), 'utf8'));
brand.logoSvg = null;

test('compilação é pura: mesmo contrato → mesmo HTML', () => {
  const c = loadC4();
  const a = compile(c, brand).html;
  const b = compile(c, brand).html;
  assert.equal(sha256(a), sha256(b));
  assert.match(a, /DERIVADO de contract.json/);
  // xmlns é identificador de namespace XML, não busca de rede: o navegador
  // nunca o requisita. O grão do estilo pôster vive em um data: URI de SVG,
  // que exige a declaração. A prova dura de N-02 é a interceptação de rotas
  // durante o render, verificada pelo gate NET no teste seguinte.
  const semNamespace = a.replace(/xmlns[^=]*=[^ >]*/g, '');
  assert.doesNotMatch(semNamespace, /https?:\/\//, 'HTML compilado não referencia rede');
});

test('render real: todos os gates verdes, sem rede, bytes idênticos em duas gerações', async (t) => {
  const root = makeTmpWorkspace({ fonts: true });
  const id = 'zx-test-render';
  const dir = path.join(root, 'pieces', id);
  fs.mkdirSync(dir, { recursive: true });
  const contract = clone(loadC4());
  contract.id = id;
  fs.writeFileSync(path.join(dir, 'contract.json'), JSON.stringify(contract, null, 2));

  const compiled = compileToFile(contract, brand, dir);
  const t0 = Date.now();
  const r1 = await renderPiece({ contract, brand, pieceDir: dir, compiledFile: compiled });
  const elapsed = (Date.now() - t0) / 1000;

  assert.equal(r1.pass, true, JSON.stringify(r1.gates.filter((g) => !g.pass)));
  assert.equal(r1.gates.length, 13);
  assert.ok(!r1.gates.some((g) => g.id === 'NET'), 'nenhuma tentativa de rede (N-02)');
  assert.ok(elapsed < 60, `N-04: geração em ${elapsed}s`);

  const hashes1 = r1.slides.map((f) => sha256(fs.readFileSync(path.join(dir, 'out', f))));
  const r2 = await renderPiece({ contract, brand, pieceDir: dir, compiledFile: compiled });
  const hashes2 = r2.slides.map((f) => sha256(fs.readFileSync(path.join(dir, 'out', f))));
  assert.deepEqual(hashes2, hashes1, 'G-05: mesmo contrato → mesmos bytes');
  assert.equal(r2.digest, r1.digest, 'digest estável entre gerações idênticas');

  t.diagnostic(`render em ${elapsed}s, digest ${r1.digest.slice(0, 12)}`);
  fs.rmSync(root, { recursive: true, force: true });
});
