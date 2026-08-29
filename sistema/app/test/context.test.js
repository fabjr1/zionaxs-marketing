// context.test.js — RF-01 e §17 "Contexto": marca válida, marca inexistente,
// referência ausente, notas conflitantes, contexto excessivo não carregado,
// fonte desatualizada e Memory inacessível.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadWorkspace } from '../lib/workspace.js';
import { buildContextPackage, blockingGaps, parseFrontmatter, memoryStatus, contextForSkill, GAP_SEVERITY, STALE_DAYS } from '../lib/memory.js';
import { validateBrandManifest, resolveBrand, safeMemoryPath } from '../lib/brands.js';
import { makeTmpWorkspace, makeTmpMemory, memoryNote, withBrand } from './helpers.js';

/**
 * Memória sincronizada por padrão (repo git + remoto bare local). Os estados
 * não verificados têm testes próprios em memory-sync.test.js — aqui o foco é
 * a seleção de contexto, e uma memória bloqueada mascararia isso.
 */
function setup({ notes, referencias, ...memOpts } = {}) {
  const mem = makeTmpMemory({
    notes: notes || {
      'pos.md': memoryNote({ title: 'Posicionamento' }),
      'pub.md': memoryNote({ title: 'Público' }),
    },
    ...memOpts,
  });
  const root = makeTmpWorkspace();
  withBrand(root, mem, { referencias });
  return { root, mem, ws: loadWorkspace(root) };
}

test('frontmatter: escalares, listas e corpo', () => {
  const { meta, body } = parseFrontmatter(memoryNote({ title: 'X', status: 'arquivado' }));
  assert.equal(meta.status, 'arquivado');
  assert.equal(meta.autoridade, 'canonica');
  assert.deepEqual(meta.tags, ['teste']);
  assert.match(body, /^# X/m);
});

test('frontmatter: nota sem frontmatter não quebra', () => {
  const { meta, body } = parseFrontmatter('# Só título\n\ntexto');
  assert.deepEqual(meta, {});
  assert.match(body, /Só título/);
});

test('marca válida: carrega as referências declaradas com proveniência', () => {
  const { ws } = setup();
  const pkg = buildContextPackage(ws, { brandId: 'marca', campaignId: 'c1' });
  assert.equal(pkg.sources.length, 2);
  assert.equal(pkg.gaps.length, 0);
  assert.equal(pkg.conflicts.length, 0);
  for (const s of pkg.sources) {
    assert.ok(s.consultedAt, 'RF-01.3: data de consulta');
    assert.ok(s.version.value, 'RF-01.3: versão da fonte');
    assert.ok(s.path, 'RF-01.3: origem');
  }
});

test('marca inexistente: lacuna bloqueante, nunca inferência', () => {
  const { ws } = setup();
  const pkg = buildContextPackage(ws, { brandId: 'nao-existe' });
  assert.equal(pkg.sources.length, 0);
  assert.equal(blockingGaps(pkg).length, 1);
  assert.match(pkg.gaps[0].what, /não tem manifesto/);
});

test('resolveBrand recusa adivinhar entre várias marcas', () => {
  const { root, ws } = setup();
  fs.mkdirSync(path.join(root, 'brands', 'outra'), { recursive: true });
  fs.writeFileSync(path.join(root, 'brands', 'outra', 'manifest.json'), JSON.stringify({
    id: 'outra', nome: 'Outra',
    referencias: [{ papel: 'posicionamento', caminho: 'pos.md' }, { papel: 'publico', caminho: 'pub.md' }],
  }));
  const r = resolveBrand(ws, null);
  assert.equal(r.ok, false);
  assert.match(r.why, /mais de uma marca/);
  assert.deepEqual(r.candidates.sort(), ['marca', 'outra']);
  assert.equal(resolveBrand(ws, 'outra').ok, true);
});

test('referência ausente vira lacuna bloqueante com pergunta', () => {
  const { ws } = setup({
    notes: { 'pos.md': memoryNote({ title: 'Posicionamento' }) }, // pub.md não existe
  });
  const pkg = buildContextPackage(ws, { brandId: 'marca' });
  assert.equal(pkg.sources.length, 1);
  const gap = pkg.gaps.find((g) => g.role === 'publico');
  assert.ok(gap, 'referência declarada e ausente precisa virar lacuna');
  assert.equal(gap.severity, GAP_SEVERITY.BLOCKS);
  assert.ok(gap.ask, 'RB-02: lacuna carrega a pergunta');
});

test('referência opcional ausente não bloqueia', () => {
  const { ws } = setup({
    notes: { 'pos.md': memoryNote({ title: 'P' }), 'pub.md': memoryNote({ title: 'U' }) },
    referencias: [
      { papel: 'posicionamento', caminho: 'pos.md' },
      { papel: 'publico', caminho: 'pub.md' },
      { papel: 'campanhas', caminho: 'sumiu.md', obrigatorio: false },
    ],
  });
  const pkg = buildContextPackage(ws, { brandId: 'marca' });
  assert.equal(blockingGaps(pkg).length, 0);
  assert.equal(pkg.gaps.filter((g) => g.severity === GAP_SEVERITY.WARNS).length, 1);
});

test('RB-08: duas canônicas para o mesmo papel é conflito preservado', () => {
  const { ws } = setup({
    notes: {
      'pos.md': memoryNote({ title: 'A' }), 'pub.md': memoryNote({ title: 'B' }),
      'pub2.md': memoryNote({ title: 'C' }),
    },
    referencias: [
      { papel: 'posicionamento', caminho: 'pos.md', autoridade: 'canonica' },
      { papel: 'publico', caminho: 'pub.md', autoridade: 'canonica' },
      { papel: 'publico', caminho: 'pub2.md', autoridade: 'canonica' },
    ],
  });
  const pkg = buildContextPackage(ws, { brandId: 'marca' });
  assert.equal(pkg.conflicts.length, 1);
  assert.equal(pkg.conflicts[0].refs.length, 2, 'as duas versões ficam preservadas');
  assert.equal(blockingGaps(pkg).length, 1, 'conflito bloqueia até decisão humana');
  // e as duas notas continuam carregadas — nada é escolhido em silêncio
  assert.equal(pkg.sources.filter((s) => s.role === 'publico').length, 2);
});

test('canônica + suporte no mesmo papel não é conflito', () => {
  const { ws } = setup({
    notes: { 'pos.md': memoryNote({ title: 'A' }), 'pub.md': memoryNote({ title: 'B' }), 'pub2.md': memoryNote({ title: 'C' }) },
    referencias: [
      { papel: 'posicionamento', caminho: 'pos.md', autoridade: 'canonica' },
      { papel: 'publico', caminho: 'pub.md', autoridade: 'canonica' },
      { papel: 'publico', caminho: 'pub2.md', autoridade: 'suporte' },
    ],
  });
  assert.equal(buildContextPackage(ws, { brandId: 'marca' }).conflicts.length, 0);
});

test('RF-01.4: contexto excessivo não é carregado — filtro por papel', () => {
  const { ws } = setup({
    notes: {
      'pos.md': memoryNote({ title: 'A' }), 'pub.md': memoryNote({ title: 'B' }),
      'des.md': memoryNote({ title: 'D' }),
    },
    referencias: [
      { papel: 'posicionamento', caminho: 'pos.md' },
      { papel: 'publico', caminho: 'pub.md' },
      { papel: 'design', caminho: 'des.md' },
    ],
  });
  const all = buildContextPackage(ws, { brandId: 'marca' });
  assert.equal(all.sources.length, 3);
  const narrow = buildContextPackage(ws, { brandId: 'marca', roles: ['publico'] });
  assert.equal(narrow.sources.length, 1);
  assert.equal(narrow.sources[0].role, 'publico');
});

test('fonte desatualizada e status não-ativo viram limitação declarada', () => {
  const old = new Date(Date.now() - (STALE_DAYS + 40) * 86400000).toISOString().slice(0, 10);
  const { ws } = setup({
    notes: {
      'pos.md': memoryNote({ title: 'Velha', atualizado: old }),
      'pub.md': memoryNote({ title: 'Arquivada', status: 'arquivado' }),
    },
  });
  const pkg = buildContextPackage(ws, { brandId: 'marca' });
  assert.ok(pkg.limitations.some((l) => /atualizada há/.test(l)), 'nota velha vira limitação');
  assert.ok(pkg.limitations.some((l) => /status "arquivado"/.test(l)), 'nota não-ativa vira limitação');
  // limitação NÃO bloqueia — ela informa
  assert.equal(blockingGaps(pkg).length, 0);
});

test('Memory inacessível: bloqueia e diz por quê, sem usar cópia como definitiva', () => {
  const root = makeTmpWorkspace();
  withBrand(root, path.join(root, 'nao-existe-memory'));
  const ws = loadWorkspace(root);
  const pkg = buildContextPackage(ws, { brandId: 'marca' });
  assert.equal(pkg.memory.available, false);
  assert.equal(pkg.sources.length, 0);
  assert.equal(blockingGaps(pkg).length, 1);
  assert.match(pkg.gaps[0].what, /Memory indisponível/);
});

test('memoryStatus sem raiz configurada não explode', () => {
  const st = memoryStatus(null);
  assert.equal(st.available, false);
  assert.match(st.why, /MOS_MEMORY_ROOT/);
});

test('traversal em caminho de referência é bloqueado', () => {
  assert.equal(safeMemoryPath('/tmp/mem', '../fora.md'), null);
  assert.ok(safeMemoryPath('/tmp/mem', 'dentro/ok.md'));
  const v = validateBrandManifest({
    id: 'x', nome: 'X',
    referencias: [
      { papel: 'posicionamento', caminho: '../escapa.md' },
      { papel: 'publico', caminho: 'ok.md' },
    ],
  });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /relativo/.test(e.msg)));
});

test('manifesto sem papel obrigatório é inválido', () => {
  const v = validateBrandManifest({ id: 'x', nome: 'X', referencias: [{ papel: 'design', caminho: 'd.md' }] });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /posicionamento/.test(e.msg)));
  assert.ok(v.errors.some((e) => /publico/.test(e.msg)));
});

test('contextForSkill entrega só o papel pedido, com proveniência', () => {
  const { ws } = setup();
  const pkg = buildContextPackage(ws, { brandId: 'marca' });
  const ctx = contextForSkill(pkg, ['publico']);
  assert.equal(ctx.sources.length, 1);
  assert.equal(ctx.sources[0].role, 'publico');
  assert.ok(ctx.consultedAt);
});
