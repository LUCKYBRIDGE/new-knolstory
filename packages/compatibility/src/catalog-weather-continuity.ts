import type {StoryProject} from '@knolstory/story-domain';
// The initial storm continues through the encounter, choice, and both reactions.
const firstStormChapters=new Set(['1-v163','C1-v162','C1-A-v106','C1-B-v161']);
const bg=(name:string)=>'seonnyeo.background.'+name;
const sunnyValley=bg('BG01-valley-day'),stormValley=bg('BG02-valley-storm');
const moonValley=bg('BG03-valley-moon-gate'),roots=bg('BG-forest-roots');
const secondStormChapters=['14-v52','14-v73','14-v84','14-v89','14-v122','14-v129','14-v142','14-v144'];
const roomChapters=['R1-v13','R1-v61','R1-v86','R1-v107'];
const choiceChapters=['C4-v51','C4-v72','C4-v88','C4-v121','C4-v128','C4-v141'];
type WeatherCut=Readonly<{id:string;chapterId:string;order:number;before:string;after:string}>;
function reviewedCuts(chapters:readonly string[],orders:readonly number[],before:string,after:string):WeatherCut[]{
 return chapters.flatMap(chapterId=>orders.map(order=>({id:`${chapterId}-${order}`,chapterId,order,before,after})));
}
// The same chapter includes heavy rain at night, daylight after the storm, and a
// moonlit descent. Never replace the whole chapter or its daylight cuts2–8.
const laterCuts=new Map([
 ...reviewedCuts(secondStormChapters,[1],roots,stormValley),
 ...reviewedCuts(secondStormChapters,Array.from({length:12},(_,i)=>i+9),roots,moonValley),
 ...reviewedCuts(choiceChapters,[1],roots,moonValley),
 ...reviewedCuts(roomChapters,Array.from({length:23},(_,i)=>i+1),bg('BG09-room-day'),bg('BG-room-night')),
].map(cut=>[cut.id,cut]));
/** Only call inside the resolver's exact published-catalog fingerprint gate. */
export function connectCatalogWeatherContinuity(project:StoryProject):StoryProject{
 if(project.id!=='pinky-review-main-004')return project;
 const lines=project.lines.map(line=>{
  if(firstStormChapters.has(line.chapterId)&&line.backgroundId===sunnyValley)return {...line,backgroundId:stormValley};
  const correction=laterCuts.get(line.id);
  return correction&&line.chapterId===correction.chapterId&&line.order===correction.order&&line.backgroundId===correction.before
   ?{...line,backgroundId:correction.after}:line;
 });
 return lines.some((line,index)=>line!==project.lines[index])?{...project,lines}:project;
}
