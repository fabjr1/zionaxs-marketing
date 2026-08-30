#!/usr/bin/env node
// preparar.mjs — deixa a peça pronta para a Meta buscar, e imprime os
// parâmetros exatos do contêiner.
//
// Existe para tirar da mão dois passos que erram calado: copiar os arquivos
// para um caminho versionado (a Meta busca por URL pública, e a rota que
// funciona nesta operação é a raw do GitHub) e montar os parâmetros do
// contêiner sem trocar um campo de lugar.
//
// A capa é o quadro de prova do gancho, e não o quadro 0: no quadro 0 a
// manchete está pela metade da revelação, e é ele que vira a miniatura no
// perfil se ninguém disser o contrário.
//
// Uso: node bin/preparar.mjs [--peca <id>]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { derivar } from '../src/tempo.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const id = arg('--peca') || fs.readFileSync(path.join(RAIZ, 'src/peca.js'), 'utf8').match(/pecas\/([^/]+)\/contract\.json/)?.[1];

const c = JSON.parse(fs.readFileSync(path.join(RAIZ, 'pecas', id, 'contract.json'), 'utf8'));
const linha = derivar(c);
const destino = path.join(RAIZ, 'pecas', id, 'publicacao');
const mp4 = path.join(RAIZ, 'out', `${id}.mp4`);
if (!fs.existsSync(mp4)) { console.error(`render ausente: rode npm run render`); process.exit(1); }

fs.mkdirSync(destino, { recursive: true });
fs.copyFileSync(mp4, path.join(destino, `${id}.mp4`));

// Capa: quadro de prova da primeira batida, que é o gancho.
const provaGancho = path.join(RAIZ, 'out', `${id}-provas`, `batida-${linha.batidas[0].meio}.png`);
if (!fs.existsSync(provaGancho)) { console.error(`quadro de prova do gancho ausente: ${provaGancho}`); process.exit(1); }
const capa = path.join(destino, 'capa.jpg');
const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', provaGancho, '-q:v', '2', capa], { encoding: 'utf8' });
if (r.status !== 0) { console.error('ffmpeg não conseguiu gerar a capa'); process.exit(1); }

const base = `https://raw.githubusercontent.com/fabjr1/zionaxs-marketing/main/sistema/video/pecas/${id}/publicacao`;
const params = {
  tool_slug: 'INSTAGRAM_POST_IG_USER_MEDIA',
  account: 'instagram_ascent-utick',
  arguments: {
    ig_user_id: '37965311306447572',
    media_type: 'REELS',
    video_url: `${base}/${id}.mp4`,
    cover_url: `${base}/capa.jpg`,
    share_to_feed: true,
    caption: c.caption,
  },
};

console.log(`\npreparado: ${path.relative(RAIZ, destino)}`);
console.log(`  ${id}.mp4  ${(fs.statSync(path.join(destino, `${id}.mp4`)).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`  capa.jpg  do quadro ${linha.batidas[0].meio}, o gancho já assentado`);
console.log('\nANTES de criar o contêiner: commite, empurre, e confirme 200 nas duas URLs.');
console.log('A Meta busca a mídia na hora; URL que ainda não subiu derruba o contêiner.\n');
console.log(JSON.stringify(params, null, 2));
