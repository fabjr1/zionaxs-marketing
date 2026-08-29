// learning.test.js — RF-08, RB-06, RB-07, RB-09, RB-10 e §17 "Feedback" e
// "Governança": preferência, falha de execução, hipótese, resultado mensurado,
// feedback contraditório, proposta recusada, promoção aprovada, proposta
// escrita na Inbox, promoção automática bloqueada, nenhum segredo produzido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadWorkspace } from '../lib/workspace.js';
import {
  addFeedback, listFeedback, loadFeedback, updateFeedback, contradictions,
  CLASSIFICATIONS, FEEDBACK_OUTCOME,
} from '../lib/feedback.js';
import {
  draftFromFeedback, validateProposal, proposeLearning, recordPromotion,
  listProposals, isApplicable, scanForSecrets, renderProposalMarkdown,
  PROPOSAL_STATUS, AGENT_DIR,
} from '../lib/learning.js';
import { createCampaign } from '../lib/campaigns.js';
import { makeTmpWorkspace, makeTmpMemory, memoryNote, withBrand } from './helpers.js';

function setup({ inbox = true } = {}) {
  const mem = makeTmpMemory({
    inbox,
    notes: { 'pos.md': memoryNote({ title: 'P' }), 'pub.md': memoryNote({ title: 'U' }) },
  });
  const root = makeTmpWorkspace({ git: true });
  withBrand(root, mem);
  const ws = loadWorkspace(root);
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Aprendizado piloto' });
  return { ws, id, mem };
}

function fullProposal(over = {}) {
  return {
    campanha: 'c1', marca: 'marca', feedbackId: 'fb-1',
    titulo: 'Denominador com peso visual igual ao número',
    observacao: 'o número aparecia sozinho, sem o denominador legível',
    interpretacao: 'a hierarquia tipográfica engolia o denominador',
    regraProposta: 'em slide de figura, denominador recebe o mesmo peso visual do número',
    escopo: { marca: 'marca', publico: 'C1', formato: 'carrossel', situacao: 'slide de figura' },
    evidencia: { classificacoes: ['falha-execucao'], forcaMaxima: 3, origem: 'devolutiva fb-1', leituras: [] },
    condicaoRevisao: 'revisar se o design system declarar outra hierarquia',
    destinoSugerido: 'Marketing/Marcas/Zionaxs/Visual/07 - Design System',
    estado: PROPOSAL_STATUS.DRAFT,
    ...over,
  };
}

// ---------- feedback ----------

test('as quatro classificações existem e têm forças distintas', () => {
  for (const k of ['preferencia', 'falha-execucao', 'hipotese', 'resultado-medido']) {
    assert.ok(CLASSIFICATIONS[k], `falta ${k}`);
    assert.ok(CLASSIFICATIONS[k].describe);
  }
  assert.ok(CLASSIFICATIONS['resultado-medido'].forcaEvidencia > CLASSIFICATIONS.preferencia.forcaEvidencia,
    'RB-07: resultado mensurado não pode valer o mesmo que preferência');
});

test('devolutiva exige alvo, observação e classificação', () => {
  const { ws, id } = setup();
  assert.throws(() => addFeedback(ws, id, { alvoTipo: 'nada', observacao: 'x', classificacoes: ['preferencia'] }),
    (e) => e.code === 'FEEDBACK_TARGET');
  assert.throws(() => addFeedback(ws, id, { alvoTipo: 'campanha', observacao: '', classificacoes: ['preferencia'] }),
    (e) => e.code === 'FEEDBACK_EMPTY');
  assert.throws(() => addFeedback(ws, id, { alvoTipo: 'campanha', observacao: 'x', classificacoes: [] }),
    (e) => e.code === 'FEEDBACK_UNCLASSIFIED');
  assert.throws(() => addFeedback(ws, id, { alvoTipo: 'campanha', observacao: 'x', classificacoes: ['inventada'] }),
    (e) => e.code === 'FEEDBACK_CLASSIFICATION');
  assert.throws(() => addFeedback(ws, id, { alvoTipo: 'ativo', observacao: 'x', classificacoes: ['preferencia'] }),
    (e) => e.code === 'FEEDBACK_TARGET', 'ativo exige identificador');
});

test('devolutiva com múltiplas classificações é registrada e commitada', () => {
  const { ws, id } = setup();
  const r = addFeedback(ws, id, {
    alvoTipo: 'ativo', alvoId: 'zx-20',
    observacao: 'a quebra de linha do slide 3 ficou errada e eu também não gosto do azul',
    classificacoes: ['falha-execucao', 'preferencia'],
  });
  assert.equal(r.entry.classificacoes.length, 2);
  assert.equal(r.entry.desdobramento, FEEDBACK_OUTCOME.PENDING);
  assert.equal(r.git.committed, true);
  assert.equal(listFeedback(ws, id).length, 1);
});

test('duas devolutivas idênticas no mesmo dia não se sobrescrevem', () => {
  const { ws, id } = setup();
  const a = addFeedback(ws, id, { alvoTipo: 'campanha', observacao: 'mesma frase', classificacoes: ['preferencia'] });
  const b = addFeedback(ws, id, { alvoTipo: 'campanha', observacao: 'mesma frase', classificacoes: ['preferencia'] });
  assert.notEqual(a.entry.id, b.entry.id);
  assert.equal(listFeedback(ws, id).length, 2);
});

test('§12: devolutiva contraditória é preservada e sinalizada, não resolvida', () => {
  const { ws, id } = setup();
  addFeedback(ws, id, { alvoTipo: 'ativo', alvoId: 'zx-20', observacao: 'achei fraco', classificacoes: ['preferencia'] });
  addFeedback(ws, id, { alvoTipo: 'ativo', alvoId: 'zx-20', observacao: 'salvou 3x mais que a média', classificacoes: ['resultado-medido'] });
  const all = listFeedback(ws, id);
  assert.equal(all.length, 2, 'as duas continuam lá');
  const c = contradictions(all);
  assert.equal(c.length, 1);
  assert.match(c[0].why, /decida qual governa/);
});

// ---------- proposta ----------

test('rascunho a partir da devolutiva não inventa a regra', () => {
  const fb = { id: 'fb-1', observacao: 'obs', classificacoes: ['preferencia'], causa: null };
  const d = draftFromFeedback({ campaignId: 'c1', brand: 'marca', feedback: fb, brief: { publico: 'C1' } });
  assert.equal(d.regraProposta, null, 'a regra é julgamento humano');
  assert.equal(d.condicaoRevisao, null);
  assert.equal(d.observacao, 'obs');
  assert.equal(d.escopo.publico, 'C1', 'o que deriva do contexto é pré-preenchido');
  assert.equal(d.evidencia.forcaMaxima, CLASSIFICATIONS.preferencia.forcaEvidencia);
});

test('RF-08.3: proposta sem regra, escopo ou condição de invalidação é inválida', () => {
  for (const missing of ['regraProposta', 'condicaoRevisao', 'destinoSugerido', 'titulo']) {
    const v = validateProposal(fullProposal({ [missing]: null }));
    assert.equal(v.ok, false, `${missing} deveria ser obrigatório`);
    assert.ok(v.errors.some((e) => e.where === missing));
  }
  assert.equal(validateProposal(fullProposal()).ok, true);
});

test('RB-06: aprendizado só de preferência exige situação declarada', () => {
  const onlyPref = fullProposal({
    evidencia: { classificacoes: ['preferencia'], forcaMaxima: 1, origem: 'x', leituras: [] },
    escopo: { marca: 'marca', publico: null, formato: null, situacao: null },
  });
  const v = validateProposal(onlyPref);
  assert.equal(v.ok, false, 'preferência sem situação viraria regra geral sem evidência');
  assert.ok(v.errors.some((e) => e.where === 'escopo.situacao'));

  onlyPref.escopo.situacao = 'capas de carrossel da campanha X';
  assert.equal(validateProposal(onlyPref).ok, true);
});

test('RB-10: segredo no conteúdo bloqueia a proposta', () => {
  assert.equal(scanForSecrets('texto limpo').length, 0);
  assert.ok(scanForSecrets('api_key: abcdef123456').length > 0);
  assert.ok(scanForSecrets('use sk_live_ABCDEFGH12345678').length > 0);
  assert.ok(scanForSecrets('ghp_ABCDEFGHIJKLMNOPQRSTUV').length > 0);

  const v = validateProposal(fullProposal({ interpretacao: 'o webhook usava api_key: s3cr3t0aqui' }));
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.where === 'segredo'));
});

test('RF-08.4: proposta é escrita na Inbox e nasce não canônica', () => {
  const { ws, id, mem } = setup();
  const r = proposeLearning(ws, id, fullProposal({ campanha: id }));
  assert.equal(r.proposal.estado, PROPOSAL_STATUS.IN_INBOX);
  assert.ok(r.inbox, 'o markdown vai para a Inbox');
  assert.match(r.proposal.inboxPath, new RegExp(`^Inbox/Agents/${AGENT_DIR}/`));
  const md = fs.readFileSync(r.inbox, 'utf8');
  assert.match(md, /não canônica/, 'o arquivo diz que não é canônico');
  assert.match(md, /## Escopo|Escopo de aplicabilidade/);
  assert.match(md, /## Confiança/);
  // não escreveu em área canônica
  assert.equal(fs.existsSync(path.join(mem, 'Marketing')), false);
  assert.equal(r.git.committed, true);
});

test('proposta inválida não chega à Inbox', () => {
  const { ws, id, mem } = setup();
  assert.throws(() => proposeLearning(ws, id, fullProposal({ regraProposta: null })),
    (e) => e.code === 'LEARNING_INVALID');
  const inboxDir = path.join(mem, 'Inbox', 'Agents', AGENT_DIR);
  // só .md: a área do agente carrega um .gitkeep para existir no remoto
  assert.equal(fs.readdirSync(inboxDir).filter((f) => f.endsWith('.md')).length, 0);
});

test('§12: Memory indisponível grava localmente e declara o bloqueio', () => {
  const root = makeTmpWorkspace({ git: true });
  withBrand(root, path.join(root, 'memory-que-nao-existe'));
  const ws = loadWorkspace(root);
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Sem memory' });
  const r = proposeLearning(ws, id, fullProposal({ campanha: id }));
  assert.equal(r.inbox, null);
  assert.equal(r.proposal.estado, PROPOSAL_STATUS.DRAFT, 'sem entrega, não vira "na inbox"');
  assert.match(r.proposal.entregaBloqueada, /Memory indisponível/);
  assert.equal(listProposals(ws, id).length, 1, 'a proposta não se perde');
});

test('Inbox sem a área do agente é bloqueio declarado, não escrita fora do lugar', () => {
  const { ws, id, mem } = setup({ inbox: false });
  const r = proposeLearning(ws, id, fullProposal({ campanha: id }));
  assert.equal(r.inbox, null);
  assert.match(r.proposal.entregaBloqueada, /área do agente não existe/);
  assert.equal(fs.existsSync(path.join(mem, 'Inbox')), false, 'não cria área na Memory por conta própria');
});

test('RF-08.5: promoção é registro de ato humano e exige destino', () => {
  const { ws, id } = setup();
  const r = proposeLearning(ws, id, fullProposal({ campanha: id }));
  assert.throws(() => recordPromotion(ws, id, r.proposal.id, { decision: 'promovida' }),
    (e) => e.code === 'PROMOTION_DESTINATION');
  assert.throws(() => recordPromotion(ws, id, r.proposal.id, { decision: 'qualquer' }),
    (e) => e.code === 'PROMOTION_DECISION');

  const ok = recordPromotion(ws, id, r.proposal.id, {
    decision: PROPOSAL_STATUS.PROMOTED, destino: 'Visual/07 - Design System', por: 'fabiano',
  });
  assert.equal(ok.proposal.estado, PROPOSAL_STATUS.PROMOTED);
  assert.equal(ok.proposal.promocao.destino, 'Visual/07 - Design System');
  assert.ok(ok.proposal.promocao.em, 'RB-09: proveniência da promoção');
});

test('proposta recusada não vira padrão futuro', () => {
  const { ws, id } = setup();
  const r = proposeLearning(ws, id, fullProposal({ campanha: id }));
  const ref = recordPromotion(ws, id, r.proposal.id, { decision: PROPOSAL_STATUS.REFUSED, motivo: 'escopo largo demais' });
  assert.equal(ref.proposal.estado, PROPOSAL_STATUS.REFUSED);
  assert.equal(isApplicable(ref.proposal, { marca: 'marca', publico: 'C1', formato: 'carrossel', situacao: 'slide de figura' }), false);
});

test('RF-08.6: aprendizado só se aplica dentro do escopo declarado', () => {
  const promoted = { ...fullProposal(), estado: PROPOSAL_STATUS.PROMOTED };
  const match = { marca: 'marca', publico: 'C1', formato: 'carrossel', situacao: 'slide de figura' };
  assert.equal(isApplicable(promoted, match), true);
  assert.equal(isApplicable(promoted, { ...match, marca: 'outra' }), false, 'outra marca não herda');
  assert.equal(isApplicable(promoted, { ...match, publico: 'A1' }), false, 'outro público não herda');
  assert.equal(isApplicable(promoted, { ...match, formato: 'story' }), false, 'outro formato não herda');
  assert.equal(isApplicable(promoted, { marca: 'marca' }), false, 'contexto sem a dimensão exigida não basta');

  const broad = { ...promoted, escopo: { marca: 'marca', publico: null, formato: null, situacao: null } };
  assert.equal(isApplicable(broad, { marca: 'marca' }), true, 'dimensão nula não restringe');

  const draft = { ...fullProposal(), estado: PROPOSAL_STATUS.IN_INBOX };
  assert.equal(isApplicable(draft, match), false, 'RB-06: não promovida não se aplica');
});

test('markdown da proposta declara confiança proporcional à evidência', () => {
  const weak = renderProposalMarkdown(fullProposal({
    evidencia: { classificacoes: ['preferencia'], forcaMaxima: 1, origem: 'x', leituras: [] },
  }));
  assert.match(weak, /Baixa/);
  const strong = renderProposalMarkdown(fullProposal({
    evidencia: { classificacoes: ['resultado-medido'], forcaMaxima: 4, origem: 'x', leituras: [] },
  }));
  assert.match(strong, /Média-alta/);
  assert.match(strong, /generalização além do escopo declarado continua não suportada/);
});

test('devolutiva registra o desdobramento quando vira proposta', () => {
  const { ws, id } = setup();
  const fb = addFeedback(ws, id, { alvoTipo: 'campanha', observacao: 'obs', classificacoes: ['falha-execucao'] });
  const r = proposeLearning(ws, id, fullProposal({ campanha: id, feedbackId: fb.entry.id }));
  updateFeedback(ws, id, fb.entry.id, {
    desdobramento: FEEDBACK_OUTCOME.LEARNING_PROPOSED, propostaAprendizado: r.proposal.id,
  });
  const again = loadFeedback(ws, id, fb.entry.id);
  assert.equal(again.desdobramento, FEEDBACK_OUTCOME.LEARNING_PROPOSED);
  assert.equal(again.propostaAprendizado, r.proposal.id);
});
