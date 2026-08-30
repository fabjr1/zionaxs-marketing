import { Composition } from 'remotion';
import { ZxPeca } from './ZxPeca';
import { contrato, linha } from './peca.js';
import tokens from './brand-tokens.json';

const { w, h } = tokens.formats[contrato.format];

export const Root = () => (
  <Composition
    id={contrato.id}
    component={ZxPeca}
    durationInFrames={linha.total}
    fps={linha.fps}
    width={w}
    height={h}
  />
);
