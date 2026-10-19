import {it,expect} from 'vitest';
import {relatedPreparationMemos,type PreparationMemo} from './story-preparation';
const base:PreparationMemo={id:'memo',kind:'free',title:'원고 연결',order:1,createdAt:'2026-10-11T00:00:00.000Z',updatedAt:'2026-10-11T00:00:00.000Z',fields:[]};
it('shows direct cut and explicit chapter links while excluding other-cut context and unresolved links',()=>{
 const memos=[{...base,id:'cut',linkedLineId:'one',linkedChapterId:'chapter'},{...base,id:'other',linkedLineId:'two',linkedChapterId:'chapter'},{...base,id:'chapter',linkedChapterId:'chapter'},{...base,id:'multiple',linkedLineIds:['two','one'],linkedChapterIds:['other-chapter']},{...base,id:'missing',linkedLineId:'deleted',linkedChapterId:'chapter'},{...base,id:'work'}];
 expect(relatedPreparationMemos(memos,'one','chapter').map(memo=>memo.id)).toEqual(['cut','chapter','multiple']);expect(memos[1].linkedLineId).toBe('two');
 expect(relatedPreparationMemos([{...base,linkedLineIds:['two'],linkedChapterIds:['chapter']}],'one','chapter')).toHaveLength(1);
});
