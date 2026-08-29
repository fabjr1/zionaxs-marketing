// copy-rules.js — o padrão de copy da marca, em código (G-13).
// Regras editoriais que valem para TODO texto que o público lê: slides,
// legenda e alt text. Não é regra de layout nem de pixel; é de escrita.
// Aprovadas por decisão humana em 29/08/2026 e documentadas em
// campanhas/zionaxs/padrao-de-copy.md — o texto lá manda, isto aqui executa.
//
// O que NÃO entra aqui: regras que exigem julgamento ("explique, não afirme",
// "jargão vira cena universal"). Máquina não mede clareza. Só entram as que
// têm resposta binária, e elas são exatamente as que passam despercebidas na
// revisão humana justamente por serem pequenas.

/**
 * Cada regra: id estável, rótulo legível, `test` (RegExp com flag u) e `fix`
 * com a correção pedida. Acrescentar regra aqui já a coloca no gate e na
 * validação do contrato, sem tocar em mais nada.
 */
export const COPY_RULES = [
  {
    id: 'traco-longo',
    label: 'travessão ou traço (— –)',
    // Tem cara de texto de máquina; a marca escreve com pontuação comum.
    test: /[\u2014\u2013]/u,
    fix: 'use ponto, vírgula, dois-pontos ou ponto e vírgula',
  },
  {
    id: 'contracao-informal',
    label: 'contração informal (num, numa, nuns, numas)',
    // Fronteira por \p{L} e não \b: com \b o "num" de "numérica" casaria,
    // porque acento não é caractere de palavra em ASCII.
    test: /(^|[^\p{L}])(num|numa|nuns|numas)([^\p{L}]|$)/iu,
    fix: 'escreva "em um", "em uma"',
  },
];

/** Trecho ao redor da ocorrência, para o relatório apontar onde está. */
function excerpt(text, re, span = 26) {
  const m = text.match(re);
  if (!m) return text.slice(0, 60);
  const i = Math.max(0, m.index - span);
  return (i > 0 ? '…' : '') + text.slice(i, m.index + m[0].length + span).trim() + '…';
}

/**
 * Aplica as regras a um texto. Retorna [] quando limpo.
 * `onde` identifica a origem no relatório (ex.: "slide 2", "caption[3]").
 */
export function scanCopy(text, onde) {
  if (!text) return [];
  const s = String(text);
  return COPY_RULES.filter((r) => r.test.test(s))
    .map((r) => ({ onde, regra: r.label, correcao: r.fix, trecho: excerpt(s, r.test) }));
}

/** Strings de copy de um slot, ignorando chaves de controle de layout. */
function slotStrings(v, out = []) {
  const CONTROL = new Set(['state', 'big', 'dark', 'src', 'hl', 'ghost']);
  if (typeof v === 'string') { if (v.trim()) out.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => slotStrings(x, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) if (!CONTROL.has(k)) slotStrings(x, out);
  }
  return out;
}

/**
 * Varre tudo que o público lê em uma peça: os slots de copy do contrato, o
 * alt text e a legenda; e, quando há medição, também o texto renderizado.
 *
 * Os slots são varridos SEMPRE, inclusive na validação que roda antes do
 * render. Confiar só na approved_visible_copy esconderia o caso em que a
 * copy aprovada já foi corrigida e o slot que vira pixel ficou para trás.
 *
 * Campos internos do contrato (research_brief, tese) ficam de fora: não são
 * publicados, e prendê-los à regra só geraria ruído na revisão.
 */
export function scanPiece(contract, perSlide = []) {
  const out = [];
  const push = (v) => { if (!out.some((x) => x.onde === v.onde && x.regra === v.regra)) out.push(v); };
  contract.slides.forEach((s, i) => {
    for (const t of slotStrings(s.copy || {})) scanCopy(t, `slide ${s.n}`).forEach(push);
    scanCopy(perSlide[i]?.renderedText, `slide ${s.n}`).forEach(push);
    scanCopy(s.alt, `alt do slide ${s.n}`).forEach(push);
  });
  (contract.caption || []).forEach((p, i) => scanCopy(p, `caption[${i}]`).forEach(push));
  (contract.caption_sources || []).forEach((p, i) => scanCopy(p, `caption_sources[${i}]`).forEach(push));
  return out;
}

/**
 * Layouts da direção visual aprovada (estilo pôster editorial, 29/08/2026).
 * Os demais do template são vocabulário legado: continuam existindo porque
 * peças anteriores dependem deles, mas não produzem a aparência da marca.
 */
export const LAYOUTS_APROVADOS = new Set([
  'poster-cover', 'poster-scene', 'poster-lines', 'poster-turn',
  'poster-fields', 'poster-statement', 'poster-close',
]);

/**
 * Slides fora da direção visual aprovada. Retorna [] quando a peça está no
 * padrão ou quando declara `estilo_legado.justificativa` no contrato —
 * a saída consciente existe para não travar peça antiga, e obriga a dizer
 * por escrito por que aquela peça foge do padrão.
 */
export function scanEstilo(contract) {
  if (contract.estilo_legado?.justificativa) return [];
  return (contract.slides || [])
    .filter((s) => !LAYOUTS_APROVADOS.has(s.layout))
    .map((s) => ({
      onde: `slide ${s.n}`,
      layout: s.layout,
      correcao: 'use a família poster-* da direção visual aprovada, ou declare estilo_legado.justificativa',
    }));
}
