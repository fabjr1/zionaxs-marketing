// decisions.js — as três decisões do console (C-05, C-06, C-07) + P-03.
// Cada decisão vira arquivo + commit. Aprovação emite o Publication Contract
// amarrado ao digest da geração aprovada — uma aprovação nunca vale para
// pixels que ela não viu.
import fs from 'node:fs';
import path from 'node:path';
import { emitYaml } from './yamlio.js';
import { isoNow, ensureDir } from './util.js';
import { commitDecision } from './gitio.js';
import { canApprove } from './pieces.js';

/**
 * Aprovar (C-05 / P-03). Recusa com gate vermelho ou sem geração.
 * publishTarget: { destination, account } do config de publicação.
 */
export function approve(ws, piece, publishTarget) {
  const gate = canApprove(piece);
  if (!gate.ok) {
    const e = new Error(`aprovação recusada: ${gate.why}`);
    e.code = 'APPROVE_REFUSED';
    throw e;
  }
  const dir = ensureDir(path.join(piece.dir, 'decisions'));
  const file = path.join(dir, 'approved.yaml');
  const yaml = emitYaml({
    effect: 'publish',
    destination: publishTarget?.destination || 'instagram',
    account: publishTarget?.account || null,
    approval_source: 'user',
    approval_scope: 'this_piece',
    approval_mode: 'advance_after_gates',
    requires_preflight: true,
    piece_id: piece.id,
    format: piece.contract.format,
    slide_count: piece.contract.slides.length,
    gates_snapshot: piece.report.digest,
    approved_at: isoNow(),
  }, {
    approval_scope: 'nunca general, nunca permanente',
    gates_snapshot: 'digest da geração aprovada — regeneração invalida',
  });
  fs.writeFileSync(file, yaml);
  const git = commitDecision(ws.root, [file],
    `decisão: aprova ${piece.id} (digest ${piece.report.digest.slice(0, 12)})`);
  return { file, git };
}

/**
 * Reprovar (C-06): motivo estruturado obrigatório — gate, esperado,
 * observado, menor correção. Texto livre não é aceito.
 */
export function reject(ws, piece, { gate, expected, actual, correction }) {
  for (const [k, v] of Object.entries({ gate, expected, actual, correction })) {
    if (!v || !String(v).trim()) {
      const e = new Error(`reprovação exige o campo "${k}" (C-06)`);
      e.code = 'REJECT_INCOMPLETE';
      throw e;
    }
  }
  const dir = ensureDir(path.join(piece.dir, 'decisions'));
  const stamp = isoNow().replace(/[:+]/g, '').slice(0, 15);
  const file = path.join(dir, `rejected-${stamp}.yaml`);
  fs.writeFileSync(file, emitYaml({
    decision: 'reject',
    piece_id: piece.id,
    gate, expected, actual, correction,
    digest_rejected: piece.report?.digest || null,
    rejected_at: isoNow(),
  }, { correction: 'a menor alteração que resolve — corrigir o CONTRATO, nunca o pixel' }));
  const git = commitDecision(ws.root, [file], `decisão: reprova ${piece.id} — ${gate}`);
  return { file, git };
}

/**
 * Escalar (C-07): a peça toca algo que exige decisão específica mesmo
 * já autorizada (oferta, preço, canal, conta, verba, tema sensível).
 */
export const ESCALATION_TOPICS = [
  'oferta', 'preço', 'posicionamento', 'canal novo', 'conta nova', 'verba', 'tema sensível',
];

export function escalate(ws, piece, { topic, note }) {
  if (!ESCALATION_TOPICS.includes(topic)) {
    const e = new Error(`tópico de escalação inválido: ${topic} (use: ${ESCALATION_TOPICS.join(', ')})`);
    e.code = 'ESCALATE_TOPIC';
    throw e;
  }
  if (!note || !note.trim()) {
    const e = new Error('escalação exige nota do que precisa ser decidido');
    e.code = 'ESCALATE_NOTE';
    throw e;
  }
  const dir = ensureDir(path.join(piece.dir, 'decisions'));
  const stamp = isoNow().replace(/[:+]/g, '').slice(0, 15);
  const file = path.join(dir, `escalated-${stamp}.yaml`);
  fs.writeFileSync(file, emitYaml({
    decision: 'escalate',
    piece_id: piece.id,
    topic, note,
    escalated_at: isoNow(),
  }, { decision: 'não aprova nem reprova — registra decisão pendente fora do escopo da peça' }));
  const git = commitDecision(ws.root, [file], `decisão: escala ${piece.id} — ${topic}`);
  return { file, git };
}
