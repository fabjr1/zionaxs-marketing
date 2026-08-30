// tempo.js — deriva a linha do tempo a partir do contrato da peça.
// Nada de número de batida escrito à mão: a duração de cada batida está no
// contrato, e composição e render leem daqui. Se divergissem, a prova
// apontaria para o quadro errado e ninguém perceberia.

/** Quadros da subida do campo novo sobre o anterior. */
export const WIPE = 12;

export function derivar(contrato) {
  let cursor = 0;
  const batidas = contrato.batidas.map((b) => {
    const from = cursor;
    cursor += b.duracao;
    return { ...b, from, ate: cursor, meio: from + Math.floor(b.duracao * 0.72) };
  });

  return {
    fps: contrato.fps,
    total: cursor,
    batidas,
    /**
     * O quadro a 72% de cada batida: tudo já entrou e nada
     * está em movimento, que é a condição para medir contraste e tipografia.
     */
    provas: batidas.map((b) => b.meio),
  };
}
