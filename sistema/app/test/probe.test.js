// probe.test.js — regressões do pageProbe no Chromium real: as medições que
// a revisão adversarial provou erradas (fundo real do elemento, quebra não
// autoral em tipo display, texto em elementos aninhados como <i>).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { pageProbe } from '../lib/gates.js';

const FIXTURE = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0}
  .slide{width:1080px;height:1350px;background:#101014;color:#f2f2f0;
    position:relative;font:400 30px Arial, sans-serif;padding:120px;box-sizing:border-box}
  .cell{background:#ffffff;padding:24px;width:400px}
  .cell p{color:#fefefe;margin:0}                 /* branco sobre branco: invisível */
  .display{font-size:80px;font-weight:700;width:600px;margin-top:40px} /* quebra sem <br> */
  .body-copy{width:400px;margin-top:40px}          /* quebra natural permitida */
</style>
<div class="slide">
  <div class="cell"><p>texto invisivel na celula clara</p></div>
  <div class="display">Titulo grande que quebra sozinho</div>
  <p class="body-copy">corpo de texto que pode quebrar naturalmente sem autor <i>com italico aninhado</i></p>
</div>`;

test('probe: fundo real, quebra display e elemento aninhado', async (t) => {
  const browser = await chromium.launch({ executablePath: process.env.MOS_CHROMIUM || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.setContent(FIXTURE);
    const m = await page.evaluate(pageProbe, { SAFE: { x: 80, y: 88 }, FACES: [], DISPLAYMIN: 64 });
    const s = m.perSlide[0];

    // G5 (F-01 da revisão): o branco-sobre-branco dentro da célula clara tem
    // de ser medido contra o fundo REAL (branco), não contra o slide escuro.
    const invisible = s.contrasts.find((c) => c.text.includes('invisivel'));
    assert.ok(invisible, 'texto da célula foi medido');
    assert.ok(invisible.ratio < 1.5, `branco sobre branco mede ~1:1, veio ${invisible.ratio}`);

    // G7 (F-03 da revisão): tipo display quebrando sem <br> é quebra não autoral.
    assert.ok(s.badWrap.some((w) => w.text.includes('Titulo grande')),
      'display de 80px com wrap e zero <br> entra em badWrap');

    // corpo abaixo do piso display pode quebrar naturalmente
    assert.ok(!s.badWrap.some((w) => w.text.includes('corpo de texto')),
      'corpo de 30px com wrap natural NÃO é badWrap');

    // F-04 da revisão: o <i> aninhado carrega texto e é medido
    assert.ok(s.contrasts.some((c) => c.text.includes('italico aninhado')),
      'elementos aninhados com texto próprio entram na medição');
  } finally {
    await browser.close();
  }
});
