// sync-brand.mjs — traz o brand pack para dentro do bundle do Remotion.
// O brand pack em sistema/workspace/brand continua sendo a única fonte de
// verdade: aqui nada é editado, só copiado. public/ e brand-tokens.json são
// artefatos, e por isso não entram no git.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const brand = path.resolve(root, '../workspace/brand');
const visual = path.resolve(root, '../../campanhas/zionaxs/direcao-visual');

const copies = [
  // Só as faces latinas: é o que a peça usa, e woff2 por face pesa pouco.
  [path.join(brand, 'fonts/f12.woff2'), 'public/fonts/poppins-700.woff2'],
  [path.join(brand, 'fonts/f3.woff2'), 'public/fonts/archivo-400.woff2'],
  [path.join(brand, 'fonts/f6.woff2'), 'public/fonts/jetbrains-mono.woff2'],
  [path.join(brand, 'logo/zionaxs-white.png'), 'public/logo/zionaxs-white.png'],
  [path.join(brand, 'logo/zionaxs-black.png'), 'public/logo/zionaxs-black.png'],
  [path.join(visual, 'foto-por-do-sol.jpg'), 'public/foto/por-do-sol.jpg'],
];

for (const [from, to] of copies) {
  if (!fs.existsSync(from)) throw new Error(`brand pack incompleto: ${from}`);
  const dest = path.join(root, to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(from, dest);
}

// Tokens de cor e tipo vêm do brand.json, nunca reescritos à mão aqui.
const pack = JSON.parse(fs.readFileSync(path.join(brand, 'brand.json'), 'utf8'));
fs.writeFileSync(
  path.join(root, 'src/brand-tokens.json'),
  JSON.stringify({ colors: pack.colors, fonts: pack.fonts, formats: pack.formats }, null, 2)
);

console.log(`brand sincronizado: ${copies.length} arquivos + tokens`);
