// campaign-console.test.js — §17 "Console": estados de lacuna, bloqueio,
// revisão, leitura insuficiente e aprendizado pendente; POSTs protegidos por
// CSRF/token. Também cobre o ciclo completo pela interface, ponta a ponta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from '../console/server.js';
import { loadWorkspace } from '../lib/workspace.js';
import { loadCampaign, CAMPAIGN_STATUS } from '../lib/campaigns.js';
import { PROPOSAL_STATUS, AGENT_DIR } from '../lib/learning.js';
import { makeTmpWorkspace, makeTmpMemory, memoryNote, withBrand, fabricatePiece } from './helpers.js';

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

async function boot({ token = null, referencias = null } = {}) {
  const mem = makeTmpMemory({
    notes: { 'pos.md': memoryNote({ title: 'Posicionamento' }), 'pub.md': memoryNote({ title: 'Público' }) },
  });
  const root = makeTmpWorkspace({ git: true });
  withBrand(root, mem, { referencias });
  if (token) process.env.MOS_TOKEN = token; else delete process.env.MOS_TOKEN;
  const { server, csrf } = createServer({ root, token });
  const base = await listen(server);
  return { root, mem, server, base, csrf };
}

/** POST urlencoded com CSRF, seguindo redirect para ler o flash. */
async function post(base, url, fields, csrf, token = null) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) v.forEach((x) => body.append(k, x));
    else body.append(k, v);
  }
  if (csrf) body.set('ct', csrf);
  if (token) body.set('t', token);
  const res = await fetch(base + url, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text(); // consumir sempre: sem isso a conexão fica viva e server.close() trava
  return { status: res.status, headers: res.headers, text: () => text };
}

/**
 * Mensagem de flash do redirect. urlencoded escreve espaço como '+', e
 * decodeURIComponent não desfaz isso — decodificar errado faria o teste
 * passar por acidente.
 */
function flash(res) {
  const loc = res.headers.get('location') || '';
  const m = new URL(loc, 'http://local').searchParams.get('m');
  return m || '';
}

test('fila de campanhas aparece e oferece abrir com a marca declarada', async () => {
  const { server, base } = await boot();
  const html = await (await fetch(base + '/campaigns')).text();
  assert.match(html, /Campanhas/);
  assert.match(html, /Abrir campanha/);
  assert.match(html, /marca/);
  assert.doesNotMatch(html, /manifesto inválido/);
  server.close();
});

test('marca com manifesto inválido é sinalizada e não permite abrir', async () => {
  const { server, base } = await boot({
    referencias: [{ papel: 'design', caminho: 'd.md' }], // sem posicionamento nem público
  });
  const html = await (await fetch(base + '/campaigns')).text();
  assert.match(html, /manifesto inválido/);
  assert.match(html, /disabled/);
  server.close();
});

test('ciclo completo pelo console: abrir → contexto → brief → plano → medir → devolutiva → aprendizado', async () => {
  const { root, mem, server, base, csrf } = await boot();

  // abrir
  let r = await post(base, '/campaigns/new', { brand: 'marca', nome: 'Piloto console' }, csrf);
  assert.equal(r.status, 303);
  const cid = 'marca-piloto-console';
  const ws = loadWorkspace(root);
  assert.equal(loadCampaign(ws, cid).status, CAMPAIGN_STATUS.DRAFT);

  // §11.2 sem contexto: a tela explica e encaminha, não mostra plano pronto
  let html = await (await fetch(`${base}/campaign/${cid}`)).text();
  assert.match(html, /Nenhuma consulta à Zionaxs Memory/);
  assert.match(html, /O plano abre depois do Brief aprovado/);

  // contexto
  r = await post(base, `/campaign/${cid}/context`, {}, csrf);
  assert.equal(r.status, 303);
  assert.match(flash(r), /2 fonte\(s\), 0 lacuna/);
  assert.equal(loadCampaign(ws, cid).status, CAMPAIGN_STATUS.CONTEXT);

  // brief — §11.2 incompleto mostra só os campos pendentes
  await post(base, `/campaign/${cid}/brief/start`, {}, csrf);
  html = await (await fetch(`${base}/campaign/${cid}`)).text();
  assert.match(html, /campo\(s\) pendente\(s\)/);
  assert.match(html, /disabled/, 'aprovar não fica disponível com campo faltando');

  // aprovação recusada enquanto incompleto
  r = await post(base, `/campaign/${cid}/brief/approve`, {}, csrf);
  assert.match(flash(r), /não pode ser aprovado/);

  await post(base, `/campaign/${cid}/brief/save`, {
    proposito: 'audiencia', objetivo: 'crescer audiência', publico: 'C1',
    acaoDesejada: 'seguir', metricaPrimaria: 'salvamentos', criterioAprovacao: 'fim do ciclo',
    canais: 'instagram, linkedin',
  }, csrf);
  r = await post(base, `/campaign/${cid}/brief/approve`, {}, csrf);
  assert.match(flash(r), /brief aprovado/);
  assert.equal(loadCampaign(ws, cid).status, CAMPAIGN_STATUS.PLANNING);

  // plano
  await post(base, `/campaign/${cid}/plan/front`, {
    tipo: 'conteudo', objetivo: 'explicar a tensão', metrica: 'salvamentos',
  }, csrf);
  await post(base, `/campaign/${cid}/plan/exclude`, {
    tipo: 'receita', motivo: 'campanha de audiência não vende nada agora',
  }, csrf);
  html = await (await fetch(`${base}/campaign/${cid}`)).text();
  assert.match(html, /Fora de escopo, por decisão/);
  assert.match(html, /não vende nada agora/);
  assert.equal(loadCampaign(ws, cid).status, CAMPAIGN_STATUS.PRODUCTION);

  // ativo: peça real, com pipeline
  fabricatePiece(root, 'zx-console', { pass: true });
  await post(base, `/campaign/${cid}/plan/asset`, {
    frente: 'conteudo', tipo: 'carrossel', id: 'zx-console',
  }, csrf);
  html = await (await fetch(`${base}/campaign/${cid}`)).text();
  assert.match(html, /zx-console/);
  assert.equal(loadCampaign(ws, cid).status, CAMPAIGN_STATUS.REVIEW);

  // §11.2 leitura insuficiente: sem denominador, o console diz e não pontua
  r = await post(base, `/campaign/${cid}/reading`, {
    metric: 'curtidas', formula: 'contagem', value: '300',
    source: 'ig', responsavel: 'fabiano', frequencia: 'semanal',
  }, csrf);
  assert.match(flash(r), /insuficiente/);
  html = await (await fetch(`${base}/campaign/${cid}`)).text();
  assert.match(html, /insuficiente/);

  // devolutiva com duas classificações (checkbox múltiplo)
  r = await post(base, `/campaign/${cid}/feedback`, {
    alvo: 'ativo:zx-console',
    observacao: 'a quebra do slide 3 ficou errada e o azul não me agrada',
    classificacoes: ['falha-execucao', 'preferencia'],
  }, csrf);
  assert.equal(r.status, 303);
  const c = loadCampaign(ws, cid);
  assert.equal(c.feedback.length, 1);
  assert.equal(c.feedback[0].classificacoes.length, 2, 'checkbox múltiplo chega como array');

  // rascunho de aprendizado
  const fid = c.feedback[0].id;
  html = await (await fetch(`${base}/campaign/${cid}/learning/${fid}`)).text();
  assert.match(html, /Propor aprendizado|não canônica/);
  assert.match(html, /Condição de revisão/);

  // criar proposta
  r = await post(base, `/campaign/${cid}/learning/create`, {
    feedbackId: fid,
    titulo: 'Quebra de linha em slide de diagnóstico',
    regraProposta: 'frases de diagnóstico ficam abaixo de 42 caracteres por linha',
    interpretacao: 'a fonte display quebrava sem br autoral',
    condicaoRevisao: 'revisar se o design system mudar a escala tipográfica',
    destinoSugerido: 'Marketing/Marcas/Zionaxs/Visual/07 - Design System',
    escopoSituacao: 'slides de diagnóstico',
  }, csrf);
  assert.match(flash(r), /Inbox/);
  const inboxDir = path.join(mem, 'Inbox', 'Agents', AGENT_DIR);
  assert.equal(fs.readdirSync(inboxDir).filter((f) => f.endsWith('.md')).length, 1);

  // §11.2 aprendizado pendente: o console diz que é não canônico
  html = await (await fetch(`${base}/campaign/${cid}`)).text();
  assert.match(html, /não canônica/);
  assert.match(html, /Promovi na Memory/);

  // registrar a promoção humana
  const pid = loadCampaign(ws, cid).proposals[0].id;
  await post(base, `/campaign/${cid}/learning/resolve`, {
    proposalId: pid, decision: PROPOSAL_STATUS.PROMOTED, destino: 'Visual/07',
  }, csrf);
  assert.equal(loadCampaign(ws, cid).proposals[0].estado, PROPOSAL_STATUS.PROMOTED);

  server.close();
});

test('§11.2 campanha bloqueada: mostra o bloqueio e a pergunta', async () => {
  const { root, server, base, csrf } = await boot({
    referencias: [
      { papel: 'posicionamento', caminho: 'pos.md' },
      { papel: 'publico', caminho: 'nao-existe.md' },
    ],
  });
  await post(base, '/campaigns/new', { brand: 'marca', nome: 'Bloqueada' }, csrf);
  const cid = 'marca-bloqueada';
  await post(base, `/campaign/${cid}/context`, {}, csrf);
  const html = await (await fetch(`${base}/campaign/${cid}`)).text();
  assert.match(html, /Campanha bloqueada/);
  assert.match(html, /nao-existe\.md/);
  assert.match(html, /bloqueada/);
  const ws = loadWorkspace(root);
  assert.equal(loadCampaign(ws, cid).status, CAMPAIGN_STATUS.BLOCKED);
  server.close();
});

test('conflito entre canônicas aparece como decisão humana', async () => {
  const { server, base, csrf } = await boot({
    referencias: [
      { papel: 'posicionamento', caminho: 'pos.md', autoridade: 'canonica' },
      { papel: 'publico', caminho: 'pub.md', autoridade: 'canonica' },
      { papel: 'publico', caminho: 'pos.md', autoridade: 'canonica' },
    ],
  });
  await post(base, '/campaigns/new', { brand: 'marca', nome: 'Conflito' }, csrf);
  await post(base, '/campaign/marca-conflito/context', {}, csrf);
  const html = await (await fetch(base + '/campaign/marca-conflito')).text();
  assert.match(html, /Conflitos — decisão humana/);
  assert.match(html, /RB-08/);
  server.close();
});

test('POST sem CSRF é recusado em rota de campanha', async () => {
  const { server, base, csrf } = await boot();
  await post(base, '/campaigns/new', { brand: 'marca', nome: 'Protegida' }, csrf);
  const r = await post(base, '/campaign/marca-protegida/context', {}, null);
  assert.equal(r.status, 403);
  const html = await r.text();
  assert.match(html, /token de sessão/);
  server.close();
});

test('token exigido nas rotas de campanha quando MOS_TOKEN está definido', async () => {
  const { server, base, csrf } = await boot({ token: 'segredo' });
  assert.equal((await fetch(base + '/campaigns')).status, 403);
  assert.equal((await fetch(base + '/campaigns?t=segredo')).status, 200);
  const r = await post(base, '/campaigns/new', { brand: 'marca', nome: 'Com token' }, csrf, 'segredo');
  assert.equal(r.status, 303);
  delete process.env.MOS_TOKEN;
  server.close();
});

test('encerrar campanha exige motivo pelo console', async () => {
  const { root, server, base, csrf } = await boot();
  await post(base, '/campaigns/new', { brand: 'marca', nome: 'Encerra' }, csrf);
  const r = await post(base, '/campaign/marca-encerra/close', { motivo: '' }, csrf);
  assert.match(flash(r), /exige motivo/);
  await post(base, '/campaign/marca-encerra/close', { motivo: 'sem verba' }, csrf);
  const ws = loadWorkspace(root);
  assert.equal(loadCampaign(ws, 'marca-encerra').status, CAMPAIGN_STATUS.CLOSED);
  server.close();
});

test('campanha inexistente devolve 404 sem derrubar o servidor', async () => {
  const { server, base } = await boot();
  const r = await fetch(base + '/campaign/nao-existe');
  assert.equal(r.status, 404);
  assert.equal((await fetch(base + '/campaigns')).status, 200);
  server.close();
});
