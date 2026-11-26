import {branchChapterNumbering,normalizeChapterTitle,type Chapter,type StoryProject} from '@knolstory/story-domain';

type Numbered=Pick<StoryProject,'chapters'|'lines'>;
const same=(chapter:Chapter,identity:{chapterNumber:number;branchLabel?:string})=>(chapter.chapterNumber??chapter.order)===identity.chapterNumber&&(chapter.branchLabel?.trim()??'')===(identity.branchLabel??'');

/** Whether every chapter a reader can reach already carries the number and letters the links give it. */
export function followsBranchNumbering(project:Numbered):boolean{
 // A number written into a title (“7장 · 동굴”) is the writer's own name for the chapter: leave such works as written.
 if(project.chapters.some(chapter=>/^\d+\s*장/u.test(normalizeChapterTitle(chapter.title).trim())))return false;
 const numbering=branchChapterNumbering(project);
 return project.chapters.every(chapter=>{const identity=numbering.identities.get(chapter.id);return !identity||same(chapter,identity);});
}

/**
 * After a structural edit (나누기, 장 넣기, 장 옮기기), keep chapter names on the shared rule (`branchChapterNumbering`)
 * when the work was on that rule before. Names a writer set by hand (the work did not follow the rule) stay.
 * Chapters a reader cannot reach keep their names.
 */
export function syncBranchNumbering(before:Numbered,after:StoryProject):StoryProject{
 if(!followsBranchNumbering(before))return after;
 const numbering=branchChapterNumbering(after);
 let changed=false;
 const chapters=after.chapters.map(chapter=>{
  const identity=numbering.identities.get(chapter.id);
  if(!identity||same(chapter,identity))return chapter;
  changed=true;
  const {branchLabel:_old,...rest}=chapter;
  return {...rest,chapterNumber:identity.chapterNumber,...(identity.branchLabel?{branchLabel:identity.branchLabel}:{})};
 });
 return changed?{...after,chapters}:after;
}
