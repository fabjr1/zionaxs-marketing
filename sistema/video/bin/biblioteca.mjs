#!/usr/bin/env node
// biblioteca.mjs — indexa a coleção de trilhas da marca.
//
// A coleção vive FORA do repositório, porque é áudio: pesa, não é código, e é
// compartilhada entre marcas. O que entra no repositório é a faixa que uma
// peça de fato usou, copiada para dentro dela, para o digest cobrir o que foi
// publicado.
//
// O manifesto mora junto dos arquivos, e não aqui, para a coleção continuar
// fazendo sentido sozinha se um dia for para outra máquina ou para a nuvem.
//
// O que ele resolve: a licença deixa de ser digitada peça a peça. Ela é
// propriedade da FAIXA, não da peça, e digitar de novo é como cada peça
// declara errado uma vez.
//
// Uso: node bin/biblioteca.mjs [--indexar]
// Caminho da coleção: variável ZX_TRILHAS, ou C:/dev/sound-collection.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const COLECAO = process.env.ZX_TRILHAS || 'C:/dev/sound-collection';
const MANIFESTO = path.join(COLECAO, 'biblioteca.json');
const AUDIO = new Set(['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.mp4']);

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function duracao(arq) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq], { encoding: 'utf8' });
  return r.status === 0 ? Number(r.stdout.trim()) : null;
}

export function lerManifesto() {
  if (!fs.existsSync(MANIFESTO)) return { faixas: [] };
  return JSON.parse(fs.readFileSync(MANIFESTO, 'utf8'));
}

export function acharFaixa(id) {
  return lerManifesto().faixas.find((f) => f.id === id) || null;
}

function indexar() {
  if (!fs.existsSync(COLECAO)) {
    console.error(`coleção não existe: ${COLECAO}`);
    console.error('crie a pasta, ou aponte a variável ZX_TRILHAS para onde ela está.');
    process.exit(1);
  }
  const anterior = lerManifesto();
  const porArquivo = new Map(anterior.faixas.map((f) => [f.arquivo, f]));

  const faixas = fs.readdirSync(COLECAO)
    .filter((f) => AUDIO.has(path.extname(f).toLowerCase()))
    .map((arquivo) => {
      const titulo = path.basename(arquivo, path.extname(arquivo));
      const antes = porArquivo.get(arquivo) || {};
      return {
        id: antes.id || slug(titulo),
        titulo: antes.titulo || titulo,
        arquivo,
        // Origem e licença ficam preservadas se já tinham sido preenchidas: o
        // índice não sobrescreve o que um humano declarou.
        origem: antes.origem || 'Meta Sound Collection',
        licenca: antes.licenca || 'Meta Sound Collection. Livre de royalties e liberada para uso comercial em conteúdo hospedado no Instagram e no Facebook. NÃO cobre YouTube nem TikTok.',
        duracao_s: Number((duracao(path.join(COLECAO, arquivo)) ?? 0).toFixed(2)),
        tags: antes.tags || [],
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  fs.writeFileSync(MANIFESTO, JSON.stringify({
    nota: 'Índice da coleção de trilhas. Gerado por sistema/video/bin/biblioteca.mjs, mas origem, licenca e tags são preenchidas à mão e nunca sobrescritas. A licença é propriedade da FAIXA: declará-la aqui evita que cada peça a digite de novo, e digitar de novo é como uma peça declara errado uma vez.',
    atualizadoEm: new Date().toISOString().slice(0, 10),
    faixas,
  }, null, 2) + '\n');

  return faixas;
}

const faixas = process.argv.includes('--indexar') ? indexar() : lerManifesto().faixas;

console.log(`\ncoleção: ${COLECAO}`);
if (!faixas.length) {
  console.log('vazia, ou ainda não indexada. Rode: npm run biblioteca -- --indexar');
} else {
  console.log(`${faixas.length} faixa(s)\n`);
  for (const f of faixas) {
    const min = Math.floor(f.duracao_s / 60), seg = String(Math.round(f.duracao_s % 60)).padStart(2, '0');
    console.log(`  ${f.id.padEnd(28)} ${min}:${seg}  ${f.titulo}${f.tags.length ? `  [${f.tags.join(', ')}]` : ''}`);
  }
  console.log('\npara pôr uma faixa na peça em produção:');
  console.log('  npm run trilha -- <id-da-faixa>');
}
