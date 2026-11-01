import type {StoryProject} from '@knolstory/story-domain';

type TitleEdit=Readonly<{before:string;after:string}>;
// These are catalog editorial corrections, not rules for naming an author's own chapters.
const onggojibTitles:Readonly<Record<string,TitleEdit>>={
 'review-main-003:b-meal-act':{before:'돌아온 뒤',after:'아이의 이야기를 듣다'},
 'review-main-003:b-meal-slip':{before:'돌아온 뒤',after:'말을 삼킨 아이들'},
 'review-main-003:b-after-meal-days':{before:'돌아온 뒤',after:'장작 스무 단과 약속한 삯'},
 'review-main-003:b-child-scene':{before:'돌아온 뒤',after:'말없이 지난 며칠'},
 'review-main-003:b-vase-care':{before:'돌아온 뒤',after:'약속한 몫을 주다'},
 'review-main-003:b-vase-care-after-harsh':{before:'돌아온 뒤',after:'아이에게 다시 묻다'},
 'review-main-003:b-vase-stick':{before:'돌아온 뒤',after:'돌이킨 한마디'},
 'review-main-003:b-before-confession-days':{before:'돌아온 뒤',after:'웃음이 돌아온 저녁'},
};
const seonnyeoTitles:Readonly<Record<string,TitleEdit>>={
 'C1-A':{before:'선택 1-A 반응',after:'바위 위에 놓인 물통'},
 'C1-B':{before:'선택 1-B 반응',after:'앞서 걷는 나무꾼'},
 'C2-A':{before:'선택 2-A 반응',after:'함께 찾기로 한 약속'},
 'C2-B':{before:'선택 2-B 반응',after:'기다려 주는 마음'},
 'C3-A':{before:'선택 3-A 반응',after:'그리운 하늘의 가족'},
 'C3-B':{before:'선택 3-B 반응',after:'떠날까 두려운 마음'},
 'C6C-A':{before:'마지막 선택 A',after:'약속을 재촉하지 않는 말'},
 'C6C-B':{before:'마지막 선택 B',after:'붙잡고 싶은 약속'},
 'C6L-A':{before:'마지막 선택 A',after:'문 앞에서 멈추다'},
 'C6L-B':{before:'마지막 선택 B',after:'문 옆으로 물러서다'},
};

/** Only the exact catalog IDs and still-unchanged production titles are eligible. */
export function renameProvidedChapterTitles(project:StoryProject):StoryProject{
 const titles=project.id==='pinky-review-main-003'?onggojibTitles:project.id==='pinky-review-main-004'?seonnyeoTitles:undefined;
 if(!titles)return project;
 const chapters=project.chapters.map(chapter=>{
  const key=project.id==='pinky-review-main-004'?chapter.id.replace(/-v\d+$/u,''):chapter.id;
  const edit=titles[key];
  return edit&&chapter.title===edit.before?{...chapter,title:edit.after}:chapter;
 });
 return chapters.some((chapter,index)=>chapter!==project.chapters[index])?{...project,chapters}:project;
}
