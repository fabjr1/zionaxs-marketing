#!/usr/bin/env node
// auditoria.js — verifica que o conhecimento vive no REPOSITÓRIO, não no
// contexto de uma sessão. Regra do Fabiano (29/08/2026): "não tem que confiar
// nada no contexto da sessão; tem que estar tudo no repo e no zionaxs-memory".
//
// Cada verificação abaixo falha quando uma decisão ficou só na cabeça de
// alguém. Não mede qualidade de conteúdo: mede se o que foi decidido tem
// endereço permanente e se as peças ainda obedecem ao que foi decidido.
//
// Uso: node bin/auditoria.js [--root <workspace>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkspace } from '../lib/workspace.js';
import { loadAllPieces, STATUS } from '../lib/pieces.js';
import { scanPiece, scanEstilo } from '../lib/copy-rules.js';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(APP, '..', '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };

const checks = [];
const ok = (id, nome, detalhe) => checks.push({ id, nome, pass: true, detalhe });
const fail = (id, nome, motivos, detalhe) => checks.push({ id, nome, pass: false, motivos, detalhe });
const ler = (p) => { try { return fs.readFileSync(path.join(REPO, p), 'utf8'); } catch { return null; } };

// A1 — a porta de entrada aponta para os padrões
const PADROES = ['campanhas/zionaxs/direcao-visual/README.md', 'campanhas/zionaxs/padrao-de-copy.md'];
const agents = ler('AGENTS.md');
if (!agents) fail('A1', 'AGENTS.md aponta os padrões', ['AGENTS.md não existe']);
else {
  const faltando = PADROES.filter((p) => !agents.includes(p));
  faltando.length
    ? fail('A1', 'AGENTS.md aponta os padrões', faltando.map((p) => `não referencia ${p}`))
    : ok('A1', 'AGENTS.md aponta os padrões', `${PADROES.length} documentos citados`);
}

// A2 — os padrões existem e têm conteúdo
const vazios = PADROES.filter((p) => (ler(p) || '').length < 500);
vazios.length
  ? fail('A2', 'documentos de padrão presentes', vazios.map((p) => `${p} ausente ou curto demais`))
  : ok('A2', 'documentos de padrão presentes', PADROES.map((p) => path.basename(p)).join(', '));

// A3 — gate que existe no código precisa estar documentado
const gatesSrc = ler('sistema/app/lib/gates.js') || '';
const idsNoCodigo = [...gatesSrc.matchAll(/add\('(G\d+)'/g)].map((m) => m[1]);
const docTudo = [agents, ...PADROES.map(ler)].filter(Boolean).join('\n');
const naoDocumentados = idsNoCodigo.filter((g) => Number(g.slice(1)) >= 13 && !docTudo.includes(g));
naoDocumentados.length
  ? fail('A3', 'gates documentados', naoDocumentados.map((g) => `${g} existe no código e não aparece na documentação`))
  : ok('A3', 'gates documentados', `${idsNoCodigo.length} gates no código`);

// A4 — a marca tem logo instalada, não paliativo
const ws = loadWorkspace(arg('--root') || path.resolve(APP, '..', 'workspace'));
const b = ws.brand;
const temLogo = !!(b.logoSvg || (b.logo && (b.logo.light || b.logo.dark)));
temLogo
  ? ok('A4', 'logo oficial instalada', b.logoSvg ? 'SVG inline' : `arquivo (${b.logo.dir})`)
  : fail('A4', 'logo oficial instalada', ['brand pack sem logo: peça sairia com wordmark composta em tipo']);

// A5 — peça não publicada precisa obedecer ao padrão vigente, ou declarar exceção
const pecas = loadAllPieces(ws);
const fora = [];
for (const p of pecas) {
  if (p.status === STATUS.PUBLISHED) continue; // publicada é registro histórico
  const copy = scanPiece(p.contract).length;
  const estilo = scanEstilo(p.contract).length;
  if (copy || estilo) fora.push(`${p.id}: ${copy} de copy, ${estilo} de estilo`);
}
fora.length
  ? fail('A5', 'peças não publicadas no padrão', fora)
  : ok('A5', 'peças não publicadas no padrão', `${pecas.length} peças varridas`);

// A6 — peça publicada tem registro reconciliado com digest
const semRegistro = pecas
  .filter((p) => p.status === STATUS.PUBLISHED)
  .filter((p) => !p.publication?.digest || !p.publication?.permalink)
  .map((p) => `${p.id} sem digest ou permalink no published.json`);
semRegistro.length
  ? fail('A6', 'publicações rastreáveis', semRegistro)
  : ok('A6', 'publicações rastreáveis', `${pecas.filter((p) => p.status === STATUS.PUBLISHED).length} publicadas`);

// A7 — a Memory canônica está acessível e mostra o que espera promoção humana
const memRoot = path.resolve(ws.root, ws.config?.memoryRoot || '../../../zionaxs-memory');
const inbox = path.join(memRoot, 'Inbox', 'Agents', 'claude-code');
if (!fs.existsSync(inbox)) {
  fail('A7', 'Zionaxs Memory acessível', [`inbox não encontrada em ${inbox}`]);
} else {
  const propostas = fs.readdirSync(inbox).filter((f) => f.endsWith('.md') && f !== 'README.md');
  ok('A7', 'Zionaxs Memory acessível', propostas.length
    ? `${propostas.length} proposta(s) aguardando promoção humana: ${propostas.join(', ')}`
    : 'nenhuma proposta pendente');
}

console.log('\n=== AUDITORIA DE PERMANÊNCIA ===');
for (const c of checks) {
  console.log(`${c.id}  ${c.nome.padEnd(34)} ${c.pass ? 'OK' : 'FALHA'}${c.detalhe ? '  · ' + c.detalhe : ''}`);
  if (!c.pass) for (const m of c.motivos) console.log(`      ${m}`);
}
const ruins = checks.filter((c) => !c.pass).length;
console.log(ruins
  ? `\n✗ ${ruins} verificação(ões) falharam: há conhecimento fora do repositório`
  : `\n✓ ${checks.length}/${checks.length} — nada depende do contexto da sessão`);
process.exit(ruins ? 1 : 0);
