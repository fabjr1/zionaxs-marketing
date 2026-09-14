#!/usr/bin/env node
// recorte-de-slide.mjs — amplia um pedaço de um slide já renderizado.
//
// Por que isto existe. O passo 6 do comando manda olhar os PNG, porque nenhum
// gate mede sobreposição, geometria invadindo texto nem tinta sobre foto. Só
// que os defeitos que aparecem ali são pequenos: a cedilha de 1 caractere
// comida pela caixa do realce (zx-54), o acento escondido embaixo do mesmo
// realce (zx-31, zx-32, zx-48), a caixa de paginação de 84x84 sumindo num
// trecho claro da foto (zx-47), a linha do corpo encostando no anel do
// poster-statement (zx-28, zx-29, zx-38). Em um PNG de 1080x1350 visto inteiro
// esses defeitos medem poucos pixels, e a diferença entre "encostou" e "passou
// perto" não se decide no olho por cima.
//
// Sem uma ferramenta, cada sessão improvisa o recorte, que é exatamente o que a
// regra zero proíbe. É o mesmo caminho que a folha-de-contato.mjs já percorreu:
// script improvisado 3 vezes vira ferramenta versionada.
//
// A folha de contato decide a foto ANTES de gerar. Esta aqui confere o pixel
// DEPOIS de gerar. As 2 servem ao mesmo passo 6, em pontas opostas.
//
// Como usa. Coordenadas em pixels do PNG de 1080x1350, ampliadas 2x na saída:
//
//   node bin/recorte-de-slide.mjs <slide.png> <saida.png> <x> <y> <w> <h>
//
// Exemplo, conferir a junção entre o título e a caixa do realce no slide 4:
//
//   node bin/recorte-de-slide.mjs out/...-slide-04.png /tmp/z.png 60 460 600 320
//
// Registrado em campanhas/zionaxs/direcao-visual/README.md.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [, , src, out, x, y, w, h] = process.argv;
if (!src || !out || !w || !h) {
  console.error('uso: node bin/recorte-de-slide.mjs <slide.png> <saida.png> <x> <y> <w> <h>');
  process.exit(1);
}

const b64 = fs.readFileSync(src).toString('base64');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w * 2, height: +h * 2 }, deviceScaleFactor: 1 });
// 2160x2700 é o slide de 1080x1350 ampliado 2x; image-rendering pixelated para
// não inventar suavização em cima do que se quer justamente medir.
await p.setContent(`<style>body{margin:0}img{position:absolute;left:${-x * 2}px;top:${-y * 2}px;width:2160px;height:2700px;image-rendering:pixelated}</style><img src="data:image/png;base64,${b64}">`);
await p.waitForTimeout(300);
await p.screenshot({ path: out });
await b.close();
console.log('ok', out);
