// learning.js — Proponente de Aprendizado (RF-08.3..6, RB-06, RB-09, RB-10).
//
// Este módulo é a fronteira entre "o Fabiano falou uma coisa" e "o sistema
// passou a acreditar nela". Três travas explícitas:
//
//  1. RB-06 — feedback não é aprendizado canônico. Toda proposta nasce
//     NÃO CANÔNICA, na Inbox da Memory. O sistema nunca promove sozinho.
//  2. RF-08.3 — a proposta exige escopo, evidência, regra e condição de
//     invalidação. Aprendizado sem condição de morte vira dogma.
//  3. RB-10 — nada de segredo, token ou output descartável vai para a Memory.
//     A varredura roda antes de escrever, e recusa.
//
// "Autoaprendizado" aqui significa propor e versionar conhecimento aprovado —
// nunca modificar o próprio sistema sem controle (§2).
import fs from 'node:fs';
import path from 'node:path';
import { isoNow, today, writeJson, readJson, exists, ensureDir, slug, assertSafeId } from './util.js';
import { commitDecision } from './gitio.js';
import { CLASSIFICATIONS } from './feedback.js';
import { syncMemory } from './memory.js';

export const PROPOSAL_STATUS = {
  DRAFT: 'rascunho',
  IN_INBOX: 'proposta na inbox',
  PROMOTED: 'promovida',
  REFUSED: 'recusada',
};

/** Agente sob o qual as propostas são escritas (§10.1). */
export const AGENT_DIR = 'claude-code';

/**
 * Padrões de segredo (RB-10, §13.1). Deliberadamente amplos: falso positivo
 * custa uma edição, falso negativo custa um segredo versionado para sempre.
 */
const SECRET_PATTERNS = [
  { re: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/i, why: 'chave de API' },
  { re: /\bgh[pousr]_[A-Za-z0-9]{16,}/, why: 'token do GitHub' },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/, why: 'token do Slack' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, why: 'chave privada' },
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./, why: 'JWT' },
  { re: /\b(?:senha|password|passwd|secret|api[_-]?key|token)\s*[:=]\s*\S{6,}/i, why: 'credencial atribuída' },
  { re: /\bMOS_WEBHOOK_KEY\s*[:=]\s*\S+/i, why: 'segredo do publicador' },
  { re: /\bZIONAXS_MAKE_WEBHOOK_API_KEY\s*[:=]\s*\S+/i, why: 'segredo do publicador' },
];

/** Varre um texto por segredo. Devolve lista de achados (vazia = limpo). */
export function scanForSecrets(text) {
  const s = String(text ?? '');
  const found = [];
  for (const p of SECRET_PATTERNS) {
    const m = s.match(p.re);
    if (m) found.push({ why: p.why, sample: m[0].slice(0, 12) + '…' });
  }
  return found;
}

const REQUIRED = ['titulo', 'observacao', 'interpretacao', 'regraProposta', 'escopo', 'evidencia', 'condicaoRevisao', 'destinoSugerido'];

/**
 * Monta a proposta a partir de uma devolutiva.
 * Não inventa a regra: pré-preenche o que deriva do feedback e deixa
 * explicitamente nulo o que exige julgamento humano.
 */
export function draftFromFeedback({ campaignId, brand, feedback, brief = null }) {
  const strongest = (feedback.classificacoes || [])
    .map((c) => ({ c, f: CLASSIFICATIONS[c]?.forcaEvidencia ?? 0 }))
    .sort((a, b) => b.f - a.f)[0];
  return {
    id: null,
    campanha: campaignId,
    marca: brand,
    feedbackId: feedback.id,
    titulo: null,
    observacao: feedback.observacao,
    interpretacao: feedback.causa || null,
    regraProposta: null,
    escopo: {
      marca: brand,
      publico: brief?.publico || null,
      formato: null,
      situacao: null,
    },
    evidencia: {
      classificacoes: feedback.classificacoes,
      forcaMaxima: strongest?.f ?? 0,
      // RB-07: a força da evidência é herdada da classificação, não escolhida.
      origem: `devolutiva ${feedback.id} na campanha ${campaignId}`,
      leituras: [],
    },
    condicaoRevisao: null,
    destinoSugerido: null,
    estado: PROPOSAL_STATUS.DRAFT,
    criadaEm: isoNow(),
    inboxPath: null,
    promocao: null,
  };
}

/** Valida a proposta antes de escrever. Nenhum erro é aviso. */
export function validateProposal(p) {
  const errors = [];
  const err = (where, msg) => errors.push({ where, msg });
  if (!p || typeof p !== 'object') return { ok: false, errors: [{ where: 'proposta', msg: 'proposta ausente' }] };

  for (const f of REQUIRED) {
    const v = f === 'escopo' || f === 'evidencia' ? p[f] : p[f];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      err(f, `campo obrigatório ausente: ${f}`);
    }
  }
  if (p.escopo && !p.escopo.marca) err('escopo.marca', 'escopo exige marca — aprendizado sem escopo se aplica onde não deveria (RF-08.6)');

  // RB-06/RB-07: preferência isolada não sustenta regra geral. Ela pode virar
  // aprendizado, mas o escopo tem de ser estreito e declarado.
  const kinds = p.evidencia?.classificacoes || [];
  const onlyPreference = kinds.length > 0 && kinds.every((k) => k === 'preferencia' || k === 'hipotese');
  if (onlyPreference && p.escopo && !p.escopo.situacao) {
    err('escopo.situacao', 'aprendizado baseado só em preferência/hipótese exige situação declarada — sem isso vira regra geral sem evidência (RB-06)');
  }

  const blob = JSON.stringify(p);
  const secrets = scanForSecrets(blob);
  for (const s of secrets) err('segredo', `possível ${s.why} no conteúdo (${s.sample}) — nada de credencial vai para a Memory (RB-10)`);

  return { ok: errors.length === 0, errors };
}

/** Markdown no formato do template da Inbox da Memory. */
export function renderProposalMarkdown(p) {
  const kinds = (p.evidencia?.classificacoes || []).map((c) => CLASSIFICATIONS[c]?.label || c).join(', ');
  const esc = (v) => (v === null || v === undefined || v === '' ? '_não declarado_' : String(v));
  const scope = p.escopo || {};
  return `# ${p.titulo}

## Agente

Marketing OS (agente externo, via console) — proposta gerada a partir de devolutiva humana registrada na campanha.

## Data

${today()}

## Tipo

Aprendizado de campanha. Classificação da devolutiva de origem: ${kinds || '_não declarada_'}.

**Esta proposta é não canônica.** Conforme a governança da Inbox, ela aguarda revisão humana e não deve ser citada como fonte de verdade enquanto estiver aqui.

## Destino sugerido

${esc(p.destinoSugerido)}

## Contexto

Campanha: \`${esc(p.campanha)}\` · Marca: ${esc(p.marca)} · Devolutiva de origem: \`${esc(p.feedbackId)}\`.

${esc(p.observacao)}

## Proposta

**Regra proposta:** ${esc(p.regraProposta)}

**Interpretação / causa:** ${esc(p.interpretacao)}

**Escopo de aplicabilidade** — a regra vale somente dentro deste recorte:

| Dimensão | Valor |
|---|---|
| Marca | ${esc(scope.marca)} |
| Público | ${esc(scope.publico)} |
| Formato | ${esc(scope.formato)} |
| Situação | ${esc(scope.situacao)} |

**Condição de revisão ou invalidação:** ${esc(p.condicaoRevisao)}

## Evidências / origem

- Origem: ${esc(p.evidencia?.origem)}
- Classificação da devolutiva: ${kinds || '_não declarada_'}
${(p.evidencia?.leituras || []).map((l) => `- Leitura: ${l.metric} = ${l.value} (${l.label || 'sem rótulo'}), fonte ${l.source}`).join('\n')}

## Relação com memória existente

${esc(p.relacao || 'A definir na revisão humana. Se esta proposta contradisser nota canônica vigente, a contradição deve ser explicitada aqui e não resolvida pelo sistema.')}

## Confiança

${esc(p.confianca || confidenceFrom(p))}
`;
}

/** Texto de confiança derivado da força da evidência — não do entusiasmo. */
function confidenceFrom(p) {
  const f = p.evidencia?.forcaMaxima ?? 0;
  if (f >= 4) return 'Média-alta: há resultado mensurado na origem. A generalização além do escopo declarado continua não suportada.';
  if (f >= 3) return 'Média: origem é falha de execução observável, reproduzível no artefato. Não estabelece relação causal com resultado.';
  return 'Baixa: origem é preferência ou hipótese, sem medição. Serve como convenção dentro do escopo declarado, não como achado.';
}

function proposalsDir(ws, campaignId) {
  assertSafeId(campaignId, 'id de campanha');
  return path.join(ws.campaignDir(campaignId), 'learnings');
}

/**
 * Caminho de uma proposta. O id chega por POST, então é validado antes de
 * virar caminho: sem isso, `../campaign` alcançava e corrompia o arquivo da
 * campanha.
 */
function proposalFile(ws, campaignId, proposalId) {
  assertSafeId(proposalId, 'id de proposta');
  return path.join(proposalsDir(ws, campaignId), `${proposalId}.json`);
}

/**
 * Grava a proposta localmente na campanha (sempre) e, quando a Memory estiver
 * disponível, entrega o Markdown na Inbox.
 *
 * A separação é deliberada (§12): Memory indisponível não pode impedir o
 * registro da devolutiva e da proposta — mas também não pode ser silenciada.
 */
export function proposeLearning(ws, campaignId, proposal) {
  const v = validateProposal(proposal);
  if (!v.ok) {
    const e = new Error(`proposta inválida: ${v.errors.map((x) => `[${x.where}] ${x.msg}`).join('; ')}`);
    e.code = 'LEARNING_INVALID';
    e.errors = v.errors;
    throw e;
  }

  const id = `${today()}-${slug(proposal.titulo).slice(0, 60) || 'aprendizado'}`;
  const dir = ensureDir(proposalsDir(ws, campaignId));
  let localFile = path.join(dir, `${id}.json`);
  let n = 2;
  while (exists(localFile)) { localFile = path.join(dir, `${id}-${String(n).padStart(2, '0')}.json`); n++; }
  const finalId = path.basename(localFile, '.json');

  // Protocolo seguro antes de escrever na Inbox (§10.1). Memory não
  // verificada — suja, atrasada, sem upstream, remoto fora — não recebe
  // proposta: escrever ali seria tratar uma cópia não confirmada como se
  // fosse a canônica. O rascunho local é gravado de todo jeito.
  const mem = syncMemory(ws.memoryRoot);
  const record = { ...proposal, id: finalId, estado: PROPOSAL_STATUS.DRAFT };
  const written = [localFile];
  let inbox = null;

  if (mem.available && mem.verified) {
    const inboxDir = path.join(ws.memoryRoot, 'Inbox', 'Agents', AGENT_DIR);
    if (!fs.existsSync(inboxDir)) {
      record.entregaBloqueada = `área do agente não existe na Memory: Inbox/Agents/${AGENT_DIR}`;
    } else {
      let mdFile = path.join(inboxDir, `${finalId}.md`);
      let k = 2;
      while (fs.existsSync(mdFile)) { mdFile = path.join(inboxDir, `${finalId}-${String(k).padStart(2, '0')}.md`); k++; }
      fs.writeFileSync(mdFile, renderProposalMarkdown(record));
      inbox = mdFile;
      record.inboxPath = path.relative(ws.memoryRoot, mdFile).split(path.sep).join('/');
      record.estado = PROPOSAL_STATUS.IN_INBOX;
      // A Memory tem protocolo próprio de commit; aqui apenas registramos o
      // arquivo. Commitar no repositório da Memory é ação do operador, que
      // segue a política daquele repositório (§10.1).
      record.entregaObservacao = 'arquivo escrito na Inbox; commit e push seguem o protocolo da Memory';
    }
  } else if (!mem.available) {
    record.entregaBloqueada = `Memory indisponível — ${mem.why}`;
  } else {
    record.entregaBloqueada = `Memory ${mem.state} — ${mem.why}. A proposta ficou como rascunho local; entregue na Inbox depois de sincronizar.`;
  }

  writeJson(localFile, record);
  const git = commitDecision(ws.root, written,
    `campanha: proposta de aprendizado em ${campaignId} — ${proposal.titulo}`);
  return { file: localFile, inbox, proposal: record, git, memory: mem };
}

export function listProposals(ws, campaignId) {
  const dir = proposalsDir(ws, campaignId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const p = readJson(path.join(dir, f));
    p._file = path.join(dir, f);
    return p;
  });
}

/**
 * Registra o desfecho humano da proposta (RF-08.5).
 * O sistema NÃO promove: ele apenas grava que um humano promoveu ou recusou,
 * e para onde. Promover significa editar a Memory, que é ação do operador.
 */
export function recordPromotion(ws, campaignId, proposalId, { decision, destino = null, por = 'humano', motivo = null }) {
  if (![PROPOSAL_STATUS.PROMOTED, PROPOSAL_STATUS.REFUSED].includes(decision)) {
    const e = new Error(`decisão inválida: ${decision} (use "${PROPOSAL_STATUS.PROMOTED}" ou "${PROPOSAL_STATUS.REFUSED}")`);
    e.code = 'PROMOTION_DECISION';
    throw e;
  }
  const file = proposalFile(ws, campaignId, proposalId);
  if (!exists(file)) throw new Error(`proposta não encontrada: ${proposalId}`);
  const cur = readJson(file);
  if (decision === PROPOSAL_STATUS.PROMOTED && !destino) {
    const e = new Error('promoção exige o destino canônico onde o conhecimento foi integrado (RB-09)');
    e.code = 'PROMOTION_DESTINATION';
    throw e;
  }
  const next = {
    ...cur,
    estado: decision,
    promocao: { decision, destino, por, motivo, em: isoNow() },
  };
  delete next._file;
  writeJson(file, next);
  const git = commitDecision(ws.root, [file],
    `campanha: aprendizado ${decision} em ${campaignId} — ${cur.titulo}`);
  return { file, proposal: next, git };
}

/**
 * RF-08.6: um aprendizado só é elegível ao contexto de outra campanha quando
 * o escopo for compatível. Campo nulo no escopo significa "não restringe";
 * campo preenchido precisa bater.
 */
export function isApplicable(proposal, context) {
  if (!proposal || proposal.estado !== PROPOSAL_STATUS.PROMOTED) return false;
  const s = proposal.escopo || {};
  for (const dim of ['marca', 'publico', 'formato', 'situacao']) {
    if (s[dim] && context?.[dim] && String(s[dim]) !== String(context[dim])) return false;
    if (s[dim] && !context?.[dim]) return false;
  }
  return true;
}
