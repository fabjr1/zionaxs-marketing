// ui.jsx — as peças fixas da linguagem visual da marca, e os primitivos de
// movimento. O chrome de prova de impressão é o mesmo do pôster: ele fica por
// cima de todas as batidas para o vídeo ler como um objeto só, e não como uma
// pilha de slides.
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import tokens from './brand-tokens.json';
import { contrato, linha } from './peca.js';

export const C = tokens.colors;
export const MX = 80;
export const MY = 110;

export const mono = (size, tracking = '.2em') => ({
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: size,
  letterSpacing: tracking,
  textTransform: 'uppercase',
});

export const display = (size) => ({
  fontFamily: 'Poppins, sans-serif',
  fontWeight: 700,
  fontSize: size,
  lineHeight: 0.98,
  letterSpacing: '-.02em',
  textTransform: 'uppercase',
});

export const corpo = (size, peso = 400) => ({
  fontFamily: 'Archivo, sans-serif',
  fontWeight: peso,
  fontSize: size,
  lineHeight: 1.36,
});

/** Mola sem repique: para texto, que não pode balançar. */
export function firme(frame, fps, delay = 0, dur = 20) {
  return spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: dur });
}

/** Mola com peso: para objeto que chega e assenta. */
export function peso(frame, fps, delay = 0, dur = 30) {
  return spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.9 }, durationInFrames: dur });
}

/**
 * Revelação por máscara: a linha sobe de dentro de um corte, como tipo saindo
 * da prensa. É o que separa isto de um fade, que é o movimento genérico de
 * apresentação de slides.
 */
export const Revela = ({ children, frame, fps, delay = 0, estilo = {} }) => {
  const s = firme(frame, fps, delay, 22);
  return (
    <div style={{ overflow: 'hidden', ...estilo }}>
      <div
        style={{
          transform: `translateY(${interpolate(s, [0, 1], [110, 0])}%)`,
          opacity: interpolate(s, [0, 0.25], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Grão de filme estático: prova de impressão, não ruído animado. */
export const Grao = () => (
  <svg
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.2, mixBlendMode: 'overlay', pointerEvents: 'none' }}
    aria-hidden
  >
    <filter id="grao">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#grao)" />
  </svg>
);

const Regua = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    {[C.ink, C.accent, C.posterGlow, C.posterTeal, C.posterCream].map((cor) => (
      <div key={cor} style={{ width: 40, height: 18, background: cor }} />
    ))}
  </div>
);

// A troca de cor do chrome vale a partir da metade da subida do campo novo.
const META_SUBIDA = 6;

/** Qual campo está visível neste quadro. */
export function campoNoFrame(frame) {
  let atual = linha.batidas[0].campo;
  for (const b of linha.batidas) if (frame >= b.from + META_SUBIDA) atual = b.campo;
  return atual;
}

/**
 * Régua de progresso: uma linha fina que atravessa a peça inteira e marca cada
 * batida. Dá ao espectador a informação de quanto falta, que é o que segura
 * quem já parou de rolar, e marca a estrutura sem nenhum texto.
 */
const Progresso = ({ tinta }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, linha.total], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'relative', height: 3, background: tinta, opacity: 0.28 }}>
      <div style={{ position: 'absolute', inset: 0, width: `${p * 100}%`, background: C.accent, opacity: 1 }} />
      {linha.batidas.slice(1).map((b) => (
        <div
          key={b.n}
          style={{
            position: 'absolute', top: -3, height: 9, width: 2,
            left: `${(b.from / linha.total) * 100}%`, background: tinta, opacity: 0.55,
          }}
        />
      ))}
    </div>
  );
};

/** Chrome fixo. Cor e variante da logo trocam com o campo, como no pôster. */
export const Chrome = () => {
  const frame = useCurrentFrame();
  const campo = campoNoFrame(frame);
  const tinta = campo === 'foto' || campo === 'tinta' ? C.posterCream : C.ink;
  const logo = campo === 'papel' ? 'logo/zionaxs-black.png' : 'logo/zionaxs-white.png';
  const ch = contrato.chrome;

  return (
    <AbsoluteFill style={{ padding: `${MY}px ${MX}px`, color: tinta, justifyContent: 'space-between', pointerEvents: 'none' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Img src={staticFile(logo)} style={{ height: 38, width: 'auto' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={mono(19, '.22em')}>{ch.ano}</span>
            <div
              style={{
                height: 74, padding: '0 16px', border: `3px solid ${tinta}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono(18, '.14em'),
              }}
            >
              {ch.selo}
            </div>
          </div>
        </div>
        <Progresso tinta={tinta} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Regua />
        <div style={{ borderTop: `1px solid ${tinta}`, opacity: 0.55 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', ...mono(17, '.1em') }}>
          <span>{ch.micro}</span>
          <span>{ch.temas}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Área útil de conteúdo: abaixo do chrome de cima, acima do rodapé. */
export const Palco = ({ children, estilo = {} }) => (
  <AbsoluteFill style={{ padding: `${MY + 190}px ${MX}px ${MY + 175}px`, ...estilo }}>{children}</AbsoluteFill>
);

/** Sobe o campo novo cobrindo o anterior. A troca marca a batida narrativa. */
export const Entrada = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = firme(frame, fps, 0, 12);
  return <AbsoluteFill style={{ clipPath: `inset(${100 - s * 100}% 0 0 0)` }}>{children}</AbsoluteFill>;
};
