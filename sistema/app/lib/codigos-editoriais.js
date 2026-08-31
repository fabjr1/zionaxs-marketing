// codigos-editoriais.js — confere os códigos editoriais do contrato contra as
// notas canônicas da Zionaxs Memory (A-09).
//
// Por que isto existe. O contrato declara `matriz` (linha da matriz editorial),
// `jtbd` (jobs) e `repertorio.id` (autor de repertório). Esses códigos vivem na
// Memory, não aqui, e uma sessão que não enxerga a Memory tende a COPIAR o
// código da peça anterior em vez de deixar em branco. Aconteceu 3 vezes em 3
// dias: a zx-25 saiu com M18 sendo M17 (registrado em decisions/), as zx-20 a
// zx-24 herdaram o mesmo M18, e a zx-26 saiu com JO2/JE2, que são os jobs de
// métrica da zx-23 e não os desta peça.
//
// Código copiado errado não vira pixel e não quebra gate nenhum: ele estraga a
// análise posterior em silêncio, que é exatamente o tipo de erro que escapa da
// revisão humana. É binário, então é da máquina, não do documento.
//
// O que NÃO se faz aqui: reescrever contrato de peça publicada. Contrato
// publicado é registro histórico, e a correção mora em decisions/ da peça.
// Por isso quem chama esta função filtra as publicadas antes.
import fs from 'node:fs';
import path from 'node:path';

const NOTA_MATRIZ_E_REPERTORIO = 'Marketing/Marcas/Zionaxs/Público/19c - Zionaxs - Matriz Editorial, Repertório e Linguagem.md';
const NOTA_JTBD = 'Marketing/Marcas/Zionaxs/Público/19b - Zionaxs - Personas, JTBD, Rotinas e Dores.md';

/** M8 e M08 são o mesmo código; a nota escreve com 2 dígitos. */
export function normalizarCodigo(c) {
  const m = String(c || '').trim().match(/^([A-Z]+)(\d+)$/i);
  if (!m) return String(c || '').trim();
  const [, letras, digitos] = m;
  const alvo = letras.toUpperCase() === 'M' ? 2 : digitos.replace(/^0+/, '').length;
  return letras.toUpperCase() + digitos.replace(/^0+/, '').padStart(alvo, '0');
}

/** Ids na primeira coluna de uma tabela markdown: `| M01 | ...`. */
function idsDaTabela(texto, prefixos) {
  const re = new RegExp(`^\\|\\s*((?:${prefixos.join('|')})\\d+)\\s*\\|`, 'gim');
  return new Set([...texto.matchAll(re)].map((m) => normalizarCodigo(m[1])));
}

/**
 * Lê os códigos válidos das notas canônicas.
 * `disponivel: false` quando a Memory não está no checkout — aí não há o que
 * conferir, e é a A7 que cobra a ausência, não esta verificação.
 */
export function lerCodigosCanonicos(memoryRoot) {
  const vazio = { disponivel: false, matriz: new Set(), jtbd: new Set(), repertorio: new Set() };
  if (!memoryRoot || !fs.existsSync(memoryRoot)) return vazio;

  const ler = (rel) => {
    try { return fs.readFileSync(path.join(memoryRoot, rel), 'utf8'); } catch { return null; }
  };
  const t19c = ler(NOTA_MATRIZ_E_REPERTORIO);
  const t19b = ler(NOTA_JTBD);
  if (!t19c || !t19b) return { ...vazio, why: 'notas 19b/19c não encontradas na Memory' };

  return {
    disponivel: true,
    matriz: idsDaTabela(t19c, ['M']),
    repertorio: idsDaTabela(t19c, ['R']),
    jtbd: idsDaTabela(t19b, ['JF', 'JE', 'JS', 'JO', 'JT']),
  };
}

/**
 * Confere os códigos declarados por um contrato. Retorna [] quando limpo.
 * Só reprova código DECLARADO que não existe na nota: campo ausente é lacuna
 * assumida, e mentir um código é pior que não declarar nenhum.
 */
export function conferirCodigos(contract, codigos) {
  if (!codigos?.disponivel) return [];
  const fora = [];
  const conferir = (valor, conjunto, campo, nota) => {
    const cod = normalizarCodigo(valor);
    if (!cod) return;
    if (!conjunto.has(cod)) {
      fora.push({ campo, declarado: String(valor).trim(), nota,
        motivo: `${campo} "${String(valor).trim()}" não existe na nota canônica` });
    }
  };

  conferir(contract.matriz, codigos.matriz, 'matriz', '19c');
  for (const j of contract.jtbd || []) conferir(j, codigos.jtbd, 'jtbd', '19b');
  // repertorio.id costuma vir como "R11" ou como "R11 (proposto)"; só o código.
  const rep = contract.repertorio?.id;
  if (rep && !/proposto|pendente/i.test(String(rep))) {
    conferir(String(rep).split(/\s+/)[0], codigos.repertorio, 'repertorio.id', '19c');
  }
  return fora;
}
