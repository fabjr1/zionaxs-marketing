// ZxTeste.jsx — prova de que o pôster editorial da Zionaxs sobrevive em movimento.
// Três batidas, uma por campo, exatamente como no carrossel: foto escura para a
// tensão, laranja chapado para a virada, papel claro para o passo. O chrome de
// prova de impressão fica por cima das três, para a peça ler como um objeto só.
import {
  AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig,
  interpolate, spring,
} from 'remotion';
import tokens from './brand-tokens.json';
import './fonts.js';

const C = tokens.colors;
const MX = 80;
const MY = 120;

// Cada batida dura 4 segundos; a troca de campo leva 14 frames.
const BEAT = 120;
const WIPE = 14;

/** Entrada padrão de bloco de texto: sobe 26px e abre a opacidade. */
function rise(frame, fps, delay) {
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 22 });
  return {
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px)`,
  };
}

/** O final vazado: assinatura tipográfica da marca. */
const RingO = () => (
  <span
    style={{
      display: 'inline-block',
      width: '.7em',
      height: '.7em',
      border: '.088em solid currentColor',
      borderRadius: '50%',
      verticalAlign: 'baseline',
      marginLeft: '.02em',
    }}
  />
);

/** Grão de filme estático, igual ao do pôster: prova de impressão, não ruído animado. */
const Grain = () => (
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

/** Régua de calibração da marca, na ordem canônica. */
const Regua = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    {[C.ink, C.accent, C.posterGlow, C.posterTeal, C.posterCream].map((cor) => (
      <div key={cor} style={{ width: 44, height: 20, background: cor }} />
    ))}
  </div>
);

const mono = (size, tracking) => ({
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 500,
  fontSize: size,
  letterSpacing: tracking,
  textTransform: 'uppercase',
});

/** Campo visível no frame, considerando que a troca vale a partir da metade da subida. */
function campoNoFrame(frame) {
  if (frame >= BEAT * 2 + WIPE / 2) return 'papel';
  if (frame >= BEAT + WIPE / 2) return 'laranja';
  return 'foto';
}

/** Chrome fixo. A cor vira quando o campo novo cobre metade da tela.
 *  Regra do brand pack: wordmark preta só sobre papel; sobre foto e sobre
 *  laranja ela é branca. Texto pequeno sobre laranja é tinta (4.9:1). */
const Chrome = () => {
  const frame = useCurrentFrame();
  const campo = campoNoFrame(frame);
  const tinta = campo === 'foto' ? C.posterCream : C.ink;
  const logo = campo === 'papel' ? 'logo/zionaxs-black.png' : 'logo/zionaxs-white.png';

  return (
    <AbsoluteFill style={{ padding: `${MY}px ${MX}px`, color: tinta, justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Img src={staticFile(logo)} style={{ height: 40, width: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={mono(20, '.22em')}>2026</span>
          <div
            style={{
              width: 84, height: 84, border: `3px solid ${tinta}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...mono(19, '.14em'),
            }}
          >
            TESTE
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Regua />
        <div style={{ borderTop: `1px solid ${tinta}`, opacity: 0.55 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', ...mono(18, '.12em') }}>
          <span>@zionaxs_ · teste de motion · foto: Rafael Garcin</span>
          <span>ZIONAXS · CONCEITO</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Campo 1: foto escura, com o gradê quente/frio e o scrim da manchete. */
const CampoFoto = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const escala = interpolate(frame, [0, BEAT + WIPE], [1.06, 1.16], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Img
          src={staticFile('foto/por-do-sol.jpg')}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${escala})`, filter: 'saturate(.72) brightness(.82)' }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          mixBlendMode: 'soft-light',
          background:
            'linear-gradient(180deg, rgba(255,122,26,.30), rgba(255,122,26,.08) 24%, rgba(39,69,78,.34) 52%, rgba(39,69,78,.10) 66%, transparent 74%)',
        }}
      />
      <AbsoluteFill
        style={{ background: 'linear-gradient(180deg, transparent 34%, rgba(20,23,27,.80) 72%, #14171B 100%)' }}
      />

      <AbsoluteFill style={{ padding: `${MY + 150}px ${MX}px ${MY + 190}px`, justifyContent: 'flex-end', color: C.posterCream }}>
        <div style={{ ...mono(22, '.24em'), ...rise(frame, fps, 6) }}>ROTINA</div>
        <h1
          style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 104,
            lineHeight: 0.98, letterSpacing: '-.02em', textTransform: 'uppercase',
            margin: '26px 0 0', ...rise(frame, fps, 12),
          }}
        >
          Tudo aberto,
          <br />
          Nada pront
          <RingO />
        </h1>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Campo 2: laranja chapado. Texto grande em papel, texto pequeno em tinta. */
const CampoLaranja = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: C.accent, padding: `${MY + 150}px ${MX}px ${MY + 190}px`, justifyContent: 'flex-end' }}>
      <div style={{ ...mono(22, '.24em'), color: C.ink, ...rise(frame, fps, 8) }}>A CONTA</div>
      <h2
        style={{
          fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 86,
          lineHeight: 1.0, letterSpacing: '-.02em', textTransform: 'uppercase',
          color: C.paper, margin: '28px 0 0', ...rise(frame, fps, 14),
        }}
      >
        12 abertas entregam menos que 3 fechadas
      </h2>
      <p
        style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 400, fontSize: 34, lineHeight: 1.38,
          color: C.ink, margin: '40px 0 0', maxWidth: 820, ...rise(frame, fps, 22),
        }}
      >
        Cada troca de frente cobra o tempo de voltar ao contexto. Com 12 tarefas abertas o dia
        inteiro vai em retomada, e o que chega ao fim do dia são 3.
      </p>
    </AbsoluteFill>
  );
};

/** Campo 3: papel claro, com o passo. */
const CampoPapel = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: C.paper, padding: `${MY + 150}px ${MX}px ${MY + 190}px`, justifyContent: 'flex-end' }}>
      <div style={{ ...mono(22, '.24em'), color: C.accentInk, ...rise(frame, fps, 8) }}>O PASSO</div>
      <h2
        style={{
          fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 92,
          lineHeight: 1.0, letterSpacing: '-.02em', textTransform: 'uppercase',
          color: C.ink, margin: '28px 0 0', ...rise(frame, fps, 14),
        }}
      >
        Termine 1 antes de abrir a próxima
      </h2>
      <p
        style={{
          fontFamily: 'Archivo, sans-serif', fontWeight: 400, fontSize: 34, lineHeight: 1.38,
          color: C.muted, margin: '40px 0 0', maxWidth: 820, ...rise(frame, fps, 22),
        }}
      >
        Abra a lista agora, escolha 1 tarefa já começada e feche ela antes de puxar qualquer outra.
      </p>
    </AbsoluteFill>
  );
};

/** Sobe o campo novo cobrindo o anterior: a troca marca a batida narrativa. */
const Entrada = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 }, durationInFrames: WIPE });
  const coberto = interpolate(s, [0, 1], [0, 100]);

  return <AbsoluteFill style={{ clipPath: `inset(${100 - coberto}% 0 0 0)` }}>{children}</AbsoluteFill>;
};

export const ZxTeste = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <CampoFoto />

    <Sequence from={BEAT}>
      <Entrada>
        <CampoLaranja />
      </Entrada>
    </Sequence>

    <Sequence from={BEAT * 2}>
      <Entrada>
        <CampoPapel />
      </Entrada>
    </Sequence>

    <Grain />
    <Chrome />
  </AbsoluteFill>
);
