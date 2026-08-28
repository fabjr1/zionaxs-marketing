// server.js — o console (C-01..C-08, P-01, P-02, M-01, B-01).
// Stateless por desenho (N-01): toda requisição relê o filesystem; toda
// escrita é arquivo + commit. Single-user (N-06): escuta em 127.0.0.1 por
// padrão; MOS_TOKEN opcional exige ?t=/campo t em tudo quando definido.
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { loadWorkspace } from '../lib/workspace.js';
import { loadAllPieces, loadPiece, canApprove, STATUS } from '../lib/pieces.js';
import { loadState, ensureState } from '../lib/state.js';
import { approve, reject, escalate } from '../lib/decisions.js';
import { buildExport, registerPermalink } from '../lib/exporter.js';
import { addReading, addCampaignReading } from '../lib/measure.js';
import { pieceHistory } from '../lib/gitio.js';
import { readJson, exists, safeJoin } from '../lib/util.js';
import { page, queueView, pieceView, stateView, libraryView } from './views.js';
import { listBrands, resolveBrand } from '../lib/brands.js';
import { buildContextPackage } from '../lib/memory.js';
import {
  loadCampaign, loadAllCampaigns, createCampaign, saveContextPackage, closeCampaign,
} from '../lib/campaigns.js';
import { newBrief, loadBrief, saveBrief, approveBrief, applyEdits } from '../lib/brief.js';
import { newPlan, newFront, loadPlan, savePlan } from '../lib/plan.js';
import { addFeedback, loadFeedback, updateFeedback, contradictions, FEEDBACK_OUTCOME } from '../lib/feedback.js';
import { draftFromFeedback, proposeLearning, recordPromotion } from '../lib/learning.js';
import { campaignQueueView, campaignView, learningDraftView } from './campaign-views.js';

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.zip': 'application/zip',
  '.md': 'text/markdown; charset=utf-8', '.html': 'text/html; charset=utf-8',
};

function repoTop(root) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
  } catch { return root; }
}

/** Comparação em tempo constante (o hash iguala os comprimentos). */
function safeEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function parseBody(req) {
  return new Promise((resolve, reject2) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) { reject2(new Error('body grande demais')); req.destroy(); }
    });
    req.on('end', () => {
      // decodeURIComponent lança em %-sequência malformada; sem o try/catch
      // um body inválido derrubaria o processo (exceção em event handler).
      try {
        const out = {};
        for (const kv of data.split('&')) {
          if (!kv) continue;
          const [k, v] = kv.split('=');
          const key = decodeURIComponent(k);
          const val = decodeURIComponent((v || '').replace(/\+/g, ' '));
          // Chave repetida vira array (checkbox múltiplo — RF-08.2 exige mais
          // de uma classificação por devolutiva). Chave única segue escalar,
          // para não mudar o contrato dos formulários existentes.
          if (key in out) out[key] = Array.isArray(out[key]) ? [...out[key], val] : [out[key], val];
          else out[key] = val;
        }
        resolve(out);
      } catch {
        reject2(new Error('body malformado — codificação urlencoded inválida'));
      }
    });
    req.on('error', reject2);
  });
}

export function createServer({ root, token = process.env.MOS_TOKEN || null } = {}) {
  const ws = loadWorkspace(root);
  const top = repoTop(ws.root);
  // F-01: o estado nasce no primeiro uso — nunca escrito à mão.
  ensureState(ws.stateFile, ws.brand.name || 'Marca');
  // CSRF (single-user): token por boot embutido em cada form; um site externo
  // não lê a página (same-origin), logo não forja o POST.
  const csrf = randomUUID();

  // biblioteca: entradas legadas do library.json + peças locais publicadas
  function libraryEntries() {
    const out = [];
    if (exists(ws.libraryFile)) {
      const lib = readJson(ws.libraryFile);
      (lib.published || []).forEach((e, i) => {
        const abs = e.contactSheet ? path.resolve(ws.root, e.contactSheet) : null;
        const inRepo = abs && (abs === top || abs.startsWith(top + path.sep)) && fs.existsSync(abs);
        out.push({ id: e.id, permalink: e.permalink, note: e.note, local: false,
          sheetUrl: inRepo ? `/legacy/${i}` : null, _abs: inRepo ? abs : null, _idx: i });
      });
    }
    for (const p of loadAllPieces(ws)) {
      if (p.status === STATUS.PUBLISHED) {
        const sheet = path.join(p.dir, 'out', `${p.id}-contact-sheet.png`);
        out.push({ id: p.id, permalink: p.publication?.permalink, note: null, local: true,
          sheetUrl: fs.existsSync(sheet) ? `/asset/${p.id}/out/${path.basename(sheet)}` : null });
      }
    }
    return out;
  }

  // anti-template (C-04): as 3 gerações mais recentes que não são a atual
  function previousSheets(currentId) {
    const cands = [];
    for (const p of loadAllPieces(ws)) {
      if (p.id === currentId || !p.report) continue;
      const sheet = path.join(p.dir, 'out', `${p.id}-contact-sheet.png`);
      if (fs.existsSync(sheet)) {
        cands.push({ id: p.id, when: fs.statSync(sheet).mtimeMs,
          sheetUrl: `/asset/${p.id}/out/${path.basename(sheet)}` });
      }
    }
    for (const e of libraryEntries()) {
      if (!e.local && e.sheetUrl && e._abs) {
        cands.push({ id: e.id, when: fs.statSync(e._abs).mtimeMs, sheetUrl: e.sheetUrl });
      }
    }
    return cands.sort((a, b) => b.when - a.when).slice(0, 3);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    const send = (code, body, type = 'text/html; charset=utf-8') => {
      res.writeHead(code, { 'content-type': type, 'x-content-type-options': 'nosniff' });
      res.end(body);
    };
    const redirect = (to, msg, kind = 'ok') => {
      const u = new URL(to, 'http://local');
      if (token) u.searchParams.set('t', token);
      if (msg) { u.searchParams.set('m', msg); u.searchParams.set('k', kind); }
      res.writeHead(303, { location: u.pathname + u.search });
      res.end();
    };

    try {
      // ---- auth (N-06) ----
      let bodyParams = {};
      if (req.method === 'POST') bodyParams = await parseBody(req);
      if (token) {
        const got = url.searchParams.get('t') || bodyParams.t;
        if (!safeEq(got ?? '', token)) return send(403, page({ title: 'Acesso', token: null, body: '<div class="note err">token ausente ou inválido — abra com ?t=SEU_TOKEN</div>' }));
      }
      if (req.method === 'POST' && !safeEq(bodyParams.ct ?? '', csrf)) {
        return send(403, page({ title: 'Acesso', token: null, body: '<div class="note err">token de sessão ausente ou expirado — recarregue a página e repita a ação</div>' }));
      }
      const flash = url.searchParams.get('m')
        ? { msg: url.searchParams.get('m'), kind: url.searchParams.get('k') || 'ok' } : null;

      const parts = url.pathname.split('/').filter(Boolean);

      // ---- favicon: 204 para manter o console sem erro de rede ----
      if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }

      // ---- fontes do brand pack (o console não depende de rede — N-02) ----
      if (parts[0] === 'brandfonts' && parts.length === 2) {
        const file = safeJoin(ws.brandDir, 'fonts', parts[1]);
        if (!fs.existsSync(file)) return send(404, 'não encontrado', 'text/plain');
        const type = file.endsWith('.css') ? 'text/css; charset=utf-8' : 'font/woff2';
        return send(200, fs.readFileSync(file), type);
      }

      // ---- assets de peça (somente leitura, path-safe) ----
      if (parts[0] === 'asset' && parts.length >= 3) {
        const pieceDir = ws.pieceDir(parts[1]);
        const file = safeJoin(pieceDir, ...parts.slice(2));
        if (!fs.existsSync(file)) return send(404, 'não encontrado', 'text/plain');
        return send(200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
      }
      if (parts[0] === 'legacy' && parts.length === 2) {
        const e = libraryEntries().find((x) => String(x._idx) === parts[1] && x._abs);
        if (!e) return send(404, 'não encontrado', 'text/plain');
        return send(200, fs.readFileSync(e._abs), 'image/png');
      }

      // ---- fila (C-01) ----
      if (url.pathname === '/') {
        const pieces = loadAllPieces(ws);
        const state = loadState(ws.stateFile);
        return send(200, page({ title: 'Fila', token, flash, body: queueView({ pieces, state, token }) }));
      }

      // ---- fluxo ----
      if (url.pathname === '/state') {
        return send(200, page({ title: 'Fluxo', token, flash, body: stateView({ state: loadState(ws.stateFile) }) }));
      }

      // ---- biblioteca (B-01) ----
      if (url.pathname === '/library') {
        return send(200, page({ title: 'Biblioteca', token, flash, body: libraryView({ published: libraryEntries(), token }) }));
      }

      // ---- peça ----
      if (parts[0] === 'piece' && parts[1]) {
        const id = parts[1];
        const p = loadPiece(ws, id);
        if (!p) return send(404, page({ title: id, token, body: '<div class="note err">peça não encontrada</div>' }));

        if (req.method === 'GET' && parts[2] === 'export') {
          const { file } = buildExport(ws, p);
          res.writeHead(200, {
            'content-type': 'application/zip',
            'content-disposition': `attachment; filename="${path.basename(file)}"`,
          });
          return res.end(fs.readFileSync(file));
        }

        if (req.method === 'POST') {
          try {
            if (parts[2] === 'approve') {
              const r = approve(ws, p, { destination: 'instagram', account: process.env.MOS_EXPECTED_ACCOUNT || null });
              return redirect(`/piece/${id}`, `aprovada — contrato emitido${r.git.committed ? ' e commitado ' + r.git.sha.slice(0, 8) : ' (' + r.git.reason + ')'}`);
            }
            if (parts[2] === 'reject') {
              const r = reject(ws, p, bodyParams);
              return redirect(`/piece/${id}`, `reprovada — volta ao contrato${r.git.committed ? ' · ' + r.git.sha.slice(0, 8) : ''}`);
            }
            if (parts[2] === 'escalate') {
              const r = escalate(ws, p, bodyParams);
              return redirect(`/piece/${id}`, `escalada: ${bodyParams.topic}${r.git.committed ? ' · ' + r.git.sha.slice(0, 8) : ''}`);
            }
            if (parts[2] === 'permalink') {
              const r = registerPermalink(ws, p, bodyParams.permalink);
              return redirect(`/piece/${id}`, `publicada — permalink registrado${r.git.committed ? ' · ' + r.git.sha.slice(0, 8) : ''}`);
            }
            if (parts[2] === 'reading') {
              const clean = { ...bodyParams };
              for (const k of ['sample', 'baseline', 'mde']) if (!clean[k]) delete clean[k];
              const r = addReading(ws, p, clean);
              return redirect(`/piece/${id}`, `leitura registrada — ${r.entry.label}`);
            }
          } catch (err) {
            return redirect(`/piece/${id}`, err.message, 'err');
          }
        }

        return send(200, page({
          title: p.contract.tese ? p.contract.tese.slice(0, 60) : id,
          token, flash,
          body: pieceView({
            p, token, csrf,
            previous: previousSheets(id),
            history: pieceHistory(ws.root, p.dir),
            canApproveRes: canApprove(p),
          }),
        }));
      }

      // ---- fila de campanhas ----
      if (url.pathname === '/campaigns') {
        return send(200, page({
          title: 'Campanhas', token, flash,
          body: campaignQueueView({ campaigns: loadAllCampaigns(ws), brands: listBrands(ws), token, csrf }),
        }));
      }

      if (url.pathname === '/campaigns/new' && req.method === 'POST') {
        try {
          const r = resolveBrand(ws, bodyParams.brand);
          if (!r.ok) return redirect('/campaigns', r.why, 'err');
          const c = createCampaign(ws, { brand: r.brandId, nome: bodyParams.nome });
          return redirect(`/campaign/${c.id}`, 'campanha aberta — consulte o contexto antes do Brief');
        } catch (err) {
          return redirect('/campaigns', err.message, 'err');
        }
      }

      // ---- campanha ----
      if (parts[0] === 'campaign' && parts[1]) {
        const cid = parts[1];
        const seg = parts[2] || null;

        // rascunho de proposta de aprendizado (GET dedicado)
        if (req.method === 'GET' && seg === 'learning' && parts[3]) {
          const c = loadCampaign(ws, cid);
          if (!c) return send(404, page({ title: cid, token, body: '<div class="note err">campanha não encontrada</div>' }));
          const fb = loadFeedback(ws, cid, parts[3]);
          if (!fb) return redirect(`/campaign/${cid}`, 'devolutiva não encontrada', 'err');
          const draft = draftFromFeedback({ campaignId: cid, brand: c.campaign.marca, feedback: fb, brief: c.brief });
          return send(200, page({
            title: 'Propor aprendizado', token, flash,
            body: learningDraftView({ c, feedback: fb, draft, token, csrf }),
          }));
        }

        if (req.method === 'POST') {
          const c = loadCampaign(ws, cid);
          if (!c) return redirect('/campaigns', `campanha não encontrada: ${cid}`, 'err');
          try {
            if (seg === 'context') {
              const pkg = buildContextPackage(ws, { brandId: c.campaign.marca, campaignId: cid });
              saveContextPackage(ws, cid, pkg);
              const nGaps = (pkg.gaps || []).length + (pkg.conflicts || []).length;
              return redirect(`/campaign/${cid}`,
                `contexto consultado — ${(pkg.sources || []).length} fonte(s), ${nGaps} lacuna(s)/conflito(s)`,
                nGaps ? 'err' : 'ok');
            }

            if (seg === 'brief' && parts[3] === 'start') {
              if (loadBrief(ws, cid)) return redirect(`/campaign/${cid}`, 'brief já existe');
              saveBrief(ws, cid, newBrief({ brand: c.campaign.marca, campaignId: cid }));
              return redirect(`/campaign/${cid}`, 'brief iniciado — responda o que a Memory não resolveu');
            }

            if (seg === 'brief' && parts[3] === 'save') {
              const cur = loadBrief(ws, cid);
              if (!cur) return redirect(`/campaign/${cid}`, 'brief inexistente', 'err');
              const edits = {};
              for (const k of ['proposito', 'objetivo', 'publico', 'oferta', 'acaoDesejada', 'metricaPrimaria', 'prazo', 'orcamento', 'criterioAprovacao']) {
                if (k in bodyParams) edits[k] = bodyParams[k].trim() || null;
              }
              if ('canais' in bodyParams) {
                edits.canais = bodyParams.canais.split(',').map((x) => x.trim()).filter(Boolean);
              }
              if ('limitesDeAlegacao' in bodyParams) {
                edits.limitesDeAlegacao = bodyParams.limitesDeAlegacao.split('\n').map((x) => x.trim()).filter(Boolean);
              }
              const { brief, invalidatesPlan, changed } = applyEdits(cur, edits);
              saveBrief(ws, cid, brief);
              return redirect(`/campaign/${cid}`,
                invalidatesPlan
                  ? `brief salvo — ${changed.join(', ')} mudou: aprovação revogada e plano invalidado`
                  : `brief salvo${changed.length ? ' — ' + changed.join(', ') : ' (sem alteração)'}`,
                invalidatesPlan ? 'err' : 'ok');
            }

            if (seg === 'brief' && parts[3] === 'approve') {
              const brief = loadBrief(ws, cid);
              const r = approveBrief(ws, cid, { brief, contextPackage: c.context });
              return redirect(`/campaign/${cid}`,
                `brief aprovado${r.git.committed ? ' · ' + r.git.sha.slice(0, 8) : ''} — o plano está liberado`);
            }

            if (seg === 'plan' && parts[3] === 'front') {
              const brief = loadBrief(ws, cid);
              const plan = loadPlan(ws, cid) || newPlan({ campaignId: cid, brief });
              const deps = (bodyParams.dependeDe || '').split(',').map((x) => x.trim()).filter(Boolean);
              plan.frentes = [...(plan.frentes || []), newFront({
                tipo: bodyParams.tipo, objetivo: bodyParams.objetivo,
                metrica: bodyParams.metrica, dependeDe: deps,
              })];
              savePlan(ws, cid, plan, brief);
              return redirect(`/campaign/${cid}`, `frente "${bodyParams.tipo}" acrescentada`);
            }

            if (seg === 'plan' && parts[3] === 'exclude') {
              const brief = loadBrief(ws, cid);
              const plan = loadPlan(ws, cid) || newPlan({ campaignId: cid, brief });
              if (!bodyParams.motivo?.trim()) throw new Error('exclusão de frente exige motivo — ausência deliberada é informação');
              plan.frentesExcluidas = [...(plan.frentesExcluidas || []),
                { tipo: bodyParams.tipo, motivo: bodyParams.motivo.trim() }];
              savePlan(ws, cid, plan, brief);
              return redirect(`/campaign/${cid}`, `frente "${bodyParams.tipo}" registrada fora de escopo`);
            }

            if (seg === 'plan' && parts[3] === 'asset') {
              const brief = loadBrief(ws, cid);
              const plan = loadPlan(ws, cid);
              if (!plan) throw new Error('não há plano — acrescente uma frente antes de declarar ativo');
              const front = (plan.frentes || []).find((f) => f.tipo === bodyParams.frente);
              if (!front) throw new Error(`frente não está no plano: ${bodyParams.frente}`);
              front.ativos = [...(front.ativos || []), { tipo: bodyParams.tipo, id: bodyParams.id }];
              savePlan(ws, cid, plan, brief);
              return redirect(`/campaign/${cid}`, `ativo ${bodyParams.id} declarado em ${bodyParams.frente}`);
            }

            if (seg === 'reading') {
              const clean = { ...bodyParams };
              delete clean.t; delete clean.ct;
              clean.primary = bodyParams.primary === '1';
              const r = addCampaignReading(ws, cid, clean);
              return redirect(`/campaign/${cid}`, `leitura registrada — ${r.entry.label}`,
                r.entry.label.startsWith('insuficiente') ? 'err' : 'ok');
            }

            if (seg === 'feedback') {
              const [alvoTipo, alvoId] = String(bodyParams.alvo || '').split(':');
              const list = Array.isArray(bodyParams.classificacoes)
                ? bodyParams.classificacoes : [bodyParams.classificacoes].filter(Boolean);
              const r = addFeedback(ws, cid, {
                alvoTipo, alvoId: alvoId || null,
                observacao: bodyParams.observacao, causa: bodyParams.causa,
                classificacoes: list,
              });
              return redirect(`/campaign/${cid}`, `devolutiva registrada — ${r.entry.id}`);
            }

            if (seg === 'learning' && parts[3] === 'draft') {
              return redirect(`/campaign/${cid}/learning/${bodyParams.feedbackId}`, null);
            }

            if (seg === 'learning' && parts[3] === 'create') {
              const fb = loadFeedback(ws, cid, bodyParams.feedbackId);
              if (!fb) throw new Error('devolutiva não encontrada');
              const draft = draftFromFeedback({ campaignId: cid, brand: c.campaign.marca, feedback: fb, brief: c.brief });
              const proposal = {
                ...draft,
                titulo: bodyParams.titulo,
                regraProposta: bodyParams.regraProposta,
                interpretacao: bodyParams.interpretacao,
                condicaoRevisao: bodyParams.condicaoRevisao,
                destinoSugerido: bodyParams.destinoSugerido,
                escopo: {
                  ...draft.escopo,
                  publico: bodyParams.escopoPublico?.trim() || draft.escopo.publico,
                  formato: bodyParams.escopoFormato?.trim() || null,
                  situacao: bodyParams.escopoSituacao?.trim() || null,
                },
              };
              const r = proposeLearning(ws, cid, proposal);
              updateFeedback(ws, cid, fb.id, {
                desdobramento: FEEDBACK_OUTCOME.LEARNING_PROPOSED,
                propostaAprendizado: r.proposal.id,
              });
              return redirect(`/campaign/${cid}`,
                r.inbox ? 'proposta criada na Inbox da Memory — não canônica até você promover'
                        : `proposta gravada localmente: ${r.proposal.entregaBloqueada}`,
                r.inbox ? 'ok' : 'err');
            }

            if (seg === 'learning' && parts[3] === 'resolve') {
              const r = recordPromotion(ws, cid, bodyParams.proposalId, {
                decision: bodyParams.decision,
                destino: bodyParams.destino?.trim() || null,
                motivo: bodyParams.motivo?.trim() || null,
              });
              return redirect(`/campaign/${cid}`, `aprendizado ${r.proposal.estado}`);
            }

            if (seg === 'close') {
              closeCampaign(ws, cid, { motivo: bodyParams.motivo });
              return redirect(`/campaign/${cid}`, 'campanha encerrada');
            }
          } catch (err) {
            return redirect(`/campaign/${cid}`, err.message, 'err');
          }
        }

        const c = loadCampaign(ws, cid);
        if (!c) return send(404, page({ title: cid, token, body: '<div class="note err">campanha não encontrada</div>' }));
        return send(200, page({
          title: c.campaign.nome, token, flash,
          body: campaignView({ c, token, csrf, contradictions: contradictions(c.feedback) }),
        }));
      }

      return send(404, page({ title: '404', token, body: '<div class="note err">rota desconhecida</div>' }));
    } catch (err) {
      return send(500, page({ title: 'Erro', token: null, body: `<div class="note err">${String(err.message).replace(/</g, '&lt;')}</div>` }));
    }
  });

  return { server, ws, csrf };
}

export function start({ root, port = Number(process.env.MOS_PORT || 4870), host = process.env.MOS_HOST || '127.0.0.1' } = {}) {
  const { server, ws } = createServer({ root });
  server.listen(port, host, () => {
    console.log(`Marketing OS console → http://${host}:${port}${process.env.MOS_TOKEN ? '/?t=***' : ''}`);
    console.log(`workspace: ${ws.root}`);
  });
  return server;
}
