#!/usr/bin/env node
// trilha.mjs — põe uma faixa da coleção na peça em produção.
//
// Copia o arquivo para dentro da peça e escreve o bloco `trilha_embutida` no
// contrato, com a licença vinda do manifesto da coleção.
//
// A cópia não é desperdício: é o que faz o digest da publicação cobrir o áudio
// que de fato foi ao ar. Referência a arquivo de fora do repositório não
// sobrevive a auditoria nenhuma, porque o arquivo pode mudar sem aviso.
//
// Uso: node bin/trilha.mjs <id-da-faixa> [--peca <id>] [--ganho -3] [--fade 2]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharFaixa, COLECAO } from './biblioteca.mjs';
import { pecaAtual } from '../scripts/peca-atual.mjs';
import { derivar } from '../src/tempo.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };

const faixaId = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : undefined;
if (!faixaId) { console.error('uso: npm run trilha -- <id-da-faixa> [--peca <id>]'); process.exit(2); }

const faixa = acharFaixa(faixaId);
if (!faixa) {
  console.error(`faixa "${faixaId}" não está no manifesto da coleção.`);
  console.error('veja o que existe com: npm run biblioteca');
  process.exit(1);
}
if (!faixa.licenca) {
  console.error(`a faixa "${faixaId}" está sem licenca no manifesto. Declare antes de usar.`);
  process.exit(1);
}

const id = arg('--peca') || pecaAtual();
const dirPeca = path.join(RAIZ, 'pecas', id);
const contrato = JSON.parse(fs.readFileSync(path.join(dirPeca, 'contract.json'), 'utf8'));
const linha = derivar(contrato);

const origem = path.join(COLECAO, faixa.arquivo);
if (!fs.existsSync(origem)) { console.error(`arquivo sumiu da coleção: ${origem}`); process.exit(1); }

// A faixa precisa cobrir a peça. Mais curta significa silêncio no fim, e
// silêncio no fim de um Reels lê como arquivo quebrado.
const precisa = linha.total / linha.fps;
if (faixa.duracao_s && faixa.duracao_s < precisa) {
  console.error(`faixa tem ${faixa.duracao_s.toFixed(1)}s e a peça pede ${precisa.toFixed(1)}s.`);
  console.error('escolha outra, ou encurte a peça no contrato.');
  process.exit(1);
}

const destinoRelativo = `audio/${faixa.id}${path.extname(faixa.arquivo)}`;
fs.mkdirSync(path.join(dirPeca, 'audio'), { recursive: true });
fs.copyFileSync(origem, path.join(dirPeca, destinoRelativo));

contrato.trilha_embutida = {
  arquivo: destinoRelativo,
  faixa: faixa.titulo,
  origem: faixa.origem,
  licenca: faixa.licenca,
  ganho_db: Number(arg('--ganho') ?? 0),
  fade_out_s: Number(arg('--fade') ?? 2),
};
// A trilha sugerida passa a descrever a mesma faixa: o contrato não pode
// sugerir uma coisa e embutir outra.
contrato.trilha_sugerida = {
  faixa: faixa.titulo,
  artista: faixa.origem,
  versao: 'Instrumental, embutida no arquivo',
  porque: contrato.trilha_sugerida?.porque || 'Instrumental de andamento constante, que não compete com a leitura.',
  evitar: 'Catálogo popular do Instagram: a licença da Meta para música famosa é de uso pessoal e não vale para conta de marca.',
};

fs.writeFileSync(path.join(dirPeca, 'contract.json'), JSON.stringify(contrato, null, 2) + '\n');

console.log(`\n✓ ${faixa.titulo} → ${id}`);
console.log(`  arquivo   ${destinoRelativo} (${(fs.statSync(path.join(dirPeca, destinoRelativo)).size / 1024).toFixed(0)} KB)`);
console.log(`  duração   ${faixa.duracao_s.toFixed(1)}s para uma peça de ${precisa.toFixed(1)}s`);
console.log(`  licença   ${faixa.licenca.split('.')[0]}`);
console.log('\nagora: npm run render && npm run pode-publicar');
