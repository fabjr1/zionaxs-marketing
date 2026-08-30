#!/usr/bin/env node
// pode-publicar.mjs — porteiro da publicação de vídeo.
//
// Mesmo papel do bin/pode-publicar.js do marketing-os, para o formato que ele
// não conhece. Cada verificação daqui existe porque a falha correspondente já
// aconteceu de verdade nesta operação, e não porque era bonito verificar:
//
//   · faixa de áudio        o primeiro arquivo saiu sem nenhuma, e Reels sem
//                           faixa fica sem "áudio original", que é o campo
//                           onde a música entra pelo app
//   · marcas de cor         o primeiro arquivo saiu sem BT.709 e o laranja da
//                           marca chegava estourado no player
//   · cadência              em 29/08/2026 saíram 4 posts contra limite de 2, e
//                           só um humano percebeu
//   · quadros de prova      sem eles não há como revisar nem medir nada
//
// Uso: node bin/pode-publicar.mjs [--peca <id>] [--excecao "<motivo>"]
// Sai 0 quando pode publicar, 1 quando não pode e diz por quê.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scanCopy } from '../../app/lib/copy-rules.js';
import { publicadasHoje, diaLocal } from '../../app/lib/cadencia.js';
import { derivar } from '../src/tempo.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(RAIZ, '../..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };

// Sem --peca, usa a que a composição está apontando hoje.
const id = arg('--peca') || fs.readFileSync(path.join(RAIZ, 'src/peca.js'), 'utf8').match(/pecas\/([^/]+)\/contract\.json/)?.[1];
if (!id) { console.error('não descobri qual peça avaliar: passe --peca <id>'); process.exit(2); }

const bloqueios = [];
const dirPeca = path.join(RAIZ, 'pecas', id);
const arqContrato = path.join(dirPeca, 'contract.json');

if (!fs.existsSync(arqContrato)) { console.error(`peça ${id} não existe em pecas/`); process.exit(2); }
const c = JSON.parse(fs.readFileSync(arqContrato, 'utf8'));
const linha = derivar(c);

/* -------------------------------------------------- 1. forma do contrato */
if (c.format !== 'story-9x16') bloqueios.push(`formato ${c.format} não é story-9x16`);
c.batidas.forEach((b, i) => {
  const onde = `batida ${b.n}`;
  if (!b.duracao) bloqueios.push(`${onde}: sem duração`);
  if (!b.cena) bloqueios.push(`${onde}: sem cena declarada`);
  if (!Array.isArray(b.approved_visible_copy)) bloqueios.push(`${onde}: sem approved_visible_copy`);
  const esperado = `Batida ${b.n} de ${c.batidas.length}.`;
  if (!b.alt?.startsWith(esperado)) bloqueios.push(`${onde}: alt precisa começar com "${esperado}"`);
});

/* -------------------------------------------------- 2. padrão de copy (G13) */
// Mesmo código que cobra o carrossel. Duas implementações da mesma regra
// divergem, e a que diverge é sempre a que ninguém está olhando.
const textos = [];
for (const b of c.batidas) { textos.push(...b.approved_visible_copy, b.alt); }
textos.push(c.caption, ...Object.values(c.chrome || {}));
let violacoes = 0;
for (const t of textos.filter(Boolean)) {
  const r = scanCopy(t);
  const achados = Array.isArray(r) ? r : (r?.hits || []);
  if (achados.length) { violacoes++; bloqueios.push(`padrão de copy: "${String(t).slice(0, 50)}..."`); }
}

/* -------------------------------------------------- 3. trilha */
if (!c.trilha_sugerida?.faixa) {
  bloqueios.push('sem trilha_sugerida no contrato: a música entra à mão pelo app e precisa ir junto da entrega');
}

// Trilha embutida sem licença declarada é o caminho curto para o Rights
// Manager silenciar a peça. A licença da biblioteca do Instagram vale dentro
// do app e não acompanha o arquivo, então música comercial embutida sai pior
// do que silêncio: vira post mudo, e ainda com risco na conta.
// Trilha embutida é OBRIGATÓRIA em vídeo, e este é o buraco que existia até
// 30/08/2026: o porteiro conferia a licença quando havia trilha, mas deixava
// passar peça sem trilha nenhuma. Reels publicado por API não aceita adicionar
// áudio depois, então peça sem trilha embutida nasce muda e assim morre. O
// padrão exige trilha; o porteiro passa a exigir também.
if (!c.trilha_embutida) {
  bloqueios.push('sem trilha_embutida: Reels publicado por API não aceita áudio depois, então a faixa tem de estar no arquivo. Use npm run trilha -- <id-da-faixa>');
} else {
  const t = c.trilha_embutida;
  if (!t.licenca) bloqueios.push('trilha_embutida sem campo licenca: declare a origem e o direito de uso comercial');
  if (!t.arquivo) bloqueios.push('trilha_embutida sem arquivo');
  else if (!fs.existsSync(path.join(dirPeca, t.arquivo))) bloqueios.push(`trilha_embutida aponta para arquivo inexistente: ${t.arquivo}`);
}

/* -------------------------------------------------- 4. render e provas */
const mp4 = path.join(RAIZ, 'out', `${id}.mp4`);
const provasDir = path.join(RAIZ, 'out', `${id}-provas`);
if (!fs.existsSync(mp4)) bloqueios.push(`render ausente: rode npm run render`);
const provas = fs.existsSync(provasDir) ? fs.readdirSync(provasDir).filter((f) => f.endsWith('.png')) : [];
if (provas.length !== c.batidas.length) {
  bloqueios.push(`quadros de prova: ${provas.length} para ${c.batidas.length} batidas`);
}

/* -------------------------------------------------- 5. o arquivo em si */
let ficha = null;
if (fs.existsSync(mp4)) {
  const r = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,color_space',
    '-show_entries', 'format=duration', '-of', 'json', mp4,
  ], { encoding: 'utf8' });
  if (r.status !== 0) bloqueios.push('ffprobe não conseguiu ler o mp4');
  else {
    ficha = JSON.parse(r.stdout);
    const v = ficha.streams.find((s) => s.codec_type === 'video');
    const a = ficha.streams.find((s) => s.codec_type === 'audio');
    if (!a) bloqueios.push('mp4 sem faixa de áudio: Reels sem faixa fica sem "áudio original" e a música não tem onde entrar');
    if (v?.color_space !== 'bt709') bloqueios.push(`mp4 sem marca de cor BT.709 (está "${v?.color_space}"): o laranja da marca chega deslocado no player`);
    if (Number(v?.width) !== 1080 || Number(v?.height) !== 1920) bloqueios.push(`mp4 em ${v?.width}x${v?.height}, esperado 1080x1920`);
    const durEsperada = linha.total / linha.fps;
    const dur = Number(ficha.format.duration);
    if (Math.abs(dur - durEsperada) > 0.2) {
      bloqueios.push(`mp4 com ${dur.toFixed(1)}s e o contrato pede ${durEsperada.toFixed(1)}s: render desatualizado`);
    }
  }
}

/* -------------------------------------------------- 6. contraste sobre foto */
// Enquanto a publicação parava para o Fabiano olhar, isto era item de revisão
// humana. Com publicação automática não há humano no meio, e trava que
// dependia de olho vira medida ou desaparece.
let contraste = null;
if (fs.existsSync(provasDir)) {
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'bin/medir-contraste.mjs'), '--peca', id], { encoding: 'utf8' });
  contraste = r.stdout.trim().split('\n').filter((l) => /:1/.test(l)).join(' | ');
  if (r.status !== 0) bloqueios.push(`contraste sobre foto abaixo do piso: ${contraste || 'ver npm run medir-contraste'}`);
}

/* -------------------------------------------------- 7. já publicada? */
const jaPublicada = path.join(dirPeca, 'publication', 'published.json');
if (fs.existsSync(jaPublicada)) {
  const j = JSON.parse(fs.readFileSync(jaPublicada, 'utf8'));
  bloqueios.push(`peça já publicada em ${j.publishedAt}: ${j.permalink}`);
}

/* -------------------------------------------------- 8. cadência da MARCA */
// O limite vem da política da marca, nunca do código, e a conta inclui
// carrossel e vídeo: cadência é da marca, não do formato.
const slug = (x) => String(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
let politica = null;
try {
  politica = JSON.parse(fs.readFileSync(path.join(REPO, 'sistema/workspace/brands', slug(c.brand), 'politica-de-publicacao.json'), 'utf8'));
} catch { /* sem política: baseline canônico */ }
const limite = politica?.cadencia?.postsPorDia ?? 1;
const fuso = politica?.cadencia?.fuso || 'America/Fortaleza';
const origem = politica ? `política da marca (${politica.cadencia?.override ? 'override declarado' : 'baseline'})` : 'baseline canônico';
const hoje = diaLocal(new Date(), fuso);
const jaHoje = publicadasHoje(REPO, fuso, id);
const excecao = arg('--excecao');
if (jaHoje.length >= limite && !excecao) {
  bloqueios.push(
    `cadência: ${jaHoje.length} publicação(ões) hoje (${hoje}, fuso ${fuso}), limite ${limite} por ${origem}. ` +
    `Já saíram: ${jaHoje.map((x) => `${x.id} (${x.formato})`).join(', ')}. ` +
    `Espere o dia virar, ou peça autorização humana AGORA e repasse --excecao "<motivo>".`
  );
}

/* -------------------------------------------------- relatório */
console.log(`\n=== PODE PUBLICAR? — ${id} ===`);
console.log(`contrato   ${c.batidas.length} batidas · ${(linha.total / linha.fps).toFixed(1)}s`);
console.log(`copy       ${textos.filter(Boolean).length} textos varridos · ${violacoes} violação(ões)`);
if (ficha) {
  const v = ficha.streams.find((s) => s.codec_type === 'video');
  const a = ficha.streams.find((s) => s.codec_type === 'audio');
  console.log(`arquivo    ${v?.width}x${v?.height} · ${v?.color_space} · áudio ${a ? a.codec_name : 'AUSENTE'} · ${Number(ficha.format.duration).toFixed(1)}s`);
}
console.log(`provas     ${provas.length}/${c.batidas.length} quadros`);
if (contraste) console.log(`contraste  ${contraste}`);
console.log(`cadência   ${jaHoje.length}/${limite} hoje · ${origem}${excecao ? ' · exceção declarada' : ''}`);
if (c.trilha_sugerida?.faixa) {
  const t = c.trilha_sugerida;
  console.log(`trilha     ${t.faixa}, ${t.artista || '?'}${t.versao ? ` (${t.versao})` : ''}`);
}

// O que nenhuma máquina mede aqui, e por isso não vira aprovação automática.
console.log('\nolho humano ainda obrigatório:');
console.log('  · sobreposição, geometria invadindo texto e foto que contradiz a copy');
console.log('  · se o texto de apoio dá tempo de ler dentro da batida');

if (bloqueios.length) {
  console.log('\n✗ NÃO PUBLICAR:');
  for (const b of bloqueios) console.log(`  · ${b}`);
  process.exit(1);
}
console.log('\n✓ liberado para publicar');
