// plan.test.js — RF-03, RF-04, RB-03 e §17 "Plano": campanha só de audiência,
// campanha de venda com frentes adicionais, frente sem métrica, dependência
// circular ou ausente, skill inadequada não roteada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorkspace } from '../lib/workspace.js';
import {
  newPlan, newFront, validatePlan, savePlan, loadPlan, routeSkills,
  findDependencyCycle, executionOrder, planBlockers, gateForAsset,
  FRONTS, FRONT_STATUS,
} from '../lib/plan.js';
import { newBrief, BRIEF_STATUS, PURPOSES } from '../lib/brief.js';
import { createCampaign } from '../lib/campaigns.js';
import { makeTmpWorkspace, makeTmpMemory, memoryNote, withBrand } from './helpers.js';

function approvedBrief(proposito = 'audiencia') {
  return {
    ...newBrief({ brand: 'marca', campaignId: 'c1' }),
    proposito, objetivo: 'o', publico: 'p', acaoDesejada: 'a',
    metricaPrimaria: 'm', criterioAprovacao: 'c',
    oferta: proposito === 'venda' ? 'oferta' : null,
    estado: BRIEF_STATUS.APPROVED, aprovadoEm: '2026-08-28T10:00:00-03:00', aprovadoPor: 'x',
  };
}

function setup() {
  const mem = makeTmpMemory({ notes: { 'pos.md': memoryNote({ title: 'P' }), 'pub.md': memoryNote({ title: 'U' }) } });
  const root = makeTmpWorkspace({ git: true });
  withBrand(root, mem);
  const ws = loadWorkspace(root);
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Plano piloto' });
  return { ws, id };
}

test('RB-01: plano sem Brief aprovado não vale', () => {
  const plan = { frentes: [newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' })] };
  const v = validatePlan(plan, { ...approvedBrief(), estado: BRIEF_STATUS.DRAFT });
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.where === 'brief'));
});

test('RB-03: campanha só de audiência é válida com duas frentes', () => {
  const brief = approvedBrief('audiencia');
  const plan = newPlan({ campaignId: 'c1', brief });
  plan.frentes = [
    newFront({ tipo: 'conteudo', objetivo: 'explicar a tensão', metrica: 'salvamentos' }),
    newFront({ tipo: 'distribuicao', objetivo: 'alcançar o segmento', metrica: 'alcance', dependeDe: ['conteudo'] }),
  ];
  const v = validatePlan(plan, brief);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.deepEqual(plan.sugeridas, PURPOSES.audiencia.suggestedFronts);
  assert.equal(plan.sugeridas.includes('receita'), false, 'audiência não sugere receita');
});

test('campanha de venda sugere as cinco frentes e aceita as adicionais', () => {
  const brief = approvedBrief('venda');
  const plan = newPlan({ campaignId: 'c1', brief });
  assert.equal(plan.sugeridas.length, 5);
  plan.frentes = ['conteudo', 'distribuicao', 'conversao', 'receita', 'continuidade']
    .map((t) => newFront({ tipo: t, objetivo: `objetivo de ${t}`, metrica: `métrica de ${t}` }));
  assert.equal(validatePlan(plan, brief).ok, true);
});

test('frente sem métrica é recusada — frente que ninguém mede não se julga', () => {
  const brief = approvedBrief();
  const plan = newPlan({ campaignId: 'c1', brief });
  plan.frentes = [newFront({ tipo: 'conteudo', objetivo: 'o', metrica: null })];
  const v = validatePlan(plan, brief);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /sem métrica/.test(e.msg)));
});

test('frente sem objetivo e frente desconhecida são recusadas', () => {
  const brief = approvedBrief();
  const plan = newPlan({ campaignId: 'c1', brief });
  plan.frentes = [
    newFront({ tipo: 'conteudo', objetivo: '', metrica: 'm' }),
    newFront({ tipo: 'inexistente', objetivo: 'o', metrica: 'm' }),
  ];
  const v = validatePlan(plan, brief);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /sem objetivo/.test(e.msg)));
  assert.ok(v.errors.some((e) => /frente desconhecida/.test(e.msg)));
});

test('dependência ausente é erro nomeado', () => {
  const brief = approvedBrief();
  const plan = newPlan({ campaignId: 'c1', brief });
  plan.frentes = [newFront({ tipo: 'conversao', objetivo: 'o', metrica: 'm', dependeDe: ['conteudo'] })];
  const v = validatePlan(plan, brief);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /dependência ausente/.test(e.msg)));
});

test('dependência circular é detectada e nomeia o ciclo', () => {
  const fronts = [
    newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm', dependeDe: ['conversao'] }),
    newFront({ tipo: 'conversao', objetivo: 'o', metrica: 'm', dependeDe: ['conteudo'] }),
  ];
  const cycle = findDependencyCycle(fronts);
  assert.ok(cycle, 'ciclo precisa ser detectado');
  assert.ok(cycle.length >= 2);
  const brief = approvedBrief();
  const plan = { ...newPlan({ campaignId: 'c1', brief }), frentes: fronts };
  assert.equal(validatePlan(plan, brief).ok, false);
  assert.equal(executionOrder(plan), null, 'grafo cíclico não tem ordem — devolve null');
});

test('ordem de execução respeita dependências', () => {
  const brief = approvedBrief();
  const plan = newPlan({ campaignId: 'c1', brief });
  plan.frentes = [
    newFront({ tipo: 'distribuicao', objetivo: 'o', metrica: 'm', dependeDe: ['conteudo'] }),
    newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' }),
  ];
  const order = executionOrder(plan);
  assert.ok(order.indexOf('conteudo') < order.indexOf('distribuicao'));
});

test('RF-04: roteamento escolhe skills da frente, e não as de outra', () => {
  const conv = routeSkills('conversao');
  assert.ok(conv.includes('cro'));
  assert.ok(conv.includes('signup'));
  assert.equal(conv.includes('emails'), false, 'skill de continuidade não entra em conversão');

  const dist = routeSkills('distribuicao');
  assert.ok(dist.includes('ads'));
  assert.ok(dist.includes('ad-creative'));

  assert.deepEqual(routeSkills('frente-inexistente'), [], 'frente desconhecida não roteia nada');
});

test('RF-04: o problema refina o roteamento sem trocar a frente', () => {
  const base = routeSkills('conteudo');
  const comTeste = routeSkills('conteudo', 'quero rodar um teste A/B do hook');
  assert.ok(comTeste.includes('ab-testing'));
  for (const s of base) assert.ok(comTeste.includes(s), 'refino acrescenta, não remove');

  const comMetrica = routeSkills('distribuicao', 'como medir a atribuição disso');
  assert.ok(comMetrica.includes('analytics'));
  assert.ok(comMetrica.includes('attribution'));
});

test('RF-05.2: ativo com pipeline tem gate; ativo novo não finge ter', () => {
  assert.ok(gateForAsset('carrossel'), 'carrossel usa o pipeline de peça');
  assert.equal(gateForAsset('carrossel').pipeline, 'piece');
  assert.equal(gateForAsset('landing-page'), null, 'formato sem gate próprio devolve null, não um gate falso');
});

test('ativo sem tipo ou sem id é recusado', () => {
  const brief = approvedBrief();
  const plan = newPlan({ campaignId: 'c1', brief });
  const f = newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' });
  f.ativos = [{ tipo: 'carrossel' }, { id: 'zx-99' }];
  plan.frentes = [f];
  const v = validatePlan(plan, brief);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /ativo sem identificador/.test(e.msg)));
  assert.ok(v.errors.some((e) => /ativo sem tipo/.test(e.msg)));
});

test('savePlan recusa gravar plano inválido e grava o válido com commit', () => {
  const { ws, id } = setup();
  const brief = approvedBrief();
  const bad = { ...newPlan({ campaignId: id, brief }), frentes: [] };
  assert.throws(() => savePlan(ws, id, bad, brief), (e) => e.code === 'PLAN_INVALID');
  assert.equal(loadPlan(ws, id), null, 'plano inválido não chega ao disco');

  const good = { ...newPlan({ campaignId: id, brief }),
    frentes: [newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' })] };
  const r = savePlan(ws, id, good, brief);
  assert.equal(r.git.committed, true);
  assert.equal(loadPlan(ws, id).frentes.length, 1);
});

test('frente duplicada é recusada', () => {
  const brief = approvedBrief();
  const plan = newPlan({ campaignId: 'c1', brief });
  plan.frentes = [
    newFront({ tipo: 'conteudo', objetivo: 'a', metrica: 'm' }),
    newFront({ tipo: 'conteudo', objetivo: 'b', metrica: 'm' }),
  ];
  assert.ok(validatePlan(plan, brief).errors.some((e) => /duplicada/.test(e.msg)));
});

test('planBlockers expõe frente bloqueada e decisão pendente', () => {
  const f1 = newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' });
  const f2 = newFront({ tipo: 'receita', objetivo: 'o', metrica: 'm' });
  f2.estado = FRONT_STATUS.BLOCKED;
  f2.decisaoPendente = 'preço do Diagnóstico não definido';
  const b = planBlockers({ frentes: [f1, f2] });
  assert.equal(b.length, 1);
  assert.equal(b[0].frente, 'receita');
  assert.match(b[0].decisaoPendente, /preço/);
});

test('todas as frentes declaradas têm rótulo, finalidade e skills', () => {
  for (const [k, v] of Object.entries(FRONTS)) {
    assert.ok(v.label, `${k} sem rótulo`);
    assert.ok(v.purpose, `${k} sem finalidade`);
    assert.ok(v.skills.length, `${k} sem skills`);
  }
});
