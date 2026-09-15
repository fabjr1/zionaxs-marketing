// folha-de-contato.mjs — o teste barato que decide foto ANTES de gastar geração.
//
// Por que isto existe: nenhum gate mede a foto. O G5 mede contraste contra o
// fundo declarado no CSS, nunca contra os pixels da imagem, então a peça sai
// com 14/14 verdes e a manchete ilegível. Quem pega isso é o passo 6 do
// comando, olhando o PNG, e cada olhada custa 1 geração completa.
//
// Esta folha reproduz o campo escuro (gradê em soft-light + scrim), a banda de
// texto real de 46% a 93% E o chrome que vive ACIMA dela, que é o primeiro a
// ser engolido por trecho claro (aprendido na zx-47).
// Comparar 9 recortes aqui custa 1 rodada de Chromium; comparar 9 recortes
// gerando a peça custa 9 gerações.
//
// Posições do chrome, MEDIDAS no compiled.html do poster-cover com Playwright
// em 15/09/2026 (zx-56), e não estimadas:
//
//   bloco do ano  x 80,  y 474 a 543  → 35.1% a 40.2% da altura
//   caixa de pág. x 889, y 474 a 558  → 35.1% a 41.4%, 84x84 com borda de 3px
//   kicker        x 80,  y 565 a 594  → 41.9% a 44.0%
//   banda de texto                    → 46% a 93%
//
// Até a zx-55 esta folha desenhava a caixa de paginação em `top:47%`, ou seja
// cerca de 160px ABAIXO de onde ela de fato está, e não desenhava nem o ano nem
// o kicker. Consequência: a faixa de 35% a 44%, onde vive todo o chrome, não era
// conferida por ninguém antes de gerar. Na capa da zx-56 os 14 gates ficaram
// verdes e o kicker saiu lavado sobre o reflexo de uma luminária no piso, a 43%
// da altura, exatamente no ponto cego. Custou 1 geração. As 3 marcas agora saem
// nas posições medidas acima.
//
// Uso:
//   ZX_CAND_DIR=<pasta com os .jpg> node bin/folha-de-contato.mjs casos.json saida.png
//
// casos.json é uma lista de { f, scale, origin, pos, nota }, em que `f` é o
// nome do arquivo sem a extensão .jpg e os outros 3 são os campos do
// `photo` do contrato. Registrado em campanhas/zionaxs/direcao-visual/README.md.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.env.ZX_CAND_DIR || process.cwd();
// [arquivo, rótulo, scale, origin]
const casos = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const cel = (c) => {
  const b64 = fs.readFileSync(path.join(dir, c.f + '.jpg')).toString('base64');
  return `<figure>
  <div class="q">
    <div class="w"><img src="data:image/jpeg;base64,${b64}"
      style="transform:scale(${c.scale || 1});transform-origin:${c.origin || '50% 50%'};object-position:${c.pos || '50% 50%'}"></div>
    <div class="grade"></div><div class="scrim"></div>
    <div class="band"></div><div class="pag"></div><div class="ano"></div><div class="kick"></div>
  </div>
  <figcaption>${c.f} · scale ${c.scale || 1} · origin ${c.origin || '50% 50%'} · pos ${c.pos || '50% 50%'}<br>${c.nota || ''}</figcaption>
</figure>`;
};

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#16181b;padding:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px;width:1400px;font-family:system-ui}
figure{margin:0}
.q{position:relative;width:100%;aspect-ratio:1080/1350;overflow:hidden;background:#000}
.w{position:absolute;inset:0;overflow:hidden}
.w img{width:100%;height:100%;object-fit:cover;display:block}
.grade{position:absolute;inset:0;mix-blend-mode:soft-light;
  background:linear-gradient(180deg,rgba(255,122,26,.30),rgba(255,122,26,.08) 24%,rgba(39,69,78,.34) 52%,rgba(39,69,78,.10) 66%,transparent 74%)}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,transparent 38%,rgba(10,12,14,.55) 62%,rgba(10,12,14,.78) 100%)}
.band{position:absolute;left:6.7%;right:6.7%;top:46%;bottom:7%;border:2px dashed rgba(245,69,2,.9)}
.pag{position:absolute;right:7.4%;top:35.1%;width:7.8%;aspect-ratio:1;border:3px solid #EFE7D7}
.ano{position:absolute;left:7.4%;top:35.1%;width:11.3%;height:5.1%;border:2px solid rgba(239,231,215,.75)}
.kick{position:absolute;left:7.4%;top:41.9%;width:37%;height:2.2%;border:2px solid rgba(245,69,2,.75)}
figcaption{font:600 15px/1.35 system-ui;color:#C9CFD6;padding:8px 2px 0}
</style>${casos.map(cel).join('\n')}`;

const out = process.argv[3];
fs.writeFileSync(out.replace(/\.png$/, '.html'), html);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1460, height: 1200 }, deviceScaleFactor: 1 });
await p.setContent(html);
await p.waitForTimeout(500);
await p.screenshot({ path: out, fullPage: true });
await b.close();
console.log('ok', out);
