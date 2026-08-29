// memory-canonical.test.js — P1: só a canônica da Zionaxs Memory é confiável.
//
// A política define a canônica como a branch `main` do remoto `origin`. Ter
// *um* upstream não basta: uma cópia em `main` rastreando `origin/rascunho`
// era reportada como sincronizada, e contexto não canônico podia aprovar Brief
// e virar proposta na Inbox.
//
// Sem rede: o remoto é um repositório bare no filesystem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadWorkspace } from '../lib/workspace.js';
import {
  syncMemory, buildContextPackage, blockingGaps,
  MEMORY_STATE, CANONICAL_REF, CANONICAL_BRANCH, SYNC_REMEDY,
} from '../lib/memory.js';
import { newBrief, approveBrief, validateBrief } from '../lib/brief.js';
import { proposeLearning, listProposals, PROPOSAL_STATUS, AGENT_DIR } from '../lib/learning.js';
import { createCampaign, saveContextPackage, loadCampaign, CAMPAIGN_STATUS } from '../lib/campaigns.js';
import {
  makeTmpWorkspace, makeTmpMemory, memoryNote, withBrand,
  memoryGit, trackNonCanonical, switchMemoryBranch,
} from './helpers.js';

const NOTES = {
  'pos.md': memoryNote({ title: 'Posicionamento' }),
  'pub.md': memoryNote({ title: 'Público' }),
};

function setup(mutate) {
  const mem = makeTmpMemory({ notes: NOTES });
  if (mutate) mutate(mem);
  const root = makeTmpWorkspace({ git: true });
  withBrand(root, mem);
  const ws = loadWorkspace(root);
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Canonica' });
  return { ws, mem, root, id };
}

function completeBrief(campaignId) {
  return {
    ...newBrief({ brand: 'marca', campaignId }),
    proposito: 'audiencia', objetivo: 'o', publico: 'C1', acaoDesejada: 'a',
    metricaPrimaria: 'm', criterioAprovacao: 'c',
  };
}

function proposal(campaignId) {
  return {
    campanha: campaignId, marca: 'marca', feedbackId: 'fb-1',
    titulo: 'Regra sob teste', observacao: 'obs', interpretacao: 'causa',
    regraProposta: 'a regra',
    escopo: { marca: 'marca', publico: 'C1', formato: 'carrossel', situacao: 's' },
    evidencia: { classificacoes: ['falha-execucao'], forcaMaxima: 3, origem: 'fb-1', leituras: [] },
    condicaoRevisao: 'c', destinoSugerido: 'd', estado: PROPOSAL_STATUS.DRAFT,
  };
}

/** Cenários não canônicos, cada um com o motivo que o console deve mostrar. */
const NAO_CANONICOS = [
  ['main rastreando outra branch', (mem) => trackNonCanonical(mem), MEMORY_STATE.NON_CANONICAL],
  ['branch local não-main', (mem) => switchMemoryBranch(mem), MEMORY_STATE.NON_CANONICAL],
  ['HEAD destacado', (mem) => memoryGit(mem, 'checkout', '-q', '--detach'), MEMORY_STATE.NON_CANONICAL],
  ['sem remoto origin', (mem) => memoryGit(mem, 'remote', 'remove', 'origin'), MEMORY_STATE.NO_ORIGIN],
];

// ---------- 1 e 2: o estado ----------

test(`main acompanhando ${CANONICAL_REF} é confiável`, () => {
  const { mem } = setup();
  const r = syncMemory(mem);
  assert.equal(r.branch, CANONICAL_BRANCH);
  assert.equal(r.upstream, CANONICAL_REF);
  assert.equal(r.state, MEMORY_STATE.SYNCED);
  assert.equal(r.verified, true);
});

test('main acompanhando origin/noncanonical é bloqueado', () => {
  const { mem } = setup((m) => trackNonCanonical(m));
  const r = syncMemory(mem);
  assert.equal(r.branch, CANONICAL_BRANCH, 'a branch local continua main');
  assert.equal(r.upstream, 'origin/noncanonical');
  assert.equal(r.state, MEMORY_STATE.NON_CANONICAL, 'ter upstream não basta — precisa ser a canônica');
  assert.equal(r.verified, false);
  assert.match(r.why, /noncanonical/);
  assert.match(r.why, new RegExp(CANONICAL_REF.replace('/', '\\/')));
});

test('branch local diferente de main é bloqueada', () => {
  const { mem } = setup((m) => switchMemoryBranch(m, 'rascunho'));
  const r = syncMemory(mem);
  assert.equal(r.branch, 'rascunho');
  assert.equal(r.state, MEMORY_STATE.NON_CANONICAL);
  assert.equal(r.verified, false);
  assert.match(r.why, /rascunho/);
});

test('HEAD destacado e ausência de origin também bloqueiam', () => {
  const det = syncMemory(setup((m) => memoryGit(m, 'checkout', '-q', '--detach')).mem);
  assert.equal(det.state, MEMORY_STATE.NON_CANONICAL);
  assert.match(det.why, /destacado/);

  const semOrigin = syncMemory(setup((m) => memoryGit(m, 'remote', 'remove', 'origin')).mem);
  assert.equal(semOrigin.state, MEMORY_STATE.NO_ORIGIN);
  assert.equal(semOrigin.verified, false);
});

test('todo estado bloqueante carrega instrução de correção', () => {
  for (const [rotulo, mutate, esperado] of NAO_CANONICOS) {
    const r = syncMemory(setup(mutate).mem);
    assert.equal(r.state, esperado, rotulo);
    assert.ok(r.why, `${rotulo}: motivo claro`);
    assert.ok(SYNC_REMEDY[r.state], `${rotulo}: instrução de correção`);
    assert.match(SYNC_REMEDY[r.state], /git /, `${rotulo}: a instrução diz o comando`);
  }
});

test('a sincronização nomeia a canônica explicitamente', () => {
  const src = fs.readFileSync(new URL('../lib/memory.js', import.meta.url), 'utf8');
  assert.match(src, /'fetch', '--quiet', CANONICAL_REMOTE, CANONICAL_BRANCH/, 'fetch da canônica');
  assert.match(src, /'pull', '--rebase', '--quiet', CANONICAL_REMOTE, CANONICAL_BRANCH/, 'rebase sobre a canônica');
  assert.match(src, /\$\{CANONICAL_REF\}\.\.\.HEAD/, 'contagem contra a canônica, não contra @{upstream}');
});

test('nenhuma operação destrutiva foi introduzida', () => {
  const src = fs.readFileSync(new URL('../lib/memory.js', import.meta.url), 'utf8');
  for (const proibida of ['reset', 'checkout', 'clean', '--force', 'push']) {
    assert.equal(src.includes(`'${proibida}'`), false, `memory.js não pode chamar git ${proibida}`);
  }
});

// ---------- 4: o Brief ----------

test('contexto canônico permite aprovar o Brief', () => {
  const { ws, id } = setup();
  const pkg = buildContextPackage(ws, { brandId: 'marca', campaignId: id });
  assert.equal(pkg.memory.verified, true);
  assert.equal(blockingGaps(pkg).length, 0);
  const r = approveBrief(ws, id, { brief: completeBrief(id), contextPackage: pkg });
  assert.equal(r.brief.estado, 'aprovado');
});

for (const [rotulo, mutate] of NAO_CANONICOS) {
  test(`contexto não canônico (${rotulo}) bloqueia a aprovação do Brief`, () => {
    const { ws, id } = setup(mutate);
    const pkg = buildContextPackage(ws, { brandId: 'marca', campaignId: id });
    assert.equal(pkg.memory.verified, false);
    assert.ok(blockingGaps(pkg).length >= 1);
    assert.ok(pkg.gaps.some((g) => g.ask), 'a lacuna diz o que fazer');

    const v = validateBrief(completeBrief(id), pkg);
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => e.where === 'contexto'));
    assert.throws(() => approveBrief(ws, id, { brief: completeBrief(id), contextPackage: pkg }),
      (e) => e.code === 'BRIEF_INCOMPLETE');
  });
}

// ---------- 5: a Inbox ----------

for (const [rotulo, mutate] of NAO_CANONICOS) {
  test(`contexto não canônico (${rotulo}) não escreve na Inbox, e preserva a proposta local`, () => {
    const { ws, mem, id } = setup(mutate);
    const r = proposeLearning(ws, id, proposal(id));

    assert.equal(r.inbox, null, 'nada é escrito na Inbox');
    assert.equal(r.proposal.estado, PROPOSAL_STATUS.DRAFT);
    assert.match(r.proposal.entregaBloqueada, /Memory/);

    const dir = path.join(mem, 'Inbox', 'Agents', AGENT_DIR);
    assert.equal(fs.readdirSync(dir).filter((f) => f.endsWith('.md')).length, 0);

    // o rascunho local sobrevive — é o que permite retomar após sincronizar
    const locais = listProposals(ws, id);
    assert.equal(locais.length, 1);
    assert.equal(locais[0].titulo, 'Regra sob teste');
  });
}

test('contexto canônico recebe a proposta na Inbox', () => {
  const { ws, mem, id } = setup();
  const r = proposeLearning(ws, id, proposal(id));
  assert.ok(r.inbox);
  assert.equal(r.proposal.estado, PROPOSAL_STATUS.IN_INBOX);
  assert.equal(fs.readdirSync(path.join(mem, 'Inbox', 'Agents', AGENT_DIR))
    .filter((f) => f.endsWith('.md')).length, 1);
});

test('promoção continua sendo ato humano registrado, não automática', () => {
  const { ws, id } = setup();
  const r = proposeLearning(ws, id, proposal(id));
  assert.equal(r.proposal.estado, PROPOSAL_STATUS.IN_INBOX, 'entra como não canônica');
  assert.ok(!r.proposal.promocao, 'nada é promovido sozinho');
  // e o markdown entregue diz, por escrito, que não é canônico
  assert.match(fs.readFileSync(r.inbox, 'utf8'), /não canônica/);
});

test('campanha com Memory não canônica fica bloqueada, com o rascunho intacto', () => {
  const { ws, id } = setup((m) => trackNonCanonical(m));
  const pkg = buildContextPackage(ws, { brandId: 'marca', campaignId: id });
  assert.equal(pkg.sources.length, 2, 'as notas continuam legíveis — some a confiança, não o acesso');
  saveContextPackage(ws, id, pkg);
  const c = loadCampaign(ws, id);
  assert.equal(c.status, CAMPAIGN_STATUS.BLOCKED);
  assert.ok(c.blockers.some((b) => /fora da canônica/.test(b.what)));
});
