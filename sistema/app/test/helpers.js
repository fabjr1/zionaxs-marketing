// helpers.js — utilitários de teste: workspace temporário e fixtures.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REAL_WS = path.resolve(APP, '..', 'workspace');
export const C4_ID = 'zx-20-capacidade-antes-de-oferta';

export function loadC4() {
  return JSON.parse(fs.readFileSync(path.join(REAL_WS, 'pieces', C4_ID, 'contract.json'), 'utf8'));
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Workspace temporário com brand pack real (fontes incluídas quando o teste
 * renderiza). git=true inicializa repositório para os testes de auditoria.
 */
export function makeTmpWorkspace({ git = false, fonts = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mos-test-'));
  fs.mkdirSync(path.join(root, 'pieces'), { recursive: true });
  fs.mkdirSync(path.join(root, 'brand', 'fonts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config.json'), JSON.stringify({
    brandDir: 'brand', piecesDir: 'pieces', libraryFile: 'library.json', stateFile: 'state.md',
  }));
  fs.copyFileSync(path.join(REAL_WS, 'brand', 'brand.json'), path.join(root, 'brand', 'brand.json'));
  if (fonts) {
    for (const f of fs.readdirSync(path.join(REAL_WS, 'brand', 'fonts'))) {
      fs.copyFileSync(path.join(REAL_WS, 'brand', 'fonts', f), path.join(root, 'brand', 'fonts', f));
    }
  }
  if (git) {
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init'], { cwd: root });
  }
  return root;
}

/** Peça fabricada: contrato + relatório verde + PNGs mínimos (sem render). */
export function fabricatePiece(root, id, { pass = true, digest = 'deadbeef'.repeat(8) } = {}) {
  const dir = path.join(root, 'pieces', id);
  fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
  const contract = clone(loadC4());
  contract.id = id;
  fs.writeFileSync(path.join(dir, 'contract.json'), JSON.stringify(contract, null, 2));
  // PNG 1x1 válido para o exporter
  const png1x1 = Buffer.from(
    '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d49444154789c626001000000ffff03000006000557' +
    'bfabd40000000049454e44ae426082', 'hex');
  const slides = contract.slides.map((_, i) => {
    const name = `${id}-slide-${String(i + 1).padStart(2, '0')}.png`;
    fs.writeFileSync(path.join(dir, 'out', name), png1x1);
    return name;
  });
  fs.writeFileSync(path.join(dir, 'out', 'render-report.json'), JSON.stringify({
    pieceId: id, pass, digest, slides,
    gates: [{ id: 'G1', name: 'canvas', pass, failures: pass ? [] : [{ i: 0 }], detail: '' }],
    perSlide: contract.slides.map((s, i) => ({ n: i + 1, renderedText: s.approved_visible_copy.join(' ') })),
  }, null, 2));
  return { dir, contract };
}
