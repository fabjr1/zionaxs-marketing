// flow.js — operações de fluxo COMMITADAS (F-03..F-06 + auditoria A-01).
// Mutar o state.md sem commit deixaria o fluxo fora da trilha de auditoria:
// cada operação aqui carrega, muda, salva e commita numa chamada só.
import {
  loadState, saveState, ensureState, setGate, acceptGap,
  openCycle, closeCycle, abandonCycle, parkCycle, resumeParked,
} from './state.js';
import { commitDecision } from './gitio.js';

function withState(ws, mutate, message) {
  const state = ensureState(ws.stateFile, ws.brand?.name || 'Marca');
  mutate(state);
  saveState(ws.stateFile, state);
  const git = commitDecision(ws.root, [ws.stateFile], message);
  return { state, git };
}

/** Marca/desmarca gate com ponteiro obrigatório (F-04) + commit. */
export function setGateOp(ws, stage, met, pointer) {
  return withState(ws, (s) => setGate(s, stage, met, pointer),
    `fluxo: gate ${stage} ${met ? 'cumprido' : 'reaberto'}${pointer ? ' → ' + String(pointer).slice(0, 60) : ''}`);
}

/** Registra lacuna aceita (F-05) + commit. */
export function recordGap(ws, stage, reason) {
  return withState(ws, (s) => acceptGap(s, stage, reason),
    `fluxo: lacuna aceita no estágio ${stage} — ${String(reason).slice(0, 60)}`);
}

/** Abre ciclo (F-03) + commit. */
export function openCycleOp(ws, cycleId, channel) {
  return withState(ws, (s) => openCycle(s, cycleId, channel),
    `fluxo: abre ciclo ${cycleId}${channel ? ' (' + channel + ')' : ''}`);
}

/** Fecha ciclo com aprendizado (F-06) + commit. */
export function closeCycleOp(ws, learning) {
  return withState(ws, (s) => closeCycle(s, learning),
    `fluxo: fecha ciclo com aprendizado — ${String(learning).slice(0, 60)}`);
}

/** Abandona ciclo com motivo (F-03) + commit. */
export function abandonCycleOp(ws, reason) {
  return withState(ws, (s) => abandonCycle(s, reason),
    `fluxo: abandona ciclo — ${String(reason).slice(0, 60)}`);
}

/** Estaciona ciclo (F-03) + commit. */
export function parkCycleOp(ws, reason) {
  return withState(ws, (s) => parkCycle(s, reason),
    `fluxo: estaciona ciclo — ${String(reason).slice(0, 60)}`);
}

/** Retoma ciclo estacionado (F-03) + commit. */
export function resumeParkedOp(ws, cycleId) {
  return withState(ws, (s) => resumeParked(s, cycleId),
    `fluxo: retoma ciclo estacionado ${cycleId}`);
}

export { loadState };
