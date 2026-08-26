// util.js — helpers compartilhados: escape, digest, fs, texto.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** Escapa texto para HTML. Toda copy passa por aqui antes de virar pixel. */
export function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Normaliza espaços para comparação literal de copy (gates G9/G10). */
export function normText(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

/** sha256 hex de um Buffer/string. */
export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/** sha256 de um conjunto de arquivos, ordem estável — usado no gates_snapshot. */
export function sha256Files(files) {
  const h = createHash('sha256');
  for (const f of [...files].sort()) {
    h.update(path.basename(f));
    h.update(fs.readFileSync(f));
  }
  return h.digest('hex');
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function exists(p) {
  return fs.existsSync(p);
}

/** Timestamp ISO 8601 com timezone local explícito. */
export function isoNow() {
  const d = new Date();
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) +
    sign + pad(Math.floor(Math.abs(off) / 60)) + ':' + pad(Math.abs(off) % 60)
  );
}

/** Data curta YYYY-MM-DD. */
export function today() {
  return isoNow().slice(0, 10);
}

/** id seguro para nomes de arquivo. */
export function slug(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Resolve caminho de workspace de forma segura (bloqueia traversal). */
export function safeJoin(root, ...parts) {
  const p = path.resolve(root, ...parts);
  const r = path.resolve(root);
  if (p !== r && !p.startsWith(r + path.sep)) {
    throw new Error(`caminho fora do workspace: ${parts.join('/')}`);
  }
  return p;
}
