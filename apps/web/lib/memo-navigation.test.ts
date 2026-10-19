import {it,expect} from 'vitest';
import {remapMemoNavigation} from './memo-navigation';
it('retains exact memo and cut focus when original authoring becomes a protected personal copy',()=>{
 const source={projectId:'original',memoId:'memo-two',lineId:'cut-five'};expect(remapMemoNavigation(source,'original','personal')).toEqual({projectId:'personal',memoId:'memo-two',lineId:'cut-five'});expect(source.projectId).toBe('original');
 expect(remapMemoNavigation(source,'other','personal')).toBe(source);expect(remapMemoNavigation(null,'original','personal')).toBeNull();
});

it('retains a work-settings purpose and current cut across personal copy remapping',()=>{const request={projectId:'original',memoId:'',lineId:'cut-2',section:'planning' as const,returnToEditor:true};expect(remapMemoNavigation(request,'original','personal')).toEqual({...request,projectId:'personal'});expect(request.projectId).toBe('original');});

it('preserves originating choice editor context through a protected copy without mutating it',()=>{const editorContext={editorView:'cut' as const,activeTool:'flow' as const,writerChapterId:null,soundTool:false};const request={projectId:'original',memoId:'',lineId:'cut-2',section:'scores' as const,returnToEditor:true,editorContext};expect(remapMemoNavigation(request,'original','personal')).toEqual({...request,projectId:'personal',editorContext});expect(request.projectId).toBe('original');expect(request.editorContext).toEqual(editorContext);});
