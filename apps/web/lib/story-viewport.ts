export type PreviewProfile = 'auto'|'desktop'|'portrait'|'landscape';
export type DisplaySize = Readonly<{width:number;height:number}>;
/** Preview presets affect presentation only, never authored stage coordinates. */
export function previewViewport(profile:PreviewProfile,actual:DisplaySize):DisplaySize {
  switch(profile) {
    case 'desktop': return {width:1280,height:720};
    case 'portrait': return {width:720,height:1280};
    case 'landscape': return {width:1280,height:720};
    default:return actual.width<actual.height?{width:720,height:1280}:{width:1280,height:720};
  }
}

/** The browser rectangle scales the whole stage; it must not reflow its contents.
 * Editing always uses landscape. Stored preview preferences remain readable for
 * older sessions but cannot introduce portrait or a third editing composition.
 */
export function storySceneLayout(mode:'edit'|'play',profile:PreviewProfile,actual:DisplaySize){
 const viewport=previewViewport(mode==='edit'?'landscape':profile,actual);
 return {viewport,displaySize:viewport};
}

/** Retired preview choices are interpreted without rewriting stored manuscripts. */
export function normalizePreviewProfile(value:unknown):PreviewProfile{
 if(value==='classic')return 'landscape';
 return value==='desktop'||value==='landscape'||value==='portrait'||value==='auto'?value:'auto';
}
