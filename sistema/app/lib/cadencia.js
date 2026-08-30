// cadencia.js — quantas peças da marca já foram ao ar hoje, contando TODOS os
// formatos.
//
// Por que isto existe: o porteiro do carrossel contava só as peças de
// sistema/workspace/pieces. Quando o vídeo virou formato próprio, com peças em
// sistema/video/pecas, um Reels publicado ficava invisível para ele, e a conta
// do dia voltava a zero por formato. Cadência é da marca, não do formato, e
// dois contadores separados são a mesma coisa que nenhum.
//
// Sem dependência além do Node: este arquivo é lido pelos dois porteiros, e um
// deles vive em outro pacote, com outro node_modules.
import fs from 'node:fs';
import path from 'node:path';

/** Onde cada formato guarda o registro do que foi publicado. */
export function fontesDePublicacao(repoRoot) {
  return [
    { formato: 'carrossel', dir: path.join(repoRoot, 'sistema/workspace/pieces') },
    { formato: 'video', dir: path.join(repoRoot, 'sistema/video/pecas') },
  ];
}

/** O dia no fuso DA MARCA. Com UTC-3, depois das 21h locais o UTC já virou e a
 *  cota do dia seguinte seria liberada cedo demais. */
export function diaLocal(data, fuso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(data);
}

/** Tudo que já foi publicado, de qualquer formato, com a data no fuso da marca. */
export function publicacoes(repoRoot, fuso) {
  const saida = [];
  for (const { formato, dir } of fontesDePublicacao(repoRoot)) {
    if (!fs.existsSync(dir)) continue;
    for (const id of fs.readdirSync(dir)) {
      const arq = path.join(dir, id, 'publication', 'published.json');
      if (!fs.existsSync(arq)) continue;
      let j;
      try { j = JSON.parse(fs.readFileSync(arq, 'utf8')); } catch { continue; }
      const quando = j.publishedAt || j.published_at || j.at;
      if (!quando) continue;
      saida.push({ id, formato, publishedAt: quando, dia: diaLocal(new Date(quando), fuso), permalink: j.permalink || null });
    }
  }
  return saida.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
}

/** As publicadas hoje, excluindo a própria peça que está sendo avaliada. */
export function publicadasHoje(repoRoot, fuso, excluirId) {
  const hoje = diaLocal(new Date(), fuso);
  return publicacoes(repoRoot, fuso).filter((x) => x.dia === hoje && x.id !== excluirId);
}
