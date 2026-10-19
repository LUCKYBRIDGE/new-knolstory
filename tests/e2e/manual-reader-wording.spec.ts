import {test,expect} from '@playwright/test';
test('reader save and load labels describe the action actually performed',async({page})=>{
 await page.route('**/api/**',route=>route.abort());await page.setViewportSize({width:1280,height:800});
 await page.goto('/?view=editor');await expect(page.getByTestId('save-status')).toHaveText('임시 보관됨');
 await page.getByRole('button',{name:'이 컷부터 재생',exact:true}).click();
 await expect(page.getByRole('button',{name:'빠른 저장',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'저장',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('작품 파일을 저장하는 기능은 아니며');
 await dialog.getByRole('button',{name:'빠른 저장',exact:true}).click();
 const quick=dialog.locator('[data-player-slot="quick"]');await expect(quick).toHaveAttribute('aria-label','빠른 저장');
 await quick.click();await expect(dialog.getByRole('status').filter({hasText:'빠른 저장 완료'})).toBeVisible();
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
 await page.getByRole('button',{name:'불러오기',exact:true}).click();
 await dialog.getByRole('button',{name:'빠른 저장',exact:true}).click();
 await expect(dialog.locator('[data-player-slot="quick"]')).toHaveAttribute('aria-label','빠른 저장 불러오기');
 await dialog.getByRole('button',{name:'읽기 메뉴 닫기',exact:true}).click();
});
