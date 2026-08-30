// peca.js — a peça que está em produção, e a linha do tempo dela.
// Trocar de peça é trocar este import, e nada mais.
import contrato from '../pecas/zxv-01-uma-porta-so/contract.json';
import { derivar } from './tempo.js';

export { contrato };
export const linha = derivar(contrato);
