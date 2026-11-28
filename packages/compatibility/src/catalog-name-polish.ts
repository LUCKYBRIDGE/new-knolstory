import type {StoryProject} from '@knolstory/story-domain';

/* Catalog editorial names, 2026-11-28 review of the four provided works.
 * Names keep places, objects and the opening act or question of a chapter or page; how a reversal
 * happens, what a choice leads to and how a character finally changes stay in the reading text.
 * The PRESERVE sources (fixtures, shortstory-originals-data.json) remain exact; names are applied
 * only while building the current provided edition, and only over the still-unchanged name. */
type NameEdit=Readonly<{before:string;after:string}>;
type CatalogNames=Readonly<{
 title?:NameEdit;subtitle?:NameEdit;
 /** Keyed by catalog chapter ID without the revision (-vN) or carried-choice (-cruelty-…) suffix. */
 chapters?:Readonly<Record<string,NameEdit>>;
 /** Lines that repeat a chapter name verbatim, e.g. the 「…」 heading before 생각해 보기. */
 headings?:Readonly<Record<string,NameEdit>>;
}>;

const catalogNames:Readonly<Record<string,CatalogNames>>={
 'classic-rabbit-tale':{chapters:{
  'classic-rabbit-4':{before:'토끼가 낸 꾀',after:'용왕 앞의 토끼'},
  'classic-rabbit-5':{before:'다시 밟은 육지',after:'파도 너머'},
 }},
 'pinky-review-main-002':{chapters:{
  'review-main-002:obey-route':{before:'첫마디: 용궁 잔치',after:'용궁 잔치 이야기'},
  'review-main-002:hesitate-route':{before:'첫마디: 도움 요청',after:'도움을 청하다'},
  'review-main-002:palace':{before:'초대가 함정으로 바뀌는 순간',after:'방석 하나'},
  'review-main-002:ending-1':{before:'진실을 말한 자라',after:'대청의 침묵'},
  'review-main-002:shield-route':{before:'확인하러 가겠다는 말',after:'용왕의 눈길'},
 },headings:{
  'review-main-002:ending-1:15':{before:'「진실을 말한 자라」',after:'「대청의 침묵」'},
 }},
 'classic-onggojib-tale':{subtitle:{before:'진짜와 가짜가 벌이는 기묘한 다툼',after:'누가 이 집의 주인일까?'},chapters:{
  'classic-onggojib-2':{before:'또 하나의 옹고집',after:'곡식 한 줌'},
  'classic-onggojib-5':{before:'쫓겨난 옹고집',after:'문밖의 밤'},
  'classic-onggojib-6':{before:'다시 열린 대문',after:'산길 끝에서'},
 }},
 'pinky-review-main-003':{title:{before:'옹고집전: 옹고집의 속죄',after:'옹고집전'},subtitle:{before:'',after:'대문 밖의 목소리'},chapters:{
  'review-main-003:start':{before:'아내의 대답',after:'겨울 저녁의 밥상'},
  // Both carried-choice copies and the preserved disconnected manuscript of each verdict scene.
  'review-main-003:real-route':{before:'돌아온 옹고집',after:'말 없는 밥상'},
  'review-main-003:fake-first-verdict':{before:'첫 번째 판결',after:'아이들의 손'},
  'review-main-003:real-loop-testimony':{before:'되풀이된 판정',after:'식은 국'},
  'review-main-003:fake-repeat-verdict':{before:'두 번째 판결',after:'부인의 한마디'},
  'review-main-003:fake-route':{before:'쫓겨난 옹고집',after:'눈길과 짚신'},
  'review-main-003:b-after-meal-days':{before:'장작 스무 단과 약속한 삯',after:'마당의 장작'},
  'review-main-003:b-vase-care':{before:'약속한 몫을 주다',after:'일꾼의 삯'},
  'review-main-003:b-vase-stick':{before:'돌이킨 한마디',after:'갈라진 손등'},
  'review-main-003:b-before-confession-days':{before:'웃음이 돌아온 저녁',after:'화롯가의 저녁'},
  'review-main-003:b-final-acts':{before:'옹고집의 고백',after:'늦은 밤의 손님'},
 }},
 'classic-seonnyeo-tale':{subtitle:{before:'하늘과 땅 사이에서 이어진 만남과 이별',after:'하늘과 땅 사이'},chapters:{
  'classic-seonnyeo-1':{before:'사슴의 보은',after:'숲에서 만난 사슴'},
  'classic-seonnyeo-3':{before:'다시 나타난 날개옷',after:'사슴의 당부'},
  'classic-seonnyeo-4':{before:'하늘로 떠난 가족',after:'구름을 바라보며'},
  'classic-seonnyeo-5':{before:'두레박 너머 하늘나라',after:'하늘에서 내려온 줄'},
  'classic-seonnyeo-6':{before:'돌아오지 못한 길',after:'용마를 타고'},
 }},
 // One scene recurs under several chapter numbers by earlier choices; every revision shares its name.
 'pinky-review-main-004':{chapters:{
  '1':{before:'나무꾼의 등장',after:'빗속의 만남'},
  '4':{before:'정체',after:'산보다 더 위'},
  '12':{before:'평범한 부부',after:'장에 가는 날'},
  // Chapter names only: the reader's choice question is a separate line and stays as written.
  'C4':{before:'선녀옷을 어떻게 할까?',after:'날개옷을 어떻게 할까?'},
  'C5R':{before:'선녀의 선택을 어떻게 마주할까?',after:'선녀의 대답 앞에서'},
  'E1-2':{before:'올라가는 날',after:'보름달 아래'},
  'E2-2':{before:'남기로 한 밤',after:'새벽까지'},
  'E4-1':{before:'직접적인 거짓말',after:'정말요?'},
  'E1-4':{before:'존중과 이별',after:'두 곳의 아침'},
  'E2-4':{before:'지상에서의 약속',after:'마당의 작은 싹'},
  'E3-5':{before:'늦은 고백과 다시 내린 비',after:'비 내리는 마당'},
  'E4-9':{before:'영원히 닫힌 문',after:'장롱에 든 햇빛'},
 }},
 'classic-heungbu-tale':{subtitle:{before:'흥부와 놀부로 널리 알려진 이야기',after:'흥부와 놀부'},chapters:{
  'classic-heungbu-1':{before:'쫓겨난 흥부',after:'갈라진 살림'},
  'classic-heungbu-7':{before:'다시 만난 형제',after:'놀부의 집터'},
 }},
 // The choice-story framing the old subtitle carried stays in the description shown on the book page.
 'heungbu-nolbu-nolstory':{title:{before:'흥부와 놀부, 서로의 몫',after:'흥부와 놀부'},subtitle:{before:'도움과 책임을 생각하는 선택형 이야기',after:'서로의 몫'},chapters:{
  'chapter-8':{before:'놀부에게 생긴 불편한 마음',after:'놀부의 방문'},
  'chapter-12a':{before:'함께 짓는 밭',after:'한 지붕 아래'},
 }},
};

const sceneId=(id:string)=>id.replace(/-v\d+$/u,'').replace(/-cruelty-.+$/u,'');
const rename=(value:string,edit:NameEdit|undefined)=>edit&&value===edit.before?edit.after:value;

/** Called only after the catalog resolver's exact-version gate; IDs, order, links and text stay intact. */
export function polishCatalogNames(project:StoryProject):StoryProject{
 const names=catalogNames[project.id];
 if(!names)return project;
 const chapters=project.chapters.map(chapter=>{const title=rename(chapter.title,names.chapters?.[sceneId(chapter.id)]);return title===chapter.title?chapter:{...chapter,title};});
 const lines=project.lines.map(line=>{
  const edit=names.headings?.[line.id];
  return edit&&line.text.startsWith(edit.before)?{...line,text:edit.after+line.text.slice(edit.before.length)}:line;
 });
 const title=rename(project.title,names.title);
 const cover=project.cover&&names.subtitle&&project.cover.subtitle===names.subtitle.before?{...project.cover,subtitle:names.subtitle.after}:project.cover;
 const changed=title!==project.title||cover!==project.cover||chapters.some((c,i)=>c!==project.chapters[i])||lines.some((l,i)=>l!==project.lines[i]);
 return changed?{...project,title,cover,chapters,lines}:project;
}

/** Shortstory originals: page names by the preserved source scene ID, over the unchanged pack title. */
const shortStoryPageNames:Readonly<Record<string,NameEdit>>={
 'rabbit-classic-06':{before:'위기를 뒤집는 꾀',after:'토끼의 한마디'},
 'rabbit-classic-07':{before:'다시 밟은 땅',after:'물가에서'},
 'rabbit-classic-08':{before:'숲으로 돌아간 토끼',after:'숲과 물가'},
 'onggojib-classic-02':{before:'쫓겨난 승려',after:'대문 앞의 승려'},
 'onggojib-classic-03':{before:'또 다른 옹고집',after:'도승의 손길'},
 'onggojib-classic-07':{before:'풀과 짚으로 돌아가다',after:'도승이 건넨 부적'},
 'seonnyeo-classic-03':{before:'돌아가지 못한 선녀',after:'낯선 산골집'},
 'seonnyeo-classic-05':{before:'하늘로 떠난 가족',after:'구름 아래 마당'},
 'seonnyeo-classic-07':{before:'하늘나라의 재회',after:'구름 위의 집'},
 'seonnyeo-classic-08':{before:'용마 위에서 만난 어머니',after:'땅으로 가는 용마'},
 'seonnyeo-classic-09':{before:'돌아오지 못한 길',after:'말 위의 호박죽'},
 'heungbu-classic-01':{before:'쫓겨난 흥부 가족',after:'대문 밖의 가족'},
 'heungbu-classic-03':{before:'다친 제비를 돌보다',after:'다친 제비'},
 'heungbu-classic-04':{before:'제비가 가져온 박씨',after:'돌아온 제비'},
 'heungbu-classic-05':{before:'박 속에서 나온 선물',after:'박을 타는 날'},
 'heungbu-classic-06':{before:'욕심으로 흉내 낸 놀부',after:'놀부와 제비'},
 'heungbu-classic-07':{before:'다른 박의 소동',after:'놀부의 박'},
 'heungbu-classic-08':{before:'다시 만난 형제',after:'형을 찾아서'},
};
export function shortStoryOriginalPageTitle(sceneId:string,title:string):string{return rename(title,shortStoryPageNames[sceneId]);}
