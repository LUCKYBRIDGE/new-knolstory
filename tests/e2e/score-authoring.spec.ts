import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {enterLibrary,startShelfCreation} from './library-entry';
import {parseAuthoringFile} from './authoring-file';

test('author creates custom plot score and preserves it through file export and reload on compact screens',async({page},info)=>{
  await page.goto('/');await enterLibrary(page);await startShelfCreation(page);
  await page.getByLabel('새 작품 제목',{exact:true}).fill('선택에 따라 쌓이는 이야기');
  await page.getByRole('button',{name:'새 작품 생성',exact:true}).click();
  if(!await page.getByRole('region',{name:'작품 설정',exact:true}).isVisible()){await page.locator('[data-work-menu]>summary').click();await page.getByRole('button',{name:'이야기 점수',exact:true}).click();}
  const preparation=page.getByRole('region',{name:'작품 설정',exact:true});
  await expect(page.getByLabel('작품 설정 항목')).toHaveValue('scores');const scores=preparation.getByRole('region',{name:'이야기 점수 설정',exact:true});
  await scores.getByLabel('새 점수 이름',{exact:true}).fill('이웃에게 나눈 횟수');
  await scores.getByLabel('새 점수 설명',{exact:true}).fill('음식과 도움을 나눈 선택을 셉니다.');
  await scores.getByRole('button',{name:'점수 만들기',exact:true}).click();
  const initial=scores.getByLabel('점수 1 시작 값',{exact:true});
  await initial.fill('2');await initial.blur();
  await expect(page.getByTestId('preparation-save-status')).toHaveText('임시 보관됨');
  for(const viewport of [{width:1280,height:800},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(viewport);
    await expect(scores.getByLabel('점수 1 이름',{exact:true})).toHaveValue('이웃에게 나눈 횟수');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await initial.fill('2.5');await initial.blur();
  await expect(scores.getByRole('alert')).toContainText('정수를 입력');
  await initial.fill('2');await initial.blur();
  await page.locator('[data-work-menu]>summary').click();
  const downloaded=page.waitForEvent('download');
  await page.getByRole('button',{name:'작품 파일 내보내기',exact:true}).click();
  const path=info.outputPath('score.knolstory');await(await downloaded).saveAs(path);
  const document=parseAuthoringFile(readFileSync(path,'utf8'));
  expect(document.project.scores).toEqual([{id:expect.any(String),name:'이웃에게 나눈 횟수',description:'음식과 도움을 나눈 선택을 셉니다.',initial:2}]);
  await page.reload();
  const restored=page.getByRole('region',{name:'작품 설정',exact:true});
  if(!await restored.isVisible()){await page.locator('[data-work-menu]>summary').click();await page.getByRole('button',{name:'이야기 점수',exact:true}).click();}else await page.getByLabel('작품 설정 항목').selectOption('scores');
  await expect(restored.getByLabel('점수 1 시작 값',{exact:true})).toHaveValue('2');
});
