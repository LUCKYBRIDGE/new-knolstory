/** Canonical silhouette placement: baseline geometry with wider automatic side spacing. */
export type AlphaGeometry = Readonly<{ left:number; right:number; top:number; bottom:number; width:number; height:number }>;
export type LayoutActor = Readonly<{ key:string; side:'left'|'right'; geometry:AlphaGeometry; scale:number; mirrored?:boolean; xAnchor?:number; centered?:boolean }>;
type Placed = LayoutActor & Readonly<{height:number; width:number; alphaLeft:number; alphaRight:number; visibleWidth:number; x:number; effectiveScale:number}>;
const clamp = (v:number, low:number, high:number) => Math.max(low, Math.min(high, v));
const resize = (a:Placed, f:number):Placed => ({...a,width:a.width*f,height:a.height*f,visibleWidth:a.visibleWidth*f,effectiveScale:a.effectiveScale*f});
const atCenter = (a:Placed, center:number):Placed => ({...a,x:center-a.width*(a.alphaLeft+a.alphaRight)/2});
export function resolveStageLayout(width:number, baseHeight:number, actors:readonly LayoutActor[], contentWidth?:number, maxVisibleHeight=Infinity, cropSides=false) {
  if (!Number.isFinite(width) || width<=0 || !Number.isFinite(baseHeight) || baseHeight<0 || actors.length>4 || new Set(actors.map(a=>a.key)).size!==actors.length ||
      (contentWidth!==undefined && (!Number.isFinite(contentWidth)||contentWidth<0)) || maxVisibleHeight<=0 || Number.isNaN(maxVisibleHeight) ||
      actors.some(a => !Number.isFinite(a.scale)||a.scale<0 || (a.xAnchor!==undefined&&!Number.isFinite(a.xAnchor)) ||
        !Number.isFinite(a.geometry.width)||!Number.isFinite(a.geometry.height)||a.geometry.width<=0||a.geometry.height<=0 ||
        ![a.geometry.left,a.geometry.right,a.geometry.top,a.geometry.bottom].every(Number.isFinite) || a.geometry.right<=a.geometry.left || a.geometry.bottom<=a.geometry.top))
    throw new RangeError('Invalid stage layout dimensions or actors.');
  const railWidth=Math.max(0,contentWidth??Math.min(980,width-2*clamp(width*.02,8,20)));
  const contentLeft=(width-railWidth)/2, inset=Math.min(20,railWidth/8);
  const safeLeft=contentLeft+inset, safeRight=width-contentLeft-inset, safeWidth=Math.max(1,safeRight-safeLeft);
  const maxGap=24,maxOverlap=.25;
  const fit=(actor:Placed):Placed => {
    const a=!cropSides&&actor.visibleWidth>safeWidth?resize(actor,safeWidth/actor.visibleWidth):actor;
    const minX=a.width<=width?Math.max(0,safeLeft-a.width*a.alphaLeft):safeLeft-a.width*a.alphaLeft;
    const maxX=a.width<=width?Math.min(width-a.width,safeRight-a.width*a.alphaRight):safeRight-a.width*a.alphaRight;
    return {...a,x:clamp(a.x,minX,Math.max(minX,maxX))};
  };
  const initial:readonly Placed[]=actors.map(a=>{
    const g=a.geometry,height=Math.min(Math.max(0,baseHeight*a.scale),maxVisibleHeight/Math.max(.001,g.bottom-g.top));
    const boxWidth=height*g.width/g.height;
    const alphaLeft=a.mirrored?1-g.right:g.left,alphaRight=a.mirrored?1-g.left:g.right;
    return {...a,height,width:boxWidth,alphaLeft,alphaRight,visibleWidth:boxWidth*(alphaRight-alphaLeft),x:0,effectiveScale:baseHeight?height/baseHeight:0};
  });
  const sideGroup=(side:'left'|'right'):readonly Placed[]=>{
    const group=initial.filter(a=>a.side===side);
    if(group.length===2&&group.every(a=>a.xAnchor===undefined&&!a.centered)){
      const [a,b]=group,band=Math.min(32,safeWidth*.06);
      const zoneLeft=side==='left'?safeLeft:safeLeft+safeWidth/2-band;
      const zoneRight=side==='right'?safeRight:safeLeft+safeWidth/2+band,zoneWidth=zoneRight-zoneLeft;
      const narrow=Math.min(a.visibleWidth,b.visibleWidth);
      const gap=Math.max(-narrow*maxOverlap,Math.min(-Math.min(maxGap,narrow*.15),zoneWidth-a.visibleWidth-b.visibleWidth));
      const requested=a.visibleWidth+b.visibleWidth+gap,factor=requested>zoneWidth?zoneWidth/requested:1;
      const aa=resize(a,factor),bb=resize(b,factor),scaledGap=gap*factor,total=aa.visibleWidth+bb.visibleWidth+scaledGap;
      const center=contentLeft+railWidth*(side==='left'?.18:.82),start=clamp(center-total/2,zoneLeft,zoneRight-total);
      return [atCenter(aa,start+aa.visibleWidth/2),atCenter(bb,start+aa.visibleWidth+scaledGap+bb.visibleWidth/2)];
    }
    const fitted=group.map(actor=>{
      const a=!cropSides&&actor.visibleWidth>safeWidth?resize(actor,safeWidth/actor.visibleWidth):actor;
      // Only unpositioned side actors move outward; authored anchors and shared centering retain their meaning.
      const positioned=a.xAnchor!==undefined?{...a,x:width*a.xAnchor/100-a.width/2}:atCenter(a,contentLeft+railWidth*(a.centered?.5:side==='left'?(cropSides?.23:.14):(cropSides?.77:.86)));
      return cropSides ? positioned : fit(positioned);
    });
    const automatic=fitted.find(a=>a.xAnchor===undefined),manual=fitted.find(a=>a.xAnchor!==undefined);
    if(fitted.length!==2||!automatic||!manual||automatic.centered)return fitted;
    const gap=-Math.min(maxGap,Math.min(automatic.visibleWidth,manual.visibleWidth)*.15);
    const manualLeft=manual.x+manual.width*manual.alphaLeft,manualRight=manual.x+manual.width*manual.alphaRight;
    const roomLeft=manualLeft-gap-safeLeft,roomRight=safeRight-manualRight-gap;
    const initialBefore=fitted.indexOf(automatic)<fitted.indexOf(manual);
    const before=(initialBefore?roomLeft:roomRight)<automatic.visibleWidth?roomLeft>=roomRight:initialBefore;
    const room=Math.max(1,before?roomLeft:roomRight),a=room<automatic.visibleWidth?resize(automatic,room/automatic.visibleWidth):automatic;
    const center=before?manualLeft-gap-a.visibleWidth/2:manualRight+gap+a.visibleWidth/2;
    return fitted.map(actor=>actor===automatic?fit(atCenter(a,center)):actor);
  };
  const resolved=[...sideGroup('left'),...sideGroup('right')];
  const footMargin=Math.max(24,Math.ceil(baseHeight*.06));
  return {contentLeft,contentRight:width-contentLeft,safeLeft,safeRight,maxGap,maxOverlap,
    actors:initial.map(original=>resolved.find(a=>a.key===original.key)!).map(a=>({...a,bottom:footMargin-a.height*(1-a.geometry.bottom),visibleLeft:a.x+a.width*a.alphaLeft,visibleRight:a.x+a.width*a.alphaRight}))};
}
