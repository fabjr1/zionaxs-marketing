import { Composition } from 'remotion';
import { ZxTeste } from './ZxTeste';
import tokens from './brand-tokens.json';

const { w, h } = tokens.formats['story-9x16'];

export const Root = () => (
  <Composition
    id="zx-teste"
    component={ZxTeste}
    durationInFrames={360}
    fps={30}
    width={w}
    height={h}
  />
);
