// fonts.js — carrega as faces do brand pack antes do primeiro frame.
// delayRender segura o render até a fonte estar pronta; sem isso o Chromium
// desenha o fallback e a peça sai com outra tipografia (o equivalente ao G2
// do renderer de carrossel, que verifica carga de face).
import { staticFile, delayRender, continueRender, cancelRender } from 'remotion';

const FACES = [
  ['Poppins', 'fonts/poppins-700.woff2', '700'],
  ['Archivo', 'fonts/archivo-400.woff2', '400'],
  ['JetBrains Mono', 'fonts/jetbrains-mono.woff2', '500'],
];

const handle = delayRender('carregando faces do brand pack');

Promise.all(
  FACES.map(([family, file, weight]) =>
    new FontFace(family, `url(${staticFile(file)}) format('woff2')`, { weight }).load()
  )
)
  .then((loaded) => {
    loaded.forEach((face) => document.fonts.add(face));
    continueRender(handle);
  })
  .catch((err) => cancelRender(err));
