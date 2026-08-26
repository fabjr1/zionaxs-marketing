// compile.js — Piece Contract → HTML renderizável (G-01).
// O HTML compilado é DERIVADO (P2): regenerável, versionado junto da execução,
// nunca editado à mão. Fontes por caminho relativo estável dentro do workspace
// (out/ → ../../../brand/fonts/), sem nenhuma dependência de rede (N-02).
import path from 'node:path';
import fs from 'node:fs';
import { esc } from './util.js';
import { getTemplate } from './templates/index.js';

/**
 * Compila o contrato. Retorna { html, template }.
 * `fontsHref` é o caminho do CSS de fontes relativo ao out/ da peça.
 */
export function compile(contract, brand, { fontsHref } = {}) {
  const template = getTemplate(contract.format);
  const total = contract.slides.length;
  const ctx = { esc, total, brand };

  const sections = contract.slides
    .map((s) => template.renderSlide(s, ctx))
    .join('\n\n');

  const href = fontsHref || path.posix.join('..', '..', '..', 'brand', 'fonts', 'fonts.css');
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<!-- DERIVADO de contract.json — não editar; corrigir o contrato e recompilar (P2) -->
<link rel="stylesheet" href="${esc(href)}">
<style>
${template.css(brand)}
</style>
</head>
<body>

${sections}

</body>
</html>
`;
  return { html, template };
}

/** Compila e grava out/compiled.html da peça. Retorna o caminho. */
export function compileToFile(contract, brand, pieceDir) {
  const outDir = path.join(pieceDir, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const { html } = compile(contract, brand);
  const file = path.join(outDir, 'compiled.html');
  fs.writeFileSync(file, html);
  return file;
}
