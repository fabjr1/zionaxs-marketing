// workspace.js — resolve e carrega o workspace (config, brand pack, caminhos).
// O layout do PRD (.agents/) vale para projetos de usuário; neste repositório
// .agents/ é gitignored (instalação de skills), então o workspace vive em
// diretório explícito, resolvido por --root ou MOS_ROOT. Decisão registrada
// no PRD/README: o layout interno é fixo, a raiz é configurável.
import fs from 'node:fs';
import path from 'node:path';
import { readJson, safeJoin, assertSafeId } from './util.js';

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
    // safeJoin bloqueia traversal; assertSafeId recusa antes disso qualquer
    // coisa que não seja um id no formato que o sistema gera. Centralizar aqui
    // faz todo módulo que constrói caminho de peça/campanha herdar a checagem.
    pieceDir(id) { return safeJoin(this.piecesDir, assertSafeId(id, 'id de peça')); },

    // ---- fluxo de campanhas (aditivo; ausência não quebra nada) ----
    brandsDir: safeJoin(root, config.brandsDir || 'brands'),
    campaignsDir: safeJoin(root, config.campaignsDir || 'campaigns'),
    brandManifestFile(id) { return safeJoin(this.brandsDir, assertSafeId(id, 'id de marca'), 'manifest.json'); },
    campaignDir(id) { return safeJoin(this.campaignsDir, assertSafeId(id, 'id de campanha')); },

    /**
     * Raiz da Zionaxs Memory. Env vence o config para permitir apontar outra
     * cópia local sem editar o workspace versionado. `null` é estado legítimo:
     * o sistema opera em modo degradado e sinaliza a limitação (§12).
     */
    get memoryRoot() {
      const r = process.env.MOS_MEMORY_ROOT || config.memoryRoot || null;
      return r ? path.resolve(root, r) : null;
    },
  };
  return ws;
}

/** Marcas com manifesto declarado. */
export function listBrandIds(ws) {
  if (!fs.existsSync(ws.brandsDir)) return [];
  return fs.readdirSync(ws.brandsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => fs.existsSync(path.join(ws.brandsDir, n, 'manifest.json')))
    .sort();
}

/** Campanhas existentes (identificadas por campaign.json). */
export function listCampaignIds(ws) {
  if (!fs.existsSync(ws.campaignsDir)) return [];
  return fs.readdirSync(ws.campaignsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => fs.existsSync(path.join(ws.campaignsDir, n, 'campaign.json')))
    .sort();
}

export function listPieceIds(ws) {
  if (!fs.existsSync(ws.piecesDir)) return [];
  return fs.readdirSync(ws.piecesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => fs.existsSync(path.join(ws.piecesDir, n, 'contract.json')))
    .sort();
}
