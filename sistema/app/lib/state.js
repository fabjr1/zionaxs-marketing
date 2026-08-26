// state.js — o arquivo de estado do fluxo (F-01..F-06).
// Formato: o state.md especificado na skill marketing-os. Markdown porque é
// lido por gente com a mesma frequência que por agente. Parse tolerante a
// espaçamento, escrita sempre canônica.
import fs from 'node:fs';
import { today } from './util.js';

export const STAGES = [
  'foundation', 'evidence', 'strategy', 'offer', 'editorial',
  'production', 'review', 'distribution', 'measurement', 'operation',
];

export function parseState(text) {
  const s = {
    brand: null, stage: null, cycle: null, openSince: null, channel: null,
    gates: [], acceptedGaps: [], openDecisions: [], lastLearning: null,
  };
  const lines = String(text).split('\n');
  let section = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^# Marketing OS — (.+)$/))) { s.brand = m[1].trim(); continue; }
    if ((m = line.match(/^stage:\s*(\d+)/))) { s.stage = Number(m[1]); continue; }
    if ((m = line.match(/^cycle:\s*(\S+)/))) { s.cycle = m[1] === 'null' ? null : m[1]; continue; }
    if ((m = line.match(/^open_since:\s*(\S+)/))) { s.openSince = m[1] === 'null' ? null : m[1]; continue; }
    if ((m = line.match(/^channel:\s*(\S+)/))) { s.channel = m[1] === 'null' ? null : m[1]; continue; }
    if ((m = line.match(/^## (.+)$/))) { section = m[1].toLowerCase(); continue; }
    if (section === 'gates met' && (m = line.match(/^- \[([ x])\] (\d+) (\S+)\s*(?:→\s*(.*))?$/))) {
      s.gates.push({ met: m[1] === 'x', stage: Number(m[2]), name: m[3], pointer: (m[4] || '').trim() || null });
      continue;
    }
    if (section === 'accepted gaps' && line.startsWith('- ')) { s.acceptedGaps.push(line.slice(2)); continue; }
    if (section === 'open decisions' && line.startsWith('- ')) { s.openDecisions.push(line.slice(2)); continue; }
    if (section === 'last learning' && line.trim() && !line.startsWith('#')) {
      s.lastLearning = (s.lastLearning ? s.lastLearning + '\n' : '') + line.trim();
    }
  }
  return s;
}

export function serializeState(s) {
  const L = [];
  L.push(`# Marketing OS — ${s.brand}`);
  L.push('');
  L.push(`stage: ${s.stage}`);
  L.push(`cycle: ${s.cycle ?? 'null'}`);
  L.push(`open_since: ${s.openSince ?? 'null'}`);
  L.push(`channel: ${s.channel ?? 'null'}`);
  L.push('');
  L.push('## Gates met');
  for (const g of s.gates) {
    const box = g.met ? 'x' : ' ';
    const ptr = g.pointer ? `   → ${g.pointer}` : '';
    L.push(`- [${box}] ${g.stage} ${g.name}${ptr}`);
  }
  L.push('');
  L.push('## Accepted gaps');
  for (const g of s.acceptedGaps) L.push(`- ${g}`);
  L.push('');
  L.push('## Open decisions');
  for (const d of s.openDecisions) L.push(`- ${d}`);
  L.push('');
  L.push('## Last learning');
  if (s.lastLearning) L.push(s.lastLearning);
  L.push('');
  return L.join('\n');
}

export function loadState(file) {
  if (!fs.existsSync(file)) return null;
  return parseState(fs.readFileSync(file, 'utf8'));
}

export function saveState(file, s) {
  fs.writeFileSync(file, serializeState(s));
}

/**
 * Regra de gate com ponteiro (F-04): marcar exige artefato.
 */
export function setGate(state, stage, met, pointer) {
  const g = state.gates.find((x) => x.stage === stage);
  if (!g) throw new Error(`gate desconhecido: ${stage}`);
  if (met && (!pointer || !String(pointer).trim())) {
    throw new Error(`gate ${stage} não pode ser marcado sem ponteiro para artefato (F-04)`);
  }
  g.met = met;
  if (pointer) g.pointer = pointer;
  return state;
}

/** Lacuna aceita (F-05): data + estágio + motivo, sempre. */
export function acceptGap(state, stage, reason) {
  if (!reason || !reason.trim()) throw new Error('lacuna aceita exige motivo (F-05)');
  state.acceptedGaps.push(`${today()} · stage ${stage} · ${reason.trim()}`);
  return state;
}

/**
 * Abrir ciclo (F-03): recusa se já existe um aberto.
 * A escolha de terminar/abandonar/estacionar é do operador, não do código.
 */
export function openCycle(state, cycleId, channel) {
  if (state.cycle) {
    const e = new Error(`já existe ciclo aberto (${state.cycle}, desde ${state.openSince}) — termine, abandone ou estacione antes (F-03)`);
    e.code = 'CYCLE_OPEN';
    throw e;
  }
  state.cycle = cycleId;
  state.openSince = today();
  if (channel) state.channel = channel;
  return state;
}

/**
 * Fechar ciclo (F-06): exige aprendizado. Gates 4–8 resetam, 0–3 persistem.
 */
export function closeCycle(state, learning) {
  if (!state.cycle) throw new Error('não há ciclo aberto para fechar');
  if (!learning || !learning.trim()) {
    const e = new Error('fechar ciclo exige uma entrada de aprendizado não vazia (F-06)');
    e.code = 'LEARNING_REQUIRED';
    throw e;
  }
  state.lastLearning = `${today()} · ${learning.trim()}`;
  state.cycle = null;
  state.openSince = null;
  for (const g of state.gates) {
    if (g.stage >= 4 && g.stage <= 8) { g.met = false; g.pointer = null; }
  }
  return state;
}

/**
 * Roteamento (F-02): a regra da skill marketing-os, executável.
 * Devolve { action, stage?, reason }.
 */
export function route(state) {
  if (!state) return { action: 'start', stage: 0, reason: 'sem estado — Estágio 0 sempre (contexto de produto)' };
  const g0 = state.gates.find((g) => g.stage === 0);
  if (!g0?.met) return { action: 'gate', stage: 0, reason: 'gate 0 não cumprido: contexto de produto é a única raiz' };
  const firstUnmet = state.gates.find((g) => !g.met);
  if (state.cycle && firstUnmet) {
    return { action: 'resume', stage: firstUnmet.stage, reason: `ciclo ${state.cycle} aberto — retomar no primeiro gate não cumprido` };
  }
  if (!state.cycle && firstUnmet) {
    return { action: 'gate', stage: firstUnmet.stage, reason: `gate ${firstUnmet.stage} (${firstUnmet.name}) pendente` };
  }
  if (state.stage >= 9) return { action: 'operate', stage: 9, reason: 'fluxo contínuo — marketing-loops' };
  return { action: 'advance', stage: (state.stage ?? 0) + 1, reason: 'todos os gates atuais cumpridos' };
}
