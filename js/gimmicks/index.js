// ギミックの登録表。新しいギミックを作ったらここに追加し、engine.js に状態空間とロジックを足す
import { Slide } from './slide.js';
import { Dial } from './dial.js';
import { Stencil } from './stencil.js';
import { Mirror } from './mirror.js';

export const GIMMICKS = { slide: Slide, dial: Dial, stencil: Stencil, mirror: Mirror };

export const ICONS = { slide: '⇆', dial: '◎', stencil: '▦', mirror: '◐' };

export function createGimmick(def, ctx) {
  const C = GIMMICKS[def.type];
  if (!C) throw new Error('unknown gimmick ' + def.type);
  return new C(def, ctx);
}
