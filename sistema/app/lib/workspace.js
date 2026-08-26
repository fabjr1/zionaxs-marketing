// workspace.js — resolve e carrega o workspace (config, brand pack, caminhos).
// O layout do PRD (.agents/) vale para projetos de usuário; neste repositório
// .agents/ é gitignored (instalação de skills), então o workspace vive em
// diretório explícito, resolvido por --root ou MOS_ROOT. Decisão registrada
// no PRD/README: o layout interno é fixo, a raiz é configurável.
import fs from 'node:fs';
import path from 'node:path';
import { readJson, safeJoin } from './util.js';

export function resolveRoot(argRoot) {
  const root = argRoot || process.env.MOS_ROOT;
  if (!root) {
    throw new Error('workspace não definido: passe --root <dir> ou exporte MOS_ROOT');
  }
  const abs = path.resolve(root);
  if (!fs.existsSync(path.join(abs, 'config.json'))) {
    throw new Error(`workspace inválido (sem config.json): ${abs}`);
  }
  return abs;
}

export function loadWorkspace(argRoot) {
  const root = resolveRoot(argRoot);
  const config = readJson(path.join(root, 'config.json'));
  const brandDir = safeJoin(root, config.brandDir || 'brand');
  const brand = readJson(path.join(brandDir, 'brand.json'));

  // logo oficial: se brand/logo.svg existir, entra no rodapé no lugar da
  // wordmark composta. Ausência é o bloqueio conhecido, não um erro.
  const logoFile = path.join(brandDir, 'logo.svg');
  brand.logoSvg = fs.existsSync(logoFile) ? fs.readFileSync(logoFile, 'utf8') : null;

  const ws = {
    root,
    config,
    brand,
    brandDir,
    piecesDir: safeJoin(root, config.piecesDir || 'pieces'),
    stateFile: safeJoin(root, config.stateFile || 'state.md'),
    libraryFile: safeJoin(root, config.libraryFile || 'library.json'),
    pieceDir(id) { return safeJoin(this.piecesDir, id); },
  };
  return ws;
}

export function listPieceIds(ws) {
  if (!fs.existsSync(ws.piecesDir)) return [];
  return fs.readdirSync(ws.piecesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => fs.existsSync(path.join(ws.piecesDir, n, 'contract.json')))
    .sort();
}
