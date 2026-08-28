// plan.js — Plano de Campanha e grafo de frentes (RF-03, RF-04, RB-03).
//
// A regra que este módulo existe para impor: não existe conjunto obrigatório
// de funil. O propósito escolhe as frentes, e as frentes que ficaram de fora
// por decisão estratégica são registradas — ausência deliberada é informação,
// ausência por esquecimento é defeito.
//
// Skills são roteadas pelo problema da frente, não por lista fixa (RF-04.1).
// O plano registra qual skill fundamentou cada frente, para revisão e
// reprodução (§10.3).
import path from 'node:path';
import { isoNow, writeJson, readJson, exists } from './util.js';
import { commitDecision } from './gitio.js';
import { PURPOSES, isApproved } from './brief.js';

/** Frentes possíveis (RF-03). Todas opcionais; nenhuma é obrigatória. */
export const FRONTS = {
  conteudo: {
    label: 'Conteúdo e atenção',
    purpose: 'Tornar a mensagem compreensível e memorável.',
    assets: ['carrossel', 'stories', 'video', 'post'],
    skills: ['copywriting', 'social', 'ad-creative', 'video', 'image'],
  },
  distribuicao: {
    label: 'Distribuição',
    purpose: 'Fazer o ativo chegar ao público.',
    assets: ['organico', 'midia-paga', 'parceria'],
    skills: ['ads', 'ad-creative', 'social', 'co-marketing', 'public-relations'],
  },
  conversao: {
    label: 'Conversão',
    purpose: 'Capturar ou mover o interessado para a próxima ação.',
    assets: ['landing-page', 'formulario', 'isca', 'agendamento'],
    skills: ['cro', 'copywriting', 'signup', 'lead-magnets', 'popups'],
  },
  receita: {
    label: 'Receita',
    purpose: 'Apresentar e concluir a proposta comercial.',
    assets: ['oferta', 'checkout', 'order-bump'],
    skills: ['offers', 'pricing', 'paywalls', 'sales-enablement'],
  },
  continuidade: {
    label: 'Continuidade',
    purpose: 'Sustentar relacionamento e retorno.',
    assets: ['email', 'nutricao', 'remarketing', 'acompanhamento'],
    skills: ['emails', 'churn-prevention', 'sms', 'referrals'],
  },
};

export const FRONT_STATUS = {
  PLANNED: 'planejada', PRODUCING: 'produção', REVIEW: 'revisão',
  APPROVED: 'aprovada', PUBLISHED: 'publicada', BLOCKED: 'bloqueada', DROPPED: 'fora de escopo',
};

/**
 * Tipos de ativo que já têm pipeline determinístico (contrato + 12 gates).
 * O resto entra como ativo declarado sem gate próprio — e o plano diz isso,
 * em vez de fingir que foi verificado (RF-05.2 / §12).
 */
export const ASSET_PIPELINES = {
  carrossel: { pipeline: 'piece', format: 'carousel-4x5', gates: 'os 12 gates de peça' },
  stories: { pipeline: 'piece', format: 'story-9x16', gates: 'os 12 gates de peça' },
  post: { pipeline: 'piece', format: 'static-1x1', gates: 'os 12 gates de peça' },
};

/** Gate declarado para um tipo de ativo, ou null quando ainda não existe. */
export function gateForAsset(assetType) {
  return ASSET_PIPELINES[assetType] || null;
}

/**
 * Roteia skills para uma frente (RF-04). O `problema` refina a escolha dentro
 * da frente; sem ele, devolve as skills base da frente.
 */
export function routeSkills(frontType, problema = null) {
  const front = FRONTS[frontType];
  if (!front) return [];
  if (!problema) return [...front.skills];
  const p = String(problema).toLowerCase();
  const extra = [];
  if (/\b(test|experimento|a\/b|ab)\b/.test(p)) extra.push('ab-testing');
  if (/\b(medi|métric|metric|analytic)/.test(p)) extra.push('analytics', 'attribution');
  if (/\b(preç|preco|pricing)/.test(p)) extra.push('pricing');
  if (/\b(seo|busca|orgânic|organic)/.test(p)) extra.push('seo-audit', 'ai-seo');
  if (/\b(concorr|competitor)/.test(p)) extra.push('competitors');
  return [...new Set([...front.skills, ...extra])];
}

export function newPlan({ campaignId, brief }) {
  const suggested = PURPOSES[brief?.proposito]?.suggestedFronts || [];
  return {
    campanha: campaignId,
    proposito: brief?.proposito || null,
    frentes: [],
    frentesExcluidas: [],
    sugeridas: suggested,
    criadoEm: isoNow(),
    atualizadoEm: isoNow(),
  };
}

export function newFront({ tipo, objetivo, metrica, dependeDe = [], skills = null, responsavel = null }) {
  return {
    tipo,
    objetivo: objetivo || null,
    estado: FRONT_STATUS.PLANNED,
    ativos: [],
    dependeDe,
    skills: skills || routeSkills(tipo, objetivo),
    metrica: metrica || null,
    responsavel,
    decisaoPendente: null,
    criadaEm: isoNow(),
  };
}

/** Detecta ciclo no grafo de dependências. Devolve o caminho, ou null. */
export function findDependencyCycle(fronts) {
  const byType = new Map(fronts.map((f) => [f.tipo, f]));
  const state = new Map(); // 0 visitando, 1 concluído
  let cycle = null;
  const visit = (type, trail) => {
    if (cycle) return;
    if (state.get(type) === 0) { cycle = [...trail.slice(trail.indexOf(type)), type]; return; }
    if (state.get(type) === 1) return;
    state.set(type, 0);
    for (const dep of byType.get(type)?.dependeDe || []) {
      if (byType.has(dep)) visit(dep, [...trail, type]);
    }
    state.set(type, 1);
  };
  for (const f of fronts) visit(f.tipo, []);
  return cycle;
}

/**
 * Valida o plano. Nenhum erro é aviso.
 * `brief` obrigatório: plano sem Brief aprovado não inicia produção (RB-01).
 */
export function validatePlan(plan, brief) {
  const errors = [];
  const err = (where, msg) => errors.push({ where, msg });

  if (!plan || typeof plan !== 'object') {
    return { ok: false, errors: [{ where: 'plan', msg: 'plano ausente' }] };
  }
  if (!isApproved(brief)) {
    err('brief', 'plano exige Brief aprovado antes de iniciar produção (RB-01)');
  }
  const fronts = plan.frentes || [];
  if (!fronts.length) err('frentes', 'plano sem nenhuma frente selecionada');

  const seen = new Set();
  fronts.forEach((f, i) => {
    const where = `frentes[${i}]`;
    if (!f.tipo) { err(where, 'frente sem tipo'); return; }
    if (!FRONTS[f.tipo]) err(where, `frente desconhecida: ${f.tipo} (use: ${Object.keys(FRONTS).join(', ')})`);
    if (seen.has(f.tipo)) err(where, `frente duplicada: ${f.tipo}`);
    seen.add(f.tipo);
    if (!f.objetivo || !String(f.objetivo).trim()) err(where, `frente "${f.tipo}" sem objetivo`);
    // RF-03: métrica por frente é obrigatória — frente que ninguém mede não
    // tem como ser julgada depois.
    if (!f.metrica || !String(f.metrica).trim()) err(where, `frente "${f.tipo}" sem métrica`);
    if (!Array.isArray(f.skills) || !f.skills.length) err(where, `frente "${f.tipo}" sem skill responsável`);
    for (const dep of f.dependeDe || []) {
      if (!fronts.some((x) => x.tipo === dep)) {
        err(where, `dependência ausente: "${f.tipo}" depende de "${dep}", que não está no plano`);
      }
    }
    for (const [j, a] of (f.ativos || []).entries()) {
      if (!a.tipo) err(`${where}.ativos[${j}]`, 'ativo sem tipo');
      if (!a.id) err(`${where}.ativos[${j}]`, 'ativo sem identificador');
    }
  });

  const cycle = findDependencyCycle(fronts.filter((f) => f.tipo));
  if (cycle) err('frentes', `dependência circular: ${cycle.join(' → ')}`);

  return { ok: errors.length === 0, errors };
}

export function planFile(ws, campaignId) {
  return path.join(ws.campaignDir(campaignId), 'plan.json');
}

export function loadPlan(ws, campaignId) {
  const f = planFile(ws, campaignId);
  return exists(f) ? readJson(f) : null;
}

/** Salva o plano. Recusa gravar plano inválido — plano inválido não orienta. */
export function savePlan(ws, campaignId, plan, brief) {
  const v = validatePlan(plan, brief);
  if (!v.ok) {
    const e = new Error(`plano inválido: ${v.errors.map((x) => `[${x.where}] ${x.msg}`).join('; ')}`);
    e.code = 'PLAN_INVALID';
    e.errors = v.errors;
    throw e;
  }
  const f = planFile(ws, campaignId);
  const next = { ...plan, atualizadoEm: isoNow() };
  writeJson(f, next);
  const git = commitDecision(ws.root, [f],
    `campanha: plano de ${campaignId} — ${next.frentes.map((x) => x.tipo).join(', ')}`);
  return { file: f, plan: next, git };
}

/**
 * Ordem de execução respeitando dependências. Devolve null se houver ciclo —
 * o chamador trata, ninguém executa um grafo cíclico "na melhor ordem".
 */
export function executionOrder(plan) {
  const fronts = (plan?.frentes || []).filter((f) => f.tipo);
  if (findDependencyCycle(fronts)) return null;
  const byType = new Map(fronts.map((f) => [f.tipo, f]));
  const out = [];
  const done = new Set();
  const visit = (type) => {
    if (done.has(type) || !byType.has(type)) return;
    done.add(type);
    for (const dep of byType.get(type).dependeDe || []) visit(dep);
    out.push(type);
  };
  for (const f of fronts) visit(f.tipo);
  return out;
}

/** Frentes bloqueadas ou com decisão pendente — alimenta o painel (§8.1). */
export function planBlockers(plan) {
  return (plan?.frentes || [])
    .filter((f) => f.estado === FRONT_STATUS.BLOCKED || f.decisaoPendente)
    .map((f) => ({
      frente: f.tipo,
      estado: f.estado,
      decisaoPendente: f.decisaoPendente || null,
    }));
}
