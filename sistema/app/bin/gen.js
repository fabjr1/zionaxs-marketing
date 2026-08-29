#!/usr/bin/env node
// gen.js — pipeline da peça: validar → compilar → renderizar → gates → saídas.
// Uso: node bin/gen.js <piece-id> [--root <workspace>]
// Sai com código 1 se contrato inválido ou qualquer gate reprovar.
import path from 'node:path';
import { loadWorkspace } from '../lib/workspace.js';
import { loadContract, validateContract } from '../lib/contract.js';
import { getTemplate } from '../lib/templates/index.js';
import { compileToFile } from '../lib/compile.js';
import { renderPiece } from '../lib/render.js';
import { writeOutputs } from '../lib/outputs.js';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const pieceId = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : undefined;
if (!pieceId) {
  console.error('uso: node bin/gen.js <piece-id> [--root <workspace>]');
  process.exit(2);
}

const ws = loadWorkspace(arg('--root'));
const pieceDir = ws.pieceDir(pieceId);
const contract = loadContract(path.join(pieceDir, 'contract.json'));

const template = getTemplate(contract.format);
const v = validateContract(contract, ws.brand, template);
if (!v.ok) {
  console.error(`✗ contrato inválido (${v.errors.length} erros):`);
  for (const e of v.errors) console.error(`  [${e.where}] ${e.msg}`);
  process.exit(1);
}
console.log(`✓ contrato válido — ${contract.slides.length} unidades, formato ${contract.format}`);

const compiled = compileToFile(contract, ws.brand, pieceDir);
console.log(`✓ compilado → ${path.relative(ws.root, compiled)}`);

const t0 = Date.now();
const report = await renderPiece({ contract, brand: ws.brand, pieceDir, compiledFile: compiled });
const secs = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n=== RENDER REPORT — ${contract.id} (${secs}s) ===`);
for (const g of report.gates) {
  const st = g.pass ? 'PASSA' : `FALHA (${g.failures.length})`;
  console.log(`${g.id.padEnd(4)} ${g.name.padEnd(26)} ${st}${g.detail ? '  · ' + g.detail : ''}`);
  if (!g.pass) for (const f of g.failures.slice(0, 5)) console.log('     ', JSON.stringify(f));
}
console.log(`digest ${report.digest.slice(0, 16)}…`);

if (!report.pass) {
  console.error('\n✗ gates reprovaram — corrija o CONTRATO e recompile (nunca o pixel)');
  process.exit(1);
}

const outs = await writeOutputs({
  contract, pieceDir,
  slideFiles: report.slides.map((f) => path.join(pieceDir, 'out', f)),
});
console.log(`✓ saídas → ${path.relative(ws.root, outs.sheet)}, ${path.relative(ws.root, outs.captionFile)}`);
console.log(`\n✓ peça gerada e ${report.gates.length}/${report.gates.length} gates verdes em ${secs}s`);
