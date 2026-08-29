// campaigns.js — a campanha e a derivação do seu estado (§9.3).
//
// Mesma regra das peças: o estado NUNCA é um campo gravado. Ele é derivado dos
// artefatos presentes, do fim do ciclo para o começo. Um campo de estado pode
// mentir; um arquivo que existe, não.
//
// `bloqueada` tem precedência sobre o progresso: uma campanha com lacuna
// bloqueante ou decisão pendente não é "em produção", por mais arquivos que
// tenha (§9.3, §11.2).
import fs from 'node:fs';
import path from 'node:path';
import { isoNow, writeJson, readJson, exists, ensureDir, slug } from './util.js';
import { commitDecision } from './gitio.js';
import { listCampaignIds } from './workspace.js';
import { loadBrief, isApproved } from './brief.js';
import { loadPlan, planBlockers, isPlanCurrent, ASSET_PIPELINES } from './plan.js';
import { blockingGaps } from './memory.js';
import { listFeedback } from './feedback.js';
import { listProposals } from './learning.js';
import { loadPiece, STATUS as PIECE_STATUS } from './pieces.js';

export const CAMPAIGN_STATUS = {
  DRAFT: 'rascunho',
  CONTEXT: 'contextualização',
  BRIEFING: 'briefing',
  PLANNING: 'planejamento',
  PRODUCTION: 'produção',
  REVIEW: 'revisão',
  APPROVED: 'aprovada',
  PUBLISHED: 'publicada',
  MEASURING: 'medição',
  CLOSED: 'encerrada',
  BLOCKED: 'bloqueada',
};

export function campaignFile(ws, id) { return path.join(ws.campaignDir(id), 'campaign.json'); }
export function contextFile(ws, id) { return path.join(ws.campaignDir(id), 'context.json'); }
export function readingsFile(ws, id) { return path.join(ws.campaignDir(id), 'readings.json'); }

/** Cria a campanha. Marca é obrigatória: §12, "Marca não identificada". */
export function createCampaign(ws, { brand, nome, id = null }) {
  if (!brand || !String(brand).trim()) {
    const e = new Error('campanha exige marca identificada antes de consultar ou produzir (RB-01)');
    e.code = 'CAMPAIGN_NO_BRAND';
    throw e;
  }
  if (!nome || !String(nome).trim()) {
    const e = new Error('campanha exige nome');
    e.code = 'CAMPAIGN_NO_NAME';
    throw e;
  }
  const cid = id || `${slug(brand)}-${slug(nome)}`.slice(0, 80);
  const file = campaignFile(ws, cid);
  if (exists(file)) {
    const e = new Error(`campanha já existe: ${cid}`);
    e.code = 'CAMPAIGN_EXISTS';
    throw e;
  }
  ensureDir(ws.campaignDir(cid));
  const entity = {
    id: cid,
    marca: brand,
    nome: String(nome).trim(),
    criadaEm: isoNow(),
    encerrada: null,
  };
  writeJson(file, entity);
  const git = commitDecision(ws.root, [file], `campanha: abre ${cid} (${brand})`);
  return { id: cid, file, campaign: entity, git };
}

export function saveContextPackage(ws, campaignId, pkg) {
  const f = contextFile(ws, campaignId);
  writeJson(f, pkg);
  const git = commitDecision(ws.root, [f], `campanha: contexto de ${campaignId} (${(pkg.sources || []).length} fontes, ${(pkg.gaps || []).length} lacunas)`);
  return { file: f, git };
}

export function loadContextPackage(ws, campaignId) {
  const f = contextFile(ws, campaignId);
  return exists(f) ? readJson(f) : null;
}

export function loadReadings(ws, campaignId) {
  const f = readingsFile(ws, campaignId);
  return exists(f) ? readJson(f) : { campanha: campaignId, readings: [] };
}

/**
 * Ativos de peça referenciados pelo plano, com o estado real da peça.
 * É por aqui que a campanha herda os gates e o digest já existentes (RF-05.1).
 */
export function planAssets(ws, plan) {
  const out = [];
  for (const front of plan?.frentes || []) {
    for (const a of front.ativos || []) {
      const pipe = ASSET_PIPELINES[a.tipo];
      const piece = pipe?.pipeline === 'piece' ? loadPiece(ws, a.id) : null;
      out.push({
        frente: front.tipo,
        tipo: a.tipo,
        id: a.id,
        pipeline: pipe?.pipeline || null,
        gate: pipe?.gates || null,
        piece,
        // Ativo sem pipeline determinístico é declarado, não verificado —
        // e o console diz isso em vez de fingir aprovação (RF-05.2).
        verificado: Boolean(piece),
        estadoPeca: piece?.status || null,
      });
    }
  }
  return out;
}

/** Carrega tudo que existe de uma campanha e deriva o estado. */
export function loadCampaign(ws, id) {
  const file = campaignFile(ws, id);
  if (!exists(file)) return null;
  const c = {
    id, dir: ws.campaignDir(id),
    campaign: readJson(file),
    context: loadContextPackage(ws, id),
    brief: loadBrief(ws, id),
    plan: loadPlan(ws, id),
    feedback: listFeedback(ws, id),
    proposals: listProposals(ws, id),
    readings: loadReadings(ws, id),
    assets: [],
    blockers: [],
    status: CAMPAIGN_STATUS.DRAFT,
  };
  // O plano só conta como vigente se corresponder à aprovação atual do Brief.
  // Um plano persistido de uma aprovação revogada continua no disco como
  // evidência, mas não sustenta produção.
  c.planCurrent = isPlanCurrent(c.plan, c.brief);
  c.planStale = Boolean(c.plan) && !c.planCurrent;
  c.assets = c.planCurrent ? planAssets(ws, c.plan) : [];

  // ---- bloqueios: lacuna de contexto, frente bloqueada, decisão pendente ----
  for (const g of blockingGaps(c.context)) {
    c.blockers.push({ kind: 'contexto', what: g.what, ask: g.ask });
  }
  // RB-01: Brief não aprovado é barreira ANTERIOR a qualquer plano persistido.
  // Sem isso, um plano de uma aprovação revogada deixava a campanha em
  // "produção" com o Brief em rascunho.
  if (c.planStale) {
    c.blockers.push({
      kind: 'plano',
      what: isApproved(c.brief)
        ? 'plano desatualizado — foi construído sobre uma aprovação anterior do Brief'
        : 'plano desatualizado — o Brief mudou depois da aprovação e voltou a rascunho',
      ask: 'Reaprove o Brief e salve o plano novamente. O plano anterior fica no arquivo como evidência.',
    });
  }
  for (const b of planBlockers(c.planCurrent ? c.plan : null)) {
    c.blockers.push({ kind: 'frente', what: `frente "${b.frente}" ${b.estado}`, ask: b.decisaoPendente });
  }

  // ---- derivação do estado, do fim para o começo ----
  const published = c.assets.filter((a) => a.estadoPeca === PIECE_STATUS.PUBLISHED);
  const approved = c.assets.filter((a) => a.estadoPeca === PIECE_STATUS.APPROVED);
  const inReview = c.assets.filter((a) => a.estadoPeca === PIECE_STATUS.REVIEW || a.estadoPeca === PIECE_STATUS.RED);

  if (c.campaign.encerrada) c.status = CAMPAIGN_STATUS.CLOSED;
  else if (c.blockers.length) c.status = CAMPAIGN_STATUS.BLOCKED;
  else if ((c.readings.readings || []).length) c.status = CAMPAIGN_STATUS.MEASURING;
  else if (published.length) c.status = CAMPAIGN_STATUS.PUBLISHED;
  else if (c.assets.length && approved.length === c.assets.length) c.status = CAMPAIGN_STATUS.APPROVED;
  else if (inReview.length) c.status = CAMPAIGN_STATUS.REVIEW;
  else if (c.planCurrent) c.status = CAMPAIGN_STATUS.PRODUCTION;
  else if (isApproved(c.brief)) c.status = CAMPAIGN_STATUS.PLANNING;
  else if (c.brief) c.status = CAMPAIGN_STATUS.BRIEFING;
  else if (c.context) c.status = CAMPAIGN_STATUS.CONTEXT;
  else c.status = CAMPAIGN_STATUS.DRAFT;

  return c;
}

export function loadAllCampaigns(ws) {
  return listCampaignIds(ws).map((id) => loadCampaign(ws, id)).filter(Boolean);
}

/**
 * Próxima ação da campanha — o que o console mostra na fila (§11.1).
 * Sempre devolve algo acionável; "em dia" também é resposta.
 */
export function nextAction(c) {
  if (!c) return { what: 'campanha inexistente', where: null };
  if (c.status === CAMPAIGN_STATUS.CLOSED) return { what: 'encerrada', where: null };
  if (c.blockers.length) {
    return { what: `resolver bloqueio: ${c.blockers[0].what}`, where: c.blockers[0].kind };
  }
  if (!c.context) return { what: 'consultar contexto da Memory', where: 'contexto' };
  if (!c.brief) return { what: 'iniciar o Brief', where: 'brief' };
  if (!isApproved(c.brief)) return { what: 'completar e aprovar o Brief', where: 'brief' };
  if (!c.planCurrent) return { what: 'montar o plano de frentes', where: 'plano' };
  if (!c.assets.length) return { what: 'declarar ativos nas frentes', where: 'plano' };
  const pending = c.assets.filter((a) => a.estadoPeca && a.estadoPeca !== 'aprovada' && a.estadoPeca !== 'publicada');
  if (pending.length) return { what: `revisar ativo ${pending[0].id} (${pending[0].estadoPeca})`, where: 'ativo' };
  if (!(c.readings.readings || []).length) return { what: 'registrar leitura da métrica primária', where: 'medição' };
  const openFeedback = c.feedback.filter((f) => f.desdobramento === 'pendente');
  if (openFeedback.length) return { what: `dar desdobramento à devolutiva ${openFeedback[0].id}`, where: 'feedback' };
  const openProposals = c.proposals.filter((p) => p.estado === 'proposta na inbox');
  if (openProposals.length) return { what: `promover ou recusar "${openProposals[0].titulo}" na Memory`, where: 'aprendizado' };
  return { what: 'encerrar a campanha', where: 'campanha' };
}

/** Encerra a campanha. Exige critério declarado — §9.3 e RF-02. */
export function closeCampaign(ws, campaignId, { motivo, por = 'humano' }) {
  if (!motivo || !String(motivo).trim()) {
    const e = new Error('encerrar campanha exige motivo — encerramento sem registro é lacuna invisível');
    e.code = 'CLOSE_REASON';
    throw e;
  }
  const file = campaignFile(ws, campaignId);
  if (!exists(file)) throw new Error(`campanha não encontrada: ${campaignId}`);
  const c = readJson(file);
  const next = { ...c, encerrada: { motivo: String(motivo).trim(), por, em: isoNow() } };
  writeJson(file, next);
  const git = commitDecision(ws.root, [file], `campanha: encerra ${campaignId} — ${String(motivo).slice(0, 60)}`);
  return { file, campaign: next, git };
}
