// peca-atual.mjs — qual peça está em produção, em um lugar só.
//
// O `src/peca.js` é a fonte: ele é o import que a composição usa, então é ele
// que decide o que o Remotion renderiza. Todo script que precisa saber a peça
// lê daqui, e não repete o caminho.
//
// Isto existe porque a primeira versão do render tinha o id cravado. Apontar a
// composição para a peça nova e esquecer o render deu erro na cara, o que foi
// sorte: o modo silencioso dessa falha seria renderizar a peça errada.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function pecaAtual() {
  const fonte = fs.readFileSync(path.join(RAIZ, 'src/peca.js'), 'utf8');
  const id = fonte.match(/pecas\/([^/]+)\/contract\.json/)?.[1];
  if (!id) throw new Error('não consegui descobrir a peça em src/peca.js');
  return id;
}

export function contratoDa(id) {
  return JSON.parse(fs.readFileSync(path.join(RAIZ, 'pecas', id, 'contract.json'), 'utf8'));
}
