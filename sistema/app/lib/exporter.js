// exporter.js — publicação manual da v0 (P-01, P-02).
// O pacote é o caminho honesto enquanto a rota automatizada não existe:
// PNGs ordenados, legenda pronta, alt text por slide e o checklist de
// postagem. Registrar o permalink é o que muda o estado para "publicada" —
// nunca a intenção de postar.
import fs from 'node:fs';
import path from 'node:path';
import { buildZip } from './zip.js';
import { isoNow, ensureDir, writeJson } from './util.js';
import { commitDecision } from './gitio.js';
import { STATUS } from './pieces.js';

function checklist(contract, approval) {
  const n = contract.slides.length;
  return `# Checklist de postagem manual — ${contract.id}

Aprovação: ${approval ? 'sim, digest ' + approval : 'NÃO ENCONTRADA — não poste sem aprovar no console'}

1. [ ] Abrir o Instagram na conta correta (confira o @ antes de qualquer upload)
2. [ ] Selecionar os ${n} PNGs NA ORDEM (01 → ${String(n).padStart(2, '0')}) — a ordem é conteúdo
3. [ ] Colar a legenda de legenda.txt sem editar (copy aprovada é contrato)
4. [ ] Inserir o alt text de cada slide (alt-text.txt) em Acessibilidade → Escrever texto alternativo
5. [ ] Publicar
6. [ ] Copiar o permalink do post
7. [ ] Registrar o permalink no console (a peça só vira "publicada" com o link — P-02)

Se qualquer item impedir a postagem, não improvise: reprove ou escale no console.
`;
}

/** Monta o ZIP de exportação. Retorna { file, size }. */
export function buildExport(ws, piece) {
  if (!piece.report?.pass) {
    const e = new Error('exportação exige geração com todos os gates verdes');
    e.code = 'EXPORT_REFUSED';
    throw e;
  }
  const outDir = path.join(piece.dir, 'out');
  const entries = [];
  piece.report.slides.forEach((f, i) => {
    entries.push({
      name: `${String(i + 1).padStart(2, '0')}-${f}`,
      data: fs.readFileSync(path.join(outDir, f)),
    });
  });
  entries.push({ name: 'legenda.txt', data: piece.contract.caption.join('\n\n') + '\n\n' + (piece.contract.caption_sources || []).join(' ') + '\n' });
  entries.push({
    name: 'alt-text.txt',
    data: piece.contract.slides.map((s) => `[slide ${s.n}]\n${s.alt}\n`).join('\n'),
  });
  const approvedDigest = piece.status === STATUS.APPROVED ? piece.report.digest.slice(0, 16) : null;
  entries.push({ name: 'checklist.md', data: checklist(piece.contract, approvedDigest) });

  const zip = buildZip(entries);
  const dir = ensureDir(path.join(piece.dir, 'export'));
  const file = path.join(dir, `${piece.id}-export.zip`);
  fs.writeFileSync(file, zip);
  return { file, size: zip.length, entries: entries.length };
}

/**
 * Registrar permalink (P-02). Exige URL http(s) que pareça um post real.
 * Grava publication/published.json + commit.
 */
export function registerPermalink(ws, piece, permalink, { manual = true } = {}) {
  // P7: efeito externo só com aprovação vigente. Sem approved.yaml com o
  // digest da geração atual, registrar permalink seria publicar por atalho.
  if (piece.status !== STATUS.APPROVED && piece.status !== STATUS.SENT) {
    const e = new Error(`registro de permalink exige peça aprovada no digest atual (status: ${piece.status})`);
    e.code = 'PERMALINK_REFUSED';
    throw e;
  }
  const url = String(permalink || '').trim();
  if (!/^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?/.test(url)) {
    const e = new Error('permalink inválido — cole a URL do post no Instagram (https://www.instagram.com/p/…)');
    e.code = 'PERMALINK_INVALID';
    throw e;
  }
  const dir = ensureDir(path.join(piece.dir, 'publication'));
  const file = path.join(dir, 'published.json');
  writeJson(file, {
    permalink: url,
    registeredAt: isoNow(),
    route: manual ? 'manual' : 'adapter',
    digest: piece.report?.digest || null,
  });
  const git = commitDecision(ws.root, [file], `publicada: ${piece.id} → ${url}`);
  return { file, git };
}
