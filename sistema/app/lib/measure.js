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
