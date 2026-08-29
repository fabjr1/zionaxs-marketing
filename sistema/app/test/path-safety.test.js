// path-safety.test.js — traversal em identificadores que viram caminho.
//
// O defeito que estes testes fixam: o id de proposta chegava por POST e era
// concatenado direto no caminho. `../campaign` alcançava e SOBRESCREVIA o
// campaign.json da campanha.
//
// A checagem vive na camada de domínio: validar só no HTTP deixaria a
// biblioteca insegura para qualquer outro chamador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from '../console/server.js';
import { loadWorkspace } from '../lib/workspace.js';
import { isSafeId, assertSafeId } from '../lib/util.js';
import { createCampaign, loadCampaign, campaignFile } from '../lib/campaigns.js';
import { addFeedback, loadFeedback, updateFeedback } from '../lib/feedback.js';
import { proposeLearning, recordPromotion, PROPOSAL_STATUS } from '../lib/learning.js';
import { loadBrief, saveBrief, newBrief } from '../lib/brief.js';
import { loadPlan } from '../lib/plan.js';
import { addCampaignReading } from '../lib/measure.js';
import { makeTmpWorkspace, makeTmpMemory, memoryNote, withBrand } from './helpers.js';

/** Captura o erro lançado — assert.throws não devolve a exceção. */
function grab(fn) {
  try { fn(); } catch (e) { return e; }
  return null;
}

/** Valores que não podem virar caminho, em nenhuma entrada. */
const HOSTIS = [
  '../campaign',
  '../../etc/passwd',
  'sub/dir',
  'sub\\dir',
  '..',
  '.',
  '',
  '   ',
  'MAIUSCULA',
  'com espaço',
  'ponto.json',
  '/absoluto',
  'C:/windows',
  'nul\u0000byte',
];

function setup() {
  const mem = makeTmpMemory({
    notes: { 'pos.md': memoryNote({ title: 'P' }), 'pub.md': memoryNote({ title: 'U' }) },
  });
  const root = makeTmpWorkspace({ git: true });
  withBrand(root, mem);
  const ws = loadWorkspace(root);
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Alvo do traversal' });
  return { ws, root, id, mem };
}

/** Estado auditável da campanha: bytes dos arquivos + HEAD do git. */
function snapshot(ws, id) {
  const dir = ws.campaignDir(id);
  const files = {};
  const walk = (d, base = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = base ? `${base}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), rel);
      else files[rel] = fs.readFileSync(path.join(d, e.name));
    }
  };
  walk(dir);
  let head = null;
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ws.root, encoding: 'utf8' }).trim(); } catch { /* sem repo */ }
  return { files, head };
}

function assertUnchanged(antes, depois, msg) {
  assert.deepEqual(Object.keys(depois.files).sort(), Object.keys(antes.files).sort(), `${msg}: nenhum arquivo novo`);
  for (const [k, v] of Object.entries(antes.files)) {
    assert.ok(v.equals(depois.files[k]), `${msg}: ${k} mudou byte a byte`);
  }
  assert.equal(depois.head, antes.head, `${msg}: nada foi commitado`);
}

// ---------- o validador ----------

test('isSafeId aceita só o formato gerado pelo sistema', () => {
  for (const bom of ['zionaxs', 'zx-20-capacidade', '2026-08-28-titulo-da-proposta', '2026-08-28-x-02', 'a']) {
    assert.equal(isSafeId(bom), true, `${bom} deveria ser aceito`);
  }
  for (const mau of HOSTIS) {
    assert.equal(isSafeId(mau), false, `${JSON.stringify(mau)} deveria ser recusado`);
  }
  for (const mau of [null, undefined, 42, {}, []]) {
    assert.equal(isSafeId(mau), false, `${String(mau)} deveria ser recusado`);
  }
});

test('assertSafeId lança com código próprio e não vaza o valor inteiro', () => {
  const e = grab(() => assertSafeId('../../segredo/muito/longo/'.repeat(10), 'id de proposta'));
  assert.ok(e, 'precisa lançar');
  assert.equal(e.code, 'UNSAFE_ID');
  assert.match(e.message, /id de proposta inválido/);
  assert.ok(e.message.length < 200);
});

// ---------- domínio ----------

test('promoção de aprendizado: traversal recusado e campanha intacta', () => {
  const { ws, id } = setup();
  proposeLearning(ws, id, {
    campanha: id, marca: 'marca', feedbackId: 'fb', titulo: 'Regra',
    observacao: 'o', interpretacao: 'i', regraProposta: 'r',
    escopo: { marca: 'marca', publico: 'C1', formato: 'carrossel', situacao: 's' },
    evidencia: { classificacoes: ['falha-execucao'], forcaMaxima: 3, origem: 'fb', leituras: [] },
    condicaoRevisao: 'c', destinoSugerido: 'd', estado: PROPOSAL_STATUS.DRAFT,
  });
  const antes = snapshot(ws, id);

  for (const mau of HOSTIS) {
    const e = grab(() => recordPromotion(ws, id, mau, { decision: PROPOSAL_STATUS.PROMOTED, destino: 'x' }));
    assert.ok(e, `id ${JSON.stringify(mau)} deveria ser recusado`);
    assert.equal(e.code, 'UNSAFE_ID', `id ${JSON.stringify(mau)} recusado pelo motivo certo`);
  }
  assertUnchanged(antes, snapshot(ws, id), 'promoção com id hostil');

  // o campaign.json continua sendo um campaign.json válido
  const c = loadCampaign(ws, id);
  assert.equal(c.campaign.marca, 'marca');
  assert.equal(c.proposals.length, 1);
  assert.equal(c.proposals[0].estado, PROPOSAL_STATUS.IN_INBOX, 'nenhuma proposta foi promovida');
});

test('feedback: traversal recusado ao carregar e ao atualizar', () => {
  const { ws, id } = setup();
  addFeedback(ws, id, { alvoTipo: 'campanha', observacao: 'obs real', classificacoes: ['preferencia'] });
  const antes = snapshot(ws, id);

  for (const mau of HOSTIS) {
    assert.throws(() => loadFeedback(ws, id, mau), (e) => e.code === 'UNSAFE_ID');
    assert.throws(() => updateFeedback(ws, id, mau, { desdobramento: 'x' }), (e) => e.code === 'UNSAFE_ID');
  }
  assertUnchanged(antes, snapshot(ws, id), 'feedback com id hostil');
});

test('id de campanha hostil é recusado em toda a superfície', () => {
  const { ws } = setup();
  for (const mau of ['../outra', 'sub/dir', '']) {
    assert.throws(() => loadCampaign(ws, mau), (e) => e.code === 'UNSAFE_ID');
    assert.throws(() => campaignFile(ws, mau), (e) => e.code === 'UNSAFE_ID');
    assert.throws(() => loadBrief(ws, mau), (e) => e.code === 'UNSAFE_ID');
    assert.throws(() => loadPlan(ws, mau), (e) => e.code === 'UNSAFE_ID');
    assert.throws(() => saveBrief(ws, mau, newBrief({ brand: 'marca', campaignId: mau })), (e) => e.code === 'UNSAFE_ID');
    assert.throws(() => addFeedback(ws, mau, { alvoTipo: 'campanha', observacao: 'o', classificacoes: ['preferencia'] }),
      (e) => e.code === 'UNSAFE_ID');
    assert.throws(() => addCampaignReading(ws, mau, {
      metric: 'm', formula: 'f', denominator: 'd', value: 1, source: 's', responsavel: 'r', frequencia: 'semanal',
    }), (e) => e.code === 'UNSAFE_ID');
  }
});

test('id de peça e de marca hostis são recusados', () => {
  const { ws } = setup();
  for (const mau of ['../fora', 'a/b', '']) {
    assert.throws(() => ws.pieceDir(mau), (e) => e.code === 'UNSAFE_ID');
    assert.throws(() => ws.brandManifestFile(mau), (e) => e.code === 'UNSAFE_ID');
  }
});

test('createCampaign com id hostil explícito é recusado antes de escrever', () => {
  const { ws, root } = setup();
  const antesDirs = fs.readdirSync(path.join(root, 'campaigns')).sort();
  assert.throws(() => createCampaign(ws, { brand: 'marca', nome: 'X', id: '../fuga' }), (e) => e.code === 'UNSAFE_ID');
  assert.deepEqual(fs.readdirSync(path.join(root, 'campaigns')).sort(), antesDirs);
});

// ---------- console ----------

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

async function post(base, url, fields, csrf) {
  const body = new URLSearchParams(fields);
  if (csrf) body.set('ct', csrf);
  const res = await fetch(base + url, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
}

test('console: traversal responde de forma controlada e não derruba o processo', async () => {
  const { ws, root, id } = setup();
  delete process.env.MOS_TOKEN;
  const { server, csrf } = createServer({ root });
  const base = await listen(server);
  const antes = snapshot(ws, id);

  for (const mau of ['../campaign', '../../etc/passwd', 'sub/dir', '']) {
    const r = await post(base, `/campaign/${id}/learning/resolve`, {
      proposalId: mau, decision: PROPOSAL_STATUS.PROMOTED, destino: 'x',
    }, csrf);
    assert.equal(r.status, 303, `id ${JSON.stringify(mau)}: resposta controlada`);
    const msg = new URL(r.headers.get('location'), 'http://local').searchParams.get('m') || '';
    assert.match(msg, /inválida|não encontrada/, `id ${JSON.stringify(mau)}: mensagem clara`);
  }
  assertUnchanged(antes, snapshot(ws, id), 'console com id hostil');

  // o servidor continua de pé e servindo
  const fila = await fetch(base + '/campaigns');
  assert.equal(fila.status, 200);
  await fila.text();
  server.close();
});

test('console: asset com id de peça hostil devolve 404, não 500', async () => {
  const { root } = setup();
  delete process.env.MOS_TOKEN;
  const { server } = createServer({ root });
  const base = await listen(server);
  for (const mau of ['..%2F..%2Fconfig', 'MAIUSCULA', 'com%20espaco']) {
    const r = await fetch(`${base}/asset/${mau}/out/x.png`);
    assert.equal(r.status, 404, `asset ${mau} deveria dar 404`);
    await r.text();
  }
  server.close();
});

/** A mensagem interna nomeia o valor recusado e a regra — não pode vazar. */
const REGRA_INTERNA = /minúsculas, dígitos e hífen|id de (campanha|proposta|devolutiva|peça|marca) inválido/;

test('P2 — GET de campanha com id hostil: 404 controlado, sem vazar a validação', async () => {
  const { ws, root, id } = setup();
  delete process.env.MOS_TOKEN;
  const { server } = createServer({ root });
  const base = await listen(server);
  const antes = snapshot(ws, id);

  // os dois casos reproduzidos na revisão, com o traversal percent-encoded
  const casos = [
    '/campaign/%2E%2E%2Fcampaign',
    `/campaign/${id}/learning/%2E%2E%2Fcampaign`,
    '/campaign/..%2Fcampaign',
    '/campaign/sub%2Fdir',
    '/campaign/MAIUSCULA',
    `/campaign/${id}/learning/sub%2Fdir`,
  ];
  for (const u of casos) {
    const r = await fetch(base + u);
    const corpo = await r.text();
    assert.equal(r.status, 404, `${u} deveria devolver 404`);
    assert.doesNotMatch(corpo, REGRA_INTERNA, `${u} não pode expor a mensagem interna`);
    assert.doesNotMatch(corpo, /\.\.\//, `${u} não pode ecoar o caminho recebido`);
  }

  assertUnchanged(antes, snapshot(ws, id), 'GET com id hostil');
  const fila = await fetch(base + '/campaigns');
  assert.equal(fila.status, 200, 'o processo continua de pé');
  await fila.text();
  server.close();
});

test('P2 — POST com id hostil não devolve a mensagem interna de validação', async () => {
  const { ws, root, id } = setup();
  delete process.env.MOS_TOKEN;
  const { server, csrf } = createServer({ root });
  const base = await listen(server);
  const antes = snapshot(ws, id);

  const r = await post(base, `/campaign/${id}/learning/resolve`, {
    proposalId: '../campaign', decision: PROPOSAL_STATUS.PROMOTED, destino: 'x',
  }, csrf);
  assert.equal(r.status, 303);
  const msg = new URL(r.headers.get('location'), 'http://local').searchParams.get('m') || '';
  assert.match(msg, /requisição inválida/);
  assert.doesNotMatch(msg, REGRA_INTERNA, 'a regra de formato não vai para o cliente');

  // id de campanha hostil no POST também é 404, não 500
  const r2 = await post(base, '/campaign/..%2Ffuga/context', {}, csrf);
  assert.equal(r2.status, 404);
  assert.doesNotMatch(r2.text, REGRA_INTERNA);

  assertUnchanged(antes, snapshot(ws, id), 'POST com id hostil');
  server.close();
});
