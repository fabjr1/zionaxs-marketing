import { Composition } from 'remotion';
import { ZxTeste } from './ZxTeste';
import { FPS, TOTAL } from './tempo.js';
import tokens from './brand-tokens.json';

const { w, h } = tokens.formats['story-9x16'];

export const Root = () => (
  <Composition
    id="zx-teste"
    component={ZxTeste}
    durationInFrames={TOTAL}
    fps={FPS}
    width={w}
    height={h}
  />
);
