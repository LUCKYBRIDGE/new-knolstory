type Anchor=Readonly<{left:number;right:number;top:number;bottom:number}>;
type Size=Readonly<{width:number;height:number}>;
export const PANEL_VIEWPORT_MARGIN=16;
type Viewport=Size&Readonly<{left?:number;top?:number}>;
/** Preserve the summary's right edge, then fit the open panel within the viewport. */
export function floatingPanelPosition(anchor:Anchor,panel:Size,viewport:Viewport){
 const margin=PANEL_VIEWPORT_MARGIN,gap=6,x=viewport.left??0,y=viewport.top??0,maxHeight=Math.max(0,viewport.height-margin*2);
 const width=Math.min(panel.width,Math.max(0,viewport.width-margin*2)),height=Math.min(panel.height,maxHeight);
 const left=Math.max(x+margin,Math.min(anchor.right-width,x+viewport.width-margin-width));
 const below=anchor.bottom+gap,preferred=below+height<=y+viewport.height-margin?below:anchor.top-gap-height;
 return {left,top:Math.max(y+margin,Math.min(preferred,y+viewport.height-margin-height)),maxHeight};
}
