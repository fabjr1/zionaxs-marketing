// brief.test.js — RF-02, RB-01, RB-03 e §17 "Brief": campos mínimos, campo
// ausente, alteração que invalida plano, rascunho retomado, aprovação explícita.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorkspace } from '../lib/workspace.js';
import {
  newBrief, validateBrief, pendingFields, approveBrief, saveBrief, loadBrief,
  applyEdits, isApproved, PURPOSES, BRIEF_STATUS,
} from '../lib/brief.js';
import { createCampaign } from '../lib/campaigns.js';
import { makeTmpWorkspace, makeTmpMemory, memoryNote, withBrand } from './helpers.js';

function setup() {
  const mem = makeTmpMemory({
    notes: { 'pos.md': memoryNote({ title: 'P' }), 'pub.md': memoryNote({ title: 'U' }) },
  });
  const root = makeTmpWorkspace({ git: true });
  withBrand(root, mem);
  const ws = loadWorkspace(root);
  const { id } = createCampaign(ws, { brand: 'marca', nome: 'Campanha piloto' });
  return { ws, id };
}

function completeBrief(over = {}) {
  return {
    ...newBrief({ brand: 'marca', campaignId: 'c1' }),
    proposito: 'audiencia',
    objetivo: 'crescer audiência qualificada',
    publico: 'C1 sócio-operador contábil',
    acaoDesejada: 'seguir o perfil',
    metricaPrimaria: 'seguidores novos por semana',
    criterioAprovacao: 'encerra ao fim do ciclo ou se o CPM dobrar',
    ...over,
  };
}

test('brief novo nasce rascunho e lista todos os campos pendentes', () => {
  const b = newBrief({ brand: 'marca', campaignId: 'c1' });
  assert.equal(b.estado, BRIEF_STATUS.DRAFT);
  const pend = pendingFields(b);
  assert.ok(pend.length >= 6);
  for (const p of pend) assert.ok(p.ask, 'cada pendência carrega a pergunta a fazer');
});

test('todos os campos mínimos: válido', () => {
  const v = validateBrief(completeBrief());
  assert.equal(v.ok, true, JSON.stringify(v.errors));
});

test('campo obrigatório ausente: inválido, e a mensagem nomeia o campo', () => {
  const v = validateBrief(completeBrief({ metricaPrimaria: null }));
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.where === 'metricaPrimaria'));
});

test('RB-03: propósito de venda exige oferta; audiência não', () => {
  const venda = completeBrief({ proposito: 'venda' });
  assert.equal(validateBrief(venda).ok, false, 'venda sem oferta não passa');
  assert.ok(pendingFields(venda).some((f) => f.key === 'oferta'));

  venda.oferta = 'Diagnóstico de Retrabalho';
  assert.equal(validateBrief(venda).ok, true);

  const audiencia = completeBrief({ proposito: 'audiencia', oferta: null });
  assert.equal(validateBrief(audiencia).ok, true, 'audiência não é obrigada a ter oferta');
  assert.equal(PURPOSES.audiencia.requiresOffer, false);
});

test('propósito inválido é recusado', () => {
  const v = validateBrief(completeBrief({ proposito: 'qualquer-coisa' }));
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.where === 'proposito'));
});

test('evidência E sem fonte é proibida no brief', () => {
  const v = validateBrief(completeBrief({ evidencias: [{ claim: 'x', status: 'E' }] }));
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => /sem fonte/.test(e.msg)));
  const ok = validateBrief(completeBrief({ evidencias: [{ claim: 'x', status: 'E', fonte: '[S22]' }] }));
  assert.equal(ok.ok, true);
});

test('RB-02: lacuna bloqueante de contexto impede aprovar', () => {
  const pkg = { gaps: [{ severity: 'bloqueia', what: 'público sem referência', ask: 'declare' }], conflicts: [] };
  const v = validateBrief(completeBrief(), pkg);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.where === 'contexto'));
});

test('rascunho retomado: salva incompleto e recarrega', () => {
  const { ws, id } = setup();
  const b = newBrief({ brand: 'marca', campaignId: id });
  b.objetivo = 'meio preenchido';
  saveBrief(ws, id, b);
  const again = loadBrief(ws, id);
  assert.equal(again.objetivo, 'meio preenchido');
  assert.equal(again.estado, BRIEF_STATUS.DRAFT);
  assert.ok(pendingFields(again).length > 0);
});

test('aprovação explícita: recusa incompleto, aceita completo, commita', () => {
  const { ws, id } = setup();
  assert.throws(
    () => approveBrief(ws, id, { brief: newBrief({ brand: 'marca', campaignId: id }) }),
    (e) => e.code === 'BRIEF_INCOMPLETE');

  const r = approveBrief(ws, id, { brief: completeBrief(), approvedBy: 'fabiano' });
  assert.equal(isApproved(r.brief), true);
  assert.equal(r.brief.aprovadoPor, 'fabiano');
  assert.ok(r.brief.aprovadoEm);
  assert.equal(r.git.committed, true, 'toda decisão vira commit');
});

test('§12: alteração material revoga aprovação e invalida plano', () => {
  const approved = { ...completeBrief(), estado: BRIEF_STATUS.APPROVED, aprovadoEm: '2026-08-28T10:00:00-03:00', aprovadoPor: 'x' };

  const cosmetic = applyEdits(approved, { prazo: '4 semanas' });
  assert.equal(cosmetic.invalidatesPlan, false);
  assert.equal(isApproved(cosmetic.brief), true, 'campo não material preserva aprovação');

  const material = applyEdits(approved, { publico: 'outro público' });
  assert.equal(material.invalidatesPlan, true);
  assert.equal(isApproved(material.brief), false, 'mudar público revoga a aprovação');
  assert.equal(material.brief.estado, BRIEF_STATUS.DRAFT);
  assert.deepEqual(material.changed, ['publico']);
});

test('applyEdits ignora valor igual e chave desconhecida', () => {
  const b = completeBrief();
  const r = applyEdits(b, { objetivo: b.objetivo, inexistente: 'x' });
  assert.deepEqual(r.changed, []);
  assert.equal('inexistente' in r.brief, false);
});
