// pieces.js — varredura das peças e derivação do estado no ciclo de vida.
// O status NUNCA é um campo gravado: é derivado dos artefatos presentes,
// na ordem do ciclo do PRD §06. Um status gravado poderia mentir; artefatos não.
import fs from 'node:fs';
import path from 'node:path';
import { readJson, exists } from './util.js';
import { listPieceIds } from './workspace.js';

export const STATUS = {
  CONTRACT: 'contrato',
  RED: 'gates vermelhos',
  REVIEW: 'em revisão',
  REJECTED: 'reprovada',
  APPROVED: 'aprovada',
  STALE: 'aprovação desatualizada',
  SENT: 'enviada',
  PUBLISHED: 'publicada',
  BLOCKED: 'bloqueada',
};

function mtime(f) { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }

/** Carrega tudo que existe de uma peça e deriva o status. */
export function loadPiece(ws, id) {
  const dir = ws.pieceDir(id);
  const p = {
    id, dir,
    contract: null, report: null,
    approval: null, rejections: [], escalations: [],
    publication: null, readings: null,
    status: STATUS.CONTRACT,
  };

  const cf = path.join(dir, 'contract.json');
  if (!exists(cf)) return null;
  p.contract = readJson(cf);

  const rf = path.join(dir, 'out', 'render-report.json');
  if (exists(rf)) p.report = readJson(rf);

  const dd = path.join(dir, 'decisions');
  if (exists(dd)) {
    for (const f of fs.readdirSync(dd).sort()) {
      const full = path.join(dd, f);
      if (f === 'approved.yaml') p.approval = { file: full, mtime: mtime(full) };
      else if (f.startsWith('rejected-')) p.rejections.push({ file: full, mtime: mtime(full) });
      else if (f.startsWith('escalated-')) p.escalations.push({ file: full, mtime: mtime(full) });
    }
  }

  const pub = path.join(dir, 'publication');
  if (exists(path.join(pub, 'blocked.json'))) p.publication = { state: 'blocked', ...readJson(path.join(pub, 'blocked.json')) };
  else if (exists(path.join(pub, 'published.json'))) p.publication = { state: 'published', ...readJson(path.join(pub, 'published.json')) };
  else if (exists(path.join(pub, 'sent.json'))) p.publication = { state: 'sent', ...readJson(path.join(pub, 'sent.json')) };

  const mr = path.join(dir, 'readings.json');
  if (exists(mr)) p.readings = readJson(mr);

  // ---- derivação do status, do fim para o começo do ciclo ----
  if (p.publication?.state === 'blocked') p.status = STATUS.BLOCKED;
  else if (p.publication?.state === 'published') p.status = STATUS.PUBLISHED;
  else if (p.publication?.state === 'sent') p.status = STATUS.SENT;
  else if (p.approval) {
    // aprovação amarra num digest; regeneração posterior invalida (C-05)
    const approvedDigest = readApprovalDigest(p.approval.file);
    if (p.report && approvedDigest && approvedDigest === p.report.digest) p.status = STATUS.APPROVED;
    else p.status = STATUS.STALE;
  } else if (p.rejections.length && (!p.report || newest(p.rejections) >= mtime(rf))) {
    // >= e não >: no fluxo real a geração leva segundos; um empate de mtime
    // só acontece quando a reprovação veio logo após a geração — e nesse
    // caso a reprovação é a decisão mais recente.
    p.status = STATUS.REJECTED; // reprovada depois da última geração → volta ao contrato
  } else if (p.report) {
    p.status = p.report.pass ? STATUS.REVIEW : STATUS.RED;
  }

  return p;
}

function newest(arr) { return Math.max(...arr.map((x) => x.mtime)); }

function readApprovalDigest(file) {
  try {
    const m = fs.readFileSync(file, 'utf8').match(/gates_snapshot:\s*(\S+)/);
    return m ? m[1].replace(/"/g, '') : null;
  } catch { return null; }
}

export function loadAllPieces(ws) {
  return listPieceIds(ws).map((id) => loadPiece(ws, id)).filter(Boolean);
}

/** Peça pode ser aprovada? Regra dura do C-05. */
export function canApprove(p) {
  if (!p.report) return { ok: false, why: 'peça ainda não gerada' };
  if (!p.report.pass) return { ok: false, why: 'há gate vermelho — o botão não existe (C-05)' };
  if (p.status === STATUS.SENT || p.status === STATUS.PUBLISHED) return { ok: false, why: 'peça já seguiu para publicação' };
  if (p.status === STATUS.APPROVED) return { ok: false, why: 'já aprovada neste digest' };
  return { ok: true };
}
