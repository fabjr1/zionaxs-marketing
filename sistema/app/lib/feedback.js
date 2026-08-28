// feedback.js — Registro de Feedback humano (RF-08.1, RF-08.2, RB-07).
//
// A distinção que este módulo protege: preferência, falha de execução,
// hipótese e resultado mensurado são coisas diferentes e não podem ser
// mescladas (RB-07). "Não gostei do azul" e "o gate G5 reprovou" e "acho que
// carrossel converte mais" têm forças de evidência incompatíveis — tratá-las
// igual é como um feedback isolado vira regra.
//
// Feedback contraditório é preservado, nunca sobrescrito (§12).
import fs from 'node:fs';
import path from 'node:path';
import { isoNow, writeJson, readJson, exists, ensureDir, slug } from './util.js';
import { commitDecision } from './gitio.js';

/**
 * Classificações. `forcaEvidencia` ordena o quanto uma observação pode
 * sustentar uma regra futura — usada pelo proponente de aprendizado.
 */
export const CLASSIFICATIONS = {
  preferencia: {
    label: 'Preferência',
    describe: 'gosto ou escolha editorial do responsável',
    forcaEvidencia: 1,
  },
  'falha-execucao': {
    label: 'Falha de execução',
    describe: 'o sistema ou a peça não fez o que deveria fazer',
    forcaEvidencia: 3,
  },
  hipotese: {
    label: 'Hipótese',
    describe: 'suposição sobre causa ou efeito, ainda não medida',
    forcaEvidencia: 1,
  },
  'resultado-medido': {
    label: 'Resultado mensurado',
    describe: 'leitura com fonte e denominador',
    forcaEvidencia: 4,
  },
};

export const TARGET_KINDS = ['campanha', 'frente', 'ativo'];

export const FEEDBACK_OUTCOME = {
  PENDING: 'pendente',
  LEARNING_PROPOSED: 'aprendizado proposto',
  DISMISSED: 'sem desdobramento',
};

function feedbackDir(ws, campaignId) {
  return path.join(ws.campaignDir(campaignId), 'feedback');
}

/**
 * Registra devolutiva. Exige alvo, observação e ao menos uma classificação —
 * devolutiva sem alvo não é acionável, e sem classificação não é julgável.
 */
export function addFeedback(ws, campaignId, input) {
  const { alvoTipo, alvoId = null, observacao, classificacoes, origem = 'humano' } = input || {};

  if (!TARGET_KINDS.includes(alvoTipo)) {
    const e = new Error(`alvo inválido: ${alvoTipo} (use: ${TARGET_KINDS.join(', ')})`);
    e.code = 'FEEDBACK_TARGET';
    throw e;
  }
  if ((alvoTipo === 'frente' || alvoTipo === 'ativo') && (!alvoId || !String(alvoId).trim())) {
    const e = new Error(`feedback de ${alvoTipo} exige o identificador do alvo`);
    e.code = 'FEEDBACK_TARGET';
    throw e;
  }
  if (!observacao || !String(observacao).trim()) {
    const e = new Error('feedback exige observação — o que foi observado, em palavras suas');
    e.code = 'FEEDBACK_EMPTY';
    throw e;
  }
  const list = Array.isArray(classificacoes) ? classificacoes : [classificacoes].filter(Boolean);
  if (!list.length) {
    const e = new Error(`feedback exige ao menos uma classificação (${Object.keys(CLASSIFICATIONS).join(', ')})`);
    e.code = 'FEEDBACK_UNCLASSIFIED';
    throw e;
  }
  for (const c of list) {
    if (!CLASSIFICATIONS[c]) {
      const e = new Error(`classificação inválida: ${c} (use: ${Object.keys(CLASSIFICATIONS).join(', ')})`);
      e.code = 'FEEDBACK_CLASSIFICATION';
      throw e;
    }
  }

  const at = isoNow();
  const id = `${at.slice(0, 10)}-${slug(String(observacao).slice(0, 40)) || 'devolutiva'}`;
  const dir = ensureDir(feedbackDir(ws, campaignId));
  // Colisão no mesmo dia com o mesmo texto vira sufixo; nada é sobrescrito.
  let file = path.join(dir, `${id}.json`);
  let n = 2;
  while (exists(file)) { file = path.join(dir, `${id}-${String(n).padStart(2, '0')}.json`); n++; }

  const entry = {
    id: path.basename(file, '.json'),
    campanha: campaignId,
    alvoTipo, alvoId,
    observacao: String(observacao).trim(),
    classificacoes: list,
    causa: input.causa ? String(input.causa).trim() : null,
    origem,
    registradoEm: at,
    desdobramento: FEEDBACK_OUTCOME.PENDING,
    propostaAprendizado: null,
  };
  writeJson(file, entry);
  const git = commitDecision(ws.root, [file],
    `campanha: devolutiva em ${campaignId} — ${list.join('/')} sobre ${alvoTipo}${alvoId ? ' ' + alvoId : ''}`);
  return { file, entry, git };
}

export function listFeedback(ws, campaignId) {
  const dir = feedbackDir(ws, campaignId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const e = readJson(path.join(dir, f));
      e._file = path.join(dir, f);
      return e;
    });
}

export function loadFeedback(ws, campaignId, feedbackId) {
  const f = path.join(feedbackDir(ws, campaignId), `${feedbackId}.json`);
  if (!exists(f)) return null;
  const e = readJson(f);
  e._file = f;
  return e;
}

export function updateFeedback(ws, campaignId, feedbackId, patch) {
  const cur = loadFeedback(ws, campaignId, feedbackId);
  if (!cur) throw new Error(`devolutiva não encontrada: ${feedbackId}`);
  const next = { ...cur, ...patch };
  delete next._file;
  writeJson(cur._file, next);
  return { file: cur._file, entry: next };
}

/**
 * Devolutivas contraditórias sobre o mesmo alvo (§12).
 * Não decide qual vale: agrupa e devolve para decisão humana.
 */
export function contradictions(entries) {
  const byTarget = new Map();
  for (const e of entries) {
    const key = `${e.alvoTipo}:${e.alvoId || '-'}`;
    const list = byTarget.get(key) || [];
    list.push(e);
    byTarget.set(key, list);
  }
  const out = [];
  for (const [key, list] of byTarget) {
    if (list.length < 2) continue;
    // Sinal de contradição: mesma alvo, classificações de forças diferentes,
    // sendo ao menos uma preferência e ao menos um resultado medido.
    const kinds = new Set(list.flatMap((e) => e.classificacoes));
    if (kinds.has('preferencia') && kinds.has('resultado-medido')) {
      out.push({ alvo: key, entries: list.map((e) => e.id),
        why: 'preferência e resultado mensurado sobre o mesmo alvo — decida qual governa' });
    }
  }
  return out;
}
