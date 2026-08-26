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
import { addReading } from '../lib/measure.js';
import { pieceHistory } from '../lib/gitio.js';
import { readJson, exists, safeJoin } from '../lib/util.js';
import { page, queueView, pieceView, stateView, libraryView } from './views.js';

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
          out[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
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
