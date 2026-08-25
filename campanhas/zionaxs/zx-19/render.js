const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const OUT = path.join(DIR, 'out');
fs.mkdirSync(OUT, { recursive: true });

// approved_visible_copy — a unica fonte do que pode virar pixel
const APPROVED = JSON.parse(fs.readFileSync(path.join(DIR, 'content-contract.json'), 'utf8'));

const CANVAS = { w: 1080, h: 1350 };
const SAFE = { x: 80, y: 88 };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: CANVAS.w, height: CANVAS.h },
    deviceScaleFactor: 1,
  });
  await page.goto('file://' + path.join(DIR, 'index.html'));
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);

  const report = await page.evaluate(({ CANVAS, SAFE }) => {
    const lum = (hex) => {
      const v = hex.match(/\d+/g).slice(0, 3).map(Number).map((c) => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const ratio = (fg, bg) => {
      const a = lum(fg), b = lum(bg);
      const [hi, lo] = a > b ? [a, b] : [b, a];
      return (hi + 0.05) / (lo + 0.05);
    };

    // 1. fallback de fonte
    const faces = [
      ['700 88px Poppins', 'Poppins 700'],
      ['400 46px Archivo', 'Archivo 400'],
      ['500 46px Archivo', 'Archivo 500'],
      ['600 38px Archivo', 'Archivo 600'],
      ['500 26px "JetBrains Mono"', 'JetBrains Mono 500'],
      ['700 232px "JetBrains Mono"', 'JetBrains Mono 700'],
    ];
    const fonts = faces.map(([spec, name]) => ({ face: name, loaded: document.fonts.check(spec) }));

    const slides = [...document.querySelectorAll('.slide')];
    const perSlide = slides.map((s) => {
      const id = s.id;
      const r = s.getBoundingClientRect();
      const bg = getComputedStyle(s).backgroundColor;

      // 2. dimensoes
      const dims = { w: Math.round(r.width), h: Math.round(r.height) };

      // 3. overflow do canvas
      const overflow = {
        x: s.scrollWidth - s.clientWidth,
        y: s.scrollHeight - s.clientHeight,
      };

      // 4. area segura + contraste + runt, por elemento de texto
      const texts = [...s.querySelectorAll('h1,p,span,div')].filter((el) => {
        const t = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        return t && el.offsetWidth > 0;
      });

      const outOfSafe = [];
      const contrasts = [];
      const runts = [];
      const badWrap = [];

      for (const el of texts) {
        const er = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const left = er.left - r.left, top = er.top - r.top;
        const right = r.right - er.right, bottom = r.bottom - er.bottom;
        if (left < SAFE.x - 1 || right < SAFE.x - 1 || top < SAFE.y - 1 || bottom < SAFE.y - 1) {
          outOfSafe.push({
            text: el.textContent.trim().slice(0, 42),
            left: Math.round(left), right: Math.round(right),
            top: Math.round(top), bottom: Math.round(bottom),
          });
        }

        // contraste contra o fundo do slide
        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10) || 400;
        // WCAG "texto grande": >=24px, ou >=18.66px em bold. Aqui tudo e >=26px.
        const large = size >= 24;
        const cr = ratio(cs.color, bg);
        contrasts.push({
          text: el.textContent.trim().slice(0, 34),
          size: Math.round(size), weight,
          color: cs.color,
          ratio: Math.round(cr * 100) / 100,
          need: large ? 3.0 : 4.5,
          pass: cr >= (large ? 3.0 : 4.5),
          large,
        });

        // 5. runt: ultima linha com uma palavra curta sozinha
        const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
        if (node) {
          const rg = document.createRange();
          rg.selectNodeContents(el);
          const raw = [...rg.getClientRects()].filter((x) => x.width > 1);
          const lines = [];
          for (const b of raw) {
            const hit = lines.find((l) => Math.abs(l.top - b.top) < 6);
            if (hit) { hit.left = Math.min(hit.left, b.left); hit.right = Math.max(hit.right, b.right); }
            else lines.push({ top: b.top, left: b.left, right: b.right });
          }
          const rects = lines.map((l) => ({ width: l.right - l.left }));
          if (rects.length > 1) {
            const last = rects[rects.length - 1];
            const widest = Math.max(...rects.map((x) => x.width));
            const words = el.textContent.trim().split(/\s+/);
            const brs = el.querySelectorAll(':scope > br').length;
            if (brs > 0 && rects.length > brs + 1) {
              badWrap.push({
                text: el.textContent.trim().slice(0, 46),
                linhas: rects.length, quebrasAutorais: brs + 1,
              });
            }
            if (last.width / widest < 0.18) {
              runts.push({
                text: el.textContent.trim().slice(0, 40),
                lastWord: words[words.length - 1],
                lastLinePct: Math.round((last.width / widest) * 100),
              });
            }
          }
        }
      }

      // 6. niveis tipograficos distintos
      const isChrome = (el) => !!el.closest('.hd,.ft');
      const levels = [...new Set(texts.filter(el=>!isChrome(el)).map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize))))]
        .sort((a, b) => b - a);
      const chromeLevels = [...new Set(texts.filter(isChrome).map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize))))]
        .sort((a, b) => b - a);

      // 7. texto realmente renderizado no slide (<br> vira espaco, decoracao removida)
      const clone = s.cloneNode(true);
      clone.querySelectorAll('.ruled,svg,[aria-hidden="true"]').forEach((n) => n.remove());
      clone.querySelectorAll('br').forEach((n) => n.replaceWith(document.createTextNode(' ')));
      const renderedText = clone.textContent.replace(/\s+/g, ' ').trim();

      return { id, dims, overflow, outOfSafe, contrasts, runts, badWrap, levels, chromeLevels, renderedText, bg };
    });

    return { fonts, perSlide };
  }, { CANVAS, SAFE });

  // screenshots
  const files = [];
  for (let i = 0; i < 8; i++) {
    const sel = '#s' + (i + 1);
    const f = path.join(OUT, `zx-19-slide-${String(i + 1).padStart(2, '0')}.png`);
    await page.locator(sel).screenshot({ path: f });
    files.push(f);
  }
  await browser.close();

  // ===== verificacao contra o Content Contract =====
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  const copyCheck = report.perSlide.map((s, i) => {
    const approved = APPROVED.slides[i].approved_visible_copy.map(norm);
    const expected = norm(approved.join(' '));
    const rendered = norm(s.renderedText);
    // cada string aprovada precisa aparecer literalmente nos pixels
    const notRendered = approved.filter((a) => !rendered.includes(a));
    // e o texto renderizado nao pode conter nada alem do aprovado
    let residue = rendered;
    for (const a of [...approved].sort((x, y) => y.length - x.length)) residue = residue.split(a).join('|');
    const notApproved = residue.split('|').map(norm).filter((x) => x.length > 0);
    // rotulo estrutural interno que vazou para o pixel
    const allow = new Set((APPROVED.allowlist_editorial||[]).map(a=>a.termo.toLowerCase()));
    const leaked = APPROVED.internal_metadata_NAO_RENDERIZAVEL
      .filter((m) => m.length > 3 && !allow.has(m.toLowerCase()))
      .filter((m) => new RegExp('(^|[^\\p{L}])' + m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^\\p{L}]|$)', 'iu').test(rendered));
    return { id: s.id, notApproved, notRendered, leaked, expected, rendered };
  });

  const flat = (k) => report.perSlide.flatMap((s) => s[k].map((x) => ({ slide: s.id, ...x })));
  const summary = {
    fontFallback: report.fonts.filter((f) => !f.loaded),
    wrongDims: report.perSlide.filter((s) => s.dims.w !== CANVAS.w || s.dims.h !== CANVAS.h),
    overflow: report.perSlide.filter((s) => s.overflow.x > 0 || s.overflow.y > 0),
    outOfSafe: flat('outOfSafe'),
    contrastFail: flat('contrasts').filter((c) => !c.pass),
    runts: flat('runts'),
    badWrap: flat('badWrap'),
    tooManyLevels: report.perSlide.filter((s) => s.levels.length > 3).map((s) => ({ slide: s.id, levels: s.levels })),
    unapprovedStrings: copyCheck.filter((c) => c.notApproved.length).map(c=>({id:c.id,notApproved:c.notApproved})),
    missingStrings: copyCheck.filter((c) => c.notRendered.length).map(c=>({id:c.id,notRendered:c.notRendered})),
    leakedInternalLabels: copyCheck.filter((c) => c.leaked.length).map(c=>({id:c.id,leaked:c.leaked})),
  };

  fs.writeFileSync(path.join(OUT, 'render-report.json'),
    JSON.stringify({ canvas: CANVAS, safe: SAFE, fonts: report.fonts, perSlide: report.perSlide, summary }, null, 2));

  const B = (x) => (x.length === 0 ? 'PASSA' : 'FALHA (' + x.length + ')');
  console.log('=== RENDER REPORT — zx-19-hora-que-sai-de-graca ===');
  console.log('canvas               ', CANVAS.w + 'x' + CANVAS.h, '| 8 slides');
  console.log('fontes carregadas    ', report.fonts.filter(f => f.loaded).length + '/' + report.fonts.length,
              report.fonts.every(f => f.loaded) ? '(sem fallback)' : '(FALLBACK!)');
  console.log('dimensoes            ', B(summary.wrongDims));
  console.log('overflow             ', B(summary.overflow));
  console.log('area segura          ', B(summary.outOfSafe));
  console.log('contraste WCAG       ', B(summary.contrastFail));
  console.log('runt lines           ', B(summary.runts));
  console.log('quebra nao autoral   ', B(summary.badWrap));
  console.log('max 3 niveis/unidade ', B(summary.tooManyLevels));
  console.log('strings nao aprovadas', B(summary.unapprovedStrings));
  console.log('strings faltando     ', B(summary.missingStrings));
  console.log('rotulo interno vazado', B(summary.leakedInternalLabels));
  if (summary.contrastFail.length) console.log('\ncontraste:', JSON.stringify(summary.contrastFail.slice(0, 6), null, 1));
  if (summary.outOfSafe.length) console.log('\narea segura:', JSON.stringify(summary.outOfSafe.slice(0, 6), null, 1));
  if (summary.runts.length) console.log('\nrunts:', JSON.stringify(summary.runts, null, 1));
  if (summary.badWrap.length) console.log('\nquebra nao autoral:', JSON.stringify(summary.badWrap, null, 1));
  if (summary.unapprovedStrings.length) console.log('\nnao aprovadas:', JSON.stringify(summary.unapprovedStrings, null, 1));
  if (summary.missingStrings.length) console.log('\nfaltando:', JSON.stringify(summary.missingStrings, null, 1));
  if (summary.leakedInternalLabels.length) console.log('\nvazou:', JSON.stringify(summary.leakedInternalLabels, null, 1));
  console.log('\ncontrastes medidos (min por slide):');
  report.perSlide.forEach(s => {
    const m = Math.min(...s.contrasts.map(c => c.ratio));
    console.log('  ' + s.id + '  min ' + m.toFixed(2) + ':1   conteudo ' + s.levels.join('/') + '   chrome ' + s.chromeLevels.join('/'));
  });
})();
