import {describe,it,expect} from 'vitest';
import {contrastRatio,glyphMaskSupportsPixel} from './contrast-math';
describe('CSS contrast measurement reference cases',()=>{
 it('matches black/white and equal colors symmetrically',()=>{expect(contrastRatio([0,0,0],[255,255,255])).toBe(21);expect(contrastRatio([255,255,255],[0,0,0])).toBe(21);expect(contrastRatio([12,34,56],[12,34,56])).toBe(1);});
 it('does not round a failing gray ratio to the normal text threshold',()=>{expect(contrastRatio([119,119,119],[255,255,255])).toBeCloseTo(4.478089453577214,10);expect(contrastRatio([119,119,119],[255,255,255])).toBeLessThan(4.5);expect(contrastRatio([118,118,118],[255,255,255])).toBeGreaterThan(4.5);});
 it('includes low-coverage glyph pixels independently of the original foreground/background difference',()=>{expect(glyphMaskSupportsPixel([0,0,0],[255,255,255])).toBe(true);expect(glyphMaskSupportsPixel([4,4,4],[5,5,5])).toBe(true);expect(glyphMaskSupportsPixel([120,120,120],[120,120,120])).toBe(false);expect(contrastRatio([0,10,20],[255,255,255])).toBeGreaterThan(19);});
});
