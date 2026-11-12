import {test,expect} from '@playwright/test';

test('story settings keep file save visible and reveal exchange tools only when requested',async({page})=>{
 await page.goto('/?view=editor');
 const menu=page.locator('[data-work-menu]');
 await menu.locator(':scope > summary').click();
 const files=menu.getByRole('group',{name:'파일·저장',exact:true});
 await expect(files.getByRole('button',{name:'작품 파일 저장',exact:true})).toBeVisible();
 await expect(files.getByLabel('작품 파일 가져오기',{exact:true})).toBeVisible();
 const advanced=files.locator('[data-file-exchange]');
 await expect(advanced.getByRole('button',{name:'임시 보관 다시 시도'})).toBeHidden();
 await advanced.getByText('파일 교환·보관 도구',{exact:true}).click();
 await expect(advanced.getByRole('button',{name:'임시 보관 다시 시도'})).toBeVisible();
 await expect(advanced.getByRole('button',{name:'작품 파일 내보내기'})).toBeVisible();
});

test('picture book keeps file saving separate from exchange and book management',async({page})=>{
 await page.setViewportSize({width:390,height:850});
 await page.goto('/shortstory/');
 const tools=page.getByRole('region',{name:'그림책 파일과 이름'});
 await expect(tools.getByRole('button',{name:'작품 파일 저장',exact:true})).toBeVisible();
 await expect(tools.getByRole('button',{name:'파일 가져오기',exact:true})).toBeHidden();
 await tools.getByText('파일 교환·보관',{exact:true}).click();
 await expect(tools.getByRole('button',{name:'파일 가져오기',exact:true})).toBeVisible();
 await expect(tools.getByRole('button',{name:'새 그림책',exact:true})).toBeHidden();
 await tools.getByText('그림책 관리',{exact:true}).click();
 await expect(tools.getByRole('button',{name:'새 그림책',exact:true})).toBeVisible();
});
