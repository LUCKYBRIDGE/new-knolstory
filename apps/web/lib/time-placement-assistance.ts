import type {CombinedTimeItem} from './combined-time-edit';
type Timing=Pick<CombinedTimeItem,'key'|'clock'|'startMs'|'durationMs'|'loop'>;
type Placement=Readonly<{startMs:number;edge?:'start'|'end';guideMs?:number}>;
/** Move a whole bar without changing its length or crossing between start clocks. */
export function snapTimePlacement(item:Timing,requested:number,items:readonly Timing[],guideMs:number,toleranceMs:number):Placement{
 const startMs=Math.max(0,Math.min(10000,Math.round(requested)));
 const marks=[guideMs,0,...items.filter(other=>other.key!==item.key&&other.clock===item.clock).flatMap(other=>[other.startMs,...(other.durationMs!==undefined&&!other.loop?[other.startMs+other.durationMs]:[])])];
 const edges:readonly ('start'|'end')[]=item.durationMs!==undefined&&!item.loop?['start','end']:['start'];
 let best:Placement={startMs},distance=toleranceMs;
 for(const mark of marks){
  for(const edge of edges){
   const candidate=mark-(edge==='end'?item.durationMs!:0),delta=Math.abs(candidate-startMs);
   if(candidate<0||candidate>10000||delta>toleranceMs||(best.edge!==undefined&&delta>=distance))continue;
   best={startMs:candidate,edge,guideMs:mark};distance=delta;
  }
 }
 return best;
}
