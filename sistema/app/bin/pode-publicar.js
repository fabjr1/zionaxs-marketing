#!/usr/bin/env node
// pode-publicar.js — porteiro da publicação automática.
// Com o comando /carrossel-<marca> publicando direto, some a revisão humana
// que antes segurava erro antes de virar público. O que dá para verificar por
// máquina passa a ser verificado aqui, e o comando obedece à resposta.
//
// Uso: node bin/pode-publicar.js <piece-id> [--root <ws>] [--excecao "<motivo>"]
// Sai 0 quando pode publicar, 1 quando não pode (e diz por quê).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkspace } from '../lib/workspace.js';
import { loadPiece, STATUS } from '../lib/pieces.js';
import { scanPiece, scanEstilo } from '../lib/copy-rules.js';
import { publicadasHoje, diaLocal } from '../lib/cadencia.js';

/** Teto de caracteres da legenda de um post do Instagram. É da plataforma. */
const LEGENDA_MAX = 2200;

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(APP, '../..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const id = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : undefined;
if (!id) { console.error('uso: node bin/pode-publicar.js <piece-id> [--root <ws>] [--excecao "<motivo>"]'); process.exit(2); }

const ws = loadWorkspace(arg('--root') || path.resolve(APP, '..', 'workspace'));
const p = loadPiece(ws, id);
const bloqueios = [];

if (!p) bloqueios.push(`peça ${id} não existe`);
else {
  if (!p.report) bloqueios.push('peça ainda não foi gerada');
  else if (!p.report.pass) {
    const vermelhos = p.report.gates.filter((g) => !g.pass).map((g) => g.id).join(', ');
    bloqueios.push(`gates vermelhos: ${vermelhos}`);
  }
  if (p.status === STATUS.PUBLISHED) bloqueios.push('peça já publicada');
  if (p.status === STATUS.SENT) bloqueios.push('peça já enviada, aguardando reconciliação');

  // padrão da marca: o gate já cobre, mas publicação automática confere de novo
  const copy = scanPiece(p.contract).length, estilo = scanEstilo(p.contract).length;
  if (copy) bloqueios.push(`${copy} violação(ões) do padrão de copy`);
  if (estilo) bloqueios.push(`${estilo} slide(s) fora da direção visual`);

  if (!p.contract.trilha_sugerida?.faixa) {
    bloqueios.push('sem trilha_sugerida no contrato: a música é adicionada à mão depois e precisa ir junto da entrega');
  }

  // Limite de legenda do Instagram. O que vai para o post é o CORPO do campo
  // `caption`; `caption_sources` fica no contrato, como registro de
  // rastreabilidade, e não entra na legenda publicada. Isso foi verificado ao
  // vivo na zx-26 em 31/08/2026, e importa porque o arquivo out/legenda-alt.md
  // imprime corpo e fontes um embaixo do outro: quem copiar de lá monta uma
  // legenda que a Meta recusa. Na zx-27 o corpo tinha 1.729 caracteres e a
  // soma com as fontes daria 3.132, acima do teto de 2.200.
  const corpo = (p.contract.caption || []).join('\n\n');
  if (corpo.length > LEGENDA_MAX) {
    bloqueios.push(`legenda com ${corpo.length} caracteres, acima do limite de ${LEGENDA_MAX} do Instagram. ` +
      'Encurte o campo `caption` do contrato. Não mova texto para `caption_sources` só para caber: ' +
      'fonte de afirmação E precisa continuar visível ao leitor na peça ou na legenda [19c §14].');
  }
}

// cadência: o limite vem da política de publicação da marca, nunca do código.
// Mudar o número aqui seria contornar uma decisão de governança; mude o arquivo.
const slug = (x) => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
let politica = null;
try {
  politica = JSON.parse(fs.readFileSync(path.join(ws.brandsDir, slug(p?.contract?.brand || ''), 'politica-de-publicacao.json'), 'utf8'));
} catch { /* sem política declarada: cai no baseline canônico */ }
const limite = politica?.cadencia?.postsPorDia ?? 1;
const origem = politica ? `política da marca (${politica.cadencia?.override ? 'override declarado' : 'baseline'})` : 'baseline canônico, sem política declarada';

// O dia é o do FUSO DA MARCA, não o UTC, e a conta inclui TODOS os formatos.
// Antes esta linha varria só as peças de carrossel, e um Reels publicado ficava
// invisível aqui: a cota do dia voltava a zero por formato. Cadência é da
// marca, não do formato.
const fuso = politica?.cadencia?.fuso || 'America/Fortaleza';
const hoje = diaLocal(new Date(), fuso);
const jaHoje = publicadasHoje(REPO, fuso, id);

const excecao = arg('--excecao');
if (jaHoje.length >= limite && !excecao) {
  bloqueios.push(`cadência: ${jaHoje.length} publicação(ões) hoje (${hoje}, fuso ${fuso}), limite ${limite} por ${origem}. ` +
    `Já saíram: ${jaHoje.map((x) => x.id + ' (' + x.formato + ')').join(', ')}. Publique amanhã, ou peça autorização humana e repasse --excecao "<motivo>".`);
}

console.log(`\n=== PODE PUBLICAR? — ${id} ===`);
if (p?.report) console.log(`gates      ${p.report.gates.filter((g) => g.pass).length}/${p.report.gates.length} · digest ${p.report.digest.slice(0, 12)}`);
if (p) console.log(`status     ${p.status}`);
console.log(`cadência   ${jaHoje.length}/${limite} hoje · ${origem}${excecao ? ' · exceção declarada' : ''}`);
if (p?.contract?.trilha_sugerida?.faixa) {
  const t = p.contract.trilha_sugerida;
  console.log(`trilha     ${t.faixa} — ${t.artista || '?'}${t.versao ? ` (${t.versao})` : ''}`);
}

if (bloqueios.length) {
  console.log('\n✗ NÃO PUBLICAR:');
  for (const b of bloqueios) console.log(`  · ${b}`);
  process.exit(1);
}
console.log('\n✓ liberado para publicar');
