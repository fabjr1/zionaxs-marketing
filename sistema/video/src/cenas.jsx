// cenas.jsx — uma cena por batida. A regra que governa todas: o movimento
// pertence ao que a frase diz, nunca é enfeite. As etiquetas chegam voando
// porque o pedido chega voando; elas colapsam em uma só porque a decisão é
// colapsar em uma só; o contador sobe porque o custo sobe. Movimento que não
// carrega significado é ruído em velocidade de feed.
//
// Segunda regra, tirada da pesquisa de motion para social: UM movimento
// dominante por batida. Dois lêem como bagunça.
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { C, MX, MY, mono, display, corpo, firme, peso, Revela, Palco } from './ui.jsx';

/* ---------------------------------------------------------------- batida 1 */
/* Gancho: a foto encena a cena da frase, uma parede tomada de recados. */
export const PosterCover = ({ b }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [de, para] = b.foto.escala;
  const escala = interpolate(frame, [0, b.duracao], [de, para], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <Img
          src={staticFile(b.foto.src)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: `scale(${escala})`,
            filter: 'grayscale(.82) brightness(.52) contrast(1.08)',
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          mixBlendMode: 'soft-light',
          background:
            'linear-gradient(180deg, rgba(255,122,26,.30), rgba(255,122,26,.08) 24%, rgba(39,69,78,.34) 52%, rgba(39,69,78,.10) 66%, transparent 74%)',
        }}
      />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(20,23,27,.35) 0%, rgba(20,23,27,.20) 30%, rgba(20,23,27,.88) 62%, #14171B 100%)' }} />

      <Palco estilo={{ justifyContent: 'flex-end', color: C.posterCream }}>
        <Revela frame={frame} fps={fps} delay={4}>
          <div style={mono(21, '.24em')}>{b.copy.kicker}</div>
        </Revela>
        <div style={{ marginTop: 22 }}>
          {b.copy.titulo.map((l, i) => (
            <Revela key={l} frame={frame} fps={fps} delay={10 + i * 6}>
              <div style={display(112)}>{l}</div>
            </Revela>
          ))}
        </div>
        <Revela frame={frame} fps={fps} delay={26} estilo={{ marginTop: 30 }}>
          <div style={{ ...corpo(33), color: C.posterCream, opacity: 0.88, maxWidth: 830 }}>{b.copy.sub}</div>
        </Revela>
      </Palco>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- batida 2 */
/* As 5 portas: cada etiqueta entra voando de uma borda e assenta torta.
   O amontoado é o argumento. */
// Aglomerado apertado de propósito: espalhado demais lê como grade organizada,
// que é o contrário do que a frase diz. Elas precisam se sobrepor um pouco.
const POSICOES = [
  { x: 10, y: 190, rot: -7, deX: -520, deY: 40 },
  { x: 415, y: 110, rot: 5, deX: 120, deY: -420 },
  { x: 105, y: 330, rot: 4, deX: -420, deY: 260 },
  { x: 425, y: 285, rot: -5, deX: 560, deY: 120 },
  { x: 235, y: 455, rot: 7, deX: -80, deY: 420 },
];

const Etiqueta = ({ texto, pos, s, tinta = C.posterCream, fundo = 'transparent' }) => (
  <div
    style={{
      position: 'absolute',
      left: pos.x, top: pos.y,
      transform: `translate(${(1 - s) * pos.deX}px, ${(1 - s) * pos.deY}px) rotate(${pos.rot * s}deg) scale(${0.86 + s * 0.14})`,
      opacity: Math.min(1, s * 2.6),
      border: `3px solid ${tinta}`,
      background: fundo,
      color: tinta,
      padding: '20px 32px',
      ...mono(36, '.12em'),
    }}
  >
    {texto}
  </div>
);

export const PortasChegando = ({ b }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Palco>
        <Revela frame={frame} fps={fps} delay={0}>
          <div style={{ ...display(66), color: C.posterCream, maxWidth: 900 }}>{b.copy.linha}</div>
        </Revela>
        <div style={{ position: 'relative', flex: 1, marginTop: 30 }}>
          {/* +110 desce o aglomerado para o meio do palco: encostado no topo
              ele deixava um vazio embaixo que lia como erro de diagramação. */}
          {b.copy.chips.map((chip, i) => (
            <Etiqueta key={chip} texto={chip} pos={{ ...POSICOES[i], y: POSICOES[i].y + 110 }} s={peso(frame, fps, 8 + i * 6, 24)} />
          ))}
        </div>
      </Palco>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- batida 3 */
/* As etiquetas somem uma a uma e sobra o retângulo vazio: a fila que não existe. */
export const FilaVazia = ({ b }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chips = ['WhatsApp', 'E-mail', 'Ligação', 'Corredor', 'Sistema'];
  const caixa = firme(frame, fps, 22, 22);

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Palco>
        <Revela frame={frame} fps={fps} delay={0}>
          <div style={{ ...display(62), color: C.posterCream, maxWidth: 900 }}>{b.copy.linha}</div>
        </Revela>
        <div style={{ position: 'relative', flex: 1, marginTop: 30 }}>
          {chips.map((chip, i) => {
            const saida = firme(frame, fps, 4 + i * 4, 12);
            return (
              <div key={chip} style={{ opacity: 1 - saida, transform: `translateY(${saida * -70}px)` }}>
                <Etiqueta texto={chip} pos={POSICOES[i]} s={1} />
              </div>
            );
          })}
          <div
            style={{
              position: 'absolute', left: 0, top: 150, width: 920, height: 420,
              border: `4px dashed ${C.posterCream}`,
              opacity: caixa * 0.85,
              transform: `scale(${0.96 + caixa * 0.04})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ ...mono(30, '.34em'), color: C.posterCream, opacity: 0.7 }}>{b.copy.rotulo}</span>
          </div>
        </div>
      </Palco>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- batida 4 */
/* A figura: o contador sobe porque o custo sobe, e aterrissa com a unidade. */
export const Contador = ({ b }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const alvo = Number(b.copy.figura);
  // A contagem precisa terminar cedo: o que vem depois dela é texto para ler,
  // e leitura é o que come o tempo da batida.
  const p = interpolate(frame, [4, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const n = Math.round(alvo * p);
  const unidade = firme(frame, fps, 28, 16);

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Palco estilo={{ justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 }}>
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: 300,
              lineHeight: 0.82, letterSpacing: '-.04em', color: C.accent,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {n}
          </div>
          <div
            style={{
              ...display(76), color: C.posterCream,
              opacity: unidade,
              transform: `translateY(${interpolate(unidade, [0, 1], [40, 0])}px)`,
            }}
          >
            {b.copy.unidade}
          </div>
        </div>

        <div style={{ marginTop: 34, height: 10, background: 'rgba(239,231,215,.18)' }}>
          <div style={{ height: '100%', width: `${p * 100}%`, background: C.accent }} />
        </div>

        <Revela frame={frame} fps={fps} delay={36} estilo={{ marginTop: 44 }}>
          <div style={{ ...corpo(35), color: C.posterCream, maxWidth: 880 }}>{b.copy.linha}</div>
        </Revela>
        <Revela frame={frame} fps={fps} delay={38} estilo={{ marginTop: 26 }}>
          <div style={{ ...mono(18, '.08em'), color: C.posterCream, opacity: 0.62, maxWidth: 880, lineHeight: 1.5 }}>
            {b.copy.fonte}
          </div>
        </Revela>
      </Palco>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- batida 5 */
/* O mecanismo: duas barras. A da pergunta é um risco; a da volta atravessa a
   tela. A diferença de comprimento é o argumento inteiro, sem número. */
const Barra = ({ rotulo, largura, cor, s, alturaBarra }) => (
  <div style={{ marginTop: 40 }}>
    <div style={{ ...mono(21, '.24em'), color: C.posterCream, opacity: 0.75, marginBottom: 14 }}>{rotulo}</div>
    <div style={{ height: alturaBarra, width: `${largura * s}px`, background: cor }} />
  </div>
);

export const CorteEVolta = ({ b }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Palco estilo={{ justifyContent: 'center' }}>
        <Revela frame={frame} fps={fps} delay={0}>
          <div style={{ ...display(68), color: C.posterCream, maxWidth: 900 }}>{b.copy.linha}</div>
        </Revela>
        <Barra rotulo={b.copy.rotuloA} largura={96} cor={C.posterCream} s={firme(frame, fps, 10, 12)} alturaBarra={26} />
        <Barra rotulo={b.copy.rotuloB} largura={920} cor={C.accent} s={firme(frame, fps, 18, 28)} alturaBarra={26} />
        <Revela frame={frame} fps={fps} delay={32} estilo={{ marginTop: 44 }}>
          <div style={{ ...corpo(32), color: C.posterCream, opacity: 0.85, maxWidth: 860 }}>{b.copy.sub}</div>
        </Revela>
      </Palco>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- batida 6 */
/* A virada: as mesmas 5 etiquetas voltam e colapsam em uma porta só.
   É a única batida em campo laranja, como manda o pôster: uma por peça. */
export const Colapso = ({ b }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chips = ['WhatsApp', 'E-mail', 'Ligação', 'Corredor', 'Sistema'];
  const junta = interpolate(frame, [4, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const porta = firme(frame, fps, 26, 18);
  const alvo = { x: 230, y: 250 };

  return (
    <AbsoluteFill style={{ background: C.accent }}>
      <Palco>
        <Revela frame={frame} fps={fps} delay={0}>
          <div style={{ ...mono(21, '.24em'), color: C.ink }}>{b.copy.kicker}</div>
        </Revela>
        {/* Altura fixa, e não flex: depois do colapso o miolo fica vazio, e com
            flex o apoio era empurrado para o rodapé, longe do título. */}
        <div style={{ position: 'relative', height: 470, marginTop: 24 }}>
          {chips.map((chip, i) => {
            const p = POSICOES[i];
            const x = p.x + (alvo.x - p.x) * junta;
            const y = p.y + (alvo.y - p.y) * junta;
            return (
              <div
                key={chip}
                style={{
                  position: 'absolute', left: x, top: y,
                  transform: `rotate(${p.rot * (1 - junta)}deg) scale(${1 - junta * 0.35})`,
                  opacity: 1 - junta,
                  border: `3px solid ${C.ink}`, color: C.ink, padding: '20px 32px', ...mono(36, '.12em'),
                }}
              >
                {chip}
              </div>
            );
          })}
          <div
            style={{
              position: 'absolute', left: 0, top: 170,
              opacity: porta,
              transform: `scale(${0.8 + porta * 0.2})`,
              transformOrigin: 'left center',
            }}
          >
            <div style={{ ...display(126), color: C.paper }}>{b.copy.titulo}</div>
          </div>
        </div>
        <Revela frame={frame} fps={fps} delay={36}>
          <div style={{ ...corpo(33, 500), color: C.ink, maxWidth: 850 }}>{b.copy.sub}</div>
        </Revela>
      </Palco>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- batida 7 */
/* A consequência: agora as coisas entram em ordem, numeradas, uma embaixo da
   outra. A própria organização da tela é a diferença em relação à batida 2. */
export const FilaAparece = ({ b }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Palco estilo={{ justifyContent: 'center' }}>
        <Revela frame={frame} fps={fps} delay={0}>
          <div style={{ ...display(72), color: C.posterCream, maxWidth: 900 }}>{b.copy.linha}</div>
        </Revela>
        <div style={{ marginTop: 46 }}>
          {b.copy.itens.map((item, i) => {
            const s = firme(frame, fps, 8 + i * 8, 18);
            return (
              <div
                key={item}
                style={{
                  display: 'flex', alignItems: 'center', gap: 30,
                  padding: '22px 0',
                  borderBottom: `1px solid rgba(239,231,215,${0.3 * s})`,
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-60, 0])}px)`,
                }}
              >
                <span style={{ ...mono(28, '.1em'), color: C.accent, width: 46 }}>{i + 1}</span>
                <span style={{ ...display(60), color: C.posterCream }}>{item}</span>
              </div>
            );
          })}
        </div>
        <Revela frame={frame} fps={fps} delay={34} estilo={{ marginTop: 40 }}>
          <div style={{ ...corpo(32), color: C.posterCream, opacity: 0.85, maxWidth: 860 }}>{b.copy.sub}</div>
        </Revela>
      </Palco>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- batida 8 */
/* O passo: campo de papel, instrução executável hoje. */
export const PosterClose = ({ b }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Palco estilo={{ justifyContent: 'center' }}>
        <Revela frame={frame} fps={fps} delay={2}>
          <div style={{ ...mono(21, '.24em'), color: C.accentInk }}>{b.copy.kicker}</div>
        </Revela>
        <Revela frame={frame} fps={fps} delay={10} estilo={{ marginTop: 22 }}>
          <div style={{ ...display(124), color: C.ink }}>{b.copy.titulo}</div>
        </Revela>
        <Revela frame={frame} fps={fps} delay={22} estilo={{ marginTop: 36 }}>
          <div style={{ ...corpo(35), color: C.muted, maxWidth: 850 }}>{b.copy.sub}</div>
        </Revela>
        <div
          style={{
            marginTop: 52, height: 6, background: C.accent,
            width: `${firme(frame, fps, 34, 26) * 320}px`,
          }}
        />
      </Palco>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- batida 9 */
/* Assinatura. Sem texto e sem chrome: a marca sozinha.
   O movimento é o da própria linguagem da peça, que é prova de impressão. As
   marcas de registro convergem como quem alinha a chapa, a wordmark é revelada
   por máscara da esquerda para a direita, como tinta saindo da prensa, e o fio
   laranja assenta embaixo. Nada de brilho, giro ou salto: a marca vende
   critério de engenharia, e logo que dá cambalhota diz o contrário. */
const Registro = ({ cantoX, cantoY, s }) => {
  const braco = 58;
  const fora = 70 * (1 - s);
  return (
    <div
      style={{
        position: 'absolute',
        [cantoX < 0 ? 'left' : 'right']: -fora,
        [cantoY < 0 ? 'top' : 'bottom']: -fora,
        width: braco, height: braco,
        [cantoY < 0 ? 'borderTop' : 'borderBottom']: `3px solid ${C.posterCream}`,
        [cantoX < 0 ? 'borderLeft' : 'borderRight']: `3px solid ${C.posterCream}`,
        opacity: s * 0.7,
      }}
    />
  );
};

export const Assinatura = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const marcas = firme(frame, fps, 6, 26);
  // A revelação é a única coisa que precisa de curva própria: mola aqui daria
  // repique na borda da máscara, e tinta impressa não repica.
  const revela = interpolate(frame, [20, 52], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const fio = firme(frame, fps, 48, 24);
  const recolhe = firme(frame, fps, 74, 22);
  // Respiração lenta: 2% de escala ao longo da batida inteira. Sem isso o
  // último plano parece imagem congelada, e não fim de filme.
  const respira = interpolate(frame, [0, 120], [0.985, 1.005], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'relative', width: 840, height: 330,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${respira})`,
        }}
      >
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) => (
          <Registro key={`${x}${y}`} cantoX={x} cantoY={y} s={marcas * (1 - recolhe)} />
        ))}

        <div style={{ overflow: 'hidden', clipPath: `inset(0 ${(1 - revela) * 100}% 0 0)` }}>
          <Img src={staticFile('logo/zionaxs-white.png')} style={{ width: 560, height: 'auto', display: 'block' }} />
        </div>

        <div style={{ marginTop: 34, height: 4, width: `${fio * 300}px`, background: C.accent }} />
      </div>
    </AbsoluteFill>
  );
};

export const CENAS = {
  'poster-cover': PosterCover,
  'portas-chegando': PortasChegando,
  'fila-vazia': FilaVazia,
  contador: Contador,
  'corte-e-volta': CorteEVolta,
  colapso: Colapso,
  'fila-aparece': FilaAparece,
  'poster-close': PosterClose,
  assinatura: Assinatura,
};
