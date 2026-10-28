export type PinchPoint={clientX:number;clientY:number};
export type TimelinePinch={distance:number;zoom:number;contentPoint:number};
const distance=(a:PinchPoint,b:PinchPoint)=>Math.max(1,Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY));
const midpoint=(a:PinchPoint,b:PinchPoint,axisLeft:number)=>Math.max(0,(a.clientX+b.clientX)/2-axisLeft);
export function beginTimelinePinch(a:PinchPoint,b:PinchPoint,zoom:number,scrollLeft:number,axisLeft:number):TimelinePinch{
 return {distance:distance(a,b),zoom,contentPoint:(scrollLeft+midpoint(a,b,axisLeft))/zoom};
}
export function moveTimelinePinch(start:TimelinePinch,a:PinchPoint,b:PinchPoint,axisLeft:number,minZoom:number){
 const zoom=Math.max(minZoom,Math.min(400,Math.round(start.zoom*distance(a,b)/start.distance)));
 return {zoom,scrollLeft:Math.max(0,start.contentPoint*zoom-midpoint(a,b,axisLeft))};
}
