// gates.js — os 12 gates do gerador (G-03), medidos no artefato real.
// Duas partes: `pageProbe` roda dentro do Chromium e devolve medições cruas
// por slide; `evaluateGates` é pura e transforma medições + contrato no
// relatório passa/falha. A parte pura é testável sem navegador.
import { normText } from './util.js';

/**
 * Função serializada para page.evaluate. Recebe {SAFE:{x,y}} e devolve
 * medições por .slide: dimensões, overflow, área segura, contraste,
 * runts, quebras não autorais, níveis tipográficos e o texto renderizado.
 * (Não usa nada de fora do closure — exigência do evaluate.)
 */
export function pageProbe({ SAFE, FACES, DISPLAYMIN }) {
  const lum = (rgb) => {
    const v = rgb.match(/\d+/g).slice(0, 3).map(Number).map((c) => {
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

  const fonts = FACES.map((spec) => ({ face: spec, loaded: document.fonts.check(spec) }));

  const slides = [...document.querySelectorAll('.slide')];
  const perSlide = slides.map((s) => {
    const r = s.getBoundingClientRect();
    const slideBg = getComputedStyle(s).backgroundColor;
    // fundo real do elemento: o primeiro backgroundColor pintado subindo a
    // árvore (uma célula branca num slide escuro mede contra o branco)
    const bgOf = (el) => {
      let n = el;
      while (n && n !== s.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'transparent' && !/^rgba\(0, 0, 0, 0\)$/.test(c)) return c;
        n = n.parentElement;
      }
      return slideBg;
    };
    const dims = { w: Math.round(r.width), h: Math.round(r.height) };
    const overflow = { x: s.scrollWidth - s.clientWidth, y: s.scrollHeight - s.clientHeight };

    const texts = [...s.querySelectorAll('*')].filter((el) => {
      if (el.closest('svg')) return false;
      const t = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      return t && el.offsetWidth > 0;
    });

    const outOfSafe = [], contrasts = [], runts = [], badWrap = [];

    for (const el of texts) {
      const er = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const left = er.left - r.left, top = er.top - r.top;
      const right = r.right - er.right, bottom = r.bottom - er.bottom;
      if (left < SAFE.x - 1 || right < SAFE.x - 1 || top < SAFE.y - 1 || bottom < SAFE.y - 1) {
        outOfSafe.push({ text: el.textContent.trim().slice(0, 42),
          left: Math.round(left), right: Math.round(right),
          top: Math.round(top), bottom: Math.round(bottom) });
      }

      const size = parseFloat(cs.fontSize);
      const weight = parseInt(cs.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const cr = ratio(cs.color, bgOf(el));
      contrasts.push({ text: el.textContent.trim().slice(0, 34),
        size: Math.round(size), weight, ratio: Math.round(cr * 100) / 100,
        need: large ? 3.0 : 4.5, pass: cr >= (large ? 3.0 : 4.5) });

      const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      if (node) {
        const rg = document.createRange();
        rg.selectNodeContents(el);
        const raw = [...rg.getClientRects()].filter((x) => x.width > 1);
        const linesArr = [];
        for (const b of raw) {
          const hit = linesArr.find((l) => Math.abs(l.top - b.top) < 6);
          if (hit) { hit.left = Math.min(hit.left, b.left); hit.right = Math.max(hit.right, b.right); }
          else linesArr.push({ top: b.top, left: b.left, right: b.right });
        }
        const rects = linesArr.map((l) => ({ width: l.right - l.left }));
        if (rects.length > 1) {
          const brs = el.querySelectorAll('br').length;
          const isDisplay = size >= DISPLAYMIN;
          if ((brs > 0 && rects.length > brs + 1) || (brs === 0 && isDisplay)) {
            badWrap.push({ text: el.textContent.trim().slice(0, 46),
              linhas: rects.length, quebrasAutorais: brs + 1 });
          }
          const last = rects[rects.length - 1];
          const widest = Math.max(...rects.map((x) => x.width));
          if (last.width / widest < 0.18) {
            const words = el.textContent.trim().split(/\s+/);
            runts.push({ text: el.textContent.trim().slice(0, 40),
              lastWord: words[words.length - 1],
              lastLinePct: Math.round((last.width / widest) * 100) });
          }
        }
      }
    }

    const isChrome = (el) => !!el.closest('.hd,.ft');
    const levelOf = (el) => Math.round(parseFloat(getComputedStyle(el).fontSize));
    const levels = [...new Set(texts.filter((el) => !isChrome(el)).map(levelOf))].sort((a, b) => b - a);
    const chromeLevels = [...new Set(texts.filter(isChrome).map(levelOf))].sort((a, b) => b - a);

    const clone = s.cloneNode(true);
    clone.querySelectorAll('svg,[aria-hidden="true"],img').forEach((n) => n.remove());
    clone.querySelectorAll('br').forEach((n) => n.replaceWith(document.createTextNode(' ')));
    const renderedText = clone.textContent.replace(/\s+/g, ' ').trim();

    return { dims, overflow, outOfSafe, contrasts, runts, badWrap, levels, chromeLevels, renderedText, bg: slideBg };
  });

  return { fonts, perSlide };
}

/** Escapa termo para uso em RegExp. */
function reEsc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parte pura: medições + contrato + brand → relatório dos 12 gates.
 */
export function evaluateGates(measure, contract, brand) {
  const fmt = brand.formats[contract.format];
  const total = contract.slides.length;
  const gates = [];
  const add = (id, name, failures, detail) =>
    gates.push({ id, name, pass: failures.length === 0, failures, detail });

  const per = measure.perSlide;

  add('G1', 'canvas',
    per.map((s, i) => ({ i, ...s.dims })).filter((s) => s.w !== fmt.w || s.h !== fmt.h),
    `${fmt.w}x${fmt.h} · ${per.length} unidades`);

  add('G2', 'fallback de fonte',
    measure.fonts.filter((f) => !f.loaded),
    `${measure.fonts.filter((f) => f.loaded).length}/${measure.fonts.length} faces`);

  add('G3', 'overflow',
    per.map((s, i) => ({ i, ...s.overflow })).filter((s) => s.x > 0 || s.y > 0), '');

  add('G4', 'área segura',
    per.flatMap((s, i) => s.outOfSafe.map((x) => ({ slide: i + 1, ...x }))),
    `${fmt.mx}/${fmt.my}px`);

  const contrastFails = per.flatMap((s, i) =>
    s.contrasts.filter((c) => !c.pass).map((c) => ({ slide: i + 1, ...c })));
  const minRatio = Math.min(...per.flatMap((s) => s.contrasts.map((c) => c.ratio)));
  add('G5', 'contraste WCAG 2.2', contrastFails, `mínimo medido ${minRatio.toFixed(2)}:1`);

  add('G6', 'runt lines',
    per.flatMap((s, i) => s.runts.map((x) => ({ slide: i + 1, ...x }))), '');

  add('G7', 'quebra não autoral',
    per.flatMap((s, i) => s.badWrap.map((x) => ({ slide: i + 1, ...x }))), '');

  add('G8', 'máx. 3 níveis por unidade',
    per.map((s, i) => ({ slide: i + 1, levels: s.levels })).filter((s) => s.levels.length > 3),
    'chrome medido à parte');

  // G9/G10/G11 — copy literal contra o contrato
  const g9 = [], g10 = [], g11 = [];
  const internal = (contract.internal_metadata || []).filter((m) => m.length >= 2);
  const allow = new Map();
  for (const a of contract.allowlist_editorial || []) {
    if (!allow.has(a.slide)) allow.set(a.slide, new Set());
    allow.get(a.slide).add(String(a.termo).toLowerCase());
  }
  const pad = (n) => String(n).padStart(2, '0');

  contract.slides.forEach((sl, i) => {
    const m = per[i];
    if (!m) return;
    const approved = sl.approved_visible_copy.map(normText);
    const rendered = normText(m.renderedText);

    for (const a of approved) if (!rendered.includes(a)) g10.push({ slide: i + 1, faltando: a.slice(0, 60) });

    let residue = rendered;
    for (const a of [...approved].sort((x, y) => y.length - x.length)) residue = residue.split(a).join('|');
    residue.split('|').map(normText).filter(Boolean)
      .forEach((x) => g9.push({ slide: i + 1, naoAprovada: x.slice(0, 60) }));

    const allowed = allow.get(sl.n) || new Set();
    for (const term of internal) {
      if (allowed.has(term.toLowerCase())) continue;
      const re = new RegExp(`(^|[^\\p{L}])${reEsc(term)}([^\\p{L}]|$)`, 'iu');
      if (re.test(rendered)) g11.push({ slide: i + 1, vazou: term });
    }
    void pad;
  });

  add('G9', 'strings não aprovadas', g9, '');
  add('G10', 'strings faltando', g10, '');
  add('G11', 'rótulo interno vazado', g11, `${(contract.allowlist_editorial || []).length} allowlist`);

  add('G12', 'alt text por unidade',
    contract.slides
      .map((s) => ({ slide: s.n, alt: s.alt || '' }))
      .filter((s) => s.alt.length < 40 || !s.alt.startsWith(`Slide ${s.slide} de ${total}`)),
    `${total} unidades`);

  return {
    gates,
    pass: gates.every((g) => g.pass),
    summary: gates.map((g) => `${g.id} ${g.name}: ${g.pass ? 'PASSA' : `FALHA (${g.failures.length})`}`),
  };
}
