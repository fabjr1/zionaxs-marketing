// contract.js — carga e validação do Piece Contract (G-07).
// O contrato é a fonte de verdade da peça (P2): tudo que vira pixel nasce
// daqui, e a validação recusa compilar um contrato que violaria os gates.
import fs from 'node:fs';
import { normText } from './util.js';
import { scanPiece } from './copy-rules.js';

const REQUIRED_TOP = [
  'id', 'brand', 'campaign', 'format', 'tese', 'categoria_editorial',
  'cta', 'comprimento_justificado', 'research_brief', 'slides',
  'caption', 'caption_sources',
];

const REQUIRED_BRIEF = ['publico', 'decisao', 'tensao', 'evidencia', 'classificacao', 'limites'];

const EVIDENCE_STATUS = new Set(['E', 'I', 'H', 'NC']);

/**
 * Chaves de CONTROLE nos slots de copy: dirigem layout, nunca viram texto
 * nos pixels. Ficam fora da checagem de copy aprovada.
 */
const CONTROL_KEYS = new Set(['state', 'big', 'dark', 'src', 'hl', 'ghost']);

/** Coleta recursivamente as strings de COPY de um valor (slots). */
export function collectStrings(v, out = []) {
  if (typeof v === 'string') { if (v.trim()) out.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (CONTROL_KEYS.has(k)) continue;
      collectStrings(x, out);
    }
  }
  return out;
}

export function loadContract(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Valida o contrato contra o brand pack e o template do formato.
 * Retorna { ok, errors: [{where, msg}] }. Nenhum erro é warning:
 * contrato inválido não compila.
 */
export function validateContract(contract, brand, template) {
  const errors = [];
  const err = (where, msg) => errors.push({ where, msg });

  for (const f of REQUIRED_TOP) {
    if (contract[f] === undefined || contract[f] === null ||
        (typeof contract[f] === 'string' && !contract[f].trim())) {
      err('contract', `campo obrigatório ausente: ${f}`);
    }
  }
  if (errors.length) return { ok: false, errors };

  if (!brand.formats[contract.format]) {
    err('contract', `formato desconhecido no brand pack: ${contract.format}`);
  }
  if (template && template.formatKey !== contract.format) {
    err('contract', `template ${template.formatKey} não atende o formato ${contract.format}`);
  }

  const brief = contract.research_brief;
  for (const f of REQUIRED_BRIEF) {
    if (brief[f] === undefined || brief[f] === null) err('research_brief', `campo ausente: ${f}`);
  }
  for (const [i, ev] of (brief.evidencia || []).entries()) {
    if (!ev.claim) err(`evidencia[${i}]`, 'sem claim');
    if (!EVIDENCE_STATUS.has(ev.status)) err(`evidencia[${i}]`, `status inválido: ${ev.status} (use E/I/H/NC)`);
    if (ev.status === 'E' && !ev.fonte) err(`evidencia[${i}]`, 'afirmação E sem fonte — proibido');
  }

  if (!Array.isArray(contract.caption) || !contract.caption.length) {
    err('caption', 'legenda vazia');
  }

  const slides = contract.slides || [];
  if (!slides.length) { err('slides', 'peça sem unidades'); return { ok: false, errors }; }
  const total = slides.length;
  const pad = (n) => String(n).padStart(2, '0');

  const internal = (contract.internal_metadata || []).filter((m) => m.length >= 2);
  // com logo instalada (SVG inline ou arquivo) o rodapé é imagem, não texto
  const hasLogo = !!(brand.logoSvg || (brand.logo && (brand.logo.light || brand.logo.dark)));
  const allow = new Map(); // slideN -> Set(termos)
  for (const a of contract.allowlist_editorial || []) {
    if (!a.termo || !a.slide || !a.justificativa) {
      err('allowlist', 'entrada de allowlist exige termo, slide e justificativa');
      continue;
    }
    if (!allow.has(a.slide)) allow.set(a.slide, new Set());
    allow.get(a.slide).add(a.termo.toLowerCase());
  }

  slides.forEach((s, idx) => {
    const where = `slide ${idx + 1}`;
    if (s.n !== idx + 1) err(where, `numeração fora de ordem: n=${s.n}`);
    if (!s.papel_interno) err(where, 'sem papel_interno');
    if (!s.layout) err(where, 'sem layout');
    else if (template && !template.layouts[s.layout]) {
      err(where, `layout desconhecido no template ${template.formatKey}: ${s.layout}`);
    }
    if (!s.kicker || !String(s.kicker).trim()) err(where, 'sem kicker');
    if (!Array.isArray(s.approved_visible_copy) || !s.approved_visible_copy.length) {
      err(where, 'approved_visible_copy vazio');
    }
    if (!s.alt || s.alt.length < 40) err(where, 'alt text ausente ou curto demais (G12)');
    else if (!s.alt.startsWith(`Slide ${s.n} de ${total}`)) {
      err(where, `alt deve abrir com "Slide ${s.n} de ${total}" (template de acessibilidade)`);
    }

    const approved = (s.approved_visible_copy || []).map(normText);
    const approvedSet = new Set(approved);

    // kicker e paginação precisam estar na copy aprovada — são pixels.
    if (s.kicker && !approvedSet.has(normText(s.kicker))) {
      err(where, `kicker "${s.kicker}" fora da approved_visible_copy`);
    }
    const pg = `${pad(s.n)}/${pad(total)}`;
    if (!approvedSet.has(pg)) err(where, `paginação "${pg}" fora da approved_visible_copy`);
    // com logo.svg oficial no brand pack o rodapé é imagem, não texto:
    // exigir a wordmark na copy tornaria G10 impossível (e vice-versa)
    if (!hasLogo && brand.wordmark && !approvedSet.has(normText(brand.wordmark))) {
      err(where, `wordmark "${brand.wordmark}" fora da approved_visible_copy`);
    }
    if (hasLogo && approvedSet.has(normText(brand.wordmark || ''))) {
      err(where, 'com logo oficial instalada a wordmark não é renderizada — remova-a da approved_visible_copy');
    }

    // todo slot de copy precisa estar aprovado (senão G9 reprova no pixel;
    // aqui reprova antes de gastar render).
    const slotStrings = collectStrings(s.copy || {}).map(normText);
    for (const t of slotStrings) {
      if (!approvedSet.has(t)) err(where, `copy de slot não aprovada: "${t.slice(0, 60)}"`);
    }

    // rótulo estrutural interno não pode aparecer na copy aprovada (G11 antecipado).
    const allowed = allow.get(s.n) || new Set();
    for (const term of internal) {
      const re = new RegExp(`(^|[^\\p{L}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu');
      for (const a of approved) {
        if (re.test(a) && !allowed.has(term.toLowerCase())) {
          err(where, `rótulo interno "${term}" na copy aprovada sem allowlist`);
        }
      }
    }

    // aprovado mas não renderizável (não é slot nem chrome) → G10 reprovaria.
    const chrome = new Set([normText(s.kicker || ''), pg]);
    if (!hasLogo) chrome.add(normText(brand.wordmark || ''));
    const slotSet = new Set(slotStrings);
    for (const a of approved) {
      if (!slotSet.has(a) && !chrome.has(a)) {
        err(where, `copy aprovada sem lugar no layout (G10 falharia): "${a.slice(0, 60)}"`);
      }
    }
  });

  // padrão de copy antecipado (G13): reprovar aqui evita gastar um render
  // inteiro para descobrir um travessão que o contrato já carregava.
  for (const v of scanPiece(contract)) {
    err(v.onde, `padrão de copy: ${v.regra} em "${v.trecho}". ${v.correcao}`);
  }

  return { ok: errors.length === 0, errors };
}
