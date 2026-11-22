import {expect as playwrightExpect} from '@playwright/test';

const expect=playwrightExpect.configure({timeout:15000});
const shortTitle='나의 그림책';
const nextTitle='그림책을 놀스토리로';
const pageText='토끼는 연못에서 새 친구를 만났어요.';
const cutText='안녕! 너도 연못에 놀러 왔니?';
const viewport={width:1280,height:900};

function button(page,name){
 return page.getByRole('button',{name,exact:true});
}

function assignment(page,title){
 return page.getByRole('listitem').filter({has:page.getByRole('heading',{name:title,exact:true})});
}

function teacherTab(page,name){
 return page.getByRole('navigation',{name:'주 메뉴',exact:true}).getByRole('link',{name,exact:true});
}

export async function runClassroomFlow({browser,origin,teacherToken,step,sensitive}){
 const teacherContext=await browser.newContext({viewport});
 await teacherContext.addCookies([{
  name:'knolstory-next-session',value:teacherToken,url:origin,httpOnly:true,sameSite:'Lax',
 }]);
 const teacher=await teacherContext.newPage();
 const student=await (await browser.newContext({viewport})).newPage();
 teacher.setDefaultTimeout(20000);
 student.setDefaultTimeout(20000);
 // The fullscreen offer is unrelated to authoring and can cover the editor controls.
 await student.addInitScript(()=>{
  if(window===window.top)sessionStorage.setItem('knolstory-fullscreen-offered-v1','1');
 });

 const {classCode,password}=await step('교사 화면에서 학급과 학생 생성',async()=>{
  await teacher.goto(origin+'/teacher');
  await teacher.getByLabel('학급 이름',{exact:true}).fill('실제 검사반');
  await button(teacher,'학급 만들기').click();
  const code=teacher.getByLabel('학급 코드',{exact:true});
  await expect(code).toHaveText(/^[A-Z0-9]{6}$/);
  const classCode=(await code.innerText()).trim();
  sensitive.push(classCode);
  await teacherTab(teacher,'학생').click();
  await teacher.getByLabel('만들 학생 수',{exact:true}).fill('1');
  await button(teacher,'학생 만들기').click();
  await teacher.getByRole('dialog',{name:'학생 로그인 QR',exact:true})
   .getByRole('button',{name:'학생 목록으로',exact:true}).click();
  await button(teacher,'1번 비밀번호 보기').click();
  const passwordLabel=teacher.getByLabel('1번 비밀번호',{exact:true});
  await expect(passwordLabel).toHaveText(/^\d{4}$/);
  const password=(await passwordLabel.innerText()).trim();
  sensitive.push(password);
  return {classCode,password};
 });

 await step('숏스토리와 통과 뒤 열리는 글만 놀스토리 과제 생성',async()=>{
  await teacherTab(teacher,'과제').click();
  await teacher.getByLabel('과제 유형',{exact:true}).selectOption('shortstory');
  await teacher.getByLabel('과제 제목',{exact:true}).fill(shortTitle);
  await teacher.getByLabel('무엇을 하나요',{exact:true}).fill('첫 쪽에 연못 이야기를 써요.');
  await button(teacher,'과제 만들기').click();
  await expect(assignment(teacher,shortTitle)).toBeVisible();

  await teacher.locator('[data-kind="knolstory"]').click();
  await teacher.getByRole('radio',{name:'숏스토리 과제를 통과한 뒤 이어 써요',exact:true}).check();
  await expect(teacher.getByLabel('먼저 할 숏스토리 과제',{exact:true}).locator('option:checked')).toHaveText(shortTitle);
  await teacher.getByLabel('과제 제목',{exact:true}).fill(nextTitle);
  await teacher.getByLabel('무엇을 하나요',{exact:true}).fill('그림책을 바탕으로 대사를 써요.');
  await teacher.getByRole('radio',{name:'글만',exact:true}).check();
  await button(teacher,'과제 만들기').click();
  const row=assignment(teacher,nextTitle);
  await expect(row).toContainText(`앞 단계 · ${shortTitle} 통과 뒤`);
  await expect(row).toContainText('고칠 수 있는 것 · 글만');
 });

 const first=assignment(student,shortTitle);
 const next=assignment(student,nextTitle);
 await step('실제 학생 로그인과 뒤 과제 잠금 확인',async()=>{
  await student.goto(origin+'/student');
  await student.getByLabel('학급 코드',{exact:true}).fill(classCode);
  await student.getByLabel('번호',{exact:true}).fill('1');
  await student.getByLabel('비밀번호',{exact:true}).fill(password);
  await button(student,'들어가기').click();
  await expect(first).toBeVisible();
  await expect(next).toContainText('앞 단계를 통과하면 열려요');
  await expect(next.getByRole('link',{name:/시작|쓰기/})).toHaveCount(0);
 });

 await step('학생이 그림책 한 쪽을 작성하고 제출',async()=>{
  await first.getByRole('link',{name:'과제 쓰기',exact:true}).click();
  await student.getByLabel('이 쪽의 이야기',{exact:true}).fill(pageText);
  await expect(student.getByText('임시 보관했어요.',{exact:true})).toBeVisible();
  await student.goto(origin+'/student');
  await button(first,'제출').click();
  await expect(first).toContainText('냈어요 · 선생님 확인을 기다려요');
  await expect(next).toContainText('앞 단계를 통과하면 열려요');
 });

 await step('교사가 제출물을 확인하고 통과시켜 다음 과제 열기',async()=>{
  await teacher.reload();
  await teacher.getByRole('group',{name:'과제 유형별 보기',exact:true})
   .getByRole('button',{name:/^숏스토리 · 1/}).click();
  const row=assignment(teacher,shortTitle);
  await button(row,`${shortTitle} 진행 보기`).click();
  await button(row,'1번 제출 작품 바로 보기').click();
  const submission=teacher.getByRole('dialog');
  await expect(submission).toContainText(pageText);
  await button(submission,'닫기').click();
  await button(row,'1번 통과').click();
  await expect(row.locator('[data-unlocks]')).toHaveText(`통과해서 이 학생에게 ‘${nextTitle}’ 과제가 열렸어요.`);
 });

 await step('통과한 그림책을 가져와 그림책 구상을 보며 글 편집',async()=>{
  await student.reload();
  await expect(first).toContainText('과제 통과!');
  await expect(next).toContainText('이 과제에서 고칠 수 있는 것 · 글만');
  await next.getByRole('link',{name:'통과한 그림책으로 시작',exact:true}).click();
  const reference=student.getByTestId('picturebook-chapter-reference').filter({visible:true});
  const referenceToggle=student.locator('summary:visible',{hasText:'그림책 구상'}).first();
  await expect(reference.or(referenceToggle).first()).toBeVisible({timeout:30000});
  if(await referenceToggle.isVisible()&&!await reference.isVisible())await referenceToggle.click();
  await expect(reference).toContainText(pageText);

  const task=student.locator('[data-task-action]');
  await task.locator('summary').click();
  await expect(task.locator('[data-task-scope]')).toContainText('글만');
  await task.locator('summary').click();
  await expect(student.locator('[data-editor-work-tabs]').getByRole('button',{name:/^(배경|인물)$/})).toHaveCount(0);
  await expect(student.getByRole('button',{name:/(배경|그림|삽화|이미지).*(고르기|찾기)/})).toHaveCount(0);
  const cut=student.getByRole('textbox',{name:'1컷 글',exact:true});
  await cut.fill(cutText);
  await expect(cut).toHaveValue(cutText);
  await expect(reference).toContainText(pageText);
 });
}
