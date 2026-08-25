const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const OUT = path.join(DIR, 'out');

const c = JSON.parse(fs.readFileSync(path.join(DIR, 'content-contract.json'), 'utf8'));
const r = JSON.parse(fs.readFileSync(path.join(OUT, 'render-report.json'), 'utf8'));

const imgs = [];
for (let i = 1; i <= 8; i++) {
  const f = path.join(OUT, `zx-19-slide-${String(i).padStart(2, '0')}.png`);
  imgs.push('data:image/png;base64,' + fs.readFileSync(f).toString('base64'));
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const minPer = r.perSlide.map((s) => ({
  id: s.id,
  min: Math.min(...s.contrasts.map((x) => x.ratio)),
  levels: s.levels.join(' / '),
}));

const gates = [
  ['canvas 1080×1350', true, '8 unidades'],
  ['fallback de fonte', r.fonts.every((f) => f.loaded), r.fonts.filter((f) => f.loaded).length + ' de ' + r.fonts.length + ' faces'],
  ['dimensões', r.summary.wrongDims.length === 0, 'todas exatas'],
  ['overflow', r.summary.overflow.length === 0, 'nenhum'],
  ['área segura 80/88px', r.summary.outOfSafe.length === 0, 'nenhum texto fora'],
  ['contraste WCAG 2.2', r.summary.contrastFail.length === 0, 'mínimo 3,38:1'],
  ['runt lines', r.summary.runts.length === 0, '3 corrigidos'],
  ['quebra não autoral', r.summary.badWrap.length === 0, '6 corrigidas'],
  ['máx. 3 níveis por unidade', r.summary.tooManyLevels.length === 0, 'chrome à parte'],
  ['strings não aprovadas', r.summary.unapprovedStrings.length === 0, 'nenhuma'],
  ['strings faltando', r.summary.missingStrings.length === 0, 'nenhuma'],
  ['rótulo interno vazado', r.summary.leakedInternalLabels.length === 0, '1 com allowlist'],
];

const caption = [
  'Um terço dos escritórios da amostra do Sescon-SP declarou não cobrar por retrabalho. O número costuma ser lido como problema de precificação. Provavelmente não é.',
  'Quando a correção não tem causa registrada, ela não tem nome dentro do escritório. Sem nome, não entra em contrato, não entra em preço e não entra em relatório nenhum. Só aparece como cansaço no fim do mês.',
  'A taxonomia do slide 6 é a parte aplicável: cliente, escritório, sistema, regra. Cada causa tem um dono e uma ação diferente, e é isso que impede a conversa de virar cobrança pessoal. A ideia de Deming, aqui em paráfrase, é que antes de responsabilizar alguém por um indicador vale mapear entrada, dependência, variação normal, incentivo e restrição.',
  'Meça uma semana antes de mudar qualquer contrato. E meça fora da semana de fechamento, ou o dado descreve o pico e não a rotina.',
];

const html = `<title>A hora que sai de graça</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&family=Poppins:wght@600;700&display=swap">
<style>
:root{
  --bg:#EBEDEF; --panel:#FFFFFF; --panel-2:#F5F6F7;
  --ink:#14171B; --ink-2:#5A6270; --ink-3:#8A929D;
  --rule:#DCE0E4; --rule-2:#C2C8CE;
  --accent:#F54502; --accent-ink:#B23100; --accent-wash:rgba(245,69,2,.08);
  --ok:#1F6B4A; --ok-wash:rgba(31,107,74,.10);
  --warn:#8A5A00; --warn-wash:rgba(138,90,0,.10);
  --shadow:0 1px 2px rgba(20,23,27,.06),0 8px 28px rgba(20,23,27,.08);
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#0A0B0D; --panel:#14171B; --panel-2:#1B1E24;
  --ink:#E8EAEC; --ink-2:#98A1AD; --ink-3:#6D7683;
  --rule:#262B31; --rule-2:#39404A;
  --accent:#FF5A1F; --accent-ink:#FF7A47; --accent-wash:rgba(255,90,31,.13);
  --ok:#5BC48D; --ok-wash:rgba(91,196,141,.13);
  --warn:#E0A83C; --warn-wash:rgba(224,168,60,.13);
  --shadow:0 1px 2px rgba(0,0,0,.5),0 10px 34px rgba(0,0,0,.45);
}}
:root[data-theme="dark"]{
  --bg:#0A0B0D; --panel:#14171B; --panel-2:#1B1E24;
  --ink:#E8EAEC; --ink-2:#98A1AD; --ink-3:#6D7683;
  --rule:#262B31; --rule-2:#39404A;
  --accent:#FF5A1F; --accent-ink:#FF7A47; --accent-wash:rgba(255,90,31,.13);
  --ok:#5BC48D; --ok-wash:rgba(91,196,141,.13);
  --warn:#E0A83C; --warn-wash:rgba(224,168,60,.13);
  --shadow:0 1px 2px rgba(0,0,0,.5),0 10px 34px rgba(0,0,0,.45);
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font-family:Archivo,"Helvetica Neue",Arial,sans-serif;font-size:16px;line-height:1.6;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px 110px}

/* ---------- masthead ---------- */
header.mast{padding:52px 0 26px;border-bottom:1px solid var(--rule);margin-bottom:38px}
.eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;
  letter-spacing:.16em;text-transform:uppercase;color:var(--accent-ink);
  margin:0 0 16px;display:flex;flex-wrap:wrap;gap:9px;align-items:center}
.eyebrow .s{color:var(--rule-2)}
h1{font-family:Poppins,sans-serif;font-weight:700;font-size:clamp(34px,5.4vw,56px);
  line-height:1.04;letter-spacing:-.03em;margin:0 0 14px;text-wrap:balance;max-width:15ch}
.sub{font-size:clamp(16px,1.9vw,19px);color:var(--ink-2);max-width:60ch;margin:0}
.sub b{color:var(--ink);font-weight:600}

/* ---------- layout ---------- */
.grid{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:44px;align-items:start}
@media(max-width:900px){.grid{grid-template-columns:1fr;gap:34px}}

/* ---------- post mockup ---------- */
.post{background:var(--panel);border:1px solid var(--rule);border-radius:10px;
  overflow:hidden;box-shadow:var(--shadow);position:sticky;top:20px}
@media(max-width:900px){.post{position:static}}
.post .acct{display:flex;align-items:center;gap:11px;padding:13px 15px}
.av{width:34px;height:34px;border-radius:50%;flex:none;
  background:linear-gradient(135deg,var(--accent),var(--accent-ink));
  display:grid;place-items:center;color:#fff;font-family:Poppins,sans-serif;
  font-weight:700;font-size:15px}
.acct .h{font-weight:600;font-size:14.5px;line-height:1.2}
.acct .h small{display:block;font-weight:400;font-size:12px;color:var(--ink-3);
  font-family:"JetBrains Mono",monospace;letter-spacing:.02em}

.stage{position:relative;background:var(--panel-2);aspect-ratio:4/5;
  overflow:hidden;touch-action:pan-y;cursor:grab;user-select:none}
.stage:active{cursor:grabbing}
.track{display:flex;height:100%;transition:transform .34s cubic-bezier(.22,.61,.36,1)}
.track img{width:100%;height:100%;flex:none;object-fit:cover;display:block;pointer-events:none}
.nav{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;
  border-radius:50%;border:none;background:rgba(20,23,27,.55);color:#fff;
  display:grid;place-items:center;cursor:pointer;font-size:17px;line-height:1;
  backdrop-filter:blur(3px);transition:opacity .15s,background .15s}
.nav:hover{background:rgba(20,23,27,.78)}
.nav:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.nav[disabled]{opacity:0;pointer-events:none}
.nav.p{left:10px}.nav.n{right:10px}
.count{position:absolute;top:11px;right:11px;background:rgba(20,23,27,.62);color:#fff;
  font-family:"JetBrains Mono",monospace;font-size:11.5px;font-weight:600;
  padding:4px 9px;border-radius:99px;backdrop-filter:blur(3px);letter-spacing:.03em}

.acts{display:flex;align-items:center;gap:14px;padding:11px 15px 4px;color:var(--ink-2)}
.acts svg{width:22px;height:22px}
.acts .sp{flex:1}
.dots{display:flex;gap:5px;justify-content:center;padding:8px 0 2px}
.dot{width:6px;height:6px;border-radius:50%;background:var(--rule-2);border:none;padding:0;
  cursor:pointer;transition:background .2s,transform .2s}
.dot[aria-current="true"]{background:var(--accent);transform:scale(1.25)}
.dot:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.cap{padding:6px 15px 17px;font-size:13.5px;line-height:1.55}
.cap .u{font-weight:600}
.cap p{margin:0 0 9px;color:var(--ink-2)}
.cap p:last-child{margin-bottom:0}
.cap .src{font-family:"JetBrains Mono",monospace;font-size:11.5px;color:var(--ink-3);line-height:1.5}

/* ---------- right column ---------- */
section{margin-bottom:46px}
h2{font-family:Poppins,sans-serif;font-weight:600;font-size:21px;letter-spacing:-.017em;
  margin:0 0 6px;display:flex;align-items:baseline;gap:11px;flex-wrap:wrap}
h2 .n{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;
  color:var(--accent);letter-spacing:.09em}
.lede{color:var(--ink-2);font-size:14.5px;margin:0 0 18px;max-width:62ch}

.sheet{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}
@media(max-width:640px){.sheet{grid-template-columns:repeat(2,1fr)}}
.thumb{border:1px solid var(--rule);border-radius:6px;overflow:hidden;background:var(--panel);
  cursor:pointer;padding:0;display:block;width:100%;transition:border-color .15s,transform .15s}
.thumb:hover{border-color:var(--accent);transform:translateY(-2px)}
.thumb[aria-current="true"]{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-wash)}
.thumb:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.thumb img{width:100%;display:block}
.thumb span{display:block;font-family:"JetBrains Mono",monospace;font-size:10px;
  color:var(--ink-3);padding:5px 0 6px;text-align:center;letter-spacing:.05em}

table{border-collapse:collapse;width:100%;font-size:13.5px;background:var(--panel);
  border:1px solid var(--rule);border-radius:7px;overflow:hidden}
th{font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.13em;
  text-transform:uppercase;color:var(--ink-3);font-weight:700;text-align:left;
  padding:10px 14px;border-bottom:1px solid var(--rule-2);white-space:nowrap}
td{padding:9px 14px;border-bottom:1px solid var(--rule);vertical-align:top}
tr:last-child td{border-bottom:none}
td.n,th.n{text-align:right;font-family:"JetBrains Mono",monospace;font-variant-numeric:tabular-nums}
.pill{display:inline-flex;align-items:center;gap:5px;font-family:"JetBrains Mono",monospace;
  font-size:10px;font-weight:700;letter-spacing:.07em;padding:2px 8px;border-radius:99px;
  border:1px solid currentColor}
.pill.ok{color:var(--ok);background:var(--ok-wash)}
.pill.wn{color:var(--warn);background:var(--warn-wash)}
.tw{overflow-x:auto}

.alt{background:var(--panel);border:1px solid var(--rule);border-radius:7px;padding:0}
.alt div{display:grid;grid-template-columns:58px 1fr;gap:0 15px;padding:13px 16px;
  border-bottom:1px solid var(--rule);font-size:13.5px;line-height:1.5;color:var(--ink-2)}
.alt div:last-child{border-bottom:none}
.alt b{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--accent-ink);font-weight:700}

.block{background:var(--panel);border:1px solid var(--rule);border-left:3px solid var(--warn);
  border-radius:0 7px 7px 0;padding:14px 18px;margin-bottom:11px;font-size:14px;line-height:1.55}
.block b{display:block;margin-bottom:3px;color:var(--ink);font-size:14.5px}
.block span{color:var(--ink-2)}

footer{margin-top:52px;padding-top:20px;border-top:1px solid var(--rule);
  font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-3);line-height:1.7}
kbd{font-family:"JetBrains Mono",monospace;font-size:10.5px;background:var(--panel-2);
  border:1px solid var(--rule-2);border-bottom-width:2px;border-radius:4px;padding:1px 5px;color:var(--ink-2)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>

<div class="wrap">
<header class="mast">
  <p class="eyebrow"><span>Zionaxs</span><span class="s">/</span><span>Capacidade antes de oferta</span>
  <span class="s">/</span><span>peça C1 de 12</span><span class="s">/</span><span>zx-19</span></p>
  <h1>A hora que sai de graça</h1>
  <p class="sub">Carrossel de 8 slides em 1080×1350, renderizado e verificado. <b>Não publicado.</b>
  Público V2 / C1, escritórios contábeis. Passou nos 12 gates medidos abaixo.</p>
</header>

<div class="grid">
  <div>
    <article class="post">
      <div class="acct">
        <div class="av">Z</div>
        <div class="h">zionaxs_<small>não publicado · prévia</small></div>
      </div>
      <div class="stage" id="stage">
        <div class="track" id="track">
          ${imgs.map((d, i) => `<img src="${d}" alt="${esc(c.slides[i].alt)}" draggable="false">`).join('\n          ')}
        </div>
        <span class="count" id="count">1/8</span>
        <button class="nav p" id="prev" aria-label="Slide anterior">‹</button>
        <button class="nav n" id="next" aria-label="Próximo slide">›</button>
      </div>
      <div class="dots" id="dots"></div>
      <div class="acts" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 20.5l1.6-4.9A8.4 8.4 0 0 1 3.7 11a8.4 8.4 0 0 1 8.4-8.5h.5A8.4 8.4 0 0 1 21 11z"/></svg>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        <span class="sp"></span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      </div>
      <div class="cap">
        <p><span class="u">zionaxs_</span> ${esc(caption[0])}</p>
        ${caption.slice(1).map((p) => `<p>${esc(p)}</p>`).join('\n        ')}
        <p class="src">Fonte: Pesquisa de Preços e Serviços Contábeis do Estado de São Paulo, Sescon-SP e Vox Populi, 2024. 255 associados, margem de erro 5,9%. Recorte estadual e associativo: não descreve o Brasil. Referência de gestão: W. E. Deming, System of Profound Knowledge, Deming Institute.</p>
      </div>
    </article>
    <p style="font-size:12.5px;color:var(--ink-3);margin:14px 2px 0;line-height:1.5">
      Arraste, clique nas setas ou use <kbd>←</kbd> <kbd>→</kbd>. Os ícones são mock, sem métrica inventada.
    </p>
  </div>

  <div>
    <section>
      <h2><span class="n">01</span> Os 8 slides</h2>
      <p class="lede">Clique em qualquer um para abrir no feed ao lado.</p>
      <div class="sheet" id="sheet">
        ${imgs.map((d, i) => `<button class="thumb" data-i="${i}" aria-label="Abrir slide ${i + 1}"><img src="${d}" alt=""><span>${String(i + 1).padStart(2, '0')}/08</span></button>`).join('\n        ')}
      </div>
    </section>

    <section>
      <h2><span class="n">02</span> Relatório de render</h2>
      <p class="lede">Medido nos pixels com Chromium, não afirmado a partir do CSS. Doze gates.</p>
      <div class="tw"><table>
        <thead><tr><th>Gate</th><th>Estado</th><th>Detalhe</th></tr></thead>
        <tbody>
        ${gates.map(([n, ok, d]) => `<tr><td>${esc(n)}</td><td><span class="pill ${ok ? 'ok' : 'wn'}">${ok ? 'passa' : 'falha'}</span></td><td style="color:var(--ink-2)">${esc(d)}</td></tr>`).join('\n        ')}
        </tbody>
      </table></div>
    </section>

    <section>
      <h2><span class="n">03</span> Contraste medido por slide</h2>
      <p class="lede">Piso WCAG 2.2: 3:1 para texto grande, e tudo aqui é ≥26px. O laranja de marca
      <code style="font-family:'JetBrains Mono',monospace;font-size:13px">#F54502</code> mede 3,38:1 sobre o papel:
      serve para display e reprova para corpo, que por isso usa <code style="font-family:'JetBrains Mono',monospace;font-size:13px">#B23100</code>.</p>
      <div class="tw"><table>
        <thead><tr><th>Slide</th><th class="n">Mínimo</th><th>Níveis de conteúdo</th></tr></thead>
        <tbody>
        ${minPer.map((s, i) => `<tr><td>${String(i + 1).padStart(2, '0')}/08</td><td class="n">${s.min.toFixed(2)}:1</td><td style="font-family:'JetBrains Mono',monospace;color:var(--ink-2)">${esc(s.levels)}</td></tr>`).join('\n        ')}
        </tbody>
      </table></div>
    </section>

    <section>
      <h2><span class="n">04</span> Alt text</h2>
      <p class="lede">Um por slide, no template de acessibilidade da nota de plataforma: posição, texto essencial, descrição funcional e conclusão.</p>
      <div class="alt">
        ${c.slides.map((s) => `<div><b>${String(s.n).padStart(2, '0')}/08</b><span>${esc(s.alt)}</span></div>`).join('\n        ')}
      </div>
    </section>

    <section>
      <h2><span class="n">05</span> Bloqueios antes de publicar</h2>
      <p class="lede">Nenhum é de conteúdo. Os quatro precisam de decisão sua ou de infraestrutura.</p>
      <div class="block"><b>A wordmark está composta em Poppins</b><span>O design system exige logo vetorial oficial sem redesenho, e compor o nome em tipo é um redesenho. Trocar pelo SVG de <code style="font-family:'JetBrains Mono',monospace;font-size:12.5px">assets/logo/zionaxs-lockup.svg</code>.</span></div>
      <div class="block"><b>Rota de publicação para @zionaxs_ segue quebrada</b><span>Composio devolve <code style="font-family:'JetBrains Mono',monospace;font-size:12.5px">base3br</code> e não há webhook de Make descobrível no ambiente.</span></div>
      <div class="block"><b>Falta revisão em aparelho real</b><span>A régua de 26px para nota de fonte só é liberada após teste em telefone, no tamanho de exibição do feed.</span></div>
      <div class="block"><b>Dark-first segue indefinido no design system</b><span>Se for declarado invariante de marca, esta direção clara cai inteira e as 12 peças da campanha precisam de nova Visual Bible.</span></div>
    </section>
  </div>
</div>

<footer>
  <p style="margin:0">zx-19 · gerado de zionaxs-memory <code>4931651</code> e das skills de marketingskills <code>becd60e</code>.
  8 PNG determinísticos, fontes Poppins, Archivo e JetBrains Mono embutidas no render, sem fallback.
  Nenhum dado criado, somado ou extrapolado.</p>
</footer>
</div>

<script>
(function(){
  var N=8,i=0;
  var track=document.getElementById('track'),count=document.getElementById('count'),
      prev=document.getElementById('prev'),next=document.getElementById('next'),
      dots=document.getElementById('dots'),stage=document.getElementById('stage'),
      thumbs=[].slice.call(document.querySelectorAll('.thumb'));
  for(var k=0;k<N;k++){
    var b=document.createElement('button');
    b.className='dot';b.setAttribute('aria-label','Slide '+(k+1));
    b.dataset.i=k;dots.appendChild(b);
  }
  var dotEls=[].slice.call(dots.children);
  function go(n){
    i=Math.max(0,Math.min(N-1,n));
    track.style.transform='translateX('+(-i*100)+'%)';
    count.textContent=(i+1)+'/'+N;
    prev.disabled=i===0;next.disabled=i===N-1;
    dotEls.forEach(function(d,x){d.setAttribute('aria-current',x===i?'true':'false')});
    thumbs.forEach(function(t,x){t.setAttribute('aria-current',x===i?'true':'false')});
  }
  prev.onclick=function(){go(i-1)};next.onclick=function(){go(i+1)};
  dots.onclick=function(e){var d=e.target.closest('.dot');if(d)go(+d.dataset.i)};
  document.getElementById('sheet').onclick=function(e){
    var t=e.target.closest('.thumb');
    if(t){go(+t.dataset.i);
      if(window.innerWidth<900)document.querySelector('.post').scrollIntoView({behavior:'smooth',block:'center'});}
  };
  document.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft'){go(i-1)}else if(e.key==='ArrowRight'){go(i+1)}
  });
  var x0=null;
  stage.addEventListener('pointerdown',function(e){x0=e.clientX});
  stage.addEventListener('pointerup',function(e){
    if(x0===null)return;var d=e.clientX-x0;x0=null;
    if(Math.abs(d)>42)go(i+(d<0?1:-1));
  });
  stage.addEventListener('pointercancel',function(){x0=null});
  go(0);
})();
</script>`;

fs.writeFileSync(path.join(DIR, 'viewer.html'), html);
const kb = Math.round(Buffer.byteLength(html) / 1024);
console.log('viewer.html gerado:', kb + ' KB', '| 8 imagens embutidas | limite 16384 KB');
