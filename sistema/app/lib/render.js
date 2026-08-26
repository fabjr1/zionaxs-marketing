// render.js — render determinístico via Chromium (G-02, G-05).
// Regras duras: nenhuma requisição de rede (http/https é abortado e contado —
// N-02), fontes vêm do brand pack em disco, e o mesmo contrato produz os
// mesmos bytes. O relatório carrega o digest da geração (gates_snapshot).
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { pageProbe, evaluateGates } from './gates.js';
import { sha256Files, isoNow } from './util.js';

function chromiumPath() {
  return process.env.MOS_CHROMIUM || undefined; // undefined → resolução do Playwright
}

/** Faces cuja carga é verificada (G2), derivadas do brand pack. */
function facesFor(brand) {
  const f = brand.fonts, t = brand.type;
  return [
    `700 ${t.display}px ${f.display}`,
    `400 ${t.body}px ${f.body}`,
    `500 ${t.body}px ${f.body}`,
    `600 ${t.secondary}px ${f.body}`,
    `500 ${t.note}px "${f.mono}"`,
    `700 ${t.figure}px "${f.mono}"`,
  ];
}

/**
 * Renderiza a peça: PNGs por slide + relatório de gates.
 * `compiledFile` é o out/compiled.html já gerado pelo compile.
 * Retorna o relatório (também gravado em out/render-report.json).
 */
export async function renderPiece({ contract, brand, pieceDir, compiledFile }) {
  const outDir = path.join(pieceDir, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const fmt = brand.formats[contract.format];
  const total = contract.slides.length;

  const browser = await chromium.launch({ executablePath: chromiumPath() });
  let networkAttempts = [];
  try {
    const page = await browser.newPage({
      viewport: { width: fmt.w, height: fmt.h },
      deviceScaleFactor: 1,
    });

    // N-02: rede proibida no render. http/https aborta e registra.
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (/^https?:/i.test(url)) {
        networkAttempts.push(url);
        return route.abort();
      }
      return route.continue();
    });

    await page.goto('file://' + path.resolve(compiledFile));
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    // G2 verifica DISPONIBILIDADE das faces declaradas, não apenas uso:
    // força o load de cada uma antes do check (face declarada mas nunca
    // usada na peça não pode reprovar; face ausente do brand pack, sim).
    await page.evaluate(async (faces) => {
      await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => [])));
    }, facesFor(brand));

    const t0 = Date.now();
    const measure = await page.evaluate(pageProbe, {
      SAFE: { x: fmt.mx, y: fmt.my },
      FACES: facesFor(brand),
      DISPLAYMIN: brand.type.title, // tipo display: toda quebra é autoral (G7)
    });

    const files = [];
    for (let i = 1; i <= total; i++) {
      const file = path.join(outDir, `${contract.id}-slide-${String(i).padStart(2, '0')}.png`);
      await page.locator(`#s${i}`).screenshot({ path: file });
      files.push(file);
    }

    const result = evaluateGates(measure, contract, brand);

    // rede tentada = falha de render, mesmo que os gates visuais passem
    if (networkAttempts.length) {
      result.gates.push({
        id: 'NET', name: 'rede durante o render', pass: false,
        failures: networkAttempts.map((u) => ({ url: u.slice(0, 120) })),
        detail: 'render deve ser 100% local (N-02)',
      });
      result.pass = false;
    }

    const digest = sha256Files([
      path.join(pieceDir, 'contract.json'),
      compiledFile,
      ...files,
    ]);

    const report = {
      pieceId: contract.id,
      generatedAt: isoNow(),
      format: contract.format,
      canvas: { w: fmt.w, h: fmt.h, safe: { x: fmt.mx, y: fmt.my } },
      fonts: measure.fonts,
      slides: files.map((f) => path.basename(f)),
      perSlide: measure.perSlide.map((s, i) => ({
        n: i + 1,
        minContrast: Math.min(...s.contrasts.map((c) => c.ratio)),
        levels: s.levels,
        chromeLevels: s.chromeLevels,
        renderedText: s.renderedText, // para o diff de copy no console (C-03)
      })),
      gates: result.gates,
      pass: result.pass,
      durationSeconds: Math.round((Date.now() - t0) / 100) / 10, // N-04 no relatório
      digest,
    };
    fs.writeFileSync(path.join(outDir, 'render-report.json'), JSON.stringify(report, null, 2) + '\n');
    return report;
  } finally {
    await browser.close();
  }
}
