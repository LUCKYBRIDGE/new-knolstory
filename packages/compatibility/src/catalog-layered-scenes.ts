import {resolveStageComposition,stageActors,stageProjection,type StageComposition,type StoryLine,type StoryProject} from '@knolstory/story-domain';

const O='onggojib.character.';
const rag=O+'layered-ragged-standing-v1', seated=O+'layered-ragged-seated-outside-v1';
const treatment=O+'layered-ragged-seated-treatment-v1', cleanTreatment=O+'layered-clean-seated-treatment-v1';
const wife=O+'wife-concerned-pixel', nurse=O+'layered-wife-kneeling-treatment-v1';
const double=O+'double-blue-gentle-consistent-pixel', offering=O+'double-blue-offering-consistent-pixel';
const real=O+'real-remorse-consistent-pixel', child=O+'youngest-child-pixel', second=O+'second-child-pixel';
const fish='rabbit-turtle.character.layered-fish-courtier-v1',crab='rabbit-turtle.character.layered-crab-courtier-v1';

function composition(assets:string[],focus=0):StageComposition{
 const actors=assets.map((assetId,index)=>({key:assets.length===2?(index?'R1':'L1'):(index<2?'L':'R')+(index%2+1),assetId,
  ...(assets.length===1?{position:'center' as const}:assets.length===2?{xAnchor:index?60:40}:{})}));
 return {leftActors:actors.filter(a=>a.key.startsWith('L')),rightActors:actors.filter(a=>a.key.startsWith('R')),speakerActorKey:actors[focus]?.key};
}
function replace(line:StoryLine,backgroundId:string,assets:string[],focus=0):StoryLine{
 const stage=composition(assets,focus);
 // Spoken side follows the selected actor; narration and every nonvisual field stay intact.
 const speaker=line.type==='dialogue'&&line.speaker!=='narration'
  ? (stage.speakerActorKey?.startsWith('L')?'left':'right') as 'left'|'right':line.speaker;
 const {backgroundMode:_oldMode,...rest}=line;
 return {...rest,backgroundId,inheritActors:false,stageComposition:stage,...stageProjection(stage),speaker};
}
function onggojibIllustration(line:StoryLine):StoryLine{
 const number=Number(line.backgroundId?.match(/shortstory-knolstory-(\d+)$/)?.[1]);
 const bg=(name:string)=>'onggojib.background.'+name+'-pixel';
 switch(number){
  case 1:return replace(line,bg('magistrate-yard'),line.id.includes(':part1-court')
   ?[double,child,O+'real-angry-pixel',O+'posol-pixel']:[double,child,wife,O+'real-angry-pixel'],1);
  case 2:return replace(line,bg('winter-courtyard'),[rag]);
  case 3:return replace(line,bg('winter-courtyard'),[O+'layered-ragged-chopping-v1']);
  case 4:return replace(line,bg('winter-courtyard'),[seated,offering]);
  case 5:return replace(line,bg('warm-room'),[treatment,child,nurse,second],0);
  case 6:return replace(line,bg('warm-room'),[real,child,second],2);
  case 7:return replace(line,bg('winter-courtyard'),[real,O+'worker-woodcutter-v2-pixel',O+'servant-household-pixel']);
  case 8:return replace(line,bg('warm-room'),[O+'real-resolve-consistent-pixel',O+'stranger-hidden-pixel',wife]);
  case 9:return replace(line,bg('warm-room'),[cleanTreatment,nurse]);
  case 10:return replace(line,bg('spring-courtyard'),[real,second,child,wife]);
  default:return line;
 }
}
function groupActors(line:StoryLine,project:StoryProject):StoryLine{
 const stage=resolveStageComposition(project.chapters.find(c=>c.id===line.chapterId),line,project);
 const group=stageActors(stage).find(a=>a.assetId.startsWith(O+'group-'))?.assetId;
 if(!group)return line;
 const companion=group.includes('worker-reward')?{assetId:O+'worker-woodcutter-v2-pixel',characterKey:'onggojib.worker'}
  :group.includes('servant-worker-payment')?{assetId:O+'servant-household-pixel',characterKey:'onggojib.servant'}
  :group.includes('wife-entering')?{assetId:wife,characterKey:'onggojib.wife'}
  :group.includes('child-story')?{assetId:second,characterKey:'onggojib.second-child'}:undefined;
 if(companion){
  // Keep the invisible real husband's own right-side identity and spectral appearance.
  // Two living actors on the left avoid spreading that appearance to his family/servant.
  const original=stage.leftActors.find(a=>a.assetId===group)!;
  const focus=group.includes('worker-reward')?original.key:companion.characterKey;
  const revised:StageComposition={leftActors:[{...original,assetId:double,scaleMultiplier:1,xAnchor:25},
   {key:companion.characterKey,...companion,scaleMultiplier:1,xAnchor:48}],rightActors:stage.rightActors,speakerActorKey:focus};
  return {...line,inheritActors:false,stageComposition:revised,...stageProjection(revised),speaker:line.type==='dialogue'?'left':line.speaker};
 }
 return line;
}
function rabbitCourt(line:StoryLine,project:StoryProject):StoryLine{
 if(line.backgroundId!=='rabbit-turtle.background.classic-court')return line;
 const current=stageActors(resolveStageComposition(project.chapters.find(c=>c.id===line.chapterId),line,project));
 const king=current.find(a=>a.assetId.includes('dragonking'))?.assetId??'rabbit-turtle.character.dragonking-sick-elder-attached';
 const rabbit=current.find(a=>a.assetId.includes('.rabbit-'))?.assetId;
 const assets=rabbit?[rabbit,fish,king,crab]:[fish,crab,king];
 const focus=line.speakerName?.includes('용왕')?2:line.type==='narration'?0:rabbit?0:2;
 return replace(line,'rabbit-turtle.background.rabbit-turtle-bg-palace',assets,focus);
}
/** Called only behind the exact published-catalog fingerprint gate. No prose or route edits. */
export function connectCatalogLayeredScenes(project:StoryProject):StoryProject{
 const states=new Map<string,{ragged:boolean;seated:boolean;treatment:boolean;nurse:boolean;shoes:boolean}>();
 const lines=project.lines.map(source=>{
  let line=source;
  if(project.id==='pinky-review-main-003'){
   line=groupActors(onggojibIllustration(line),project);
   if(line.id.includes(':fake-route')){
    const state={...(states.get(line.chapterId)??{ragged:false,seated:false,treatment:false,nurse:false,shoes:false})};
    if(line.text.startsWith('그 뒤로 얼마나')||line.text.includes('옷과 짚신도 해져'))state.ragged=true;
    if(line.text.includes('눈길에 주저앉았다'))state.seated=true;
    if(line.text.includes('주먹밥 하나를 먹고')){state.seated=false;state.shoes=true;}
    if(line.text.includes('화로 옆에 앉혔다'))state.treatment=true;
    if(line.text.includes('따뜻한 물이 담긴 대야'))state.nurse=true;
    if(line.text.startsWith('보름 뒤'))state.ragged=false;
    states.set(line.chapterId,state);
    if(state.ragged){
     const old=resolveStageComposition(project.chapters.find(c=>c.id===line.chapterId),line,project);
     const actorAsset=state.treatment?treatment:state.seated?seated:state.shoes?O+'layered-ragged-replacement-shoes-v1':rag;
     const swap=(a:StageComposition['leftActors'][number])=>({...a,assetId:a.assetId.startsWith(O+'real-')||a.assetId===O+'classic-worn-reflection'?actorAsset:state.nurse&&a.assetId.startsWith(O+'wife-')?nurse:a.assetId});
     const stage={...old,leftActors:old.leftActors.map(swap),rightActors:old.rightActors.map(swap)};
     line={...line,inheritActors:false,stageComposition:stage,...stageProjection(stage)};
    }
   }
   if(line.id.includes(':b-final-acts:')){
    const index=Number(line.id.split(':').at(-1));
    if(index>=4&&index<=15)line=replace(line,'onggojib.background.warm-room-pixel',[cleanTreatment,nurse],line.speakerName==='부인'?1:0);
   }
  }
  if(line.backgroundId==='heungbu.scene.nolbu-goblin-chaos'){
   line=replace(line,'heungbu.background.layered-goblin-courtyard-v1',['heungbu.character.nolbu-angry','heungbu.character.layered-dokkaebi-hat-v1','heungbu.character.wife-nolbu-shocked'],line.type==='narration'?1:0);
  }
  return rabbitCourt(line,project);
 });
 const chapters=project.chapters.map(chapter=>{
  const own=lines.filter(l=>l.chapterId===chapter.id);
  const backgrounds=own.flatMap(l=>l.backgroundId?[l.backgroundId]:[]);
  const characters=own.flatMap(l=>stageActors(resolveStageComposition(chapter,l,project)).map(a=>a.assetId));
  return {...chapter,backgroundAssetIds:[...new Set([...(chapter.backgroundAssetIds??[]),...backgrounds])],characterAssetIds:[...new Set([...(chapter.characterAssetIds??[]),...characters])]};
 });
 return {...project,lines,chapters};
}
