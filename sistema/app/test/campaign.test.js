// campaign.test.js — §9.3 (estados derivados), RF-07 (medição) e §11.2.
// A regra que estes testes protegem: o estado da campanha NUNCA é gravado.
// Ele é derivado dos artefatos, e `bloqueada` vence o progresso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadWorkspace } from '../lib/workspace.js';
import {
  createCampaign, loadCampaign, loadAllCampaigns, saveContextPackage,
  closeCampaign, nextAction, CAMPAIGN_STATUS,
} from '../lib/campaigns.js';
import { newBrief, saveBrief, approveBrief, BRIEF_STATUS } from '../lib/brief.js';
import { newPlan, newFront, savePlan } from '../lib/plan.js';
import { addFeedback } from '../lib/feedback.js';
import { addCampaignReading, primaryMetricStatus, READING_LABEL } from '../lib/measure.js';
import { buildContextPackage } from '../lib/memory.js';
import { makeTmpWorkspace, makeTmpMemory, memoryNote, withBrand, fabricatePiece } from './helpers.js';

function setup() {
  const mem = makeTmpMemory({
    notes: { 'pos.md': memoryNote({ title: 'P' }), 'pub.md': memoryNote({ title: 'U' }) },
  });
  const root = makeTmpWorkspace({ git: true });
  withBrand(root, mem);
  const ws = loadWorkspace(root);
  return { ws, root, mem };
}

function completeBrief(campaignId) {
  return {
    ...newBrief({ brand: 'marca', campaignId }),
    proposito: 'audiencia', objetivo: 'o', publico: 'C1', acaoDesejada: 'a',
    metricaPrimaria: 'salvamentos por seguidor', criterioAprovacao: 'c',
  };
}

test('campanha exige marca e nome', () => {
  const { ws } = setup();
  assert.throws(() => createCampaign(ws, { brand: '', nome: 'x' }), (e) => e.code === 'CAMPAIGN_NO_BRAND');
  assert.throws(() => createCampaign(ws, { brand: 'marca', nome: '' }), (e) => e.code === 'CAMPAIGN_NO_NAME');
  const r = createCampaign(ws, { brand: 'marca', nome: 'Capacidade antes de oferta' });
  assert.equal(r.id, 'marca-capacidade-antes-de-oferta');
  assert.equal(r.git.committed, true);
  assert.throws(() => createCampaign(ws, { brand: 'marca', nome: 'Capacidade antes de oferta' }),
    (e) => e.code === 'CAMPAIGN_EXISTS');
});

test('§9.3: o estado percorre a sequência conforme os artefatos aparecem', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Piloto' });

  assert.equal(loadCampaign(ws, id).status, CAMPAIGN_STATUS.DRAFT);

  saveContextPackage(ws, id, buildContextPackage(ws, { brandId: 'marca', campaignId: id }));
  assert.equal(loadCampaign(ws, id).status, CAMPAIGN_STATUS.CONTEXT);

  saveBrief(ws, id, newBrief({ brand: 'marca', campaignId: id }));
  assert.equal(loadCampaign(ws, id).status, CAMPAIGN_STATUS.BRIEFING);

  approveBrief(ws, id, { brief: completeBrief(id) });
  assert.equal(loadCampaign(ws, id).status, CAMPAIGN_STATUS.PLANNING);

  const brief = loadCampaign(ws, id).brief;
  const plan = { ...newPlan({ campaignId: id, brief }),
    frentes: [newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' })] };
  savePlan(ws, id, plan, brief);
  assert.equal(loadCampaign(ws, id).status, CAMPAIGN_STATUS.PRODUCTION);
});

test('estado sobe para revisão e aprovada conforme o estado real da peça', () => {
  const { ws, root } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Com peça' });
  saveContextPackage(ws, id, buildContextPackage(ws, { brandId: 'marca', campaignId: id }));
  approveBrief(ws, id, { brief: completeBrief(id) });
  const brief = loadCampaign(ws, id).brief;

  fabricatePiece(root, 'zx-teste', { pass: true });
  const front = newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' });
  front.ativos = [{ tipo: 'carrossel', id: 'zx-teste' }];
  savePlan(ws, id, { ...newPlan({ campaignId: id, brief }), frentes: [front] }, brief);

  const c = loadCampaign(ws, id);
  assert.equal(c.assets.length, 1);
  assert.equal(c.assets[0].verificado, true, 'carrossel herda o pipeline de peça');
  assert.equal(c.assets[0].estadoPeca, 'em revisão');
  assert.equal(c.status, CAMPAIGN_STATUS.REVIEW);
});

test('RF-05.2: ativo sem pipeline é declarado, não verificado', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'LP' });
  saveContextPackage(ws, id, buildContextPackage(ws, { brandId: 'marca', campaignId: id }));
  approveBrief(ws, id, { brief: completeBrief(id) });
  const brief = loadCampaign(ws, id).brief;
  const front = newFront({ tipo: 'conversao', objetivo: 'o', metrica: 'm' });
  front.ativos = [{ tipo: 'landing-page', id: 'lp-diagnostico' }];
  savePlan(ws, id, { ...newPlan({ campaignId: id, brief }), frentes: [front] }, brief);

  const a = loadCampaign(ws, id).assets[0];
  assert.equal(a.verificado, false);
  assert.equal(a.gate, null, 'formato sem gate não recebe gate falso');
  assert.equal(a.estadoPeca, null);
});

test('§9.3: bloqueada vence o progresso', () => {
  const { ws, root } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Bloqueada' });
  // contexto com lacuna: referência declarada que não existe
  fs.writeFileSync(path.join(root, 'brands', 'marca', 'manifest.json'), JSON.stringify({
    id: 'marca', nome: 'marca',
    referencias: [
      { papel: 'posicionamento', caminho: 'pos.md' },
      { papel: 'publico', caminho: 'sumiu.md' },
    ],
  }));
  const ws2 = loadWorkspace(root);
  saveContextPackage(ws2, id, buildContextPackage(ws2, { brandId: 'marca', campaignId: id }));
  const c = loadCampaign(ws2, id);
  assert.equal(c.status, CAMPAIGN_STATUS.BLOCKED);
  assert.ok(c.blockers.length);
  assert.equal(c.blockers[0].kind, 'contexto');
  assert.match(nextAction(c).what, /resolver bloqueio/);
});

test('próxima ação acompanha o estágio da campanha', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Próxima' });
  assert.match(nextAction(loadCampaign(ws, id)).what, /contexto/);
  saveContextPackage(ws, id, buildContextPackage(ws, { brandId: 'marca', campaignId: id }));
  assert.match(nextAction(loadCampaign(ws, id)).what, /Brief/);
  saveBrief(ws, id, newBrief({ brand: 'marca', campaignId: id }));
  assert.match(nextAction(loadCampaign(ws, id)).what, /aprovar o Brief/);
  approveBrief(ws, id, { brief: completeBrief(id) });
  assert.match(nextAction(loadCampaign(ws, id)).what, /plano/);
});

test('encerrar exige motivo e é o estado final', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Fim' });
  assert.throws(() => closeCampaign(ws, id, { motivo: '' }), (e) => e.code === 'CLOSE_REASON');
  closeCampaign(ws, id, { motivo: 'ciclo terminou sem verba' });
  const c = loadCampaign(ws, id);
  assert.equal(c.status, CAMPAIGN_STATUS.CLOSED);
  assert.match(c.campaign.encerrada.motivo, /sem verba/);
});

test('loadAllCampaigns lista só diretórios com campaign.json', () => {
  const { ws, root } = setup();
  createCampaign(ws, { brand: 'marca', nome: 'Uma' });
  fs.mkdirSync(path.join(root, 'campaigns', 'lixo'), { recursive: true });
  assert.equal(loadAllCampaigns(ws).length, 1);
});

// ---------- medição (RF-07) ----------

test('RF-07.2: leitura de campanha exige responsável e frequência', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Medida' });
  assert.throws(() => addCampaignReading(ws, id, {
    metric: 'm', formula: 'a/b', source: 'ig', denominator: 'seguidores', value: 10,
  }), (e) => e.code === 'READING_INCOMPLETE');

  const r = addCampaignReading(ws, id, {
    metric: 'salvamentos', formula: 'salvamentos/alcance', denominator: 'alcance',
    value: 0.04, source: 'Instagram Insights', responsavel: 'fabiano', frequencia: 'semanal',
  });
  assert.equal(r.entry.label, READING_LABEL.DIRECTIONAL);
});

test('RF-07.4: falta de dado é leitura insuficiente, não resultado', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Sem dado' });
  const r = addCampaignReading(ws, id, {
    metric: 'salvamentos', formula: 'a/b', denominator: 'alcance', value: '',
    source: 'ig', responsavel: 'f', frequencia: 'semanal',
  });
  assert.equal(r.entry.label, READING_LABEL.INSUFFICIENT);
  assert.equal(r.entry.value, null);
});

test('número sem denominador é decoração — insuficiente', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Sem denominador' });
  const r = addCampaignReading(ws, id, {
    metric: 'curtidas', formula: 'contagem', value: 320,
    source: 'ig', responsavel: 'f', frequencia: 'semanal',
  });
  assert.equal(r.entry.label, READING_LABEL.INSUFFICIENT);
  assert.match(r.entry.limitacoes, /sem denominador/);
});

test('RF-07.3: leitura não significativa não carrega interpretação causal', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Causal' });
  const r = addCampaignReading(ws, id, {
    metric: 'ctr', formula: 'cliques/impressões', denominator: 'impressões', value: 0.03,
    source: 'ads', responsavel: 'f', frequencia: 'semanal',
    interpretacao: 'o hook novo causou o aumento',
  });
  assert.ok(r.entry.avisoCausal, 'direcional com interpretação precisa do aviso');
  assert.match(r.entry.avisoCausal, /hipótese, não causa/);
});

test('amostra suficiente promove a leitura a significativa', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Significativa' });
  const r = addCampaignReading(ws, id, {
    metric: 'conversão', formula: 'conv/visitas', denominator: 'visitas', value: 0.06,
    source: 'ga4', responsavel: 'f', frequencia: 'mensal',
    baseline: 0.05, mde: 0.2, sample: 100000,
  });
  assert.equal(r.entry.label, READING_LABEL.SIGNIFICANT);
  assert.ok(r.entry.requiredSample > 0);
  assert.equal(r.entry.avisoCausal, undefined);
});

test('primaryMetricStatus liga leitura à hipótese do Brief', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Primária' });
  const brief = completeBrief(id);

  assert.equal(primaryMetricStatus({ metricaPrimaria: null }, { readings: [] }).declared, false);

  const none = primaryMetricStatus(brief, { readings: [] });
  assert.equal(none.declared, true);
  assert.equal(none.measured, false);

  addCampaignReading(ws, id, {
    metric: 'salvamentos por seguidor', formula: 's/f', denominator: 'seguidores', value: 0.02,
    source: 'ig', responsavel: 'f', frequencia: 'semanal', primary: true,
  });
  const c = loadCampaign(ws, id);
  const st = primaryMetricStatus(brief, c.readings);
  assert.equal(st.measured, true);
  assert.equal(st.label, READING_LABEL.DIRECTIONAL);
  assert.equal(c.status, CAMPAIGN_STATUS.MEASURING);
});

test('devolutiva pendente aparece como próxima ação depois da medição', () => {
  const { ws } = setup();
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Devolutiva' });
  saveContextPackage(ws, id, buildContextPackage(ws, { brandId: 'marca', campaignId: id }));
  approveBrief(ws, id, { brief: completeBrief(id) });
  const brief = loadCampaign(ws, id).brief;
  const front = newFront({ tipo: 'conteudo', objetivo: 'o', metrica: 'm' });
  front.ativos = [{ tipo: 'carrossel', id: 'zx-inexistente' }];
  savePlan(ws, id, { ...newPlan({ campaignId: id, brief }), frentes: [front] }, brief);
  addCampaignReading(ws, id, {
    metric: 'x', formula: 'a/b', denominator: 'b', value: 1,
    source: 's', responsavel: 'f', frequencia: 'semanal',
  });
  addFeedback(ws, id, { alvoTipo: 'campanha', observacao: 'obs', classificacoes: ['preferencia'] });
  const c = loadCampaign(ws, id);
  assert.match(nextAction(c).what, /devolutiva/);
});
