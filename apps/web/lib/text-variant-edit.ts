import {isStoryTextVariants,type StoryTextVariant} from '@knolstory/story-domain';
type Variants=StoryTextVariant[]|undefined;
function validate(value:StoryTextVariant[]){if(!isStoryTextVariants(value))throw Error('조건별 글의 ID·본문·점수 조건을 확인해 주세요.');return value;}
function indexOf(list:Variants,id:string){const index=list?.findIndex(item=>item.id===id)??-1;if(index<0)throw Error('선택한 조건별 글을 찾을 수 없어요.');return index;}
export function appendTextVariant(list:Variants,id:string,text:string,scoreId:string){if(!scoreId.trim())throw Error('점수 항목을 먼저 만들어 주세요.');return validate([...(list??[]),{id,text,condition:{mode:'all',terms:[{scoreId,operator:'gte',value:1}]}}]);}
export function updateTextVariant(list:Variants,id:string,patch:Partial<StoryTextVariant>){indexOf(list,id);return validate(list!.map(item=>item.id===id?{...item,...structuredClone(patch)}:item));}
export function moveTextVariant(list:Variants,id:string,direction:number){const index=indexOf(list,id),target=index+direction;if(!Number.isInteger(target)||target<0||target>=list!.length)throw Error('옮길 위치를 확인해 주세요.');return list!.map((item,i)=>i===index?list![target]:i===target?list![index]:item);}
export function deleteTextVariant(list:Variants,id:string){indexOf(list,id);const next=list!.filter(item=>item.id!==id);return next.length?next:undefined;}
export function createTextVariantUndo(projectId:string,lineId:string,before:Variants,after:Variants){return {projectId,lineId,before:structuredClone(before),after:structuredClone(after)};}
export type TextVariantUndo=ReturnType<typeof createTextVariantUndo>;
export function undoTextVariants(projectId:string,lineId:string,current:Variants,undo:TextVariantUndo){if(projectId!==undo.projectId||lineId!==undo.lineId||JSON.stringify(current)!==JSON.stringify(undo.after))throw Error('조건별 글이 이후 바뀌어 취소하지 않았어요. 현재 원고를 유지해요.');return structuredClone(undo.before);}
