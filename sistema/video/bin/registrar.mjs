#!/usr/bin/env node
// registrar.mjs — grava o que foi publicado, com digest e reconciliação.
//
// HTTP 200 nunca foi publicação, e id devolvido pela API também não. O que
// muda o estado para publicada é a reconciliação: perguntar de volta à
// plataforma quem é o dono, qual o permalink e qual o tipo, e conferir contra
// o que foi enviado. Este script recusa gravar se a conta divergir.
//
// Uso: node bin/registrar.mjs --peca <id> --reconciliacao <arquivo.json>
// O arquivo é a resposta crua de INSTAGRAM_GET_IG_MEDIA.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const id = arg('--peca') || fs.readFileSync(path.join(RAIZ, 'src/peca.js'), 'utf8').match(/pecas\/([^/]+)\/contract\.json/)?.[1];
const arqRec = arg('--reconciliacao');
if (!arqRec) { console.error('uso: node bin/registrar.mjs --peca <id> --reconciliacao <arquivo.json>'); process.exit(2); }

const CONTA_ESPERADA = { id: '37965311306447572', username: 'zionaxs_' };

const dirPeca = path.join(RAIZ, 'pecas', id);
const c = JSON.parse(fs.readFileSync(path.join(dirPeca, 'contract.json'), 'utf8'));
const bruto = JSON.parse(fs.readFileSync(arqRec, 'utf8'));
const m = bruto.data?.results?.[0]?.response?.data || bruto.data || bruto;

// Conta divergente aborta. Há 2 contas conectadas nesta operação, e publicar
// na errada é o tipo de erro que não tem desfazer.
if (m.owner?.id !== CONTA_ESPERADA.id || m.username !== CONTA_ESPERADA.username) {
  console.error(`✗ conta divergente: veio ${m.username} (${m.owner?.id}), esperado ${CONTA_ESPERADA.username} (${CONTA_ESPERADA.id})`);
  console.error('  Nada foi gravado. Investigue antes de qualquer retry.');
  process.exit(1);
}
if (m.media_product_type !== 'REELS') {
  console.error(`✗ tipo divergente: veio ${m.media_product_type}, esperado REELS`);
  process.exit(1);
}
if (m.caption !== c.caption) {
  console.error('✗ a legenda publicada não é a do contrato. Nada gravado.');
  process.exit(1);
}

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const mp4 = path.join(dirPeca, 'publicacao', `${id}.mp4`);
const base = `https://raw.githubusercontent.com/fabjr1/zionaxs-marketing/main/sistema/video/pecas/${id}/publicacao`;

const registro = {
  postId: m.id,
  permalink: m.permalink,
  shortcode: m.shortcode,
  publishedAt: m.timestamp,
  accountUsername: m.username,
  igUserId: m.owner.id,
  route: 'composio/instagram REELS, via /reels-zionaxs',
  composioAccount: 'instagram_ascent-utick',
  containerId: arg('--container') || null,
  mediaUrls: [`${base}/${id}.mp4`, `${base}/capa.jpg`],
  digest: { contrato: sha(path.join(dirPeca, 'contract.json')), mp4: fs.existsSync(mp4) ? sha(mp4) : null },
  reconciledAt: new Date().toISOString(),
  reconciliation: {
    fonte: 'INSTAGRAM_GET_IG_MEDIA',
    owner: m.owner.id,
    username: m.username,
    media_type: m.media_type,
    media_product_type: m.media_product_type,
    legendaConfere: true,
  },
  trilhaSugerida: c.trilha_sugerida,
  pendencia: 'A trilha entra à mão, editando o post no app. A API não escolhe faixa.',
};

fs.mkdirSync(path.join(dirPeca, 'publication'), { recursive: true });
fs.writeFileSync(path.join(dirPeca, 'publication', 'published.json'), JSON.stringify(registro, null, 2) + '\n');
console.log(`✓ registrado: ${registro.permalink}`);
console.log(`  conta conferida, tipo REELS, legenda idêntica ao contrato`);
console.log(`  digest do mp4: ${registro.digest.mp4?.slice(0, 16)}`);
