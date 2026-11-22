import {readFileSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {expect,test,type Page,type TestInfo} from '@playwright/test';

const globals=readFileSync(new URL('../../apps/web/app/globals.css',import.meta.url),'utf8');
const tokenNames=[...new Set(globals.match(/--text-[\w-]+(?=\s*:)/g))];
const sizes=[[320,568],[360,740],[390,844],[740,360]] as const;

type Finding = {
 rule:'large'|'token'|'box'|'viewport'|'overlap';
 element:string;
 other?:string;
 reason:string;
 amount:number;
 intentional?:string;
};
type Screen = {screen:string;viewport:string;tokens:number[];inspected:number;findings:Finding[]};

async function collect(page:Page,screen:string):Promise<Screen>{
 await page.evaluate(async()=>{
  await document.fonts.ready;
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
 });
 const result=await page.evaluate(names=>{
  const root=document.documentElement,rootStyle=getComputedStyle(root);
  const tokens=[...new Set(names.map(name=>Number.parseFloat(rootStyle.getPropertyValue(name))).filter(Number.isFinite))].sort((a,b)=>a-b);
  const viewportWidth=root.clientWidth,viewportHeight=window.innerHeight;
  const findings:Finding[]=[];
  const epsilon=1;
  const ignored='[hidden],[inert],[aria-hidden="true"],dialog:not([open]),canvas,iframe,svg,[data-cover-face]';
  const computed=new Map<Element,CSSStyleDeclaration>();
  const style=(element:Element)=>{
   let value=computed.get(element);
   if(!value){value=getComputedStyle(element);computed.set(element,value);}
   return value;
  };
  const suppressed=new Map<Element,boolean>();
  function hidden(element:Element):boolean{
   const cached=suppressed.get(element);
   if(cached!==undefined)return cached;
   const css=style(element),parent=element.parentElement;
   const rect=element.getBoundingClientRect();
   const closedDetails=parent?.matches('details:not([open])')&&element!==parent.querySelector(':scope > summary');
   const value=element.matches(ignored)||!!closedDetails||
    css.display==='none'||css.visibility!=='visible'||css.contentVisibility==='hidden'||Number(css.opacity)===0||
    css.clip!=='auto'||css.clipPath!=='none'||
    (css.display!=='contents'&&rect.width<=2&&rect.height<=2)||
    !!parent&&hidden(parent);
   suppressed.set(element,value);
   return value;
  }
  function label(element:Element,text:string){
   const localClasses=[...element.classList].map(name=>name.replace(/^.*-module__.*?__/,'')).sort();
   const id=element.id&&!element.id.startsWith('_r_')?'#'+element.id:'';
   return `${element.localName}${id}${localClasses.map(name=>'.'+name).join('')} «${text.replace(/\s+/g,' ').trim().slice(0,90)}»`;
  }
  function ancestors(element:Element){
   const result:Element[]=[];
   for(let parent:Element|null=element;parent;parent=parent.parentElement)result.push(parent);
   return result;
  }
  function scrolls(chain:Element[],axis:'x'|'y'){
   return chain.some(node=>node!==root&&node!==document.body&&['auto','scroll'].includes(axis==='x'?style(node).overflowX:style(node).overflowY));
  }
  function add(rule:Finding['rule'],element:string,reason:string,amount:number,other?:string,intentional?:string){
   findings.push({rule,element,other,reason,amount:Math.round(amount*10)/10,intentional});
  }
  function visibleRects(rects:DOMRect[],chain:Element[]){
   // Scrollport/clipping can hide a range even when the range still has geometry.
   const clips=chain.slice(1).filter(node=>node!==root&&node!==document.body)
    .map(node=>({node,x:style(node).overflowX!=='visible',y:style(node).overflowY!=='visible'}))
    .filter(clip=>clip.x||clip.y);
   for(const clip of clips){
    const box=clip.node.getBoundingClientRect();
    rects=rects.flatMap(rect=>{
     const x=clip.x?Math.max(rect.left,box.left):rect.left;
     const y=clip.y?Math.max(rect.top,box.top):rect.top;
     const right=clip.x?Math.min(rect.right,box.right):rect.right;
     const bottom=clip.y?Math.min(rect.bottom,box.bottom):rect.bottom;
     return right>x&&bottom>y?[new DOMRect(x,y,right-x,bottom-y)]:[];
    });
   }
   return rects;
  }
  // These specific classroom bars deliberately paint over their own scrolling content.
  const allowedLayering=[
   {bar:'[class*="__navPin"]',content:'[class*="__wrap"]',reason:'학급 고정 주 메뉴 아래로 본문이 스크롤됨'},
   {bar:'[aria-label="선택한 학생에게 적용"]',content:'[aria-label="학생 목록"]',reason:'선택한 학생 도구 막대가 학생 목록 위에 붙음'},
  ];
  function intentionalOverlap(a:Element,b:Element){
   for(const {bar,content,reason} of allowedLayering){
    const first=a.closest(bar),second=b.closest(bar),overlay=first??second;
    if(!overlay||(first&&second)||!['sticky','fixed'].includes(style(overlay).position))continue;
    const underlying=first?b:a;
    const owner=overlay.closest(content);
    if(owner&&owner.contains(underlying))return reason;
   }
  }
  const textBoxes:{node:Element;name:string;rects:DOMRect[]}[]=[];
  let inspected=0;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const direct=new Map<Element,Text[]>();
  for(let node=walker.nextNode();node;node=walker.nextNode()){
   const element=node.parentElement;
   if(!element||!node.textContent?.trim()||element.matches('script,style,template,noscript,option'))continue;
   const texts=direct.get(element)??[];
   texts.push(node as Text);
   direct.set(element,texts);
  }
  // These native controls paint text in an internal viewport with no visible DOM range.
  function controlText(field:Element){
   if(field instanceof HTMLSelectElement)return field.selectedOptions[0]?.text??'';
   if(field instanceof HTMLInputElement||field instanceof HTMLTextAreaElement)return field.value||field.placeholder;
   return '';
  }
  for(const field of document.querySelectorAll('input:not([type]),input:is([type=text],[type=search],[type=email],[type=password],[type=number],[type=url],[type=tel]),textarea,select')){
   if(!direct.has(field)&&controlText(field))direct.set(field,[]);
  }
  for(const [element,nodes] of direct){
   if(hidden(element))continue;
   const field=element instanceof HTMLInputElement||element instanceof HTMLTextAreaElement?element:null;
   const text=nodes.length?nodes.map(node=>node.data).join(' '):controlText(element);
   const css=style(element);
   const font=Number.parseFloat(field&&!field.value&&field.placeholder?getComputedStyle(field,'::placeholder').fontSize:css.fontSize);
   if(!(font>0))continue;
   const rects=nodes.flatMap(node=>{
    const range=document.createRange();
    range.setStart(node,node.data.length-node.data.trimStart().length);
    range.setEnd(node,node.data.trimEnd().length);
    return [...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);
   });
   if(!rects.length&&nodes.length)continue;
   inspected++;
   const name=label(element,text);
   if(window.innerWidth<=430&&font>28) add('large',name,`글씨 ${font}px · 작은 화면 최대 28px`,font-28);
   if(!tokens.some(value=>Math.abs(value-font)<.05)) add('token',name,`글씨 ${font}px · 적용 토큰 ${tokens.join(' / ')}px 외`,font);
   if(!rects.length)continue;
   const chain=ancestors(element);
   const fixed=chain.some(node=>style(node).position==='fixed');
   const scrollX=scrolls(chain,'x'),scrollY=scrolls(chain,'y');
   const containingBox=chain.find(node=>!['inline','contents'].includes(style(node).display));
   const bounds=containingBox?.getBoundingClientRect();
   const right=Math.max(...rects.map(rect=>rect.right)),bottom=Math.max(...rects.map(rect=>rect.bottom));
   const left=Math.min(...rects.map(rect=>rect.left)),top=Math.min(...rects.map(rect=>rect.top));
   if(bounds){
    if(!scrollX&&right>bounds.right+epsilon) add('box',name,'자기 칸 오른쪽으로 넘침',right-bounds.right);
    if(!scrollY&&bottom>bounds.bottom+epsilon) add('box',name,'자기 칸 아래로 넘침',bottom-bounds.bottom);
   }
   // Ordinary content below the fold can scroll into view. Fixed content cannot.
   const outsideX=Math.max(-left,right-viewportWidth);
   const outsideY=Math.max(-(top+(fixed?0:window.scrollY)),bottom+(fixed?0:window.scrollY)-(fixed?viewportHeight:root.scrollHeight));
   if(!scrollX&&outsideX>epsilon) add('viewport',name,'화면 좌우 경계를 벗어남',outsideX);
   if(!scrollY&&outsideY>epsilon) add('viewport',name,'세로로 도달할 수 있는 화면 경계를 벗어남',outsideY);
   textBoxes.push({node:element,name,rects:visibleRects(rects,chain)});
  }
  for(const [i,box] of textBoxes.entries()){
   for(const other of textBoxes.slice(i+1)){
    if(box.node.contains(other.node)||other.node.contains(box.node))continue;
    const overlap=Math.max(0,...box.rects.flatMap(a=>other.rects.map(b=>Math.min(
     Math.min(a.right,b.right)-Math.max(a.left,b.left),
     Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top),
    ))));
    if(overlap>4){
     const [a,b]=[box.name,other.name].sort();
     add('overlap',a,'서로 다른 글의 실제 줄 상자가 겹침',overlap,b,intentionalOverlap(box.node,other.node));
    }
   }
  }
  return {tokens,inspected,findings};
 },tokenNames);
 expect(result.tokens.length,'globals.css의 적용 글자 토큰').toBeGreaterThan(0);
 expect(result.inspected,`${screen}에서 측정한 글 요소 수`).toBeGreaterThan(0);
 const {width,height}=page.viewportSize()!;
 return {screen,viewport:`${width}×${height}`,...result};
}

async function classroom(page:Page,role:'teacher'|'student'|'guest'){
 const permissions={text:true,images:true,characters:true,audio:true,direction:true,choices:true,newWorks:true,forcedStoryKey:null};
 const assignment={id:'a1',format:'knolstory',title:'내 이야기 쓰기',description:'세 컷을 써 보세요.',storyKey:null,open:true,createdAt:1795219200000,submittedAt:null,submittedCount:0};
 const summary={id:'c1',name:'3반',classCode:'ABC234',studentCount:2};
 const students=[{number:1,name:'하늘',password:'4821',permissions:null,hasQr:false},
  {number:2,name:'바다',password:'7315',permissions:null,hasQr:false}];
 const accountId='11111111-1111-4111-8111-111111111111';
 const data:Record<string,unknown>={
  'auth/config':{signupProvider:'kakao',providers:{kakao:true,google:false}},
  me:{accountId,csrf:'csrf-1'},
  'class/me':role==='teacher'?{role,account:{id:accountId},classroom:summary}:
   {role,account:{id:accountId},student:{number:1,name:'하늘',classId:'c1',className:'3반',permissions}},
  'class/classroom':{...summary,defaultPermissions:permissions,students},
  'class/classroom/assignments':[assignment],
  'class/classroom/missions':[],
 };
 await page.route('**/api/v1/**',route=>{
  const path=new URL(route.request().url()).pathname.replace('/api/v1/','');
  const status=role==='guest'&&path!=='auth/config'?401:path in data?200:404;
  return route.fulfill({status,json:status===200?{success:true,data:data[path]}:
   {success:false,error:{code:status===401?'SESSION_REQUIRED':'INVALID_REQUEST'}}});
 });
}

// Known on main 5cee7271. Entries match one screen, size, rule and exact label.
const rabbitText='p.storyText «용왕이 깊은 병에 걸렸어요. 토끼의 간이 약이 된다는 말을 듣고, 별주부가 토끼를 찾아 육지로 가겠다고 나섰어요.»';
type Known = {screen:string;viewport:string;rule:Finding['rule'];element:string;maximum:number;reason:string;detail?:string};
function landscapeTokens(screen:string,pixels:number,elements:string[],reason:string):Known[]{
 return elements.map(element=>({screen,viewport:'740×360',rule:'token',element,maximum:pixels,reason}));
}
const known:Known[]=[
 // The count uses a browser-scaled <small>, rather than an explicit caption token.
 ...sizes.map(([w,h]):Known=>({screen:'학생 할 일',viewport:`${w}×${h}`,rule:'token',element:'small «1»',
  maximum:w===740?14.2:13.3,reason:'할 일 그룹 수에 기본 small 비율이 적용됨'})),
 // Current Korean wrapping leaves the last glyphs slightly past the prose box.
 {screen:'숏스토리 표지와 1쪽',viewport:'390×844',rule:'box',element:rabbitText,maximum:4,
  detail:'자기 칸 오른쪽으로 넘침',reason:'토끼 그림책 1쪽 본문 줄바꿈에서 오른쪽 공백을 약 3px 침범'},
 // Fixed sizes remain after the 740px touch media query changes the type scale.
 ...landscapeTokens('놀스토리 서재',18,['h1 «놀스토리 서재»'],'서재 제목의 18px 고정 크기'),
 ...landscapeTokens('숏스토리 표지와 1쪽',18,[rabbitText],'읽기 본문의 18px 고정 크기'),
 ...landscapeTokens('숏스토리 표지와 1쪽',16,[
  'button.copyToWrite «내 사본으로 쓰기»','span.longLabel «그림책 보관함 열기»','summary «전체 구성 · 8 쪽»',
  'button «‹ 이전 쪽»','span «1 / 8»','button.readNext «다음 쪽 ›»','button «A4 미리보기»','button «작품 도구»',
 ],'읽기 도구가 16px 크기를 유지함'),
 ...landscapeTokens('숏스토리 쓰기',16,[
  'button.toKnolstory «놀스토리로 보내기»','button «쓰기»','button «읽기»','span.longLabel «그림책 보관함 열기»',
  'summary «전체 구성 · 1 쪽»','span «1 쪽 · 제목 없는 쪽»','button.appendPage «+ 맨 뒤에 새 쪽 추가»',
  'span «그림 없는 쪽»','button#write-tab-text «글»','button#write-tab-picture «그림»','button#write-tab-pages «쪽»',
  'label «이 쪽 제목»','label «이 쪽의 이야기»','button «작품 도구»',
 ],'쓰기 도구가 16px 크기를 유지함'),
 ...landscapeTokens('학생 할 일',16,['summary «내가 고칠 수 있는 것 · 작품 보관»'],'편집 범위 안내 제목의 16px 고정 크기'),
];

async function report(info:TestInfo,results:Screen[]){
 const entries=results.flatMap(result=>result.findings.map(finding=>({screen:result.screen,viewport:result.viewport,...finding})));
 const remaining=new Set(known);
 const failures:typeof entries=[],knownFindings:(typeof entries[number]&{allowReason:string})[]=[];
 for(const entry of entries){
  if(entry.intentional)continue;
  const match=[...remaining].find(item=>item.screen===entry.screen&&item.viewport===entry.viewport&&
   item.rule===entry.rule&&item.element===entry.element&&!entry.other&&
   (!item.detail||item.detail===entry.reason)&&(entry.rule==='token'?entry.amount===item.maximum:entry.amount<=item.maximum));
  if(match){
   remaining.delete(match); // A second occurrence of the same label is a new finding.
   knownFindings.push({...entry,allowReason:match.reason});
  }else failures.push(entry);
 }
 const path=info.outputPath('typography-audit.json');
 await writeFile(path,JSON.stringify({screens:results,failures,knownFindings,intentional:entries.filter(entry=>entry.intentional)},null,2));
 await info.attach('typography-audit.json',{path,contentType:'application/json'});
 expect(failures.map(finding=>
  `${finding.screen} ${finding.viewport} · ${finding.element}${finding.other?' ↔ '+finding.other:''} · ${finding.reason} (${finding.amount}px)`
 ).join('\n'),'화면별 새 글자 문제').toBe('');
}

test.use({hasTouch:true,timezoneId:'Asia/Seoul'});
for(const [width,height] of sizes)test(`휴대폰 글자 검사 ${width}×${height}`,async({page},info)=>{
 test.setTimeout(120000);
 await page.setViewportSize({width,height});
 await page.clock.setFixedTime(new Date('2026-11-22T03:00:00Z'));
 const results:Screen[]=[];
 const audit=async(name:string)=>{results.push(await collect(page,name));};
 await classroom(page,'guest');

 await page.goto('/?view=library');
 await expect(page.getByTestId('library-save-status')).toHaveText('임시 보관됨');
 await audit('놀스토리 서재');

 await page.goto('/shortstory?work=rabbit&mode=read');
 const reader=page.getByRole('region',{name:'숏스토리 읽기',exact:true});
 const cover=page.getByRole('region',{name:'이 그림책',exact:true});
 // Current main presents the book card alongside page one. If a separate cover
 // entry is present, measure it before taking the real navigation action.
 await expect(reader.or(page.getByRole('button',{name:'책 펼치기',exact:true})).first()).toBeVisible();
 const openBook=page.getByRole('button',{name:'책 펼치기',exact:true});
 const separateCover=await openBook.isVisible();
 if(separateCover){
  await audit('숏스토리 표지');
  await openBook.click();
 }else await expect(cover).toBeVisible();
 await expect(reader.getByRole('navigation',{name:'읽기 쪽 넘기기'})).toContainText('1 / 8');
 await audit(separateCover?'숏스토리 1쪽':'숏스토리 표지와 1쪽');

 await page.goto('/shortstory?mode=library');
 await page.getByRole('button',{name:'새 그림책',exact:true}).click();
 await expect(page.getByRole('region',{name:'숏스토리 쓰기',exact:true})).toBeVisible();
 await audit('숏스토리 쓰기');

 await page.goto('/?view=editor');
 await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 const offer=page.getByRole('dialog',{name:'휴대폰 전체 화면 안내',exact:true});
 await expect(offer.getByRole('button',{name:'지금은 그대로',exact:true})).toBeVisible();
 await offer.getByRole('button',{name:'지금은 그대로',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'1컷 글',exact:true})).toBeVisible();
 await audit('놀스토리 쓰기');

 await page.goto('/student');
 await expect(page.getByRole('form',{name:'학생 로그인',exact:true})).toBeVisible();
 await audit('학생 로그인');

 await page.unroute('**/api/v1/**');
 await classroom(page,'teacher');
 await page.goto('/teacher');
 await expect(page.getByRole('heading',{name:'내 이야기 쓰기',exact:true})).toBeVisible();
 await audit('교사 과제');
 const menu=page.getByRole('navigation',{name:'주 메뉴',exact:true});
 await menu.getByRole('link',{name:'학생',exact:true}).click();
 await expect(page.locator('tr[data-student]')).toHaveCount(2);
 await audit('교사 학생');
 await page.locator('a[href="/teacher?tab=settings"]').click();
 await expect(page.getByRole('note').filter({hasText:'학년도 과제와 제출물은'})).toBeVisible();
 await audit('교사 설정');

 await page.unroute('**/api/v1/**');
 await classroom(page,'student');
 await page.goto('/student');
 const todo=page.getByRole('region',{name:'할 일',exact:true});
 await expect(todo.getByRole('heading',{name:'내 이야기 쓰기',exact:true})).toBeVisible();
 await audit('학생 할 일');
 await report(info,results);
});

test('글자 검사 판정과 가려진 텍스트 제외',async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await page.setContent(`
  <main>
   <p id="large" style="font-size:30px">큰 글자</p>
   <p id="rogue" style="font-size:27px">토큰 외 글자</p>
   <div id="overflow" style="width:32px;height:8px;white-space:nowrap">칸보다 길고 높은 글자</div>
   <p id="edge" style="position:fixed;left:315px;top:120px;margin:0">화면 밖 글자</p>
   <p id="first" style="position:absolute;top:180px;left:40px;margin:0">겹친 글자</p>
   <p id="second" style="position:absolute;top:182px;left:42px;margin:0">겹침 검증</p>
   <div style="font-size:72px">
    <span hidden>제외 hidden</span><span inert>제외 inert</span><span aria-hidden="true">제외 aria</span>
    <span style="position:absolute;width:2px;height:2px;overflow:hidden">제외 tiny</span>
    <span style="position:absolute;clip:rect(0,0,0,0)">제외 clip</span>
    <span style="clip-path:inset(50%)">제외 clip-path</span>
    <span style="font-size:0">제외 zero</span>
    <details><summary style="font-size:16px">접힌 요약</summary><p>제외 details</p></details>
    <dialog>제외 dialog</dialog>
    <div data-cover-face>제외 표지</div><canvas>제외 캔버스</canvas>
   </div>
   <div style="position:absolute;top:240px;left:20px;width:80px;height:16px;overflow:auto;white-space:nowrap">
    <span>스크롤하는 긴 글</span>
   </div>
  </main>`);
 await page.addStyleTag({content:globals});
 const {findings}=await collect(page,'판정 확인');
 const has=(rule:Finding['rule'],id:string)=>findings.some(row=>row.rule===rule&&row.element.includes(`#${id} «`));
 expect(has('large','large')).toBe(true);
 expect(has('token','rogue')).toBe(true);
 expect(findings.filter(row=>row.element.includes('#overflow «')&&row.rule==='box')).toHaveLength(2);
 expect(has('viewport','edge')).toBe(true);
 expect(findings.some(row=>row.rule==='overlap'&&row.element.includes('#first «')&&row.other?.includes('#second «'))).toBe(true);
 expect(findings.filter(row=>/제외|스크롤하는 긴 글/.test(row.element))).toEqual([]);
});
