import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkMarkdownLinks,canonicalDocs} from '../check-project-docs.mjs';
function fixture(run){const root=mkdtempSync(join(tmpdir(),'knol-docs-'));try{run(root);}finally{rmSync(root,{recursive:true,force:true});}}
test('accepts local fragments, external URLs and angle paths with spaces',()=>fixture(root=>{
 writeFileSync(join(root,'target file.md'),'# target');writeFileSync(join(root,'index.md'),'[local](<target file.md#target>) [web](https://example.com)');assert.deepEqual(checkMarkdownLinks(root,['index.md']),[]);
}));
test('reports missing local links with source row and missing canonical files',()=>fixture(root=>{
 writeFileSync(join(root,'index.md'),'# doc\n[broken](missing.md)');const errors=checkMarkdownLinks(root,['index.md','absent.md']);assert.equal(errors.length,2);assert.equal(errors[0].line,2);assert.equal(errors[0].target,'missing.md');
}));
test('ignores fenced examples and checks skill navigation',()=>fixture(root=>{
 mkdirSync(join(root,'.agents/skills/sample'),{recursive:true});writeFileSync(join(root,'.agents/skills/sample/SKILL.md'),'[missing](../../../missing.md)');writeFileSync(join(root,'index.md'),'```md\n[example](missing.md)\n```');assert.deepEqual(checkMarkdownLinks(root,['index.md']),[]);assert.ok(canonicalDocs(root).includes('.agents/skills/sample/SKILL.md'));
}));
