// carousel-4x5.js — template pack do formato carrossel 1080×1350 (G-06).
// Derivado do Render Contract provado no zx-19: mesmos tokens, mesmas
// relações tipográficas, mesmos papéis narrativos. Um layout é uma função
// pura (slide, ctx) → HTML do corpo; o chrome (kicker, paginação, wordmark)
// é do template, não do layout.
//
// Vocabulário de layouts:
//   cover, statement, figure, figure-duo, lines, keyvalue, fields,
//   strip, flow, math, image
// Cada um respeita: máx. 3 níveis tipográficos de conteúdo por unidade,
// área segura, e só renderiza strings vindas do contrato.

export const formatKey = 'carousel-4x5';

/** Quebra autoral: "\n" no contrato vira <br> no pixel. */
function brk(escFn, s) {
  return escFn(String(s)).replaceAll('\n', '<br>');
}

export function css(brand) {
  const c = brand.colors, t = brand.type, f = brand.fonts;
  const fmt = brand.formats[formatKey];
  return `
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#3a3d42}
body{font-family:${f.body},sans-serif;-webkit-font-smoothing:antialiased;font-kerning:normal}
.slide{position:relative;width:${fmt.w}px;height:${fmt.h}px;background:${c.paper};color:${c.ink};
  overflow:hidden;display:flex;flex-direction:column;padding:${fmt.my}px ${fmt.mx}px;margin:0 auto 40px}
.slide.dark{background:${c.ink};color:${c.darkInk}}
.hd{display:flex;justify-content:space-between;align-items:baseline;
  padding-bottom:22px;border-bottom:2px solid ${c.ink};flex:none}
.slide.dark .hd{border-bottom-color:#4A525C}
.hd .kick{font-family:"${f.mono}",monospace;font-weight:700;font-size:${t.kicker}px;
  letter-spacing:.14em;text-transform:uppercase;color:${c.accentInk}}
.slide.dark .hd .kick{color:${c.accent}}
.hd .pg{font-family:"${f.mono}",monospace;font-weight:500;font-size:${t.kicker}px;
  letter-spacing:.06em;color:${c.muted};font-variant-numeric:tabular-nums}
.slide.dark .hd .pg{color:${c.darkMuted}}
.body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:56px 0}
.ft{display:flex;justify-content:space-between;align-items:center;
  padding-top:22px;border-top:1px solid ${c.rule};flex:none}
.slide.dark .ft{border-top-color:${c.darkRule}}
.ft .wm{font-family:${f.display},sans-serif;font-weight:700;font-size:26px;letter-spacing:-.01em}
.ft .wm svg{height:30px;display:block}
.ft .wm img{height:${(brand.logo && brand.logo.height) || 30}px;display:block}
.d1{font-family:${f.display},sans-serif;font-weight:700;font-size:${t.display}px;line-height:1.08;letter-spacing:-.028em}
.d2{font-family:${f.display},sans-serif;font-weight:700;font-size:${t.title}px;line-height:1.12;letter-spacing:-.022em}
.p{font-size:${t.body}px;line-height:1.42;font-weight:400}
.p.med{font-weight:500}
.sec{font-size:${t.secondary}px;line-height:1.45;color:${c.muted}}
.slide.dark .sec{color:${c.darkMuted}}
.note{font-family:"${f.mono}",monospace;font-size:${t.note}px;line-height:1.5;color:${c.muted}}
.slide.dark .note{color:${c.darkMuted}}
.acc{color:${c.accent}}
.acc-i{color:${c.accentInk}}
.stack>*+*{margin-top:34px}
.stack-s>*+*{margin-top:20px}
.figure{font-family:"${f.mono}",monospace;font-weight:700;font-size:${t.figure}px;
  line-height:.92;letter-spacing:-.04em;color:${c.accent}}
.denom{font-size:${t.body}px;line-height:1.4;font-weight:500;color:${c.ink};max-width:880px}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:0 48px;align-items:start}
.duo .num{font-family:"${f.mono}",monospace;font-weight:700;font-size:${t.figureDuo}px;
  line-height:.95;letter-spacing:-.03em;color:${c.accent}}
.duo .lab{font-size:${t.secondary}px;line-height:1.35;font-weight:500;margin-top:14px}
.duo .sub{font-family:"${f.mono}",monospace;font-size:${t.note}px;color:${c.muted};margin-top:10px}
.rows{display:flex;flex-direction:column;border-top:2px solid ${c.ink}}
.row{display:grid;grid-template-columns:300px 1fr;align-items:center;gap:0 28px;
  padding:30px 0;border-bottom:1px solid ${c.rule}}
.row .k{font-family:"${f.mono}",monospace;font-weight:700;font-size:38px;letter-spacing:.02em;color:${c.accentInk}}
.row .v{font-size:38px;line-height:1.3;font-weight:500}
.reg{display:flex;flex-direction:column;border-top:2px solid ${c.ink};margin-top:20px}
.reg .l{display:grid;grid-template-columns:64px 1fr;gap:0 22px;align-items:center;
  padding:26px 0;border-bottom:1px solid ${c.rule}}
.reg .n{font-family:"${f.mono}",monospace;font-weight:700;font-size:32px;color:${c.muted};font-variant-numeric:tabular-nums}
.reg .b{height:2px;background:${c.rule}}
.reg .t{font-size:${t.secondary}px;font-weight:500;line-height:1.35}
.cal{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:24px}
.wk{border:2px solid ${c.rule2};border-radius:6px;background:${c.cellBg};padding:24px 12px;text-align:center;
  font-family:"${f.mono}",monospace;font-size:${t.note}px;font-weight:700;color:${c.muted}}
.wk.on{border-color:${c.accent};color:${c.accentInk}}
.wk.off{background:repeating-linear-gradient(45deg,${c.hatchA} 0 8px,${c.paper} 8px 16px);color:${c.muted}}
.callab{font-family:"${f.mono}",monospace;font-size:${t.note}px;color:${c.muted};margin-top:16px;display:flex;gap:38px}
.callab i{font-style:normal;display:flex;align-items:center;gap:10px}
.dot{width:18px;height:18px;border-radius:4px;display:inline-block;border:2px solid ${c.accent}}
.dot.x{border-color:${c.rule2};background:repeating-linear-gradient(45deg,${c.hatchA} 0 5px,${c.paper} 5px 10px)}
.diag{display:grid;grid-template-columns:1fr 96px 1fr;align-items:center;margin-top:52px}
.diag .col{display:flex;flex-direction:column;gap:18px}
.cell{background:${c.cellBg};color:${c.ink};border:2px solid ${c.rule2};border-radius:6px;
  padding:22px 26px;font-size:${t.secondary}px;line-height:1.3;font-weight:500}
.cell.out{border-color:${c.accent};color:${c.accentInk};font-weight:600}
.arrows{position:relative;height:100%;min-height:230px}
.arrows svg{position:absolute;inset:0;width:100%;height:100%}
.math{font-family:"${f.mono}",monospace;font-weight:700;font-size:88px;letter-spacing:-.03em;
  line-height:1.1;color:${c.accent}}
.cite{border-left:3px solid ${c.rule2};padding-left:24px;margin-top:44px}
.imgwrap{margin-top:40px;border:1px solid ${c.rule};border-radius:6px;overflow:hidden}
.imgwrap img{width:100%;display:block}

/* ===== estilo pôster editorial (direção visual oficial, 29/08/2026) =====
   Três campos: foto escura (emoção), papel claro (utilidade), laranja
   chapado (virada). Chrome de prova de impressão em todos: grão, ano,
   nº em caixa, temas, régua de cor e microlinha. Contraste é medido pelo
   G5 contra o background declarado do campo — por isso: no laranja, texto
   pequeno é tinta (4.9:1) e texto grande é papel (3.4:1); no campo de
   foto o slide declara tinta e os scrims garantem a leitura perceptual. */
.slide.poster{display:block;padding:0}
.pbgwrap{position:absolute;inset:0;overflow:hidden}
.pbg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pgrade{position:absolute;inset:0;mix-blend-mode:soft-light;background:
  linear-gradient(180deg, rgba(255,122,26,.26) 0%, rgba(255,122,26,.08) 26%,
  rgba(39,69,78,.32) 54%, rgba(39,69,78,.10) 68%, transparent 76%)}
.pscrim{position:absolute;inset:0;background:
  linear-gradient(180deg, rgba(12,13,16,.32) 0%, rgba(12,13,16,.12) 30%,
  rgba(12,13,16,.42) 60%, rgba(12,13,16,.92) 96%)}
.pgrain{position:absolute;inset:0;pointer-events:none;opacity:.18;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='260' height='260' filter='url(%23n)' opacity='0.9'/></svg>")}
.pbleed{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.parc{position:absolute;border-radius:50%;border:26px solid ${c.accent}}
.pblock{position:absolute;overflow:hidden}
.pblock img{width:100%;height:100%;object-fit:cover;filter:grayscale(1) contrast(1.08) brightness(1.18)}
.pghost{position:absolute;right:-40px;bottom:60px;width:640px;height:640px}
.pghost text{font-family:"${f.mono}",monospace;font-weight:700;fill:rgba(20,23,27,.12)}

.slide.pfield-photo{background:${c.ink};color:${c.posterCream}}
.slide.pfield-paper{background:${c.paper};color:${c.ink}}
.slide.pfield-orange{background:${c.accent};color:${c.paper}}

.pmeta{position:absolute;left:${fmt.mx}px;right:${fmt.mx}px;top:40%;
  display:flex;justify-content:space-between;align-items:flex-start;
  padding-bottom:0;border-bottom:0}
.pyear{font-family:${f.display},sans-serif;font-weight:700;font-size:46px;letter-spacing:.02em}
.pkick{font-family:"${f.mono}",monospace;font-weight:700;font-size:22px;letter-spacing:.2em;
  text-transform:uppercase;margin-top:22px;color:${c.accent}}
.pfield-orange .pkick{color:${c.paper}}
.pnum{display:flex;align-items:center;justify-content:center;min-width:84px;height:84px;
  padding:0 14px;border:3px solid rgba(239,231,215,.9);
  font-family:"${f.mono}",monospace;font-weight:700;font-size:24px;letter-spacing:.06em;
  font-variant-numeric:tabular-nums}
.pfield-orange .pnum{border-color:rgba(245,246,247,.9)}

.php{position:absolute;left:${fmt.mx}px;right:${fmt.mx}px;top:${fmt.my}px;
  display:flex;justify-content:space-between;align-items:baseline;
  padding-bottom:20px;border-bottom:2px solid ${c.ink}}
.php .pk2{font-family:"${f.mono}",monospace;font-weight:700;font-size:${t.kicker}px;
  letter-spacing:.14em;text-transform:uppercase;color:${c.accentInk}}
.php .pp2{font-family:"${f.mono}",monospace;font-weight:500;font-size:24px;
  letter-spacing:.06em;color:${c.muted};font-variant-numeric:tabular-nums}

.pbody{position:absolute;left:${fmt.mx}px;right:${fmt.mx}px;bottom:206px}
.pbody.up{text-transform:uppercase}
.pt1{font-family:${f.display},sans-serif;font-weight:700;line-height:.98;letter-spacing:-.02em}
.pt2{font-family:${f.display},sans-serif;font-weight:700;font-size:${t.title}px;line-height:1.1;letter-spacing:-.022em}
.psub{font-size:40px;line-height:1.32;font-weight:500}
.pnote{font-family:"${f.mono}",monospace;font-size:${t.note}px;line-height:1.5;color:rgba(239,231,215,.72)}
.pfield-paper .pnote{color:${c.muted}}
.phl{background:${c.accent};color:${c.paper};padding:2px 18px 5px;border-radius:4px;
  box-decoration-break:clone;-webkit-box-decoration-break:clone}
.phl-ink{background:${c.ink};color:${c.paper};padding:2px 18px 5px;border-radius:4px;
  box-decoration-break:clone;-webkit-box-decoration-break:clone}
.preg{display:flex;flex-direction:column;border-top:2px solid ${c.ink};margin-top:30px}
.preg .l{display:grid;grid-template-columns:64px 1fr;gap:0 22px;align-items:center;
  padding:26px 0;border-bottom:1px solid ${c.rule2}}
.preg .n{font-family:"${f.mono}",monospace;font-weight:700;font-size:32px;color:${c.accentInk};font-variant-numeric:tabular-nums}
.preg .t{font-size:${t.secondary}px;line-height:1.35;font-weight:500;color:${c.ink}}

.pfoot{position:absolute;left:${fmt.mx}px;right:${fmt.mx}px;bottom:${fmt.my}px;
  display:block;padding-top:0;border-top:0}
.pfoot .pf1{display:flex;justify-content:space-between;align-items:baseline;
  padding-top:18px;border-top:1px solid rgba(239,231,215,.45)}
.pfield-paper .pfoot .pf1{border-top-color:${c.rule}}
.pfield-orange .pfoot .pf1{border-top-color:rgba(245,246,247,.55)}
.ptemas{font-family:"${f.mono}",monospace;font-size:17px;letter-spacing:.14em;
  text-transform:uppercase;color:rgba(239,231,215,.78)}
.pfield-paper .ptemas{color:${c.muted}}
.pfield-orange .ptemas{color:${c.ink}}
.pwm{font-family:${f.display},sans-serif;font-weight:700;font-size:26px;letter-spacing:-.01em;color:${c.posterCream}}
.pwm img{height:${(brand.logo && brand.logo.height) || 30}px;display:block}
.pfield-paper .pwm{color:${c.ink}}
.pfield-orange .pwm{color:${c.paper}}
.pf2{display:flex;justify-content:space-between;align-items:center;margin-top:14px}
.pchips{display:flex;gap:8px}
.pchips i{display:block;width:44px;height:20px}
.pfield-paper .pchips i{box-shadow:inset 0 0 0 1px rgba(20,23,27,.14)}
.pfield-orange .pchips i{box-shadow:inset 0 0 0 1px rgba(245,246,247,.45)}
.pmicro{font-family:"${f.mono}",monospace;font-size:15px;letter-spacing:.08em;color:rgba(239,231,215,.6)}
.pfield-paper .pmicro{color:${c.muted}}
.pfield-orange .pmicro{color:${c.ink}}
`;
}

/**
 * Marca no rodapé. Ordem: SVG inline do brand pack → logo oficial em arquivo
 * (variante por campo: preta sobre papel, branca sobre foto e laranja) →
 * wordmark composta em tipo, paliativo de quando não há logo instalada.
 * Caminho relativo ao out/ da peça, mesmo esquema das fontes (N-02: local).
 */
function logoMark(brand, escFn, variant, cls) {
  if (brand.logoSvg) return `<span class="${cls}">${brand.logoSvg}</span>`;
  const lg = brand.logo;
  if (lg && lg[variant]) {
    const src = `../../../${lg.dir || 'brand/logo'}/${lg[variant]}`;
    return `<span class="${cls}"><img src="${escFn(src)}" alt=""></span>`;
  }
  return `<span class="${cls}">${escFn(brand.wordmark)}</span>`;
}

/** Realce autoral: `hl` no contrato marca a substring que ganha a caixa. */
function hlWrap(escFn, text, hl, cls) {
  const html = brk(escFn, text);
  if (!hl) return html;
  const target = brk(escFn, hl);
  return html.replace(target, `<span class="${cls}">${target}</span>`);
}

/** Campo de cada layout pôster: foto escura, papel claro ou laranja. */
const POSTER_FIELD = {
  'poster-cover': 'photo', 'poster-close': 'photo', 'poster-turn': 'orange',
  'poster-scene': 'paper', 'poster-lines': 'paper', 'poster-fields': 'paper',
  'poster-statement': 'paper',
};

/** Decorações não-textuais por layout (clipadas em .pbleed; SVG e imagens
    ficam fora dos gates de texto por construção — como as setas do flow). */
function posterBleed(slide) {
  switch (slide.layout) {
    case 'poster-scene': {
      const ph = slide.photo;
      return `<div class="pbleed">
    <div class="parc" style="width:560px;height:560px;right:-210px;top:150px"></div>
    ${ph ? `<div class="pblock" style="right:80px;top:250px;width:380px;height:440px"><img src="${ph.src}" alt=""></div>` : ''}
    <div class="parc" style="width:220px;height:220px;right:370px;top:560px;border-width:20px"></div>
  </div>`;
    }
    case 'poster-lines':
      return `<div class="pbleed">
    <div class="parc" style="width:520px;height:520px;right:-200px;top:170px"></div>
    <div class="parc" style="width:190px;height:190px;right:250px;top:120px;border-width:18px"></div>
  </div>`;
    case 'poster-fields':
      return `<div class="pbleed">
    <div class="parc" style="width:560px;height:560px;right:-240px;top:-240px"></div>
  </div>`;
    case 'poster-statement':
      return `<div class="pbleed">
    <div class="parc" style="width:420px;height:420px;right:-240px;top:40%"></div>
  </div>`;
    case 'poster-turn': {
      const g = slide.copy && slide.copy.ghost;
      return g ? `<div class="pbleed">
    <svg class="pghost" viewBox="0 0 640 640" aria-hidden="true"><text x="640" y="560" text-anchor="end" font-size="560" letter-spacing="-28">${g}</text></svg>
  </div>` : '';
    }
    default:
      return '';
  }
}

/** Moldura do estilo pôster: campo + chrome de prova de impressão. */
function posterFrame(slide, ctx, bodyHtml) {
  const { esc, total, brand } = ctx;
  const pad = (n) => String(n).padStart(2, '0');
  const c = slide.copy || {};
  const field = POSTER_FIELD[slide.layout];
  const pg = `${pad(slide.n)}/${pad(total)}`;
  const cc = brand.colors;

  const ph = slide.photo;
  const bg = field === 'photo' && ph
    ? `<div class="pbgwrap"><img class="pbg" src="${esc(ph.src)}" alt="" style="object-position:${esc(ph.pos || '50% 50%')}${ph.scale ? `;transform:scale(${Number(ph.scale)});transform-origin:${esc(ph.origin || '50% 50%')}` : ''}"></div>
  <div class="pgrade"></div>
  <div class="pscrim"></div>`
    : '';

  const top = field === 'paper'
    ? `<div class="hd php"><span class="pk2">${esc(slide.kicker)}</span><span class="pp2">${pg}</span></div>`
    : `<div class="hd pmeta">
    <div>${c.year ? `<div class="pyear">${esc(c.year)}</div>` : ''}<div class="pkick">${esc(slide.kicker)}</div></div>
    <div class="pnum">${pg}</div>
  </div>`;

  const chips = [cc.ink, cc.accent, cc.posterGlow, cc.posterTeal, cc.posterCream]
    .map((x) => `<i style="background:${x}"></i>`).join('');
  const wm = logoMark(brand, esc, field === 'paper' ? 'light' : 'dark', 'pwm');
  const foot = `<div class="ft pfoot">
    <div class="pf1"><span class="ptemas">${esc(c.temas || '')}</span>${wm}</div>
    <div class="pf2"><span class="pchips">${chips}</span><span class="pmicro">${esc(c.micro || '')}</span></div>
  </div>`;

  const up = field === 'paper' ? '' : ' up';
  return `<section class="slide poster pfield-${field}" id="s${slide.n}">
  ${bg}
  ${posterBleed(slide)}
  <div class="pgrain"></div>
  ${top}
  <div class="pbody${up}">
${bodyHtml}
  </div>
  ${foot}
</section>`;
}

/** Chrome determinístico da unidade: cabeçalho e rodapé. */
function chrome(slide, ctx, bodyHtml) {
  const { esc, total, brand } = ctx;
  const pad = (n) => String(n).padStart(2, '0');
  const dark = slide.dark ? ' dark' : '';
  const wm = logoMark(brand, esc, slide.dark ? 'dark' : 'light', 'wm');
  return `<section class="slide${dark}" id="s${slide.n}">
  <div class="hd"><span class="kick">${esc(slide.kicker)}</span><span class="pg">${pad(slide.n)}/${pad(total)}</span></div>
  <div class="body">
${bodyHtml}
  </div>
  <div class="ft">${wm}</div>
</section>`;
}

export const layouts = {
  cover(s, ctx) {
    const c = s.copy, e = ctx.esc;
    return `<div class="stack">
  <h1 class="d1">${brk(e, c.title)}${c.accentLine ? `<br><span class="acc">${brk(e, c.accentLine)}</span>` : ''}</h1>
  ${c.sub ? `<p class="sec">${e(c.sub)}</p>` : ''}
  ${c.note ? `<p class="note">${brk(e, c.note)}</p>` : ''}
</div>`;
  },

  statement(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const cls = c.big ? 'd1' : 'd2';
    return `<div class="stack">
  <p class="${cls}">${brk(e, c.title)}</p>
  ${c.accent ? `<p class="${cls} acc">${brk(e, c.accent)}</p>` : ''}
  ${c.body ? `<p class="p med${s.dark ? '' : ' acc-i'}">${brk(e, c.body)}</p>` : ''}
</div>`;
  },

  figure(s, ctx) {
    const c = s.copy, e = ctx.esc;
    return `<div class="stack">
  <div class="figure">${e(c.value)}</div>
  <p class="denom">${brk(e, c.denom)}</p>
  ${c.note ? `<p class="note">${brk(e, c.note)}</p>` : ''}
</div>`;
  },

  'figure-duo'(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const items = (c.items || []).map((it) => `
    <div>
      <div class="num">${e(it.value)}</div>
      <div class="lab">${brk(e, it.label)}</div>
      ${it.sub ? `<div class="sub">${e(it.sub)}</div>` : ''}
    </div>`).join('');
    return `<div class="stack">
  ${c.title ? `<p class="d2">${brk(e, c.title)}</p>` : ''}
  <div class="duo">${items}</div>
  ${c.note ? `<p class="note">${brk(e, c.note)}</p>` : ''}
</div>`;
  },

  lines(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const lines = (c.lines || []).map((l) => `<p class="d2">${brk(e, l)}</p>`).join('\n  ');
    return `<div class="stack-s">
  ${lines}
  ${c.closing ? `<p class="p med" style="margin-top:40px">${brk(e, c.closing)}</p>` : ''}
</div>`;
  },

  keyvalue(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const rows = (c.rows || []).map((r) =>
      `<div class="row"><span class="k">${e(r.k)}</span><span class="v">${e(r.v)}</span></div>`).join('\n    ');
    return `<div>
  <p class="d2" style="margin-bottom:44px">${brk(e, c.title)}</p>
  <div class="rows">
    ${rows}
  </div>
</div>`;
  },

  fields(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const items = (c.items || []).map((it) =>
      `<div class="l"><span class="n">${e(it.num)}</span><span class="t">${brk(e, it.label)}</span></div>`).join('\n    ');
    return `<div>
  <p class="d2" style="margin-bottom:16px">${brk(e, c.title)}</p>
  ${c.accent ? `<p class="p med acc-i" style="margin-bottom:28px">${brk(e, c.accent)}</p>` : ''}
  <div class="reg">
    ${items}
  </div>
</div>`;
  },

  register(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const items = (c.items || []).map((it) =>
      `<div class="l"><span class="n">${e(it)}</span><span class="b"></span></div>`).join('\n    ');
    return `<div>
  <p class="d2" style="margin-bottom:16px">${brk(e, c.title)}</p>
  ${c.accent ? `<p class="p med acc-i" style="margin-bottom:28px">${brk(e, c.accent)}</p>` : ''}
  <div class="reg">
    ${items}
  </div>
</div>`;
  },

  strip(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const cells = (c.cells || []).map((cell) =>
      `<div class="wk ${cell.state === 'on' ? 'on' : 'off'}">${e(cell.label)}</div>`).join('');
    return `<div>
  <p class="d2" style="margin-bottom:24px">${brk(e, c.title)}</p>
  <div class="cal">${cells}</div>
  <div class="callab">
    <i><span class="dot"></span> ${e(c.legendOn)}</i>
    <i><span class="dot x"></span> ${e(c.legendOff)}</i>
  </div>
  ${c.closing ? `<p class="p med" style="margin-top:48px">${brk(e, c.closing)}</p>` : ''}
</div>`;
  },

  flow(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const left = (c.left || []).map((x) => `<div class="cell">${e(x)}</div>`).join('\n      ');
    const rule2 = ctx.brand.colors.rule2;
    return `<div>
  <p class="d2">${brk(e, c.title)}</p>
  <div class="diag">
    <div class="col">
      ${left}
    </div>
    <div class="arrows"><svg viewBox="0 0 96 260" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 42 C 52 42, 52 130, 92 130" fill="none" stroke="${rule2}" stroke-width="3"/>
      <path d="M2 130 L 92 130" fill="none" stroke="${rule2}" stroke-width="3"/>
      <path d="M2 218 C 52 218, 52 130, 92 130" fill="none" stroke="${rule2}" stroke-width="3"/>
      <path d="M84 123 L 94 130 L 84 137 Z" fill="${rule2}"/>
    </svg></div>
    <div class="col"><div class="cell out">${e(c.out)}</div></div>
  </div>
  ${c.closing ? `<p class="p med" style="margin-top:44px">${brk(e, c.closing)}</p>` : ''}
</div>`;
  },

  math(s, ctx) {
    const c = s.copy, e = ctx.esc;
    return `<div class="stack">
  ${c.title ? `<p class="d2">${brk(e, c.title)}</p>` : ''}
  <div class="math">${e(c.expression)}</div>
  ${c.body ? `<p class="p med">${brk(e, c.body)}</p>` : ''}
  ${c.citation ? `<div class="cite"><p class="note">${brk(e, c.citation)}</p></div>` : ''}
</div>`;
  },

  image(s, ctx) {
    const c = s.copy, e = ctx.esc;
    return `<div>
  ${c.title ? `<p class="d2" style="margin-bottom:8px">${brk(e, c.title)}</p>` : ''}
  <div class="imgwrap"><img src="${e(c.src)}" alt=""></div>
  ${c.caption ? `<p class="note" style="margin-top:18px">${brk(e, c.caption)}</p>` : ''}
</div>`;
  },

  // ===== layouts do estilo pôster editorial (foto/papel/laranja) =====

  'poster-cover'(s, ctx) {
    const c = s.copy, e = ctx.esc;
    return `<h1 class="pt1" style="font-size:86px">${brk(e, c.title)}</h1>
<p class="pt1" style="font-size:54px;line-height:1.06;margin-top:30px">${hlWrap(e, c.accentLine, c.hl, 'phl')}</p>
${c.sub ? `<p class="pnote" style="margin-top:26px">${brk(e, c.sub)}</p>` : ''}`;
  },

  'poster-scene'(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const lines = (c.lines || []).map((l) =>
      `<p class="pt1" style="font-size:80px">${brk(e, l)}</p>`).join('\n');
    return `${lines}
${c.closing ? `<p class="psub" style="margin-top:30px;max-width:820px">${brk(e, c.closing)}</p>` : ''}`;
  },

  'poster-lines'(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const lines = (c.lines || []).map((l) =>
      `<p class="pt2" style="margin-top:14px">${brk(e, l)}</p>`).join('\n');
    return `${lines.replace('style="margin-top:14px"', 'style="margin-top:0"')}
${c.closing ? `<p class="sec" style="margin-top:34px;max-width:840px">${brk(e, c.closing)}</p>` : ''}`;
  },

  'poster-turn'(s, ctx) {
    const c = s.copy, e = ctx.esc;
    return `<p class="pt1" style="font-size:78px">${brk(e, c.title)}</p>
<p class="pt1" style="font-size:78px;margin-top:30px">${hlWrap(e, c.accent, c.hl, 'phl-ink')}</p>`;
  },

  'poster-fields'(s, ctx) {
    const c = s.copy, e = ctx.esc;
    const items = (c.items || []).map((it) =>
      `<div class="l"><span class="n">${e(it.num)}</span><span class="t">${brk(e, it.label)}</span></div>`).join('\n    ');
    return `<p class="pt2">${brk(e, c.title)}</p>
<div class="preg">
    ${items}
</div>`;
  },

  'poster-statement'(s, ctx) {
    const c = s.copy, e = ctx.esc;
    return `<p class="pt2">${brk(e, c.title)}</p>
<p class="pt2" style="color:${ctx.brand.colors.accentInk};margin-top:18px">${brk(e, c.accent)}</p>
${c.body ? `<p class="psub" style="margin-top:34px;max-width:860px">${brk(e, c.body)}</p>` : ''}`;
  },

  'poster-close'(s, ctx) {
    const c = s.copy, e = ctx.esc;
    return `<p class="pt1" style="font-size:76px">${hlWrap(e, c.title, c.hl, 'phl')}</p>
${c.accent ? `<p class="psub" style="margin-top:28px">${brk(e, c.accent)}</p>` : ''}
${c.body ? `<p class="pnote" style="margin-top:24px">${brk(e, c.body)}</p>` : ''}`;
  },
};

export function renderSlide(slide, ctx) {
  const fn = layouts[slide.layout];
  if (!fn) throw new Error(`layout desconhecido: ${slide.layout}`);
  if (POSTER_FIELD[slide.layout]) return posterFrame(slide, ctx, fn(slide, ctx));
  return chrome(slide, ctx, fn(slide, ctx));
}
