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
 * Estados possíveis da Memory. Só `SYNCED` é confiável para orientar um Brief
 * ou receber uma proposta; os demais permitem rascunho local e nada além.
 */
export const MEMORY_STATE = {
  UNAVAILABLE: 'indisponível',
  NOT_A_REPO: 'sem versionamento',
  NO_ORIGIN: 'sem remoto origin',
  NO_UPSTREAM: 'sem upstream',
  NON_CANONICAL: 'fora da canônica',
  DIRTY: 'suja',
  UNVERIFIED: 'não verificada',
  FETCH_FAILED: 'remoto inacessível',
  REBASE_CONFLICT: 'conflito ao integrar',
  BEHIND: 'atrasada',
  SYNCED: 'sincronizada',
};

/**
 * A canônica, conforme a política da Zionaxs Memory: branch `main` do remoto
 * `origin`. Não basta ter *um* upstream — tem que ser este.
 *
 * Sem esta amarração, uma cópia local em `main` rastreando `origin/rascunho`
 * era reportada como sincronizada, e contexto não canônico podia aprovar Brief
 * e virar proposta na Inbox.
 */
export const CANONICAL_REMOTE = 'origin';
export const CANONICAL_BRANCH = 'main';
export const CANONICAL_REF = `${CANONICAL_REMOTE}/${CANONICAL_BRANCH}`;

/**
 * Protocolo seguro da Zionaxs Memory (§10.1, §12), aplicado ANTES de leitura
 * relevante de contexto e ANTES de escrever proposta na Inbox:
 * verificar estado → buscar remoto → integrar sem apagar nada → só então usar.
 *
 * O que este código NÃO faz, por regra: nenhum `reset`, `checkout`, `clean` ou
 * `push --force`. As únicas escritas são `fetch` e, com a árvore limpa,
 * `pull --rebase` — e um `rebase --abort` se a integração falhar, para deixar
 * o repositório exatamente como estava.
 *
 * Árvore suja NÃO é integrada: rebase com alteração local pendente é onde se
 * perde trabalho. Nesse caso o estado é bloqueante e nada é tocado.
 *
 * `MOS_MEMORY_NO_FETCH=1` pula a busca. Isso não "libera" o fluxo: sem
 * comparar com o remoto não há verificação, e o estado fica `UNVERIFIED`,
 * que bloqueia igual.
 */
export function syncMemory(memoryRoot, { fetch: doFetch = process.env.MOS_MEMORY_NO_FETCH !== '1' } = {}) {
  const out = { available: false, verified: false, root: memoryRoot || null, state: MEMORY_STATE.UNAVAILABLE };

  if (!memoryRoot) { out.why = 'MOS_MEMORY_ROOT não definido'; return out; }
  if (!fs.existsSync(memoryRoot)) { out.why = `raiz da Memory inexistente: ${memoryRoot}`; return out; }
  out.available = true;

  const git = (args) => execFileSync('git', args, {
    cwd: memoryRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const tryGit = (args) => { try { return { ok: true, out: git(args) }; } catch (e) { return { ok: false, err: String(e.stderr || e.message).slice(0, 300) }; } };

  const inRepo = tryGit(['rev-parse', '--is-inside-work-tree']);
  if (!inRepo.ok || inRepo.out !== 'true') {
    out.state = MEMORY_STATE.NOT_A_REPO;
    out.why = 'a raiz da Memory não é repositório git — não há como verificar sincronização nem proveniência';
    return out;
  }
  out.head = tryGit(['rev-parse', '--short', 'HEAD']).out || null;
  out.branch = tryGit(['rev-parse', '--abbrev-ref', 'HEAD']).out || null;

  // ---- a cópia local precisa SER a canônica, não apenas ter um upstream ----
  if (out.branch !== CANONICAL_BRANCH) {
    out.state = MEMORY_STATE.NON_CANONICAL;
    out.why = out.branch === 'HEAD'
      ? 'a cópia local está em HEAD destacado — não há branch para confrontar com a canônica'
      : `a cópia local está na branch "${out.branch}", e a canônica é "${CANONICAL_BRANCH}"`;
    return out;
  }

  const origin = tryGit(['remote', 'get-url', CANONICAL_REMOTE]);
  if (!origin.ok) {
    out.state = MEMORY_STATE.NO_ORIGIN;
    out.why = `sem remoto "${CANONICAL_REMOTE}" — não há canônica para confrontar`;
    return out;
  }

  const upstream = tryGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  if (!upstream.ok) {
    out.state = MEMORY_STATE.NO_UPSTREAM;
    out.why = 'sem upstream configurado — a cópia local não pode ser confirmada contra a canônica';
    return out;
  }
  out.upstream = upstream.out;
  if (out.upstream !== CANONICAL_REF) {
    out.state = MEMORY_STATE.NON_CANONICAL;
    out.why = `a branch local acompanha "${out.upstream}", e a canônica é "${CANONICAL_REF}"`;
    return out;
  }

  out.dirty = (tryGit(['status', '--porcelain']).out || '').length > 0;
  if (out.dirty) {
    out.state = MEMORY_STATE.DIRTY;
    out.why = 'a cópia local tem alterações não commitadas — integrar agora arriscaria o trabalho pendente';
    return out;
  }

  if (!doFetch) {
    out.state = MEMORY_STATE.UNVERIFIED;
    out.why = 'busca do remoto desativada (MOS_MEMORY_NO_FETCH) — sem comparação, não há verificação';
    return out;
  }

  // Busca e compara SEMPRE contra a canônica nomeada, não contra o que o
  // upstream por acaso aponta — é o que torna a verificação inequívoca.
  const fetched = tryGit(['fetch', '--quiet', CANONICAL_REMOTE, CANONICAL_BRANCH]);
  if (!fetched.ok) {
    out.state = MEMORY_STATE.FETCH_FAILED;
    out.why = `não foi possível buscar ${CANONICAL_REF}: ${fetched.err}`;
    return out;
  }

  const counts = (label) => {
    const r = tryGit(['rev-list', '--left-right', '--count', `${CANONICAL_REF}...HEAD`]);
    if (!r.ok) return null;
    const [behind, ahead] = r.out.split(/\s+/).map(Number);
    return { behind, ahead, label };
  };

  let c = counts('após fetch');
  if (c && c.behind > 0) {
    // Árvore limpa: rebase é seguro e preserva os commits locais por cima.
    const pulled = tryGit(['pull', '--rebase', '--quiet', CANONICAL_REMOTE, CANONICAL_BRANCH]);
    if (!pulled.ok) {
      tryGit(['rebase', '--abort']); // devolve o repositório ao estado anterior
      out.state = MEMORY_STATE.REBASE_CONFLICT;
      out.why = `conflito ao integrar o remoto — rebase abortado, nada foi alterado: ${pulled.err}`;
      return out;
    }
    out.integrated = true;
    out.head = tryGit(['rev-parse', '--short', 'HEAD']).out || out.head;
    c = counts('após rebase');
  }

  out.behind = c?.behind ?? null;
  out.ahead = c?.ahead ?? null;

  if (c && c.behind > 0) {
    out.state = MEMORY_STATE.BEHIND;
    out.why = `a cópia local continua ${c.behind} commit(s) atrás de ${CANONICAL_REF}`;
    return out;
  }

  out.state = MEMORY_STATE.SYNCED;
  out.verified = true;
  // Commits locais ainda não enviados não impedem leitura nem proposta: o que
  // a Memory tem, esta cópia também tem. É limitação a declarar, não bloqueio.
  if (c && c.ahead > 0) out.unpushed = c.ahead;
  return out;
}

/** Compatibilidade: leitura do estado sem tentar integrar nada. */
export function memoryStatus(memoryRoot) {
  return syncMemory(memoryRoot, { fetch: false });
}

/** O que fazer em cada estado bloqueante — texto que vai para a lacuna. */
export const SYNC_REMEDY = {
  [MEMORY_STATE.NOT_A_REPO]: 'A Memory precisa ser um repositório git para ter proveniência e sincronização verificáveis.',
  [MEMORY_STATE.NO_ORIGIN]: `Configure o remoto canônico da Memory (git remote add ${CANONICAL_REMOTE} <url>).`,
  [MEMORY_STATE.NON_CANONICAL]: `A canônica é a branch ${CANONICAL_BRANCH} acompanhando ${CANONICAL_REF}. Volte para ela (git switch ${CANONICAL_BRANCH}) e aponte o upstream (git branch --set-upstream-to=${CANONICAL_REF}).`,
  [MEMORY_STATE.NO_UPSTREAM]: `Configure o upstream do branch da Memory (git branch --set-upstream-to=${CANONICAL_REF}).`,
  [MEMORY_STATE.DIRTY]: 'Commite ou guarde as alterações locais da Memory. O sistema não integra por cima de trabalho pendente.',
  [MEMORY_STATE.UNVERIFIED]: 'Reative a busca do remoto (remova MOS_MEMORY_NO_FETCH) para que a sincronização possa ser verificada.',
  [MEMORY_STATE.FETCH_FAILED]: 'Restabeleça o acesso ao remoto da Memory e consulte o contexto de novo.',
  [MEMORY_STATE.REBASE_CONFLICT]: 'Resolva o conflito na Memory manualmente. O rebase foi abortado e nada foi alterado.',
  [MEMORY_STATE.BEHIND]: 'A cópia local continua atrás da canônica — integre na Memory antes de seguir.',
};

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
    // Protocolo seguro antes da leitura relevante (§10.1): busca e integra
    // quando é seguro, e reporta bloqueio quando não é.
    memory: syncMemory(ws.memoryRoot),
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

  // A Memory existe mas não está verificada: as notas ainda são carregadas —
  // rascunho local continua possível — e o bloqueio impede que esse contexto
  // aprove um Brief ou receba uma proposta como se fosse confiável.
  if (!pkg.memory.verified) {
    pkg.gaps.push({
      role: null, severity: GAP_SEVERITY.BLOCKS,
      what: `Memory ${pkg.memory.state} — ${pkg.memory.why}`,
      ask: SYNC_REMEDY[pkg.memory.state] || 'Resolva a sincronização da Memory antes de aprovar o Brief.',
    });
  }
  if (pkg.memory.integrated) {
    pkg.limitations.push('o remoto foi integrado por rebase nesta leitura — o contexto reflete a canônica atual');
  }
  if (pkg.memory.unpushed) {
    pkg.limitations.push(`${pkg.memory.unpushed} commit(s) local(is) ainda não enviados à canônica`);
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
