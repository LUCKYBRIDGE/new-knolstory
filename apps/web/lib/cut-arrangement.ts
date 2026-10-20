export type CutArrangement='auto'|'columns'|'stacked';
/** Compare the editing area's orientation, never change the story canvas ratio. */
export function resolveCutArrangement(preference:CutArrangement,size?:Readonly<{width:number;height:number}>):Exclude<CutArrangement,'auto'>{
 if(preference==='columns'||preference==='stacked')return preference;
 if(!size||!Number.isFinite(size.width)||!Number.isFinite(size.height)||size.width<=0||size.height<=0)return 'columns';
 // The logarithmic midpoint of16:9 and9:16 is1:1.
 return size.width<size.height?'stacked':'columns';
}
