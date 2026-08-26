// outputs.js — saídas de acompanhamento da peça (G-04): folha de contato,
// legenda e alt text prontos para o fluxo de publicação.
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { esc } from './util.js';

export function captionMarkdown(contract) {
  const L = [];
  L.push(`# ${contract.id} — legenda e alt text`);
  L.push('');
  L.push('## Legenda');
  L.push('');
  for (const p of contract.caption) L.push(p, '');
  if (contract.caption_sources?.length) {
    L.push(contract.caption_sources.join(' '), '');
  }
  L.push('## Alt text por slide');
  L.push('');
  for (const s of contract.slides) {
    L.push(`**${String(s.n).padStart(2, '0')}/${String(contract.slides.length).padStart(2, '0')}** · ${s.alt}`, '');
  }
  return L.join('\n');
}

export async function writeOutputs({ contract, pieceDir, slideFiles }) {
  const outDir = path.join(pieceDir, 'out');
  fs.writeFileSync(path.join(outDir, 'legenda-alt.md'), captionMarkdown(contract) + '\n');

  // folha de contato — grade com todos os slides, um screenshot só
  const cols = Math.min(4, slideFiles.length);
  const imgs = slideFiles.map((f, i) =>
    `<figure><img src="${esc(path.basename(f))}"><figcaption>${String(i + 1).padStart(2, '0')}/${String(slideFiles.length).padStart(2, '0')}</figcaption></figure>`
  ).join('\n');
  const html = `<!doctype html><meta charset="utf-8">
<style>
body{margin:0;background:#2A2D31;padding:28px;display:grid;
  grid-template-columns:repeat(${cols},1fr);gap:20px;width:2200px}
figure{margin:0}
img{width:100%;display:block;border-radius:4px}
figcaption{font:600 20px/1.3 system-ui,sans-serif;color:#C9CFD6;padding:10px 2px 0}
h1{grid-column:1/-1;font:700 30px system-ui;color:#fff;margin:0 0 6px}
</style>
<h1>${esc(contract.id)} · ${slideFiles.length} slides</h1>
${imgs}`;
  const sheetHtml = path.join(outDir, 'contact-sheet.html');
  fs.writeFileSync(sheetHtml, html);

  const browser = await chromium.launch({ executablePath: process.env.MOS_CHROMIUM || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 2200, height: 1400 } });
    await page.goto('file://' + path.resolve(sheetHtml));
    await page.waitForLoadState('networkidle');
    const sheetPng = path.join(outDir, `${contract.id}-contact-sheet.png`);
    await page.screenshot({ path: sheetPng, fullPage: true });
    return { sheet: sheetPng, captionFile: path.join(outDir, 'legenda-alt.md') };
  } finally {
    await browser.close();
  }
}
