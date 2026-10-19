import {describe,it,expect} from 'vitest';
import {isRuntimeEvent,isRuntimeScene} from '../src/index';
const rect={x:0,y:0,width:720,height:180};
const report={protocol:1,type:'sceneRendered',sceneId:'chapter/cut',revision:3,renderMs:1,rendererRect:rect,textboxRect:rect};
describe('native dialogue page evidence',()=>{
 it('accepts legacy reports and zero-based first, middle and last pages',()=>{
  expect(isRuntimeEvent(report)).toBe(true);
  for(const dialoguePage of [{index:0,count:1},{index:0,count:3},{index:1,count:3},{index:2,count:3},{index:19999,count:20000}])expect(isRuntimeEvent({...report,dialoguePage})).toBe(true);
 });
 it('rejects malformed and unbounded page evidence',()=>{
  for(const dialoguePage of [null,[],{}, {index:0},{count:1},{index:-1,count:1},{index:1,count:1},{index:0,count:0},{index:.5,count:2},{index:0,count:1.5},{index:0,count:20001},{index:0,count:Infinity},{index:'0',count:1},{index:0,count:'1'}])expect(isRuntimeEvent({...report,dialoguePage})).toBe(false);
 });
});

 describe('source dialogue offsets',()=>{
  const scene={contractVersion:1,sceneId:'cut',revision:1,width:1280,height:720,actors:[],dialogue:{speaker:'',text:'Hello'}};
  it('accepts additive initial and reported positions without requiring them in old payloads',()=>{
   for(const offset of [0,3,Number.MAX_SAFE_INTEGER]){expect(isRuntimeScene({...scene,dialogueOffset:offset})).toBe(true);expect(isRuntimeEvent({...report,dialoguePage:{index:1,count:3,offset}})).toBe(true);}
   expect(isRuntimeScene(scene)).toBe(true);
  });
  it('rejects noninteger, negative, coerced and unsafe positions',()=>{
   for(const offset of [-1,.5,'1',null,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){expect(isRuntimeScene({...scene,dialogueOffset:offset})).toBe(false);expect(isRuntimeEvent({...report,dialoguePage:{index:0,count:1,offset}})).toBe(false);}
  });
 });

describe('canonical pagination font size',()=>{
 const scene={contractVersion:1,sceneId:'cut',revision:1,width:1280,height:720,actors:[],dialogue:{speaker:'',text:'Hello'}};
 const style={fontSize:48,speakerFontSize:32,padding:24};
 it('accepts the legacy absent reference and finite reference sizes independent of displayed font',()=>{
  expect(isRuntimeScene({...scene,dialogueStyle:style})).toBe(true);
  for(const paginationFontSize of [16,32,48.5,96])expect(isRuntimeScene({...scene,dialogueStyle:{...style,paginationFontSize}})).toBe(true);
 });
 it('rejects nonfinite, coerced and out of range reference sizes',()=>{
  for(const paginationFontSize of [NaN,Infinity,-Infinity,'32',null,15.99,96.01])expect(isRuntimeScene({...scene,dialogueStyle:{...style,paginationFontSize}})).toBe(false);
 });
});


describe('reader tools reserved height',()=>{
 const scene={contractVersion:1,sceneId:'cut',revision:1,width:1280,height:720,actors:[],dialogue:{speaker:'',text:'Hello'}};
 const style={fontSize:32,speakerFontSize:32,padding:24};
 it('accepts the absent legacy reserve and finite logical tool heights',()=>{
  expect(isRuntimeScene({...scene,dialogueStyle:style})).toBe(true);
  for(const toolsHeight of [44,99.5,512])expect(isRuntimeScene({...scene,dialogueStyle:{...style,toolsHeight}})).toBe(true);
 });
 it('rejects malformed, nonfinite and out of range tool reserves',()=>{
  for(const toolsHeight of [NaN,Infinity,-Infinity,'44',null,43.99,512.01])expect(isRuntimeScene({...scene,dialogueStyle:{...style,toolsHeight}})).toBe(false);
 });
});

describe('displayed source end boundary',()=>{
 it('accepts additive Unicode source end offsets and keeps old reports compatible',()=>{
  expect(isRuntimeEvent({...report,dialoguePage:{index:0,count:2,offset:0}})).toBe(true);
  expect(isRuntimeEvent({...report,dialoguePage:{index:0,count:2,offset:0,endOffset:12}})).toBe(true);
 });
 it('rejects malformed displayed boundaries rather than coercing them',()=>{
  for(const endOffset of [-1,.5,'12',null,Infinity,NaN,Number.MAX_SAFE_INTEGER+1])expect(isRuntimeEvent({...report,dialoguePage:{index:0,count:2,offset:0,endOffset}})).toBe(false);
 });
});
