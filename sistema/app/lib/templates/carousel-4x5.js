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
`;
}

/** Chrome determinístico da unidade: cabeçalho e rodapé. */
function chrome(slide, ctx, bodyHtml) {
  const { esc, total, brand } = ctx;
  const pad = (n) => String(n).padStart(2, '0');
  const dark = slide.dark ? ' dark' : '';
  const wm = brand.logoSvg
    ? `<span class="wm">${brand.logoSvg}</span>`
    : `<span class="wm">${esc(brand.wordmark)}</span>`;
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
};

export function renderSlide(slide, ctx) {
  const fn = layouts[slide.layout];
  if (!fn) throw new Error(`layout desconhecido: ${slide.layout}`);
  return chrome(slide, ctx, fn(slide, ctx));
}
