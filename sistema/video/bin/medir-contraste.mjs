#!/usr/bin/env node
// medir-contraste.mjs — mede a tinta contra o PIXEL REAL da foto.
//
// Por que isto existe agora e não antes: enquanto a publicação de vídeo parava
// para o Fabiano olhar, este era um item de revisão humana. Com publicação
// automática não há mais humano no meio, e trava que dependia de olho tem de
// virar medida, ou desaparece. Promover autonomia sem substituir a trava é só
// remover a trava.
//
// O problema que ele resolve é o mesmo do carrossel: o gate de contraste
// comum compara a tinta com o fundo DECLARADO no CSS, e sobre foto o fundo
// declarado não existe. Uma peça pode passar em todos os gates com a manchete
// sumindo dentro da imagem.
//
// Método: recorta a banda de texto do quadro de prova, separa o que é tinta do
// que é fundo pela luminância, e compara o creme da marca com o pixel de fundo
// MAIS CLARO da banda, e não com a média. A média esconde exatamente a mancha
// clara que engole uma linha.
//
// Uso: node bin/medir-contraste.mjs [--peca <id>] [--piso 4.5]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { derivar } from '../src/tempo.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const id = arg('--peca') || fs.readFileSync(path.join(RAIZ, 'src/peca.js'), 'utf8').match(/pecas\/([^/]+)\/contract\.json/)?.[1];
const PISO = Number(arg('--piso') || 4.5);

// Cenas que desenham tinta por cima de foto. Campo chapado tem fundo declarado
// e já é coberto pelo contraste de token; foto não.
const CENAS_COM_FOTO = new Set(['poster-cover', 'poster-close']);

// Banda de texto: 60% a 90% da altura, dentro das margens. É onde manchete,
// apoio e kicker vivem nos layouts de pôster.
const BANDA = { x0: 0.074, x1: 0.926, y0: 0.60, y1: 0.90 };

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const razao = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05); };

const c = JSON.parse(fs.readFileSync(path.join(RAIZ, 'pecas', id, 'contract.json'), 'utf8'));
const linha = derivar(c);
const tokens = JSON.parse(fs.readFileSync(path.join(RAIZ, 'src/brand-tokens.json'), 'utf8'));
const creme = tokens.colors.posterCream.match(/\w\w/g).map((h) => parseInt(h, 16));
const Lcreme = lum(...creme);

const alvos = linha.batidas.filter((b) => CENAS_COM_FOTO.has(b.cena) && b.foto);
if (!alvos.length) {
  console.log('nenhuma batida com foto: nada a medir');
  process.exit(0);
}

const { w, h } = tokens.formats[c.format];
const cw = Math.round((BANDA.x1 - BANDA.x0) * w);
const ch = Math.round((BANDA.y1 - BANDA.y0) * h);
const cx = Math.round(BANDA.x0 * w);
const cy = Math.round(BANDA.y0 * h);

let reprovou = false;
console.log(`\n=== CONTRASTE SOBRE FOTO — ${id} ===`);
console.log(`creme ${tokens.colors.posterCream} · banda ${Math.round(BANDA.y0 * 100)}% a ${Math.round(BANDA.y1 * 100)}% da altura · piso ${PISO}:1\n`);

for (const b of alvos) {
  // --quadro existe para apontar o medidor a um quadro conhecido e provar que
  // ele reprova quando deve. Medidor que nunca viu uma reprovação não é
  // medidor, é enfeite.
  const prova = arg('--quadro') || path.join(RAIZ, 'out', `${id}-provas`, `batida-${b.meio}.png`);
  if (!fs.existsSync(prova)) { console.log(`batida ${b.n}: quadro de prova ausente`); reprovou = true; continue; }

  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', prova, '-vf', `crop=${cw}:${ch}:${cx}:${cy}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { encoding: 'buffer', maxBuffer: 1 << 28 });
  if (r.status !== 0) { console.log(`batida ${b.n}: ffmpeg falhou ao recortar`); reprovou = true; continue; }

  // Onde há tinta, e só ali. Medir a banda inteira reprovaria por uma mancha
  // clara em um canto vazio, onde não passa letra nenhuma: seria número
  // pessimista, e número que reprova peça boa acaba sendo desligado.
  //
  // Então: acha as linhas que têm creme, e em cada uma limita a medição ao
  // trecho horizontal que a tinta ocupa. É o fundo que a letra encosta.
  const L = new Float64Array(cw * ch);
  for (let i = 0, p = 0; i < r.stdout.length; i += 3, p++) {
    L[p] = lum(r.stdout[i], r.stdout[i + 1], r.stdout[i + 2]);
  }
  // A serrilha é uma armadilha, e cara: o pixel da borda do glifo é mistura de
  // creme com fundo, e se ele entrar na conta como "fundo" o número despenca
  // por causa da própria letra. Medindo assim a zxv-01 dava 2,15:1, quando o
  // fundo real dela é 13,8:1. Gate que reprova peça boa acaba desligado.
  //
  // Então: tinta é o miolo do glifo, fundo é só o que é francamente escuro, e
  // uma faixa de 2 pixels em volta de qualquer tinta é descartada inteira.
  const tinta = new Uint8Array(cw * ch);
  for (let p = 0; p < L.length; p++) if (L[p] > Lcreme * 0.75) tinta[p] = 1;

  const HALO = 2;
  const vizinhoDeTinta = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (!tinta[y * cw + x]) continue;
      for (let dy = -HALO; dy <= HALO; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= ch) continue;
        for (let dx = -HALO; dx <= HALO; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= cw) continue;
          vizinhoDeTinta[yy * cw + xx] = 1;
        }
      }
    }
  }

  const corte = Lcreme * 0.25;
  const fundos = [];
  let linhasComTexto = 0;
  for (let y = 0; y < ch; y++) {
    let min = -1, max = -1, n = 0;
    for (let x = 0; x < cw; x++) {
      if (tinta[y * cw + x]) { if (min < 0) min = x; max = x; n++; }
    }
    if (n < 5) continue; // linha sem texto de verdade
    linhasComTexto++;
    for (let x = min; x <= max; x++) {
      const p = y * cw + x;
      if (vizinhoDeTinta[p]) continue;
      if (L[p] < corte) fundos.push(L[p]);
    }
  }
  if (!fundos.length) { console.log(`batida ${b.n}: não achei tinta na banda para medir contra`); reprovou = true; continue; }

  fundos.sort((x, y) => x - y);
  // Percentil 99: o pixel de fundo mais claro que não é ruído isolado. É ele
  // que engole a linha de texto que passar por cima.
  const pior = fundos[Math.floor(fundos.length * 0.99)];
  const mediana = fundos[Math.floor(fundos.length * 0.5)];
  const rPior = razao(Lcreme, pior);
  const rMediana = razao(Lcreme, mediana);
  const ok = rPior >= PISO;
  if (!ok) reprovou = true;

  console.log(`batida ${b.n} (${b.cena})`);
  console.log(`  pior fundo (p99)  ${rPior.toFixed(2)}:1  ${ok ? '✓' : '✗ ABAIXO DO PISO'}`);
  console.log(`  fundo típico      ${rMediana.toFixed(2)}:1`);
  console.log(`  amostra           ${fundos.length.toLocaleString("pt-BR")} pixels de fundo, em ${linhasComTexto} linhas com tinta`);
}

if (reprovou) {
  console.log(`\n✗ REPROVADO. Conserte o ENQUADRAMENTO, nunca a cor do texto:`);
  console.log('  · mexa em photo.pos, photo.scale ou photo.origin no contrato');
  console.log('  · ou troque por uma foto com a metade de baixo escura e quieta');
  console.log('  Clarear o texto para escapar do número é falsificar a medida.');
  process.exit(1);
}
console.log('\n✓ contraste sobre foto dentro do piso');
