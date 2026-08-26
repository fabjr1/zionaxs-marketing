// gitio.js — auditoria por commit (N-03, C-08).
// Toda decisão sobre peça vira um commit no repositório do workspace.
// Se o workspace não estiver dentro de um repo git, as operações degradam
// para no-op EXPLÍCITO no retorno — nunca silencioso.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

function git(root, args, opts = {}) {
  return execFileSync('git', args, {
    cwd: root, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'], ...opts,
  }).trim();
}

export function isRepo(root) {
  try { return git(root, ['rev-parse', '--is-inside-work-tree']) === 'true'; }
  catch { return false; }
}

/**
 * Commita arquivos com mensagem de decisão. Retorna { committed, sha?, reason? }.
 */
export function commitDecision(root, files, message) {
  if (!isRepo(root)) return { committed: false, reason: 'workspace fora de repositório git — decisão gravada só em arquivo' };
  try {
    git(root, ['add', '--', ...files.map((f) => path.relative(root, path.resolve(root, f)))]);
    git(root, [
      '-c', 'user.name=Marketing OS',
      '-c', 'user.email=marketing-os@local',
      'commit', '-m', message, '--', ...files.map((f) => path.relative(root, path.resolve(root, f))),
    ]);
    const sha = git(root, ['rev-parse', 'HEAD']);
    return { committed: true, sha };
  } catch (err) {
    return { committed: false, reason: String(err.stderr || err.message).slice(0, 300) };
  }
}

/**
 * Histórico de uma peça (C-08): commits que tocaram o diretório dela.
 */
export function pieceHistory(root, pieceDir, limit = 30) {
  if (!isRepo(root)) return [];
  try {
    const rel = path.relative(root, pieceDir);
    const out = git(root, ['log', `-${limit}`, '--pretty=%h%x09%ad%x09%s', '--date=short', '--', rel]);
    if (!out) return [];
    return out.split('\n').map((l) => {
      const [sha, date, ...msg] = l.split('\t');
      return { sha, date, message: msg.join('\t') };
    });
  } catch { return []; }
}
