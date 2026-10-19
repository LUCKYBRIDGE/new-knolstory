export type Rgb=readonly[number,number,number];
const linear=(channel:number)=>{const value=channel/255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;};
function luminance(color:Rgb){return .2126*linear(color[0])+.7152*linear(color[1])+.0722*linear(color[2]);}
/** WCAG relative luminance; callers use CSS foreground, never anti-aliased glyph RGB. */
export function contrastRatio(first:Rgb,second:Rgb){const a=luminance(first),b=luminance(second);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
/** Independent black/white masks retain glyphs even when original text matches its backdrop. */
export function glyphMaskSupportsPixel(dark:Rgb,light:Rgb){return dark.some((value,index)=>value!==light[index]);}
