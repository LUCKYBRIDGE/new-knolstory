import {describe,expect,it} from 'vitest';
import {defaultEditorPreferences} from './editor-preferences';
import {ALL_EDITING_ALLOWED,EDITING_PRESETS,allowedEditingScreen,describeEditingPermissions,resolveEditingPermissions,restrictEditorPreferences} from './editing-permissions';

describe('editing permissions',()=>{
 it('prefers the student setting, then the class default, then everything',()=>{
  expect(resolveEditingPermissions(EDITING_PRESETS.textOnly,EDITING_PRESETS.all)).toBe(EDITING_PRESETS.textOnly);
  expect(resolveEditingPermissions(null,EDITING_PRESETS.textAndImages)).toBe(EDITING_PRESETS.textAndImages);
  expect(resolveEditingPermissions(null,null)).toBe(ALL_EDITING_ALLOWED);
 });
 it('turns blocked features off and falls back to the basic screen',()=>{
  const opened={...defaultEditorPreferences,screen:'audio' as const,enabled:{characters:true,audio:true,direction:true},logic:{choices:true,scores:true,branches:true}};
  const limited=restrictEditorPreferences(opened,EDITING_PRESETS.textAndImages);
  expect(limited.screen).toBe('basic');
  expect(limited.enabled).toEqual({characters:false,audio:false,direction:false});
  expect(limited.logic).toEqual({choices:false,scores:false,branches:false});
  expect(restrictEditorPreferences(opened,ALL_EDITING_ALLOWED)).toBe(opened);
 });
 it('needs image permission for the background and character screens',()=>{
  expect(allowedEditingScreen('background',EDITING_PRESETS.textOnly)).toBe(false);
  expect(allowedEditingScreen('background',EDITING_PRESETS.textAndImages)).toBe(true);
  expect(allowedEditingScreen('characters',EDITING_PRESETS.textAndImages)).toBe(false);
  expect(allowedEditingScreen('text',EDITING_PRESETS.textOnly)).toBe(true);
 });
 it('explains limits in plain sentences',()=>{
  expect(describeEditingPermissions(ALL_EDITING_ALLOWED)).toEqual([]);
  expect(describeEditingPermissions(EDITING_PRESETS.textOnly)[0]).toContain('그림은 바꿀 수 없어요');
 });
});
