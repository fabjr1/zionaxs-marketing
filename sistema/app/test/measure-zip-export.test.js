// measure-zip-export.test.js — M-01/M-02, o escritor ZIP e o exporter P-01/P-02.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { requiredSample, addReading } from '../lib/measure.js';
import { crc32, buildZip } from '../lib/zip.js';
import { buildExport, registerPermalink } from '../lib/exporter.js';
import { loadPiece, STATUS } from '../lib/pieces.js';
import { loadWorkspace } from '../lib/workspace.js';
import { approve } from '../lib/decisions.js';
import { makeTmpWorkspace, fabricatePiece } from './helpers.js';

// ---------- M-02: matemática de amostra ----------
test('amostra exigida bate com a ordem de grandeza da skill ab-testing', () => {
  // baseline 5%, lift 20% → a tabela da skill diz ~7k/variante
  const n = requiredSample(0.05, 0.20);
  assert.ok(n > 6000 && n < 9500, `n=${n}`);
  // baseline 10%, lift 50% → ~550/variante
  const n2 = requiredSample(0.10, 0.50);
  assert.ok(n2 > 350 && n2 < 800, `n2=${n2}`);
  assert.throws(() => requiredSample(0, 0.2));
});

test('M-01: leitura sem denominador é recusada; sem desenho é direcional por regra', () => {
  const root = makeTmpWorkspace({ git: true });
  fabricatePiece(root, 'zx-m1');
  const ws = loadWorkspace(root);
  const p = loadPiece(ws, 'zx-m1');

  assert.throws(() => addReading(ws, p, { metric: 'saves', formula: 'x', value: 10, source: 'ig' }), /denominator/);

  const r1 = addReading(ws, p, { metric: 'saves/alcance', formula: 'saves ÷ alcance', denominator: 4200, value: '2.1%', source: 'ig insights' });
  assert.equal(r1.entry.label, 'direcional (H)');

  const r2 = addReading(ws, p, {
    metric: 'dm/alcance', formula: 'DMs ÷ alcance', denominator: 20000, value: '0.4%',
    source: 'ig', baseline: 0.05, mde: 0.2, sample: 20000,
  });
  assert.equal(r2.entry.label, 'significativa');
  assert.ok(r2.entry.requiredSample < 20000);

  const r3 = addReading(ws, p, {
    metric: 'dm/alcance', formula: 'DMs ÷ alcance', denominator: 800, value: '0.5%',
    source: 'ig', baseline: 0.05, mde: 0.2, sample: 800,
  });
  assert.equal(r3.entry.label, 'direcional (H)', 'amostra insuficiente → rótulo imposto pelo código');
});

// ---------- ZIP ----------
test('crc32 bate com o vetor de referência', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xCBF43926);
});

test('zip tem assinaturas e contagem corretas', () => {
  const z = buildZip([{ name: 'a.txt', data: 'alfa' }, { name: 'b/c.txt', data: 'beta' }]);
  assert.equal(z.readUInt32LE(0), 0x04034b50, 'local header');
  const eocd = z.length - 22;
  assert.equal(z.readUInt32LE(eocd), 0x06054b50, 'EOCD');
  assert.equal(z.readUInt16LE(eocd + 10), 2, 'duas entradas');
});

// ---------- exporter ----------
test('P-01: exportação exige gates verdes e empacota tudo na ordem', () => {
  const root = makeTmpWorkspace({ git: true });
  fabricatePiece(root, 'zx-e1', { pass: false });
  const ws = loadWorkspace(root);
  assert.throws(() => buildExport(ws, loadPiece(ws, 'zx-e1')), /gates verdes/);

  fabricatePiece(root, 'zx-e2');
  const p = loadPiece(ws, 'zx-e2');
  const { file, entries } = buildExport(ws, p);
  assert.ok(fs.existsSync(file));
  // 8 slides + legenda + alt + checklist
  assert.equal(entries, 11);
  const buf = fs.readFileSync(file);
  assert.equal(buf.readUInt16LE(buf.length - 22 + 10), 11);
  const txt = buf.toString('latin1');
  assert.ok(txt.includes('01-zx-e2-slide-01.png'), 'slides prefixados pela ordem');
  assert.ok(txt.includes('checklist.md'));
});

test('P-02: permalink inválido recusado; válido vira "publicada" com commit', () => {
  const root = makeTmpWorkspace({ git: true });
  fabricatePiece(root, 'zx-e3');
  const ws = loadWorkspace(root);
  const p = loadPiece(ws, 'zx-e3');
  approve(ws, p, {});

  assert.throws(() => registerPermalink(ws, loadPiece(ws, 'zx-e3'), 'ainda não postei'), /permalink inválido/);
  assert.throws(() => registerPermalink(ws, loadPiece(ws, 'zx-e3'), 'https://example.com/p/x'), /permalink inválido/);

  const r = registerPermalink(ws, loadPiece(ws, 'zx-e3'), 'https://www.instagram.com/p/DcTest123/');
  assert.equal(r.git.committed, true);
  const done = loadPiece(ws, 'zx-e3');
  assert.equal(done.status, STATUS.PUBLISHED);
  assert.equal(done.publication.route, 'manual');
});

// ---------- path traversal no workspace ----------
test('safeJoin bloqueia traversal para fora do workspace', async () => {
  const { safeJoin } = await import('../lib/util.js');
  const root = makeTmpWorkspace({});
  assert.throws(() => safeJoin(root, '..', 'fora'), /fora do workspace/);
  assert.ok(safeJoin(root, 'pieces', 'x').startsWith(root));
  void path;
});
