// measure.js — medição honesta (M-01, M-02).
// Toda leitura carrega fórmula, denominador, fonte e data. A checagem de
// amostra roda em toda leitura comparativa: abaixo da significância, o
// rótulo "direcional" é imposto pelo código, não deixado ao otimismo.
import path from 'node:path';
import fs from 'node:fs';
import { isoNow, writeJson, exists, readJson } from './util.js';
import { commitDecision } from './gitio.js';

/**
 * Tamanho de amostra por variante para duas proporções.
 * baseline: taxa base (0..1), mde: lift relativo mínimo detectável (ex.: 0.2),
 * alpha 0.05 bicaudal, power 0.8 — os padrões da skill ab-testing.
 */
export function requiredSample(baseline, mde, { zAlpha = 1.96, zBeta = 0.8416 } = {}) {
  if (!(baseline > 0 && baseline < 1)) throw new Error('baseline deve estar em (0,1)');
  if (!(mde > 0)) throw new Error('mde deve ser > 0');
  const p1 = baseline;
  const p2 = Math.min(0.999, baseline * (1 + mde));
  const pBar = (p1 + p2) / 2;
  const num = zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((num * num) / ((p2 - p1) * (p2 - p1)));
}

/**
 * Registra uma leitura na peça. Campos obrigatórios: metric, formula,
 * denominator, value, source. Comparativa (baseline+mde+sample presentes)
 * ganha o veredito da amostra.
 */
export function addReading(ws, piece, reading) {
  for (const f of ['metric', 'formula', 'denominator', 'value', 'source']) {
    if (reading[f] === undefined || reading[f] === null || String(reading[f]).trim() === '') {
      const e = new Error(`leitura exige o campo "${f}" (M-01) — número sem denominador é decoração`);
      e.code = 'READING_INCOMPLETE';
      throw e;
    }
  }
  const entry = { ...reading, date: reading.date || isoNow().slice(0, 10) };

  if (reading.baseline !== undefined && reading.mde !== undefined && reading.sample !== undefined) {
    const need = requiredSample(Number(reading.baseline), Number(reading.mde));
    entry.requiredSample = need;
    entry.label = Number(reading.sample) >= need ? 'significativa' : 'direcional (H)';
  } else {
    entry.label = 'direcional (H)'; // sem desenho de teste, nenhuma leitura vira E
  }

  const file = path.join(piece.dir, 'readings.json');
  const data = exists(file) ? readJson(file) : { pieceId: piece.id, readings: [] };
  data.readings.push(entry);
  writeJson(file, data);
  const git = commitDecision(ws.root, [file],
    `leitura: ${piece.id} — ${entry.metric} = ${entry.value} [${entry.label}]`);
  return { entry, file, git };
}

export function loadReadings(piece) {
  const file = path.join(piece.dir, 'readings.json');
  return fs.existsSync(file) ? readJson(file) : { pieceId: piece.id, readings: [] };
}

// ---------------------------------------------------------------------------
// Medição de campanha (RF-07)
// ---------------------------------------------------------------------------

/** Rótulos de leitura. `insuficiente` existe para RF-07.4. */
export const READING_LABEL = {
  SIGNIFICANT: 'significativa',
  DIRECTIONAL: 'direcional (H)',
  INSUFFICIENT: 'insuficiente — sem dados',
};

/**
 * Registra leitura de campanha (RF-07.2). Além do que a leitura de peça exige,
 * cobra responsável e frequência: métrica sem dono e sem cadência não é
 * acompanhada, é decorada.
 *
 * `primary` opcional: quando a leitura é da métrica primária do Brief, o
 * vínculo fica gravado — é o que liga resultado a hipótese (Fase 4).
 *
 * Falta de dado NÃO vira resultado (RF-07.4): vira leitura insuficiente,
 * rotulada pelo código.
 */
export function addCampaignReading(ws, campaignId, reading) {
  for (const f of ['metric', 'formula', 'source', 'responsavel', 'frequencia']) {
    if (reading[f] === undefined || reading[f] === null || String(reading[f]).trim() === '') {
      const e = new Error(`leitura de campanha exige o campo "${f}" (RF-07.2)`);
      e.code = 'READING_INCOMPLETE';
      throw e;
    }
  }

  const noData = reading.value === undefined || reading.value === null || String(reading.value).trim() === '';
  const entry = {
    ...reading,
    campanha: campaignId,
    date: reading.date || isoNow().slice(0, 10),
    primary: Boolean(reading.primary),
    limitacoes: reading.limitacoes || null,
  };

  if (noData) {
    // RF-07.4: ausência de dado é lacuna declarada, nunca resultado.
    entry.value = null;
    entry.label = READING_LABEL.INSUFFICIENT;
  } else if (!reading.denominator || String(reading.denominator).trim() === '') {
    // M-01 vale igual aqui: número sem denominador é decoração.
    entry.label = READING_LABEL.INSUFFICIENT;
    entry.limitacoes = [entry.limitacoes, 'sem denominador declarado'].filter(Boolean).join('; ');
  } else if (reading.baseline !== undefined && reading.mde !== undefined && reading.sample !== undefined) {
    const need = requiredSample(Number(reading.baseline), Number(reading.mde));
    entry.requiredSample = need;
    entry.label = Number(reading.sample) >= need ? READING_LABEL.SIGNIFICANT : READING_LABEL.DIRECTIONAL;
  } else {
    entry.label = READING_LABEL.DIRECTIONAL;
  }

  // RF-07.3: leitura direcional ou insuficiente nunca carrega leitura causal.
  if (entry.label !== READING_LABEL.SIGNIFICANT && entry.interpretacao) {
    entry.interpretacao = String(entry.interpretacao);
    entry.avisoCausal = 'leitura não significativa — a interpretação é hipótese, não causa estabelecida';
  }

  const file = path.join(ws.campaignDir(campaignId), 'readings.json');
  const data = exists(file) ? readJson(file) : { campanha: campaignId, readings: [] };
  data.readings.push(entry);
  writeJson(file, data);
  const git = commitDecision(ws.root, [file],
    `leitura: campanha ${campaignId} — ${entry.metric} = ${entry.value ?? 'sem dado'} [${entry.label}]`);
  return { entry, file, git };
}

/**
 * Confronta as leituras com a métrica primária declarada no Brief (Fase 4).
 * Não conclui nada: diz se há leitura da métrica primária e com que força.
 */
export function primaryMetricStatus(brief, readings) {
  // `typeof null === 'object'`: sem a checagem de nulo, um Brief sem métrica
  // cairia no ramo de objeto e estouraria.
  const raw = brief?.metricaPrimaria ?? null;
  const metric = raw && typeof raw === 'object' ? raw.metric : raw;
  if (!metric) return { declared: false, why: 'Brief sem métrica primária' };
  const hits = (readings?.readings || []).filter(
    (r) => r.primary || String(r.metric).toLowerCase() === String(metric).toLowerCase());
  if (!hits.length) return { declared: true, metric, measured: false, why: 'métrica primária declarada, ainda sem leitura' };
  const best = hits.reduce((a, b) => {
    const rank = (x) => (x.label === READING_LABEL.SIGNIFICANT ? 2 : x.label === READING_LABEL.DIRECTIONAL ? 1 : 0);
    return rank(b) > rank(a) ? b : a;
  });
  return { declared: true, metric, measured: true, label: best.label, reading: best, count: hits.length };
}
