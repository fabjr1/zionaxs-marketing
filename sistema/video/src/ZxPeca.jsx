// ZxPeca.jsx — monta a peça a partir do contrato.
// Aqui não há copy: cada batida entrega a sua cena e a sua duração, e a cena
// certa é escolhida pelo campo `cena` do contrato. Trocar de peça é trocar o
// import em peca.js.
import { AbsoluteFill, Sequence } from 'remotion';
import { linha } from './peca.js';
import { C, Chrome, Grao, Entrada } from './ui.jsx';
import { CENAS } from './cenas.jsx';
import './fonts.js';

export const ZxPeca = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    {linha.batidas.map((b, i) => {
      const Cena = CENAS[b.cena];
      if (!Cena) throw new Error(`contrato pede cena inexistente: ${b.cena}`);
      // A primeira batida não sobe sobre nada, então entra inteira.
      const conteudo = <Cena b={b} />;
      return (
        <Sequence key={b.n} from={b.from} durationInFrames={linha.total - b.from} name={`batida ${b.n}`}>
          {i === 0 ? conteudo : <Entrada>{conteudo}</Entrada>}
        </Sequence>
      );
    })}
    <Grao />
    <Chrome />
  </AbsoluteFill>
);
