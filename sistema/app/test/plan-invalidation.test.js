// plan-invalidation.test.js — RB-01: nenhum plano ou produção permanece
// válido sem Brief aprovado.
//
// O defeito que estes testes fixam: uma alteração material revogava a
// aprovação do Brief, mas o plan.json persistido continuava sendo encontrado
// pela derivação de estado, e a campanha seguia em "produção".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadWorkspace } from '../lib/workspace.js';
import { buildContextPackage } from '../lib/memory.js';
import {
  newBrief, saveBrief, approveBrief, applyEdits, isApproved,
  briefApprovalRef, PLAN_INVALIDATING_FIELDS,
} from '../lib/brief.js';
import { newPlan, newFront, savePlan, loadPlan, isPlanCurrent } from '../lib/plan.js';
import {
  createCampaign, saveContextPackage, loadCampaign, nextAction, CAMPAIGN_STATUS,
} from '../lib/campaigns.js';
import { makeTmpWorkspace, makeTmpMemory, memoryNote, withBrand, fabricatePiece } from './helpers.js';

function setup() {
  const mem = makeTmpMemory({
    notes: { 'pos.md': memoryNote({ title: 'P' }), 'pub.md': memoryNote({ title: 'U' }) },
  });
  const root = makeTmpWorkspace({ git: true });
  withBrand(root, mem);
  const ws = loadWorkspace(root);
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Invalidacao' });
  saveContextPackage(ws, id, buildContextPackage(ws, { brandId: 'marca', campaignId: id }));
  return { ws, root, id };
}

function complete(campaignId) {
  return {
    ...newBrief({ brand: 'marca', campaignId }),
    proposito: 'audiencia', objetivo: 'crescer audiência', publico: 'C1',
    acaoDesejada: 'seguir', metricaPrimaria: 'salvamentos', criterioAprovacao: 'fim do ciclo',
  };
}

/** Aprova o Brief e salva um plano de uma frente. Devolve o Brief vigente. */
function approveAndPlan(ws, id, over = {}) {
  approveBrief(ws, id, { brief: { ...complete(id), ...over } });
  const brief = loadCampaign(ws, id).brief;
  savePlan(ws, id, {
    ...newPlan({ campaignId: id, brief }),
    frentes: [newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' })],
  }, brief);
  return brief;
}

test('a referência de aprovação muda com qualquer campo material', () => {
  const base = { ...complete('c1'), estado: 'aprovado', aprovadoEm: '2026-08-28T10:00:00-03:00' };
  const ref = briefApprovalRef(base);
  assert.ok(ref, 'brief aprovado tem referência');
  assert.equal(briefApprovalRef({ ...base, estado: 'rascunho' }), null, 'rascunho não tem referência');

  for (const campo of PLAN_INVALIDATING_FIELDS) {
    const mudado = { ...base, [campo]: `outro valor de ${campo}` };
    assert.notEqual(briefApprovalRef(mudado), ref, `mudar ${campo} precisa mudar a referência`);
  }
  // reaprovação também produz outra referência
  assert.notEqual(briefApprovalRef({ ...base, aprovadoEm: '2026-08-29T10:00:00-03:00' }), ref);
});

test('plano salvo carrega a referência da aprovação vigente', () => {
  const { ws, id } = setup();
  const brief = approveAndPlan(ws, id);
  const plan = loadPlan(ws, id);
  assert.equal(plan.briefRef, briefApprovalRef(brief));
  assert.equal(isPlanCurrent(plan, brief), true);
});

test('ciclo completo: alteração material derruba a produção e a reaprovação a devolve', () => {
  const { ws, id } = setup();
  approveAndPlan(ws, id);

  // 1) com plano e Brief aprovado, a campanha produz
  let c = loadCampaign(ws, id);
  assert.equal(c.status, CAMPAIGN_STATUS.PRODUCTION);
  assert.equal(c.planCurrent, true);

  // 2) alteração material: aprovação revogada, plano deixa de valer
  const { brief: rascunho, invalidatesPlan } = applyEdits(c.brief, { publico: 'outro segmento' });
  assert.equal(invalidatesPlan, true);
  saveBrief(ws, id, rascunho);

  c = loadCampaign(ws, id);
  assert.equal(isApproved(c.brief), false, 'o Brief voltou a rascunho');
  assert.notEqual(c.status, CAMPAIGN_STATUS.PRODUCTION, 'a campanha não pode continuar em produção');
  assert.equal(c.status, CAMPAIGN_STATUS.BLOCKED);
  assert.equal(c.planCurrent, false);
  assert.equal(c.planStale, true);
  assert.ok(c.blockers.some((b) => b.kind === 'plano'), 'o bloqueio nomeia o plano');

  // o histórico é preservado: nada foi apagado
  assert.ok(loadPlan(ws, id), 'o plan.json continua no disco como evidência');
  assert.equal(loadPlan(ws, id).frentes.length, 1);

  // 3) reaprovar não basta: o plano é de outra aprovação
  approveBrief(ws, id, { brief: loadCampaign(ws, id).brief });
  c = loadCampaign(ws, id);
  assert.equal(isApproved(c.brief), true);
  assert.equal(c.planCurrent, false, 'plano anterior continua fora de dia');
  assert.notEqual(c.status, CAMPAIGN_STATUS.PRODUCTION);

  // 4) salvar o plano de novo o recoloca em dia
  const brief = c.brief;
  savePlan(ws, id, {
    ...newPlan({ campaignId: id, brief }),
    frentes: [newFront({ tipo: 'conteudo', objetivo: 'novo objetivo', metrica: 'm' })],
  }, brief);
  c = loadCampaign(ws, id);
  assert.equal(c.planCurrent, true);
  assert.equal(c.status, CAMPAIGN_STATUS.PRODUCTION);
  assert.equal(c.plan.frentes[0].objetivo, 'novo objetivo', 'o plano foi substituído');
});

test('alteração NÃO material preserva aprovação e plano', () => {
  const { ws, id } = setup();
  approveAndPlan(ws, id);
  const c0 = loadCampaign(ws, id);
  const { brief, invalidatesPlan } = applyEdits(c0.brief, { prazo: '6 semanas' });
  assert.equal(invalidatesPlan, false);
  saveBrief(ws, id, brief);
  const c = loadCampaign(ws, id);
  assert.equal(isApproved(c.brief), true);
  assert.equal(c.planCurrent, true);
  assert.equal(c.status, CAMPAIGN_STATUS.PRODUCTION);
});

test('ativos de plano fora de dia não sustentam revisão nem aprovação', () => {
  const { ws, root, id } = setup();
  approveBrief(ws, id, { brief: complete(id) });
  let brief = loadCampaign(ws, id).brief;
  fabricatePiece(root, 'zx-inval', { pass: true });
  const front = newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' });
  front.ativos = [{ tipo: 'carrossel', id: 'zx-inval' }];
  savePlan(ws, id, { ...newPlan({ campaignId: id, brief }), frentes: [front] }, brief);

  let c = loadCampaign(ws, id);
  assert.equal(c.assets.length, 1);
  assert.equal(c.status, CAMPAIGN_STATUS.REVIEW);

  saveBrief(ws, id, applyEdits(c.brief, { objetivo: 'outro objetivo' }).brief);
  c = loadCampaign(ws, id);
  assert.equal(c.assets.length, 0, 'ativo de plano invalidado não conta');
  assert.equal(c.status, CAMPAIGN_STATUS.BLOCKED);
});

test('savePlan continua recusando plano sem Brief aprovado', () => {
  const { ws, id } = setup();
  saveBrief(ws, id, complete(id)); // rascunho
  const brief = loadCampaign(ws, id).brief;
  assert.throws(() => savePlan(ws, id, {
    ...newPlan({ campaignId: id, brief }),
    frentes: [newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' })],
  }, brief), (e) => e.code === 'PLAN_INVALID');
  assert.equal(loadPlan(ws, id), null);
});

test('plano legado sem briefRef não é tratado como vigente', () => {
  const { ws, id } = setup();
  const brief = approveAndPlan(ws, id);
  // simula um plano gravado antes deste mecanismo
  const f = path.join(ws.campaignDir(id), 'plan.json');
  const plan = JSON.parse(fs.readFileSync(f, 'utf8'));
  delete plan.briefRef;
  fs.writeFileSync(f, JSON.stringify(plan, null, 2));

  assert.equal(isPlanCurrent(loadPlan(ws, id), brief), false);
  const c = loadCampaign(ws, id);
  assert.notEqual(c.status, CAMPAIGN_STATUS.PRODUCTION);
  assert.ok(c.blockers.some((b) => b.kind === 'plano'));
});

test('próxima ação de plano fora de dia aponta o plano, não a produção', () => {
  const { ws, id } = setup();
  approveAndPlan(ws, id);
  saveBrief(ws, id, applyEdits(loadCampaign(ws, id).brief, { metricaPrimaria: 'outra' }).brief);
  const c = loadCampaign(ws, id);
  const na = nextAction(c);
  assert.match(na.what, /bloqueio/);
  assert.match(c.blockers[0].ask, /Reaprove o Brief/);
});
