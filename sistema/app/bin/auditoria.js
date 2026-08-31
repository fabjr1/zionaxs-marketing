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
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkspace } from '../lib/workspace.js';
import { loadAllPieces, STATUS } from '../lib/pieces.js';
import { scanPiece, scanEstilo } from '../lib/copy-rules.js';
import { lerCodigosCanonicos, conferirCodigos } from '../lib/codigos-editoriais.js';

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

// A3 — o que o código faz e o que a documentação promete precisam bater.
// Três falhas distintas, todas encontradas em 29/08/2026 por um agente em nuvem:
// gate implementado e não documentado; contagem de gates errada em três
// arquivos; e documento prometendo um gate que nunca foi implementado (G15).
const gatesSrc = ler('sistema/app/lib/gates.js') || '';
const idsNoCodigo = [...gatesSrc.matchAll(/add\('(G\d+)'/g)].map((m) => m[1]);
const DOCS = ['AGENTS.md', ...PADROES, 'sistema/app/README.md', '.claude/commands/carrossel-zionaxs.md'];
const docTudo = DOCS.map(ler).filter(Boolean).join('\n');
const problemasA3 = [];

// 3a. gate recente existe no código e não aparece em documento nenhum
for (const g of idsNoCodigo.filter((x) => Number(x.slice(1)) >= 13)) {
  if (!docTudo.includes(g)) problemasA3.push(`${g} existe no código e não aparece na documentação`);
}

// 3b. documento cita gate que o código não tem
for (const g of [...new Set([...docTudo.matchAll(/\bG(\d+)\b/g)].map((m) => 'G' + m[1]))]) {
  if (!idsNoCodigo.includes(g)) problemasA3.push(`${g} é citado na documentação e NÃO existe no código`);
}

// 3c. contagem declarada em texto tem de bater com a contagem real
for (const d of DOCS) {
  const txt = ler(d);
  if (!txt) continue;
  for (const m of txt.matchAll(/\**(\d+)\**\s+gates/g)) {
    if (Number(m[1]) !== idsNoCodigo.length) {
      problemasA3.push(`${d} afirma "${m[1]} gates" e o código tem ${idsNoCodigo.length}`);
    }
  }
}

problemasA3.length
  ? fail('A3', 'documentação bate com o código', [...new Set(problemasA3)])
  : ok('A3', 'documentação bate com o código', `${idsNoCodigo.length} gates, conferidos em ${DOCS.length} documentos`);


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

// A8 — comando do projeto precisa estar VERSIONADO, não só no disco local.
// Achado em 29/08/2026: o .gitignore herdado ignorava .claude/ inteiro, e o
// agente em nuvem clonou o repositório sem o processo, tendo que improvisar.
// Arquivo existir no disco não prova que ele viaja com o repositório.
try {
  const rastreados = execFileSync('git', ['ls-files', '.claude/commands'], { cwd: REPO, encoding: 'utf8' })
    .split(String.fromCharCode(10)).filter(Boolean);
  const dirCmd = path.join(REPO, '.claude', 'commands');
  const emDisco = fs.existsSync(dirCmd) ? fs.readdirSync(dirCmd).filter((x) => x.endsWith('.md')) : [];
  const foraDoGit = emDisco.filter((x) => !rastreados.some((r) => r.endsWith(x)));
  foraDoGit.length
    ? fail('A8', 'comandos versionados', foraDoGit.map((x) => `.claude/commands/${x} existe no disco e não está no git`))
    : ok('A8', 'comandos versionados', `${rastreados.length} comando(s) versionado(s)`);
} catch (e) {
  fail('A8', 'comandos versionados', [`não foi possível consultar o git: ${e.message.slice(0, 80)}`]);
}

// A9 — código editorial declarado tem de existir na nota canônica da Memory.
// Sessão sem a Memory à mão copia o código da peça anterior em vez de deixar em
// branco, e isso já aconteceu 3 vezes: zx-25 com M18 sendo M17, zx-20 a zx-24
// herdando o mesmo M18, zx-26 com JO2/JE2, que são os jobs de métrica da zx-23.
// Não vira pixel, não quebra gate, estraga a análise em silêncio: é binário,
// logo é da máquina. Peça publicada fica de fora: contrato publicado é registro
// histórico e a correção mora em decisions/ da peça, nunca reescrevendo.
const codigos = lerCodigosCanonicos(memRoot);
if (!codigos.disponivel) {
  ok('A9', 'códigos editoriais canônicos', 'sem Memory no checkout, nada a conferir (ver A7)');
} else {
  const errados = [];
  for (const p of pecas) {
    if (p.status === STATUS.PUBLISHED) continue;
    for (const f of conferirCodigos(p.contract, codigos)) {
      errados.push(`${p.id}: ${f.motivo} (nota ${f.nota})`);
    }
  }
  errados.length
    ? fail('A9', 'códigos editoriais canônicos', errados)
    : ok('A9', 'códigos editoriais canônicos',
      `${codigos.matriz.size} linhas de matriz, ${codigos.jtbd.size} jobs, ${codigos.repertorio.size} de repertório`);
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
