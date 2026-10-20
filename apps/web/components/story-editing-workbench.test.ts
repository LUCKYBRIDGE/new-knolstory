import {it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createBlankStoryProject} from '@knolstory/runtime-core';
import {StoryEditingWorkbench} from './story-editing-workbench';
import {defaultEditorPreferences} from '../lib/editor-preferences';
import {assetDisplayName,resolveAsset} from '@knolstory/asset-registry';

it('keeps basic speaker, explicit playback and contextual navigation reachable without actor opt-in',()=>{
 const project=createBlankStoryProject({id:'editor-audit',chapterId:'chapter',lineId:'first'});
 project.lines[0].purposeNote='인물이 결심하는 컷';
 project.lines[0].flow={type:'choice',options:[{id:'end',label:'끝내기',targetLineId:null},{id:'pending',label:'미완성 갈래',targetLineId:''}]};
 const html=renderToStaticMarkup(createElement(StoryEditingWorkbench,{
  preferences:defaultEditorPreferences,onPreferencesChange:()=>{},project,lineId:'first',screen:'basic',
  onScreenChange:()=>{},onProjectChange:()=>{},onSelectCut:()=>{},onComposing:()=>{},basicTextDisabled:false,
  onBasicTextChange:()=>{},disabled:false,composing:false,onPreview:()=>{},
 }));
 expect(html).toContain('aria-label="현재 컷 화자"');
 expect(html).toContain('aria-label="현재 컷 글 종류"');
 expect(html.match(/aria-label="이 컷부터 재생"/g)).toHaveLength(1);
 expect(html).toContain('인물이 결심하는 컷');
 expect(html).toContain('끝내기 → 이야기 종료');
 expect(html).toContain('미완성 갈래 → 도착 컷 미지정');
 expect(html).toContain('aria-label="현재 장 컷 목록"');
 expect(html).toContain('aria-current="step"');
 expect(html).not.toContain('등록된 말하는 인물');
});

it('uses native scene pixels for the next cut instead of a background material image',()=>{
 const project=createBlankStoryProject({id:'native-neighbors',chapterId:'chapter',lineId:'first'});
 project.lines.push({...project.lines[0],id:'second',order:project.lines[0].order+1,text:'다음 컷 원고'});
 const html=renderToStaticMarkup(createElement(StoryEditingWorkbench,{
  preferences:defaultEditorPreferences,onPreferencesChange:()=>{},project,lineId:'first',screen:'basic',
  onScreenChange:()=>{},onProjectChange:()=>{},onSelectCut:()=>{},onComposing:()=>{},basicTextDisabled:false,
  onBasicTextChange:()=>{},disabled:false,composing:false,onPreview:()=>{},
  adjacentThumbnails:{second:{status:'ready',width:320,height:180,dataUrl:'data:image/png;base64,iVBORw0KGgo='}},
 }));
 expect(html).toContain('data-adjacent-scene="second" data-thumbnail-status="ready"');
 expect(html).toContain('다음 컷 장면 미리보기 · 인물 배치와 첫 글상자');
 expect(html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
 expect(html).toContain('다음 컷 원고');
});

it('shows the actual inherited speaking actor image and keeps narration unlinked without changing the manuscript',()=>{
 const project=createBlankStoryProject({id:'speaker-image',chapterId:'chapter',lineId:'first'});
 const imageId='rabbit-turtle.character.dragonking-sick-elder-attached';
 project.chapters[0].leftAssetId=imageId;
 Object.assign(project.lines[0],{type:'dialogue',speaker:'left',speakerName:'용왕',inheritActors:true});
 const render=()=>renderToStaticMarkup(createElement(StoryEditingWorkbench,{
  preferences:defaultEditorPreferences,onPreferencesChange:()=>{},project,lineId:'first',screen:'basic',
  onScreenChange:()=>{},onProjectChange:()=>{},onSelectCut:()=>{},onComposing:()=>{},basicTextDisabled:false,
  onBasicTextChange:()=>{},disabled:false,composing:false,onPreview:()=>{},
 }));
 const before=structuredClone(project),html=render();
 expect(html).toContain('aria-label="현재 컷 화자"');expect(html).toContain('value="용왕"');
 expect(html).toContain('aria-label="현재 컷 화자에 연결된 이미지"');
 expect(html).toContain(assetDisplayName(resolveAsset(imageId)!));
 expect(html).toContain('글 종류 설정');expect(project).toEqual(before);
 Object.assign(project.lines[0],{type:'narration',speaker:'narration'});
 expect(render()).toContain('없음 · 해설');
 Object.assign(project.lines[0],{type:'dialogue',speaker:'narration'});
 expect(render()).toContain('없음 · 화면 밖 목소리');
});
