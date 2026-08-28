// memory.js — Resolvedor de Contexto e Pacote de Contexto (RF-01, §10.1).
//
// Três regras que governam este módulo:
//
//  1. Seletividade (RF-01.4): carrega SOMENTE as notas declaradas no manifesto
//     da marca. Nunca varre a árvore. Contexto irrelevante faz regra histórica
//     sobrepor regra atual — é o erro que o guia da Memory manda evitar.
//  2. Proveniência (RF-01.3): toda informação usada carrega origem, data de
//     consulta e versão. O pacote referencia fontes; não copia a Memory
//     inteira para dentro do artefato de campanha (§13.6).
//  3. Lacuna nunca vira inferência (RF-01.5, RB-02): referência ausente,
//     conflito entre canônicas ou Memory inacessível aparecem como lacuna
//     explícita. O sistema não preenche o buraco com plausibilidade.
//
// A Memory é conteúdo de terceiro: tudo que sai daqui é DADO A AVALIAR, nunca
// instrução executável (§13.7). Este módulo só lê texto e metadados.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { isoNow, today } from './util.js';
import { loadBrandManifest, validateBrandManifest, safeMemoryPath } from './brands.js';

/** Severidades de lacuna. `bloqueia` impede aprovação do Brief. */
export const GAP_SEVERITY = { BLOCKS: 'bloqueia', WARNS: 'atencao' };

/** Quantos dias tornam uma nota "possivelmente desatualizada" (sinal, não erro). */
export const STALE_DAYS = 180;

/**
 * Parser do frontmatter YAML das notas da Memory. Subconjunto deliberado:
 * escalares e listas simples, que é o que a política de metadados usa.
 * Não é parser YAML geral e não precisa ser.
 */
export function parseFrontmatter(text) {
  const s = String(text);
  if (!s.startsWith('---')) return { meta: {}, body: s };
  const end = s.indexOf('\n---', 3);
  if (end < 0) return { meta: {}, body: s };
  const raw = s.slice(3, end);
  const body = s.slice(end + 4).replace(/^\r?\n/, '');
  const meta = {};
  let listKey = null;
  for (const line of raw.split('\n')) {
    const t = line.replace(/\r$/, '');
    if (!t.trim()) continue;
    const item = t.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      meta[listKey].push(item[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    const kv = t.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2].trim();
    if (val === '') { listKey = key; meta[key] = []; continue; }
    listKey = null;
    meta[key] = val.replace(/^["']|["']$/g, '');
  }
  return { meta, body };
}

/** Primeiro título H1 da nota, quando existir. */
function titleOf(body, fallback) {
  const m = String(body).match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

/** Resumo referencial: as primeiras linhas de texto, para orientar sem copiar. */
function digestOf(body, maxChars = 320) {
  const clean = String(body)
    .replace(/^#.*$/gm, '')
    .replace(/^\s*[-*|>].*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .find((p) => p.length > 40);
  if (!clean) return null;
  return clean.length > maxChars ? clean.slice(0, maxChars - 1).trimEnd() + '…' : clean;
}

/**
 * Estado de sincronização da Memory (§10.1, §12).
 * Não sincroniza sozinho: só observa e reporta. Sincronizar é operação de
 * escrita no repositório de outro sistema e não pertence a este processo.
 */
export function memoryStatus(memoryRoot) {
  if (!memoryRoot) return { available: false, why: 'MOS_MEMORY_ROOT não definido', synced: false };
  if (!fs.existsSync(memoryRoot)) return { available: false, why: `raiz da Memory inexistente: ${memoryRoot}`, synced: false };
  const git = (args) => execFileSync('git', args, {
    cwd: memoryRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const out = { available: true, root: memoryRoot, synced: false };
  try {
    out.head = git(['rev-parse', '--short', 'HEAD']);
    out.branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    out.dirty = git(['status', '--porcelain']).length > 0;
    // ahead/behind contra o remoto JÁ CONHECIDO — sem fetch: buscar rede aqui
    // tornaria uma leitura de contexto uma operação de rede silenciosa.
    try {
      const counts = git(['rev-list', '--left-right', '--count', `${out.branch}@{upstream}...HEAD`]);
      const [behind, ahead] = counts.split(/\s+/).map(Number);
      out.behind = behind; out.ahead = ahead;
      out.synced = behind === 0 && ahead === 0;
      out.verifiedAgainstRemote = false; // sem fetch, é o remoto da última busca
    } catch {
      out.why = 'sem upstream configurado — não é possível confirmar sincronização';
    }
  } catch {
    out.why = 'raiz da Memory não é repositório git — proveniência limitada ao filesystem';
  }
  return out;
}

/** Versão auditável de uma nota: sha do último commit que a tocou, ou mtime. */
function noteVersion(memoryRoot, abs) {
  try {
    const rel = path.relative(memoryRoot, abs);
    const sha = execFileSync('git', ['log', '-1', '--pretty=%h', '--', rel], {
      cwd: memoryRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (sha) return { kind: 'git', value: sha };
  } catch { /* degrada para mtime */ }
  try {
    return { kind: 'mtime', value: new Date(fs.statSync(abs).mtimeMs).toISOString().slice(0, 10) };
  } catch {
    return { kind: 'none', value: null };
  }
}

function daysSince(dateStr) {
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.parse(today()) - t) / 86400000);
}

/**
 * Monta o Pacote de Contexto de uma campanha (§9.2).
 *
 * `roles` opcional restringe os papéis carregados ao que o pedido precisa —
 * a proporcionalidade exigida por RF-01.1 e pelo requisito não funcional de
 * escopo de contexto. Sem `roles`, carrega todos os papéis declarados.
 */
export function buildContextPackage(ws, { brandId, campaignId = null, roles = null }) {
  const manifest = loadBrandManifest(ws, brandId);
  const consultedAt = isoNow();
  const pkg = {
    brand: brandId,
    campaign: campaignId,
    consultedAt,
    memory: memoryStatus(ws.memoryRoot),
    sources: [],
    gaps: [],
    conflicts: [],
    limitations: [],
  };

  if (!manifest) {
    pkg.gaps.push({
      role: null, severity: GAP_SEVERITY.BLOCKS,
      what: `marca "${brandId}" não tem manifesto declarado`,
      ask: 'Declare o manifesto da marca antes de consultar contexto ou produzir.',
    });
    return pkg;
  }
  pkg.manifestFile = manifest._file;

  const v = validateBrandManifest(manifest, ws.memoryRoot);
  for (const e of v.errors) {
    pkg.gaps.push({
      role: null, severity: GAP_SEVERITY.BLOCKS,
      what: `manifesto inválido — [${e.where}] ${e.msg}`,
      ask: 'Corrija o manifesto da marca.',
    });
  }

  if (!pkg.memory.available) {
    // §12: cópia local não é definitiva sem sinalizar. Permite rascunho,
    // bloqueia o que depende de contexto confiável.
    pkg.gaps.push({
      role: null, severity: GAP_SEVERITY.BLOCKS,
      what: `Zionaxs Memory indisponível — ${pkg.memory.why}`,
      ask: 'Aponte MOS_MEMORY_ROOT para a cópia local da Memory.',
    });
    return pkg;
  }
  if (pkg.memory.dirty) {
    pkg.limitations.push('a cópia local da Memory tem alterações não commitadas — o contexto pode divergir da canônica');
  }
  if (!pkg.memory.synced) {
    pkg.limitations.push(pkg.memory.why
      || `cópia local ${pkg.memory.behind ?? '?'} atrás / ${pkg.memory.ahead ?? '?'} à frente do remoto conhecido; sincronização não verificada nesta leitura`);
  }

  const wanted = (manifest.referencias || [])
    .filter((r) => !roles || roles.includes(r.papel));

  // RB-08 / §12: dois canônicos para o mesmo papel é conflito preservado,
  // nunca resolvido escolhendo um.
  const byRole = new Map();
  for (const r of wanted) {
    const list = byRole.get(r.papel) || [];
    list.push(r);
    byRole.set(r.papel, list);
  }
  for (const [role, list] of byRole) {
    const canonical = list.filter((r) => (r.autoridade || 'canonica') === 'canonica');
    if (canonical.length > 1) {
      pkg.conflicts.push({
        role,
        what: `${canonical.length} referências canônicas para o papel "${role}"`,
        refs: canonical.map((r) => r.caminho),
        ask: 'Decida qual governa, ou reclassifique as demais como suporte. Conflito entre canônicas não é resolvido pelo sistema (RB-08).',
      });
    }
  }

  for (const ref of wanted) {
    const abs = ref.caminho ? safeMemoryPath(ws.memoryRoot, ref.caminho) : null;
    if (!abs || !fs.existsSync(abs)) {
      pkg.gaps.push({
        role: ref.papel,
        severity: ref.obrigatorio === false ? GAP_SEVERITY.WARNS : GAP_SEVERITY.BLOCKS,
        what: `referência declarada não encontrada na Memory: ${ref.caminho}`,
        ask: `Corrija o caminho no manifesto ou crie a nota que governa "${ref.papel}".`,
      });
      continue;
    }
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch (err) {
      pkg.gaps.push({
        role: ref.papel, severity: GAP_SEVERITY.BLOCKS,
        what: `referência ilegível: ${ref.caminho} (${err.code || 'erro de leitura'})`,
        ask: 'Verifique permissões do arquivo na Memory.',
      });
      continue;
    }
    const { meta, body } = parseFrontmatter(text);
    const version = noteVersion(ws.memoryRoot, abs);
    const stale = meta.atualizado_em ? daysSince(meta.atualizado_em) : null;

    const source = {
      role: ref.papel,
      path: ref.caminho,
      title: titleOf(body, path.basename(ref.caminho, '.md')),
      authority: meta.autoridade || ref.autoridade || null,
      status: meta.status || null,
      updatedAt: meta.atualizado_em || null,
      version,
      consultedAt,
      // RF-01.3 e §13.6: guardamos um resumo referencial, não a nota inteira.
      digest: digestOf(body),
      note: ref.nota || null,
    };
    pkg.sources.push(source);

    if (meta.status && meta.status !== 'ativo') {
      pkg.limitations.push(`"${source.title}" está com status "${meta.status}" — não é conhecimento vigente`);
    }
    if (stale !== null && stale > STALE_DAYS) {
      pkg.limitations.push(`"${source.title}" foi atualizada há ${stale} dias (${meta.atualizado_em}) — confirme antes de tratar como corrente`);
    }
  }

  return pkg;
}

/** Lacunas que impedem seguir adiante (RB-01/RB-02). */
export function blockingGaps(pkg) {
  if (!pkg) return [];
  return [
    ...(pkg.gaps || []).filter((g) => g.severity === GAP_SEVERITY.BLOCKS),
    ...(pkg.conflicts || []).map((c) => ({ role: c.role, severity: GAP_SEVERITY.BLOCKS, what: c.what, ask: c.ask })),
  ];
}

/** Contexto utilizável por uma skill: só referências, com proveniência. */
export function contextForSkill(pkg, roles) {
  if (!pkg) return { sources: [], limitations: [] };
  return {
    brand: pkg.brand,
    consultedAt: pkg.consultedAt,
    sources: (pkg.sources || []).filter((s) => !roles || roles.includes(s.role)),
    limitations: pkg.limitations || [],
  };
}
