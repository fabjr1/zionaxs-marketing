#!/usr/bin/env node
// pode-publicar.js — porteiro da publicação automática.
// Com o comando /carrossel-<marca> publicando direto, some a revisão humana
// que antes segurava erro antes de virar público. O que dá para verificar por
// máquina passa a ser verificado aqui, e o comando obedece à resposta.
//
// Uso: node bin/pode-publicar.js <piece-id> [--root <ws>] [--excecao "<motivo>"]
// Sai 0 quando pode publicar, 1 quando não pode (e diz por quê).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkspace } from '../lib/workspace.js';
import { loadPiece, loadAllPieces, STATUS } from '../lib/pieces.js';
import { scanPiece, scanEstilo } from '../lib/copy-rules.js';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
}

// cadência: no máximo 1 post por dia (restrição do Brief aprovado)
const hoje = new Date().toISOString().slice(0, 10);
const jaHoje = loadAllPieces(ws)
  .filter((x) => x.id !== id && x.publication?.publishedAt)
  .filter((x) => new Date(x.publication.publishedAt).toISOString().slice(0, 10) === hoje);

const excecao = arg('--excecao');
if (jaHoje.length && !excecao) {
  bloqueios.push(`cadência: ${jaHoje.map((x) => x.id).join(', ')} já publicou hoje (${hoje}). ` +
    'O Brief limita a 1 post por dia. Publique amanhã, ou peça autorização humana e repasse --excecao "<motivo>".');
}

console.log(`\n=== PODE PUBLICAR? — ${id} ===`);
if (p?.report) console.log(`gates      ${p.report.gates.filter((g) => g.pass).length}/${p.report.gates.length} · digest ${p.report.digest.slice(0, 12)}`);
if (p) console.log(`status     ${p.status}`);
console.log(`cadência   ${jaHoje.length ? jaHoje.length + ' publicação(ões) hoje' : 'nenhuma publicação hoje'}${excecao ? ' · exceção declarada' : ''}`);
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
