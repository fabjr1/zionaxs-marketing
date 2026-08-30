// tempo.js — a batida da peça, declarada em um lugar só.
// A composição usa para animar. O render usa para saber qual quadro guardar
// como prova depois de apagar a sequência. Se cada um tivesse a sua cópia, um
// dia divergiriam em silêncio e a prova apontaria para o quadro errado.
//
// Quando o vídeo passar a nascer de contrato, estes números saem daqui e
// entram no contrato da peça, ao lado de `duracao` de cada batida.
export const FPS = 30;

/** Quadros por batida: 4 segundos. */
export const BEAT = 120;

/** Quadros da subida do campo novo sobre o anterior. */
export const WIPE = 14;

export const BATIDAS = 3;

export const TOTAL = BEAT * BATIDAS;

/**
 * O quadro do meio de cada batida: o texto já entrou por completo e nada está
 * em movimento, que é a condição para medir contraste e tipografia.
 */
export const provas = () =>
  Array.from({ length: BATIDAS }, (_, i) => i * BEAT + Math.floor(BEAT / 2));
