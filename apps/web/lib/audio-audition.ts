export type AuditionSource=Readonly<{sourceStartMs?:number;sourceEndMs?:number}>;
export type AuditionBounds=Readonly<{start:number;end:number}>;
export function audioAuditionBounds(source:AuditionSource,duration:number):AuditionBounds|null{
 if(!Number.isFinite(duration)||duration<=0||[source.sourceStartMs,source.sourceEndMs].some(value=>value!==undefined&&(!Number.isInteger(value)||value<0)))return null;
 const start=(source.sourceStartMs??0)/1000,end=Math.min(duration,(source.sourceEndMs??duration*1000)/1000);
 return end>start?{start,end}:null;
}
export function audioAuditionPosition(bounds:AuditionBounds,current:number,event:'play'|'seek'|'time'):Readonly<{position:number;stop:boolean}>{
 if(current>=bounds.end)return event==='play'?{position:bounds.start,stop:false}:{position:bounds.end,stop:true};
 return {position:Math.max(bounds.start,current),stop:false};
}
