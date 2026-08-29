// brief.js — Contrato de Brief de Campanha (RF-02, RB-01, RB-03).
//
// O Brief existe para impedir uma coisa específica: começar produção como se
// objetivo, público e ação desejada estivessem decididos quando não estão.
// Por isso a aprovação do Brief é gate do Plano, e a aprovação recusa enquanto
// houver campo mínimo faltando ou lacuna bloqueante no contexto.
//
// O propósito não é decorativo: ele determina quais frentes e qual métrica a
// campanha exige (RB-03). Uma campanha de audiência não deve ser obrigada a
// declarar oferta; uma de venda, sim.
import path from 'node:path';
import { isoNow, writeJson, readJson, exists, sha256, assertSafeId } from './util.js';
import { commitDecision } from './gitio.js';
import { blockingGaps } from './memory.js';

/**
 * Propósitos suportados (RF-02). Cada um declara o que a campanha exige e
 * quais frentes são plausíveis — é assim que "campanha de audiência não
 * precisa de preço" deixa de ser exceção manual e vira escopo declarado.
 */
export const PURPOSES = {
  venda: {
    label: 'Venda',
    requiresOffer: true,
    suggestedFronts: ['conteudo', 'distribuicao', 'conversao', 'receita', 'continuidade'],
  },
  audiencia: {
    label: 'Aquisição de audiência',
    requiresOffer: false,
    suggestedFronts: ['conteudo', 'distribuicao'],
  },
  divulgacao: {
    label: 'Divulgação',
    requiresOffer: false,
    suggestedFronts: ['conteudo', 'distribuicao'],
  },
  autoridade: {
    label: 'Autoridade',
    requiresOffer: false,
    suggestedFronts: ['conteudo', 'distribuicao'],
  },
  retencao: {
    label: 'Retenção',
    requiresOffer: false,
    suggestedFronts: ['continuidade', 'conteudo'],
  },
  teste: {
    label: 'Teste',
    requiresOffer: false,
    suggestedFronts: ['conteudo'],
  },
};

export const BRIEF_STATUS = { DRAFT: 'rascunho', APPROVED: 'aprovado' };

/** Campos exigidos de todo Brief, com a pergunta que o agente deve fazer. */
export const FIELDS = [
  { key: 'marca', label: 'Marca', ask: 'A qual marca esta campanha pertence?' },
  { key: 'proposito', label: 'Propósito', ask: 'Esta campanha é de venda, audiência, divulgação, autoridade, retenção ou teste?' },
  { key: 'objetivo', label: 'Objetivo', ask: 'Que resultado esta campanha pretende produzir?' },
  { key: 'publico', label: 'Público', ask: 'A qual segmento, persona ou recorte ela se dirige?' },
  { key: 'acaoDesejada', label: 'Ação desejada', ask: 'O que o público deve fazer depois de ver a campanha?' },
  { key: 'metricaPrimaria', label: 'Métrica primária', ask: 'Que medida define o sucesso desse objetivo?' },
  { key: 'criterioAprovacao', label: 'Critério de aprovação e encerramento', ask: 'O que valida a campanha, e em que condição ela deve ser reavaliada ou encerrada?' },
];

/** Campos exigidos apenas quando o propósito os torna necessários (RB-03). */
export const CONDITIONAL_FIELDS = [
  { key: 'oferta', label: 'Oferta', when: (b) => PURPOSES[b.proposito]?.requiresOffer,
    ask: 'O que está sendo oferecido, e em que condições?' },
];

export function newBrief({ brand, campaignId }) {
  return {
    campanha: campaignId,
    marca: brand,
    proposito: null,
    objetivo: null,
    publico: null,
    oferta: null,
    acaoDesejada: null,
    canais: [],
    canaisAdiados: [],
    metricaPrimaria: null,
    metricasApoio: [],
    prazo: null,
    orcamento: null,
    restricoes: [],
    evidencias: [],
    limitesDeAlegacao: [],
    criterioAprovacao: null,
    estado: BRIEF_STATUS.DRAFT,
    aprovadoEm: null,
    aprovadoPor: null,
    criadoEm: isoNow(),
    atualizadoEm: isoNow(),
  };
}

function empty(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return !v.trim();
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Campos ainda pendentes. É esta lista que o agente usa para perguntar apenas
 * o que a Memory e o pedido não resolveram (RF-02) — e que o console mostra.
 */
export function pendingFields(brief) {
  const out = [];
  for (const f of FIELDS) {
    if (empty(brief?.[f.key])) out.push(f);
  }
  for (const f of CONDITIONAL_FIELDS) {
    if (f.when(brief || {}) && empty(brief?.[f.key])) out.push(f);
  }
  return out;
}

/**
 * Valida o Brief. Erros impedem aprovação; nenhum é aviso.
 * `contextPackage` opcional: lacuna bloqueante de contexto impede aprovar,
 * porque aprovar sobre lacuna é exatamente presumir a resposta (RB-02).
 */
export function validateBrief(brief, contextPackage = null) {
  const errors = [];
  const err = (where, msg) => errors.push({ where, msg });

  if (!brief || typeof brief !== 'object') {
    return { ok: false, errors: [{ where: 'brief', msg: 'brief ausente' }] };
  }
  for (const f of pendingFields(brief)) {
    err(f.key, `campo obrigatório ausente: ${f.label}`);
  }
  if (brief.proposito && !PURPOSES[brief.proposito]) {
    err('proposito', `propósito inválido: ${brief.proposito} (use: ${Object.keys(PURPOSES).join(', ')})`);
  }
  // RF-07.1: métrica primária existe para ser medida depois; sem fórmula ela
  // não sobrevive ao contato com a medição.
  if (brief.metricaPrimaria && typeof brief.metricaPrimaria === 'object' && !brief.metricaPrimaria.formula) {
    err('metricaPrimaria', 'métrica primária declarada como objeto precisa de fórmula');
  }
  // RB-04 e §12: alegação sem limite declarado é como a peça vaza afirmação
  // não suportada. Hipótese é legítima; hipótese silenciosa não.
  for (const [i, ev] of (brief.evidencias || []).entries()) {
    if (!ev || !ev.claim) err(`evidencias[${i}]`, 'evidência sem claim');
    else if (!['E', 'I', 'H', 'NC'].includes(ev.status)) {
      err(`evidencias[${i}]`, `status inválido: ${ev.status} (use E/I/H/NC)`);
    } else if (ev.status === 'E' && !ev.fonte) {
      err(`evidencias[${i}]`, 'afirmação E sem fonte — proibido');
    }
  }
  if (contextPackage) {
    for (const g of blockingGaps(contextPackage)) {
      err('contexto', `lacuna bloqueante não resolvida: ${g.what}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function briefFile(ws, campaignId) {
  assertSafeId(campaignId, 'id de campanha');
  return path.join(ws.campaignDir(campaignId), 'brief.json');
}

export function loadBrief(ws, campaignId) {
  const f = briefFile(ws, campaignId);
  return exists(f) ? readJson(f) : null;
}

/** Salva rascunho. Rascunho aceita campo faltando — é o ponto do rascunho. */
export function saveBrief(ws, campaignId, brief) {
  const f = briefFile(ws, campaignId);
  const next = { ...brief, atualizadoEm: isoNow() };
  writeJson(f, next);
  return { file: f, brief: next };
}

/**
 * Aprova o Brief (gate obrigatório do Plano, RB-01).
 * Alterar campo depois da aprovação invalida a aprovação — ver `applyEdits`.
 */
export function approveBrief(ws, campaignId, { brief, contextPackage, approvedBy = 'humano' }) {
  const v = validateBrief(brief, contextPackage);
  if (!v.ok) {
    const e = new Error(`brief não pode ser aprovado: ${v.errors.map((x) => `[${x.where}] ${x.msg}`).join('; ')}`);
    e.code = 'BRIEF_INCOMPLETE';
    e.errors = v.errors;
    throw e;
  }
  const next = {
    ...brief,
    estado: BRIEF_STATUS.APPROVED,
    aprovadoEm: isoNow(),
    aprovadoPor: approvedBy,
    atualizadoEm: isoNow(),
  };
  const f = briefFile(ws, campaignId);
  writeJson(f, next);
  const git = commitDecision(ws.root, [f], `campanha: aprova brief de ${campaignId} (${next.proposito})`);
  return { file: f, brief: next, git };
}

/**
 * Campos cuja alteração invalida um plano já montado (§12, "Brief rejeitado
 * ou alterado"). Mudar o propósito ou o público muda a campanha, não o texto.
 */
export const PLAN_INVALIDATING_FIELDS = ['proposito', 'objetivo', 'publico', 'oferta', 'acaoDesejada', 'metricaPrimaria'];

/**
 * Aplica edições devolvendo o Brief a rascunho quando a mudança for material.
 * Devolve { brief, invalidatesPlan, changed }.
 */
export function applyEdits(brief, edits) {
  const changed = [];
  const next = { ...brief };
  for (const [k, v] of Object.entries(edits || {})) {
    if (!(k in next)) continue;
    if (JSON.stringify(next[k]) === JSON.stringify(v)) continue;
    next[k] = v;
    changed.push(k);
  }
  const invalidatesPlan = changed.some((k) => PLAN_INVALIDATING_FIELDS.includes(k));
  if (invalidatesPlan && next.estado === BRIEF_STATUS.APPROVED) {
    next.estado = BRIEF_STATUS.DRAFT;
    next.aprovadoEm = null;
    next.aprovadoPor = null;
  }
  next.atualizadoEm = isoNow();
  return { brief: next, invalidatesPlan, changed };
}

export function isApproved(brief) {
  return Boolean(brief && brief.estado === BRIEF_STATUS.APPROVED && brief.aprovadoEm);
}

/**
 * Impressão digital da aprovação vigente do Brief.
 *
 * Mesmo idioma que amarra a aprovação de peça ao digest da geração: o plano
 * grava esta referência, e qualquer mudança material — ou uma reaprovação —
 * produz outra. Assim o plano antigo fica **verificavelmente** desatualizado
 * sem que nada seja apagado: o arquivo continua lá, com a referência da
 * aprovação sobre a qual ele foi construído.
 *
 * Devolve null quando não há aprovação vigente — e plano sem referência não
 * pode ser tratado como atual.
 */
export function briefApprovalRef(brief) {
  if (!isApproved(brief)) return null;
  const material = {};
  for (const k of PLAN_INVALIDATING_FIELDS) material[k] = brief[k] ?? null;
  material.aprovadoEm = brief.aprovadoEm;
  return sha256(JSON.stringify(material)).slice(0, 16);
}
