#!/usr/bin/env node
// exportar-jpg.js — converte os PNG de uma peça em JPEG para a publicação.
//
// Por que isto existe. A rota de publicação entrega à Meta uma URL pública de
// imagem, e a Meta quer JPEG. O renderizador produz PNG. O ambiente em nuvem
// não tem sharp, Pillow nem ImageMagick, então a conversão sempre acabou sendo
// um script improvisado dentro da sessão: aconteceu na zx-28, na zx-30 e na
// zx-31, que registrou em decisions/ a sugestão de versionar isto aqui.
//
// Script improvisado por sessão é exatamente o que a regra zero proíbe: ele
// não tem endereço permanente, então a qualidade dele depende de quem lembrou
// do quê naquele dia. A conversão é determinística e binária, logo é da
// máquina.
//
// Como converte. Usa o próprio Chromium do Playwright, que já é dependência do
// renderizador, desenhando cada PNG em um canvas e lendo de volta em
// image/jpeg. Sem dependência nova.
//
//   node bin/exportar-jpg.js <piece-id> [--root ../workspace] [--quality 0.92]
//
// Saída: pieces/<id>/out/jpg/<arquivo>.jpg, um por slide, na mesma ordem.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = { id: null, root: '../workspace', quality: 0.92 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--root') { args.root = argv[i + 1]; i += 1; }
    else if (a === '--quality') { args.quality = Number(argv[i + 1]); i += 1; }
    else if (!a.startsWith('-') && !args.id) args.id = a;
  }
  return args;
}

/** PNG de slide da peça, em ordem de paginação. O contact-sheet fica de fora. */
export function listarSlides(outDir, id) {
  if (!fs.existsSync(outDir)) return [];
  return fs.readdirSync(outDir)
    .filter((f) => f.startsWith(`${id}-slide-`) && f.endsWith('.png'))
    .sort();
}

async function main() {
  const { id, root, quality } = parseArgs(process.argv.slice(2));
  if (!id) {
    console.error('uso: node bin/exportar-jpg.js <piece-id> [--root ../workspace] [--quality 0.92]');
    process.exit(2);
  }
  if (!(quality > 0 && quality <= 1)) {
    console.error(`qualidade inválida: ${quality}. Use um número entre 0 e 1.`);
    process.exit(2);
  }

  const outDir = path.resolve(root, 'pieces', id, 'out');
  const slides = listarSlides(outDir, id);
  if (!slides.length) {
    console.error(`nenhum PNG de slide em ${outDir}. Rode bin/gen.js antes.`);
    process.exit(1);
  }

  const jpgDir = path.join(outDir, 'jpg');
  fs.mkdirSync(jpgDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    for (const file of slides) {
      const png = fs.readFileSync(path.join(outDir, file));
      const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
      const jpegDataUrl = await page.evaluate(async ({ src, q }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        // JPEG não tem alfa: fundo branco explícito evita borda preta.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL('image/jpeg', q);
      }, { src: dataUrl, q: quality });

      const jpg = Buffer.from(jpegDataUrl.split(',')[1], 'base64');
      const dest = path.join(jpgDir, file.replace(/\.png$/, '.jpg'));
      fs.writeFileSync(dest, jpg);
      const kb = (jpg.length / 1024).toFixed(0);
      console.log(`✓ ${path.basename(dest)} · ${kb} KB`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n✓ ${slides.length} JPEG em ${path.relative(process.cwd(), jpgDir)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
