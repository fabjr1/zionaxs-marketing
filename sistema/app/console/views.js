// views.js — HTML server-rendered do console (C-01..C-08, N-05).
// Sem framework, sem estado no cliente além da navegação de slides.
// Dois temas via prefers-color-scheme; contraste e foco seguem a mesma
// régua WCAG que os gates cobram das peças.
import { esc, normText } from '../lib/util.js';
import { STATUS } from '../lib/pieces.js';

const CSS = `
:root{
  --bg:#EDF0F3;--panel:#FFF;--panel2:#E3E8ED;--ink:#161A1F;--ink2:#5B6672;--ink3:#8A94A0;
  --rule:#D2D8DE;--rule2:#B4BDC6;--human:#B23100;--humanhi:#F54502;--humanw:rgba(245,69,2,.08);
  --ok:#1C6B4B;--okw:rgba(28,107,75,.10);--wait:#8A5A00;--waitw:rgba(138,90,0,.10);
  --stop:#A3211A;--stopw:rgba(163,33,26,.10);
}
@media (prefers-color-scheme:dark){:root{
  --bg:#0D1116;--panel:#151A21;--panel2:#1C232B;--ink:#E4E8EC;--ink2:#8E99A6;--ink3:#6A7482;
  --rule:#242C35;--rule2:#36414D;--human:#FF7A47;--humanhi:#FF5A1F;--humanw:rgba(255,90,31,.13);
  --ok:#57C08C;--okw:rgba(87,192,140,.13);--wait:#DFA83E;--waitw:rgba(223,168,62,.13);
  --stop:#F0685E;--stopw:rgba(240,104,94,.13);
}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Archivo,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1120px;margin:0 auto;padding:0 22px 90px}
a{color:var(--human);text-decoration:none;border-bottom:1px solid var(--humanw)}
a:hover{border-bottom-color:var(--humanhi)}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--humanhi);outline-offset:2px}
header{padding:34px 0 16px;border-bottom:2px solid var(--ink);margin-bottom:26px;display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:10px}
header h1{font-size:24px;margin:0;letter-spacing:-.02em}
header nav{display:flex;gap:18px;font-size:14px}
.eyebrow{font:700 11px/1 "JetBrains Mono",monospace;letter-spacing:.15em;text-transform:uppercase;color:var(--human)}
h2{font-size:20px;letter-spacing:-.015em;margin:34px 0 12px}
h3{font-size:16px;margin:24px 0 10px}
table{border-collapse:collapse;width:100%;font-size:14px;background:var(--panel);border:1px solid var(--rule);border-radius:8px;overflow:hidden}
th{font:700 9.5px/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3);text-align:left;padding:10px 13px;border-bottom:1px solid var(--rule2)}
td{padding:9px 13px;border-bottom:1px solid var(--rule);vertical-align:top}
tr:last-child td{border-bottom:none}
.mono{font-family:"JetBrains Mono",monospace;font-size:.87em}
.pill{display:inline-block;font:700 10px/1.5 "JetBrains Mono",monospace;letter-spacing:.07em;padding:2px 9px;border-radius:99px;border:1px solid currentColor;white-space:nowrap}
.s-ok{color:var(--ok);background:var(--okw)}.s-wait{color:var(--wait);background:var(--waitw)}
.s-stop{color:var(--stop);background:var(--stopw)}.s-hum{color:var(--human);background:var(--humanw)}
.card{background:var(--panel);border:1px solid var(--rule);border-radius:8px;padding:18px 20px;margin:0 0 16px}
.note{border-left:3px solid var(--humanhi);background:var(--humanw);border-radius:0 6px 6px 0;padding:12px 16px;margin:0 0 16px;font-size:14px}
.note.err{border-left-color:var(--stop);background:var(--stopw)}
.note.ok{border-left-color:var(--ok);background:var(--okw)}
.grid2{display:grid;grid-template-columns:minmax(0,430px) minmax(0,1fr);gap:28px;align-items:start}
@media(max-width:920px){.grid2{grid-template-columns:1fr}}
.stage{position:relative;background:var(--panel2);border:1px solid var(--rule);border-radius:8px;overflow:hidden;aspect-ratio:4/5}
.stage img{width:100%;height:100%;object-fit:contain;display:none}
.stage img.on{display:block}
.snav{display:flex;gap:6px;justify-content:center;padding:10px 0 2px;flex-wrap:wrap}
.snav button{font:700 12px "JetBrains Mono",monospace;border:1px solid var(--rule2);background:var(--panel);color:var(--ink2);border-radius:5px;padding:5px 9px;cursor:pointer}
.snav button[aria-current="true"]{border-color:var(--humanhi);color:var(--human)}
.sheetrow{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}
.sheetrow figure{margin:0;flex:0 0 210px}
.sheetrow img{width:100%;border:1px solid var(--rule);border-radius:6px;display:block}
.sheetrow figcaption{font:600 11px "JetBrains Mono",monospace;color:var(--ink3);padding-top:5px}
form.dec{display:grid;gap:10px;margin:0}
form.dec label{font:700 10px "JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3)}
form.dec input,form.dec select,form.dec textarea{font:14px Archivo,sans-serif;color:var(--ink);background:var(--panel2);border:1px solid var(--rule2);border-radius:6px;padding:8px 10px;width:100%}
form.dec textarea{min-height:70px;resize:vertical}
button.act{font:600 14px Archivo,sans-serif;border-radius:7px;padding:10px 16px;cursor:pointer;border:1px solid transparent}
button.act.approve{background:var(--ok);color:#fff}
button.act.rejectb{background:var(--panel);border-color:var(--stop);color:var(--stop)}
button.act.escal{background:var(--panel);border-color:var(--wait);color:var(--wait)}
button.act.plain{background:var(--panel);border-color:var(--rule2);color:var(--ink2)}
.diffline{font:13px/1.6 "JetBrains Mono",monospace;padding:2px 0;border-bottom:1px dashed var(--rule)}
.diffline.okc::before{content:"✓ ";color:var(--ok)}
.diffline.miss::before{content:"✗ ";color:var(--stop)}
details{margin:0 0 12px}
summary{cursor:pointer;font-weight:600;font-size:14px}
footer{margin-top:50px;border-top:1px solid var(--rule);padding-top:14px;font:11px "JetBrains Mono",monospace;color:var(--ink3)}
`;

export function statusPill(status) {
  const map = {
    [STATUS.CONTRACT]: 's-wait', [STATUS.RED]: 's-stop', [STATUS.REVIEW]: 's-hum',
    [STATUS.REJECTED]: 's-stop', [STATUS.APPROVED]: 's-ok', [STATUS.STALE]: 's-stop',
    [STATUS.SENT]: 's-wait', [STATUS.PUBLISHED]: 's-ok', [STATUS.BLOCKED]: 's-stop',
  };
  return `<span class="pill ${map[status] || 's-wait'}">${esc(status)}</span>`;
}

export function page({ title, body, token, flash }) {
  const t = token ? `?t=${encodeURIComponent(token)}` : '';
  const flashHtml = flash
    ? `<div class="note ${flash.kind === 'err' ? 'err' : flash.kind === 'ok' ? 'ok' : ''}" role="status">${esc(flash.msg)}</div>`
    : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Marketing OS</title>
<link rel="stylesheet" href="/brandfonts/fonts.css">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header>
  <div><span class="eyebrow">Marketing OS</span><h1>${esc(title)}</h1></div>
  <nav>
    <a href="/${t}">Fila</a>
    <a href="/state${t}">Fluxo</a>
    <a href="/library${t}">Biblioteca</a>
  </nav>
</header>
${flashHtml}
${body}
<footer>console stateless — estado em arquivos + git · aprovação vira contrato, nunca clique</footer>
</div>
</body>
</html>`;
}

// ---------- fila (C-01) ----------
export function queueView({ pieces, state, token }) {
  const t = token ? `?t=${encodeURIComponent(token)}` : '';
  const rows = pieces.map((p) => `<tr>
    <td class="mono"><a href="/piece/${esc(p.id)}${t}">${esc(p.id)}</a></td>
    <td>${esc(p.contract.piece || '')} · ${esc(p.contract.campaign || '')}</td>
    <td>${statusPill(p.status)}</td>
    <td class="mono">${p.report ? (p.report.pass ? '12/12' : p.report.gates.filter((g) => g.pass).length + '/' + p.report.gates.length) : '—'}</td>
    <td class="mono">${p.report ? esc(p.report.digest.slice(0, 10)) : '—'}</td>
  </tr>`).join('\n');

  const cyc = state
    ? `<div class="card"><strong>Ciclo:</strong> <span class="mono">${esc(state.cycle ?? 'nenhum aberto')}</span>
       · estágio ${state.stage} · canal ${esc(state.channel ?? '—')}
       · <a href="/state${t}">gates do fluxo →</a></div>`
    : `<div class="note err">state.md não encontrado — Estágio 0 (rode o fluxo antes de produzir)</div>`;

  return `${cyc}
<h2>Peças</h2>
<table>
<thead><tr><th>Peça</th><th>Campanha</th><th>Estado</th><th>Gates</th><th>Digest</th></tr></thead>
<tbody>${rows || '<tr><td colspan="5">nenhuma peça no workspace</td></tr>'}</tbody>
</table>`;
}

// ---------- fluxo (state) ----------
export function stateView({ state }) {
  if (!state) return '<div class="note err">sem state.md</div>';
  const rows = state.gates.map((g) => `<tr>
    <td class="mono">${g.stage}</td><td>${esc(g.name)}</td>
    <td>${g.met ? '<span class="pill s-ok">cumprido</span>' : '<span class="pill s-wait">pendente</span>'}</td>
    <td class="mono">${g.pointer ? esc(g.pointer) : '<em>sem ponteiro</em>'}</td>
  </tr>`).join('');
  const gaps = state.acceptedGaps.map((g) => `<li>${esc(g)}</li>`).join('') || '<li><em>nenhuma</em></li>';
  const dec = state.openDecisions.map((g) => `<li>${esc(g)}</li>`).join('') || '<li><em>nenhuma</em></li>';
  return `
<div class="card"><strong>${esc(state.brand)}</strong> · estágio ${state.stage}
 · ciclo <span class="mono">${esc(state.cycle ?? 'nenhum')}</span>${state.openSince ? ` desde ${esc(state.openSince)}` : ''}</div>
<h2>Gates do fluxo</h2>
<table><thead><tr><th>#</th><th>Gate</th><th>Estado</th><th>Ponteiro (F-04: sem ponteiro não é gate)</th></tr></thead>
<tbody>${rows}</tbody></table>
<h2>Lacunas aceitas</h2><ul>${gaps}</ul>
<h2>Decisões abertas</h2><ul>${dec}</ul>
<h2>Último aprendizado</h2><p>${esc(state.lastLearning ?? '—')}</p>`;
}

// ---------- tela da peça (C-02..C-07) ----------
export function pieceView({ p, previous, history, token, canApproveRes }) {
  const t = token ? `?t=${encodeURIComponent(token)}` : '';
  const tk = token ? `<input type="hidden" name="t" value="${esc(token)}">` : '';
  const c = p.contract;
  const total = c.slides.length;

  // pixels navegáveis
  const imgs = p.report
    ? p.report.slides.map((f, i) =>
      `<img src="/asset/${esc(p.id)}/out/${esc(f)}"${i === 0 ? ' class="on"' : ''} alt="${esc(c.slides[i].alt)}">`).join('')
    : '';
  const navBtns = p.report
    ? p.report.slides.map((_, i) =>
      `<button type="button" data-i="${i}"${i === 0 ? ' aria-current="true"' : ''}>${String(i + 1).padStart(2, '0')}</button>`).join('')
    : '';
  const stage = p.report
    ? `<div class="stage" id="stage">${imgs}</div><div class="snav" id="snav">${navBtns}</div>`
    : '<div class="note">peça ainda não gerada — rode <span class="mono">npm run gen ' + esc(p.id) + '</span></div>';

  // gates (C-02)
  const gates = p.report ? `<h2>Gates</h2><table>
<thead><tr><th>Gate</th><th>Estado</th><th>Detalhe</th></tr></thead><tbody>
${p.report.gates.map((g) => `<tr><td class="mono">${esc(g.id)} ${esc(g.name)}</td>
 <td>${g.pass ? '<span class="pill s-ok">passa</span>' : `<span class="pill s-stop">falha (${g.failures.length})</span>`}</td>
 <td class="mono">${esc(g.detail || '')}${g.pass ? '' : '<br>' + g.failures.slice(0, 3).map((f) => esc(JSON.stringify(f)).slice(0, 90)).join('<br>')}</td></tr>`).join('')}
</tbody></table>` : '';

  // diff de copy (C-03)
  let diff = '';
  if (p.report?.perSlide?.[0]?.renderedText !== undefined) {
    diff = '<h2>Copy aprovada × renderizada</h2>' + c.slides.map((s, i) => {
      const rendered = normText(p.report.perSlide[i]?.renderedText || '');
      const lines = s.approved_visible_copy.map((a) => {
        const okc = rendered.includes(normText(a));
        return `<div class="diffline ${okc ? 'okc' : 'miss'}">${esc(a)}</div>`;
      }).join('');
      return `<details${i === 0 ? ' open' : ''}><summary>Slide ${String(i + 1).padStart(2, '0')}</summary>${lines}</details>`;
    }).join('');
  }

  // evidência (C-02)
  const ev = (c.research_brief?.evidencia || []).map((e2) =>
    `<tr><td><span class="pill ${e2.status === 'E' ? 's-ok' : e2.status === 'NC' ? 's-stop' : 's-wait'}">${esc(e2.status)}</span></td>
     <td>${esc(e2.claim)}</td><td class="mono">${esc(e2.fonte || '—')}</td></tr>`).join('');

  // anti-template (C-04)
  const anti = previous.length ? `<h2>Anti-template — 3 anteriores</h2>
<div class="sheetrow">${previous.map((q) =>
    `<figure><img src="${esc(q.sheetUrl)}" alt="folha de contato de ${esc(q.id)}"><figcaption>${esc(q.id)}</figcaption></figure>`).join('')}</div>
<p style="font-size:13px;color:var(--ink2)">Se a capa desta peça puder ser confundida com uma destas após trocar o texto, redesenhe a Visual Bible antes de aprovar.</p>` : '';

  // decisões (C-05..C-07)
  const approveBtn = canApproveRes.ok
    ? `<form class="dec" method="post" action="/piece/${esc(p.id)}/approve">${tk}
        <button class="act approve" type="submit">Aprovar — emite Publication Contract (digest ${esc(p.report.digest.slice(0, 10))})</button>
       </form>`
    : `<div class="note">${esc(canApproveRes.why)}</div>`;

  const decisions = `
<h2>Decisão</h2>
<div class="card">${approveBtn}</div>
<div class="card"><h3>Reprovar (motivo estruturado — C-06)</h3>
<form class="dec" method="post" action="/piece/${esc(p.id)}/reject">${tk}
  <label>gate</label><input name="gate" required placeholder="ex.: G6 runt / editorial / evidência">
  <label>esperado</label><input name="expected" required>
  <label>observado</label><input name="actual" required>
  <label>menor correção (no CONTRATO)</label><input name="correction" required>
  <button class="act rejectb" type="submit">Reprovar → volta ao contrato</button>
</form></div>
<div class="card"><h3>Escalar (C-07)</h3>
<form class="dec" method="post" action="/piece/${esc(p.id)}/escalate">${tk}
  <label>tópico</label><select name="topic">${['oferta', 'preço', 'posicionamento', 'canal novo', 'conta nova', 'verba', 'tema sensível'].map((x) => `<option>${x}</option>`).join('')}</select>
  <label>o que precisa ser decidido</label><textarea name="note" required></textarea>
  <button class="act escal" type="submit">Escalar — não aprova nem reprova</button>
</form></div>`;

  // publicação manual (P-01/P-02) + medição (M-01)
  const pub = `
<h2>Publicação</h2>
<div class="card">
  ${p.publication ? `<p>estado: ${statusPill(p.status)} ${p.publication.permalink ? `· <a href="${esc(p.publication.permalink)}">${esc(p.publication.permalink)}</a>` : ''}${p.publication.reason ? `<br><span class="mono">${esc(p.publication.reason)}</span>` : ''}</p>` : ''}
  ${p.status === STATUS.APPROVED ? `<p><a class="act plain" style="display:inline-block" href="/piece/${esc(p.id)}/export${t}">Baixar pacote de exportação (P-01)</a></p>
  <form class="dec" method="post" action="/piece/${esc(p.id)}/permalink">${tk}
    <label>permalink do post publicado (P-02)</label>
    <input name="permalink" required placeholder="https://www.instagram.com/p/…">
    <button class="act approve" type="submit">Registrar — só o link torna a peça publicada</button>
  </form>` : ''}
</div>
<h2>Medição (M-01)</h2>
<div class="card">
${(p.readings?.readings || []).map((r) => `<p class="mono">${esc(r.date)} · ${esc(r.metric)} = ${esc(String(r.value))} (${esc(r.formula)}; denom ${esc(String(r.denominator))}; ${esc(r.source)}) → <strong>${esc(r.label)}</strong></p>`).join('') || '<p><em>sem leituras</em></p>'}
<form class="dec" method="post" action="/piece/${esc(p.id)}/reading">${tk}
  <label>métrica</label><input name="metric" required>
  <label>fórmula</label><input name="formula" required placeholder="ex.: DMs CAUSA ÷ alcance não seguidores">
  <label>denominador</label><input name="denominator" required>
  <label>valor</label><input name="value" required>
  <label>fonte</label><input name="source" required>
  <label>amostra / baseline / MDE (opcional — sem os três, a leitura é direcional por regra)</label>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
    <input name="sample" placeholder="amostra"><input name="baseline" placeholder="baseline 0–1"><input name="mde" placeholder="MDE rel. ex.: 0.2">
  </div>
  <button class="act plain" type="submit">Registrar leitura</button>
</form>
</div>`;

  const hist = history.length ? `<h2>Histórico (C-08)</h2><table><tbody>
${history.map((h) => `<tr><td class="mono">${esc(h.sha)}</td><td class="mono">${esc(h.date)}</td><td>${esc(h.message)}</td></tr>`).join('')}
</tbody></table>` : '';

  const legend = `<details><summary>Legenda e alt text</summary>
<div class="card">${c.caption.map((x) => `<p>${esc(x)}</p>`).join('')}
<p class="mono" style="font-size:12px">${esc((c.caption_sources || []).join(' '))}</p>
${c.slides.map((s) => `<p style="font-size:13px"><strong class="mono">${String(s.n).padStart(2, '0')}/${String(total).padStart(2, '0')}</strong> ${esc(s.alt)}</p>`).join('')}</div></details>`;

  const script = p.report ? `<script>
(function(){
  var imgs=[].slice.call(document.querySelectorAll('#stage img'));
  var btns=[].slice.call(document.querySelectorAll('#snav button'));
  function go(i){imgs.forEach(function(im,x){im.classList.toggle('on',x===i)});
    btns.forEach(function(b,x){b.setAttribute('aria-current',x===i?'true':'false')});}
  document.getElementById('snav').addEventListener('click',function(e){
    var b=e.target.closest('button');if(b)go(+b.dataset.i);});
  document.addEventListener('keydown',function(e){
    var cur=btns.findIndex(function(b){return b.getAttribute('aria-current')==='true'});
    if(e.key==='ArrowRight')go(Math.min(imgs.length-1,cur+1));
    if(e.key==='ArrowLeft')go(Math.max(0,cur-1));});
})();
</script>` : '';

  return `
<p>${statusPill(p.status)} · <span class="mono">${esc(c.piece || '')} · ${esc(c.campaign || '')}</span></p>
<div class="grid2">
  <div>${stage}${legend}</div>
  <div>
    ${gates}
    <h2>Evidência</h2>
    <table><thead><tr><th>Status</th><th>Afirmação</th><th>Fonte</th></tr></thead><tbody>${ev}</tbody></table>
    ${diff}
  </div>
</div>
${anti}
${decisions}
${pub}
${hist}
${script}`;
}

// ---------- biblioteca (B-01) ----------
export function libraryView({ published, token }) {
  const t = token ? `?t=${encodeURIComponent(token)}` : '';
  if (!published.length) return '<p><em>nenhuma peça publicada ainda</em></p>';
  return `<div class="sheetrow" style="flex-wrap:wrap">${published.map((q) => `
  <figure style="flex:0 0 320px">
    ${q.sheetUrl ? `<img src="${esc(q.sheetUrl)}" alt="folha de contato de ${esc(q.id)}">` : ''}
    <figcaption>${q.local ? `<a href="/piece/${esc(q.id)}${t}">${esc(q.id)}</a>` : esc(q.id)}
      ${q.permalink ? ` · <a href="${esc(q.permalink)}">post</a>` : ' · <span class="pill s-wait">sem permalink</span>'}
      ${q.note ? `<br>${esc(q.note)}` : ''}</figcaption>
  </figure>`).join('')}</div>`;
}
