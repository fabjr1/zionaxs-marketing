// memory-sync.test.js — protocolo seguro da Zionaxs Memory (§10.1, §12).
//
// Nenhum teste toca a rede: o "remoto" é um repositório bare no filesystem,
// então fetch e rebase rodam de verdade, offline.
//
// A regra sob teste: Memory não verificada permite rascunho local e nada mais —
// não aprova Brief e não recebe proposta na Inbox.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadWorkspace } from '../lib/workspace.js';
import { syncMemory, buildContextPackage, blockingGaps, MEMORY_STATE } from '../lib/memory.js';
import { newBrief, approveBrief, validateBrief } from '../lib/brief.js';
import { proposeLearning, listProposals, PROPOSAL_STATUS, AGENT_DIR } from '../lib/learning.js';
import { createCampaign, saveContextPackage, loadCampaign, CAMPAIGN_STATUS } from '../lib/campaigns.js';
import {
  makeTmpWorkspace, makeTmpMemory, memoryNote, withBrand, advanceMemoryRemote, memoryRemote,
} from './helpers.js';

const NOTES = {
  'pos.md': memoryNote({ title: 'Posicionamento' }),
  'pub.md': memoryNote({ title: 'Público' }),
};

function setup(memOpts = {}) {
  const mem = makeTmpMemory({ notes: NOTES, ...memOpts });
  const root = makeTmpWorkspace({ git: true });
  withBrand(root, mem);
  const ws = loadWorkspace(root);
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Sincronizacao' });
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
    titulo: 'Regra sob teste',
    observacao: 'obs', interpretacao: 'causa',
    regraProposta: 'a regra',
    escopo: { marca: 'marca', publico: 'C1', formato: 'carrossel', situacao: 'slide de figura' },
    evidencia: { classificacoes: ['falha-execucao'], forcaMaxima: 3, origem: 'fb-1', leituras: [] },
    condicaoRevisao: 'revisar quando o design system mudar',
    destinoSugerido: 'Visual/07',
    estado: PROPOSAL_STATUS.DRAFT,
  };
}

// ---------- estados do protocolo ----------

test('memória limpa e sincronizada é verificada', () => {
  const { mem } = setup();
  const r = syncMemory(mem);
  assert.equal(r.state, MEMORY_STATE.SYNCED);
  assert.equal(r.verified, true);
  assert.ok(r.head);
  assert.ok(r.upstream);
});

test('memória atrasada é integrada por rebase e passa a verificada', () => {
  const { mem } = setup();
  advanceMemoryRemote(mem);
  const antes = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: mem, encoding: 'utf8' }).trim();
  const r = syncMemory(mem);
  assert.equal(r.integrated, true, 'o remoto precisa ser integrado, não só observado');
  assert.equal(r.state, MEMORY_STATE.SYNCED);
  assert.equal(r.verified, true);
  const depois = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: mem, encoding: 'utf8' }).trim();
  assert.notEqual(antes, depois, 'HEAD avançou');
  assert.ok(fs.existsSync(path.join(mem, 'nota-remota.md')), 'a nota do remoto chegou');
});

test('memória suja bloqueia e NÃO é integrada — trabalho local intacto', () => {
  const { mem } = setup({ dirty: true });
  advanceMemoryRemote(mem);
  const antes = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: mem, encoding: 'utf8' }).trim();
  const r = syncMemory(mem);
  assert.equal(r.state, MEMORY_STATE.DIRTY);
  assert.equal(r.verified, false);
  assert.equal(r.integrated, undefined, 'árvore suja não é rebaseada');
  const depois = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: mem, encoding: 'utf8' }).trim();
  assert.equal(antes, depois, 'nada foi movido');
  assert.equal(fs.readFileSync(path.join(mem, 'rascunho-local.md'), 'utf8'), 'trabalho pendente\n',
    'o arquivo local não commitado continua igual');
});

test('memória sem upstream bloqueia', () => {
  const { mem } = setup({ remote: false });
  const r = syncMemory(mem);
  assert.equal(r.state, MEMORY_STATE.NO_UPSTREAM);
  assert.equal(r.verified, false);
});

test('memória sem git bloqueia', () => {
  const { mem } = setup({ git: false });
  const r = syncMemory(mem);
  assert.equal(r.state, MEMORY_STATE.NOT_A_REPO);
  assert.equal(r.verified, false);
});

test('remoto inacessível bloqueia sem alterar o repositório', () => {
  const { mem } = setup();
  fs.rmSync(memoryRemote(mem), { recursive: true, force: true }); // remoto some
  const antes = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: mem, encoding: 'utf8' }).trim();
  const r = syncMemory(mem);
  assert.equal(r.state, MEMORY_STATE.FETCH_FAILED);
  assert.equal(r.verified, false);
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: mem, encoding: 'utf8' }).trim(), antes);
});

test('busca desativada não é o mesmo que sincronizada', () => {
  const { mem } = setup();
  const r = syncMemory(mem, { fetch: false });
  assert.equal(r.state, MEMORY_STATE.UNVERIFIED);
  assert.equal(r.verified, false);
});

test('commits locais não enviados não bloqueiam — viram limitação', () => {
  const { mem } = setup();
  fs.writeFileSync(path.join(mem, 'local.md'), memoryNote({ title: 'Local' }));
  const g = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: mem, stdio: 'ignore' });
  g('add', '-A'); g('commit', '-q', '-m', 'local');
  const r = syncMemory(mem);
  assert.equal(r.state, MEMORY_STATE.SYNCED);
  assert.equal(r.verified, true);
  assert.equal(r.unpushed, 1);
});

test('o protocolo nunca usa operação destrutiva', () => {
  const src = fs.readFileSync(new URL('../lib/memory.js', import.meta.url), 'utf8');
  for (const proibida of ['reset', 'checkout', 'clean', '--force', '-f\'']) {
    assert.equal(src.includes(`'${proibida}'`), false, `memory.js não pode chamar git ${proibida}`);
  }
});

// ---------- efeito no Brief ----------

test('memória verificada: contexto sem bloqueio e Brief aprovável', () => {
  const { ws, id } = setup();
  const pkg = buildContextPackage(ws, { brandId: 'marca', campaignId: id });
  assert.equal(pkg.memory.verified, true);
  assert.equal(blockingGaps(pkg).length, 0);
  assert.equal(validateBrief(completeBrief(id), pkg).ok, true);
  const r = approveBrief(ws, id, { brief: completeBrief(id), contextPackage: pkg });
  assert.equal(r.brief.estado, 'aprovado');
});

for (const [rotulo, opts] of [
  ['suja', { dirty: true }],
  ['sem upstream', { remote: false }],
  ['sem git', { git: false }],
]) {
  test(`memória ${rotulo} bloqueia a aprovação do Brief`, () => {
    const { ws, id } = setup(opts);
    const pkg = buildContextPackage(ws, { brandId: 'marca', campaignId: id });
    assert.equal(pkg.memory.verified, false);
    assert.ok(blockingGaps(pkg).length >= 1, 'estado não verificado precisa bloquear');
    assert.ok(pkg.gaps.some((g) => g.ask), 'a lacuna diz o que fazer');

    const v = validateBrief(completeBrief(id), pkg);
    assert.equal(v.ok, false);
    assert.ok(v.errors.some((e) => e.where === 'contexto'));
    assert.throws(() => approveBrief(ws, id, { brief: completeBrief(id), contextPackage: pkg }),
      (e) => e.code === 'BRIEF_INCOMPLETE');
  });
}

test('memória atrasada é integrada e o Brief volta a ser aprovável', () => {
  const { ws, id } = setup();
  advanceMemoryRemote(ws.memoryRoot);
  const pkg = buildContextPackage(ws, { brandId: 'marca', campaignId: id });
  assert.equal(pkg.memory.verified, true, 'a integração acontece antes da leitura');
  assert.equal(blockingGaps(pkg).length, 0);
  assert.ok(pkg.limitations.some((l) => /rebase/.test(l)), 'a integração é declarada');
});

test('rascunho local continua possível com a memória bloqueada', () => {
  const { ws, id } = setup({ dirty: true });
  const pkg = buildContextPackage(ws, { brandId: 'marca', campaignId: id });
  // as notas continuam legíveis — o que some é a confiança, não o acesso
  assert.equal(pkg.sources.length, 2);
  saveContextPackage(ws, id, pkg);
  const c = loadCampaign(ws, id);
  assert.equal(c.status, CAMPAIGN_STATUS.BLOCKED);
  assert.ok(c.blockers.some((b) => /Memory/.test(b.what)));
});

// ---------- efeito na Inbox ----------

test('memória verificada recebe a proposta na Inbox', () => {
  const { ws, mem, id } = setup();
  const r = proposeLearning(ws, id, proposal(id));
  assert.ok(r.inbox, 'a proposta é entregue');
  assert.equal(r.proposal.estado, PROPOSAL_STATUS.IN_INBOX);
  const dir = path.join(mem, 'Inbox', 'Agents', AGENT_DIR);
  assert.equal(fs.readdirSync(dir).filter((f) => f.endsWith('.md')).length, 1);
});

for (const [rotulo, opts] of [
  ['suja', { dirty: true }],
  ['sem upstream', { remote: false }],
  ['sem git', { git: false }],
]) {
  test(`memória ${rotulo} não recebe proposta, e o rascunho local sobrevive`, () => {
    const { ws, mem, id } = setup(opts);
    const r = proposeLearning(ws, id, proposal(id));
    assert.equal(r.inbox, null, 'nada é escrito na Inbox');
    assert.equal(r.proposal.estado, PROPOSAL_STATUS.DRAFT);
    assert.match(r.proposal.entregaBloqueada, /Memory/);

    const dir = path.join(mem, 'Inbox', 'Agents', AGENT_DIR);
    if (fs.existsSync(dir)) {
      assert.equal(fs.readdirSync(dir).filter((f) => f.endsWith('.md')).length, 0);
    }
    // o rascunho local não se perde — é o que permite retomar depois
    const locais = listProposals(ws, id);
    assert.equal(locais.length, 1);
    assert.equal(locais[0].titulo, 'Regra sob teste');
  });
}

test('memória atrasada é integrada e então recebe a proposta', () => {
  const { ws, mem, id } = setup();
  advanceMemoryRemote(mem);
  const r = proposeLearning(ws, id, proposal(id));
  assert.equal(r.memory.integrated, true);
  assert.ok(r.inbox);
  assert.ok(fs.existsSync(path.join(mem, 'nota-remota.md')), 'integrou antes de escrever');
});
