// publisher.js — adapter de publicação automatizada (P-04).
// Implementa o contrato de webhook + callback documentado na governança de
// publicação (nota 23 da base de conhecimento): preflight não-publicante,
// envio com requestId idempotente, e reconciliação onde SÓ o callback com a
// conta esperada + postId + permalink muda o estado para "publicada".
// HTTP 200 nunca é publicação. Conta divergente bloqueia sem retry.
//
// A rota real depende de credenciais externas (env) — o código é completo;
// a credencial é a pendência.
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { isoNow, ensureDir, writeJson, exists, readJson } from './util.js';
import { commitDecision } from './gitio.js';
import { STATUS } from './pieces.js';

/** Config da rota: arquivo publish.json do workspace + env (env vence). */
export function publishConfig(ws) {
  const file = path.join(ws.root, 'publish.json');
  const base = exists(file) ? readJson(file) : {};
  return {
    webhookUrl: process.env.MOS_WEBHOOK_URL || base.webhookUrl || null,
    apiKey: process.env.MOS_WEBHOOK_KEY || null, // segredo NUNCA vem de arquivo versionado
    expectedAccount: process.env.MOS_EXPECTED_ACCOUNT || base.expectedAccount || null,
    mediaBaseUrl: process.env.MOS_MEDIA_BASE_URL || base.mediaBaseUrl || null,
    destination: base.destination || 'instagram',
    timeoutMs: base.timeoutMs || 30000,
  };
}

export function routeReady(cfg) {
  const missing = [];
  if (!cfg.webhookUrl) missing.push('MOS_WEBHOOK_URL');
  if (!cfg.apiKey) missing.push('MOS_WEBHOOK_KEY');
  if (!cfg.expectedAccount) missing.push('MOS_EXPECTED_ACCOUNT');
  if (!cfg.mediaBaseUrl) missing.push('MOS_MEDIA_BASE_URL');
  return { ready: missing.length === 0, missing };
}

async function post(cfg, body) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(cfg.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* callback fora do contrato */ }
    return { status: res.status, json, text: text.slice(0, 500) };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Preflight (requires_preflight do Publication Contract): confirma a rota
 * SEM publicar. Exige status dry_run, publish:false e requestId preservado.
 */
export async function preflight(cfg) {
  const requestId = `mos-preflight-${randomUUID()}`;
  const r = await post(cfg, { dry_run: true, publish: false, requestId });
  const ok = r.status >= 200 && r.status < 300 &&
    r.json && r.json.status === 'dry_run' && r.json.publish === false &&
    r.json.requestId === requestId;
  return { ok, requestId, response: r };
}

/**
 * Reconciliação do callback — o coração do P-04.
 * Retorna { state: 'published'|'blocked'|'sent', reason, record }.
 */
export function reconcileCallback(cfg, requestId, r) {
  const j = r.json;
  if (!j || typeof j !== 'object') {
    return { state: 'sent', reason: 'callback fora do contrato — recebimento não é publicação' };
  }
  if (j.requestId && j.requestId !== requestId) {
    return { state: 'blocked', reason: `requestId divergente: esperado ${requestId}, veio ${j.requestId}` };
  }
  if (j.accountUsername && j.accountUsername !== cfg.expectedAccount) {
    return {
      state: 'blocked',
      reason: `conta divergente: esperado ${cfg.expectedAccount}, veio ${j.accountUsername} — sem retry automático`,
    };
  }
  if (j.ok === false || j.status === 'failed') {
    return { state: 'blocked', reason: `falha declarada pelo cenário: ${JSON.stringify(j.error ?? null).slice(0, 200)}` };
  }
  const confirmed = j.ok === true && j.status === 'published' &&
    j.accountUsername === cfg.expectedAccount && j.postId && j.permalink;
  if (confirmed) {
    return {
      state: 'published',
      reason: 'callback confirmou conta esperada + postId + permalink',
      record: { postId: j.postId, permalink: j.permalink, publishedAt: j.publishedAt || isoNow(), accountUsername: j.accountUsername },
    };
  }
  return { state: 'sent', reason: 'HTTP aceito mas sem confirmação completa — permanece "enviada"' };
}

/**
 * Publica uma peça APROVADA pela rota automatizada.
 * Escreve publication/{sent,published,blocked}.json conforme o desfecho.
 */
export async function publishPiece(ws, piece) {
  if (piece.status !== STATUS.APPROVED) {
    const e = new Error(`publicação exige peça aprovada com digest válido (status atual: ${piece.status})`);
    e.code = 'PUBLISH_REFUSED';
    throw e;
  }
  const cfg = publishConfig(ws);
  const ready = routeReady(cfg);
  if (!ready.ready) {
    const e = new Error(`rota de publicação não configurada — faltam: ${ready.missing.join(', ')}`);
    e.code = 'ROUTE_NOT_CONFIGURED';
    throw e;
  }

  const pf = await preflight(cfg);
  if (!pf.ok) {
    const e = new Error(`preflight reprovou: ${JSON.stringify(pf.response.json || pf.response.text).slice(0, 200)}`);
    e.code = 'PREFLIGHT_FAILED';
    throw e;
  }

  const requestId = `mos-${piece.id}-${randomUUID()}`;
  const mediaUrls = piece.report.slides.map((f) => `${cfg.mediaBaseUrl.replace(/\/$/, '')}/${piece.id}/${f}`);
  const pubDir = ensureDir(path.join(piece.dir, 'publication'));

  const sentFile = path.join(pubDir, 'sent.json');
  writeJson(sentFile, { requestId, sentAt: isoNow(), digest: piece.report.digest, mediaUrls, account: cfg.expectedAccount });
  commitDecision(ws.root, [sentFile], `enviada: ${piece.id} (${requestId})`);

  const r = await post(cfg, {
    requestId,
    carouselId: piece.id,
    platform: cfg.destination,
    slideCount: piece.contract.slides.length,
    mediaUrls,
    caption: piece.contract.caption.join('\n\n'),
  });

  const outcome = reconcileCallback(cfg, requestId, r);
  if (outcome.state === 'published') {
    const file = path.join(pubDir, 'published.json');
    writeJson(file, { ...outcome.record, requestId, route: 'adapter', digest: piece.report.digest });
    commitDecision(ws.root, [file], `publicada: ${piece.id} → ${outcome.record.permalink}`);
  } else if (outcome.state === 'blocked') {
    const file = path.join(pubDir, 'blocked.json');
    writeJson(file, { requestId, reason: outcome.reason, blockedAt: isoNow(), response: r.json || r.text });
    commitDecision(ws.root, [file], `bloqueada: ${piece.id} — ${outcome.reason.slice(0, 60)}`);
  }
  return { requestId, outcome, http: r.status };
}
