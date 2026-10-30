import {describe,expect,it} from 'vitest';
import {isRuntimeImagePath,isRuntimeScene,type RuntimeScene} from './index';
const prefix='assets/characters/stature-v2/';
const files=['rabbit-turtle.character.turtle-child-unified-720x900.webp','rabbit-turtle.character.turtle-child-flashback.webp','seonnyeo.character.classic-children.webp'];
const scene:RuntimeScene={contractVersion:1,sceneId:'stature/child',revision:1,width:1280,height:720,mode:'edit',actors:[],dialogue:{speaker:'',text:''}};
describe('derived child image runtime paths',()=>{
 it.each(files)('accepts the registered versioned child sprite %s in actor and background contracts',file=>{
  const imagePath=prefix+file;expect(isRuntimeImagePath(imagePath)).toBe(true);
  expect(isRuntimeScene({...scene,actors:[{id:'child',name:'아이',rect:{x:100,y:100,width:200,height:300},imagePath}]})).toBe(true);
  expect(isRuntimeScene({...scene,background:{imagePath}})).toBe(true);
 });
 it('retains existing legacy image paths',()=>{
  for(const extension of ['webp','png','jpg','jpeg'])expect(isRuntimeImagePath(`assets/legacy-18da4fc/child_01-base.${extension}`)).toBe(true);
 });
 it('rejects unregistered files, other namespaces, URLs and path ambiguities',()=>{
  const valid=prefix+files[0];
  for(const value of [null,{},42,'',prefix+'unknown.webp',prefix+'rabbit-turtle.character.turtle-child-unified-720x900.png',valid+'?v=1',valid+'#fragment','/'+valid,'https://example.com/'+valid,'data:image/webp;base64,AA',prefix+'../'+files[0],prefix+'%2e%2e/'+files[0],prefix+files[0].replace('.webp','%2f.webp'),prefix.replaceAll('/','\\')+files[0],valid.replace('stature-v2','stature-v3'),'assets/characters/'+files[0],valid+'\n'])expect(isRuntimeImagePath(value),String(value)).toBe(false);
 });
});
