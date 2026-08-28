// brands.js — Manifesto de Marca (§8.1, §9.2).
// O manifesto é o único lugar que sabe QUAIS notas da Zionaxs Memory governam
// uma marca. Sem ele o resolvedor não tem o que carregar — e essa é a intenção:
// RF-01.4 proíbe varrer a árvore inteira, então a seleção precisa ser declarada,
// não descoberta. O manifesto guarda REFERÊNCIAS, nunca cópia de conteúdo (§13.6).
import fs from 'node:fs';
import path from 'node:path';
import { readJson, exists } from './util.js';
import { listBrandIds } from './workspace.js';

/** Papéis de contexto que uma referência pode cumprir. */
export const CONTEXT_ROLES = ['posicionamento', 'publico', 'design', 'linguagem', 'provas', 'campanhas', 'aprendizados'];

/** Papéis sem os quais uma campanha não pode ser planejada com honestidade. */
export const REQUIRED_ROLES = ['posicionamento', 'publico'];

const REQUIRED_TOP = ['id', 'nome', 'referencias'];

export function loadBrandManifest(ws, brandId) {
  const file = ws.brandManifestFile(brandId);
  if (!exists(file)) return null;
  const m = readJson(file);
  m._file = file;
  return m;
}

/**
 * Valida o manifesto. Erros impedem uso; nenhum é aviso.
 * `memoryRoot` opcional: quando presente, verifica se cada referência existe
 * em disco. Ausência de Memory não invalida o manifesto — vira lacuna no
 * pacote de contexto (§12, "Acesso à Memory indisponível").
 */
export function validateBrandManifest(manifest, memoryRoot = null) {
  const errors = [];
  const err = (where, msg) => errors.push({ where, msg });

  if (!manifest || typeof manifest !== 'object') {
    return { ok: false, errors: [{ where: 'manifest', msg: 'manifesto ausente ou inválido' }] };
  }
  for (const f of REQUIRED_TOP) {
    if (manifest[f] === undefined || manifest[f] === null ||
        (typeof manifest[f] === 'string' && !manifest[f].trim())) {
      err('manifest', `campo obrigatório ausente: ${f}`);
    }
  }
  if (errors.length) return { ok: false, errors };

  const refs = manifest.referencias;
  if (!Array.isArray(refs) || !refs.length) {
    err('referencias', 'manifesto sem referências — não há o que carregar da Memory');
    return { ok: false, errors };
  }

  const seenRoles = new Map();
  refs.forEach((r, i) => {
    const where = `referencias[${i}]`;
    if (!r.papel) err(where, 'sem papel');
    else if (!CONTEXT_ROLES.includes(r.papel)) {
      err(where, `papel desconhecido: ${r.papel} (use: ${CONTEXT_ROLES.join(', ')})`);
    }
    if (!r.caminho || !String(r.caminho).trim()) err(where, 'sem caminho para a nota');
    if (r.caminho && (path.isAbsolute(r.caminho) || r.caminho.split(/[\\/]/).includes('..'))) {
      err(where, `caminho deve ser relativo à raiz da Memory e sem "..": ${r.caminho}`);
    }
    if (r.autoridade && !['canonica', 'suporte'].includes(r.autoridade)) {
      err(where, `autoridade inválida: ${r.autoridade} (use canonica ou suporte)`);
    }
    // RB-08: dois canônicos para o mesmo papel é conflito, e conflito não se
    // resolve em silêncio. Aqui só marcamos — a decisão sobe para o humano.
    if (r.papel) {
      const list = seenRoles.get(r.papel) || [];
      list.push(r);
      seenRoles.set(r.papel, list);
    }
  });

  for (const role of REQUIRED_ROLES) {
    if (!seenRoles.has(role)) err('referencias', `papel obrigatório sem referência: ${role}`);
  }

  if (memoryRoot) {
    refs.forEach((r, i) => {
      if (!r.caminho) return;
      const abs = safeMemoryPath(memoryRoot, r.caminho);
      if (!abs) err(`referencias[${i}]`, `caminho escapa da raiz da Memory: ${r.caminho}`);
    });
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Resolve um caminho declarado contra a raiz da Memory, bloqueando traversal.
 * Devolve o caminho absoluto ou null quando o caminho escapa da raiz.
 * A Memory é diretório de terceiro: caminho vindo de arquivo é dado, não rota
 * confiável (§13.7).
 */
export function safeMemoryPath(memoryRoot, rel) {
  const root = path.resolve(memoryRoot);
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

/** Marcas declaradas no workspace, já validadas. */
export function listBrands(ws) {
  return listBrandIds(ws).map((id) => {
    const manifest = loadBrandManifest(ws, id);
    const v = validateBrandManifest(manifest, ws.memoryRoot);
    return { id, manifest, valid: v.ok, errors: v.errors };
  });
}

/**
 * Resolve a marca de um pedido (§12, "Marca não identificada").
 * Devolve { ok, brandId } ou { ok:false, why, candidates } — nunca adivinha
 * quando há mais de uma marca possível.
 */
export function resolveBrand(ws, requested) {
  const ids = listBrandIds(ws);
  if (requested) {
    if (ids.includes(requested)) return { ok: true, brandId: requested };
    return { ok: false, why: `marca desconhecida: ${requested}`, candidates: ids };
  }
  if (ids.length === 1) return { ok: true, brandId: ids[0] };
  if (!ids.length) return { ok: false, why: 'nenhuma marca com manifesto declarado', candidates: [] };
  return { ok: false, why: 'mais de uma marca declarada — identifique a marca antes de consultar ou produzir', candidates: ids };
}

/** Escreve um manifesto validado. Recusa gravar manifesto inválido. */
export function saveBrandManifest(ws, manifest) {
  const v = validateBrandManifest(manifest, ws.memoryRoot);
  if (!v.ok) {
    const e = new Error(`manifesto inválido: ${v.errors.map((x) => `[${x.where}] ${x.msg}`).join('; ')}`);
    e.code = 'BRAND_MANIFEST_INVALID';
    throw e;
  }
  const file = ws.brandManifestFile(manifest.id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
  return file;
}
