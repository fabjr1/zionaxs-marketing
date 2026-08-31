// Códigos editoriais (A-09): código declarado no contrato tem de existir na
// nota canônica da Memory. O caso que originou a verificação está no primeiro
// teste: a zx-26 declarou JO2/JE2, que existem, mas são os jobs de métrica da
// zx-23; o que a máquina consegue cobrar é a EXISTÊNCIA do código, não a
// pertinência dele, então os testes cobrem exatamente essa fronteira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lerCodigosCanonicos, conferirCodigos, normalizarCodigo } from '../lib/codigos-editoriais.js';

const NOTA_19C = 'Marketing/Marcas/Zionaxs/Público/19c - Zionaxs - Matriz Editorial, Repertório e Linguagem.md';
const NOTA_19B = 'Marketing/Marcas/Zionaxs/Público/19b - Zionaxs - Personas, JTBD, Rotinas e Dores.md';

/** Memory de mentira, com a mesma forma de tabela das notas reais. */
function memoryFalsa() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-'));
  const escrever = (rel, txt) => {
    const abs = path.join(raiz, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, txt);
  };
  escrever(NOTA_19C, [
    '| ID | Segmento |', '|---|---|',
    '| M08 | V2 | Retrabalho invisível |',
    '| M17 | Transversal | Automatizar o processo errado |',
    '| M18 | Transversal | Número que ninguém confia |',
    '', '| R8 | Toyota (TPS) | jidoka |', '| R9 | W. Edwards Deming | sistema |',
  ].join('\n'));
  escrever(NOTA_19B, [
    '| ID | Job |', '|---|---|',
    '| JF9 | "Quando o mesmo dado é digitado duas vezes…" |',
    '| JE1 | "Quero parar de empurrar." |',
    '| JO2 | "Quero uma fórmula de métrica…" |',
  ].join('\n'));
  return raiz;
}

test('normaliza M8 e M08 para o mesmo código, e não estraga R9', () => {
  assert.equal(normalizarCodigo('M8'), 'M08');
  assert.equal(normalizarCodigo('M08'), 'M08');
  assert.equal(normalizarCodigo('R9'), 'R9');
  assert.equal(normalizarCodigo('JF9'), 'JF9');
});

test('lê os códigos das duas notas canônicas', () => {
  const c = lerCodigosCanonicos(memoryFalsa());
  assert.equal(c.disponivel, true);
  assert.deepEqual([...c.matriz].sort(), ['M08', 'M17', 'M18']);
  assert.deepEqual([...c.repertorio].sort(), ['R8', 'R9']);
  assert.deepEqual([...c.jtbd].sort(), ['JE1', 'JF9', 'JO2']);
});

test('sem Memory no checkout não há o que conferir: quem cobra a ausência é a A7', () => {
  const c = lerCodigosCanonicos('/caminho/que/nao/existe');
  assert.equal(c.disponivel, false);
  assert.deepEqual(conferirCodigos({ matriz: 'M99', jtbd: ['JX7'] }, c), []);
});

test('reprova código declarado que não existe na nota', () => {
  const c = lerCodigosCanonicos(memoryFalsa());
  const fora = conferirCodigos({ matriz: 'M42', jtbd: ['JF9', 'JX1'] }, c);
  assert.equal(fora.length, 2);
  assert.deepEqual(fora.map((f) => f.campo).sort(), ['jtbd', 'matriz']);
  assert.equal(fora.find((f) => f.campo === 'matriz').nota, '19c');
});

test('campo ausente é lacuna assumida, não erro: mentir um código é pior', () => {
  const c = lerCodigosCanonicos(memoryFalsa());
  assert.deepEqual(conferirCodigos({ jtbd: ['JF9'] }, c), []);
  assert.deepEqual(conferirCodigos({}, c), []);
});

test('repertorio.id declarado como proposto não é cobrado', () => {
  const c = lerCodigosCanonicos(memoryFalsa());
  assert.deepEqual(conferirCodigos({ repertorio: { id: 'R12 (proposto)' } }, c), []);
  assert.equal(conferirCodigos({ repertorio: { id: 'R42' } }, c).length, 1);
  assert.deepEqual(conferirCodigos({ repertorio: { id: 'R8' } }, c), []);
});

test('a verificação mede existência, não pertinência: JO2 na peça errada passa', () => {
  // Limite declarado da A-09. Foi o caso real da zx-26: JO2 existe, mas é o job
  // de métrica da zx-23. Escolher o job certo continua sendo julgamento humano.
  const c = lerCodigosCanonicos(memoryFalsa());
  assert.deepEqual(conferirCodigos({ jtbd: ['JO2'] }, c), []);
});
