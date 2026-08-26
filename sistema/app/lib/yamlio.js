// yamlio.js — emissão e leitura do subconjunto de YAML usado pelos contratos
// do sistema (Publication Contract, decisões). Deliberadamente mínimo: mapas
// planos de escalares, comentários e strings. Não é um parser YAML geral —
// e não precisa ser: nós controlamos os dois lados do formato.

/** true se o valor pode ir sem aspas. */
function plain(s) {
  return /^[A-Za-z0-9_][A-Za-z0-9_\-./:@ ]*$/.test(s) && !/^(true|false|null|~|yes|no)$/i.test(s) && !/ $/.test(s);
}

function emitValue(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v);
  return plain(s) ? s : JSON.stringify(s);
}

/**
 * Emite um mapa plano como YAML. `comments` opcional: { chave: "comentário" }.
 * Chaves na ordem de inserção do objeto — a ordem é parte do contrato legível.
 */
export function emitYaml(obj, comments = {}) {
  const lines = [];
  for (const [k, v] of Object.entries(obj)) {
    const c = comments[k] ? `   # ${comments[k]}` : '';
    lines.push(`${k}: ${emitValue(v)}${c}`);
  }
  return lines.join('\n') + '\n';
}

/** Lê o YAML plano emitido por emitYaml. Ignora comentários e linhas vazias. */
export function parseYaml(text) {
  const out = {};
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/(^|\s)#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v === 'null' || v === '') v = null;
    else if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
    else if (v.startsWith('"')) { try { v = JSON.parse(v); } catch { /* mantém cru */ } }
    out[m[1]] = v;
  }
  return out;
}
