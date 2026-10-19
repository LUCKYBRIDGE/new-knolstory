import {test} from 'node:test';
import assert from 'node:assert/strict';
import {languageIssues,isHistoricalDocument,replaceRetiredTerms} from '../check-product-language.mjs';
test('detects retired product names and provides preferred labels',()=>{
 assert.deepEqual(languageIssues('작업파일 저장 · 브라우저 복구본').map(item=>item.preferred),['작품 파일','임시 보관']);
});
test('keeps link targets, anchors and fences intact while checking current descriptions',()=>{
 const source='[작업파일 저장](evidence/작업파일.md#작업파일)\n```\n작업파일\n```\n## 로컬 작업파일\n작업파일 저장';
 const updated=replaceRetiredTerms(source);
 assert.ok(updated.includes('(evidence/작업파일.md#작업파일)'));
 assert.ok(updated.includes('## 로컬 작업파일'));
 assert.equal(languageIssues(updated).length,0);
 assert.equal(languageIssues(source).length,2);
});
test('does not alter protected historical records or literal quotations',()=>{
 for(const name of ['docs/architecture/evidence/run/a.md','docs/archive/a.md','docs/decisions/0010-example.md','docs/architecture/foo-validation.md'])assert.ok(isHistoricalDocument(name));
 assert.equal(isHistoricalDocument('docs/architecture/authoring-storage-contract.md'),false);
 assert.equal(replaceRetiredTerms('> 작업파일 저장\n<!-- language-history -->\n작업파일\n<!-- /language-history -->'),'> 작업파일 저장\n<!-- language-history -->\n작업파일\n<!-- /language-history -->');
});
test('is idempotent and does not rewrite semantically distinct vocabulary',()=>{
 const source='자동 저장 / 임시 보관 / 읽기 기록 / Flow / sourceLineId';
 assert.equal(replaceRetiredTerms(source),source);
 assert.equal(replaceRetiredTerms(replaceRetiredTerms('작업파일')), '작품 파일');
});

test('preserves inline and indented code, reference identifiers and reference definitions',()=>{
 const source='Field `작업파일`\n    작업파일\n[label][작업파일]\n[작업파일]: ./old.md';
 assert.equal(replaceRetiredTerms(source),source);
 assert.equal(languageIssues(source).length,0);
 assert.equal(languageIssues('    작업파일',false).length,1);
 assert.equal(isHistoricalDocument('docs/reference/legacy-ui/README.md'),true);
});

test('discovers new current documents, skills and UI helpers while excluding history and aliases',async()=>{
 const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=await import('node:fs');
 const {join}=await import('node:path');const {tmpdir}=await import('node:os');
 const {languageSurfaces}=await import('../check-product-language.mjs');const root=mkdtempSync(join(tmpdir(),'knol-language-'));
 try{
  const files=['docs/architecture/new-contract.md','.agents/skills/new/SKILL.md','apps/web/lib/new-message.ts','apps/web/lib/new-message.test.ts','apps/web/lib/editor-terms.ts','docs/reference/legacy-ui/README.md'];
  for(const file of files){mkdirSync(join(root,file,'..'),{recursive:true});writeFileSync(join(root,file),'current');}
  const {checked,historical}=languageSurfaces(root);
  for(const file of files.slice(0,3))assert.ok(checked.includes(file));
  assert.ok(!checked.includes(files[3]));assert.ok(!checked.includes(files[4]));assert.ok(historical.includes(files[5]));
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('keeps explicit compatibility anchors while checking the renamed heading description',()=>{
 const source='<a id="로컬-작업파일-우선"></a>\n## 작품 파일\n작품 파일 저장';
 assert.equal(replaceRetiredTerms(source),source);assert.equal(languageIssues(source).length,0);
});
