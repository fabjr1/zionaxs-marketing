// templates/index.js — registro dos template packs (G-06, G-08).
// static-1x1 e story-9x16 compartilham o vocabulário de layouts do carrossel:
// o que muda é o canvas (dimensões e margens vêm de brand.formats[key]).
// Isso é deliberado — o vocabulário narrativo é do método, o canvas é do canal.
import * as carousel from './carousel-4x5.js';

function derive(formatKey) {
  return {
    formatKey,
    layouts: carousel.layouts,
    css: (brand) => {
      const base = carousel.css(brand);
      const from = brand.formats[carousel.formatKey];
      const to = brand.formats[formatKey];
      // o css do carrossel referencia o canvas do próprio formato; troca dirigida
      return base
        .replace(`width:${from.w}px;height:${from.h}px`, `width:${to.w}px;height:${to.h}px`)
        .replace(`padding:${from.my}px ${from.mx}px`, `padding:${to.my}px ${to.mx}px`);
    },
    renderSlide: carousel.renderSlide,
  };
}

const REGISTRY = {
  'carousel-4x5': carousel,
  'static-1x1': derive('static-1x1'),
  'story-9x16': derive('story-9x16'),
};

export function getTemplate(formatKey) {
  const t = REGISTRY[formatKey];
  if (!t) throw new Error(`formato sem template pack: ${formatKey}`);
  return t;
}

export function listFormats() {
  return Object.keys(REGISTRY);
}
