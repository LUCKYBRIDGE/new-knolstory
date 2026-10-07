export type PreviewProfile = 'auto'|'desktop'|'portrait'|'landscape';
export type DisplaySize = Readonly<{width:number;height:number}>;
/** Preview presets affect presentation only, never authored stage coordinates. */
export function previewViewport(profile:PreviewProfile,actual:DisplaySize):DisplaySize {
  switch(profile) {
    case 'desktop': return {width:1280,height:720};
    case 'portrait': return {width:360,height:800};
    case 'landscape': return {width:800,height:360};
    default:return actual;
  }
}
