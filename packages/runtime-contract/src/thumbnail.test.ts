import {expect,it} from 'vitest';
import {isRuntimeThumbnailRequest,isRuntimeEvent} from './index';
const payload={contractVersion:1,sceneId:'adjacent',revision:0,width:1280,height:720,mode:'edit',actors:[],dialogue:{speaker:'해설',text:'다음 장면'}};
it('accepts only bounded landscape editing scenes for native thumbnails',()=>{
 const request={protocol:1,type:'renderSceneThumbnail',requestId:'neighbor-1',payload};
 expect(isRuntimeThumbnailRequest(request)).toBe(true);
 for(const patch of [{mode:'play'},{width:720,height:1280},{dialogue:{speaker:'x',text:42}}])expect(isRuntimeThumbnailRequest({...request,payload:{...payload,...patch}})).toBe(false);
 expect(isRuntimeThumbnailRequest({...request,requestId:''})).toBe(false);
});
it('validates native thumbnail pixels and correlates failure without accepting arbitrary image URLs',()=>{
 const result={protocol:1,type:'sceneThumbnail',requestId:'neighbor-1',sceneId:'adjacent',revision:0,width:320,height:180,dataUrl:'data:image/png;base64,iVBORw0KGgo='};
 expect(isRuntimeEvent(result)).toBe(true);
 for(const dataUrl of ['https://example.com/picture.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,'+'A'.repeat(600000)])expect(isRuntimeEvent({...result,dataUrl})).toBe(false);
 expect(isRuntimeEvent({...result,width:1280})).toBe(false);
 expect(isRuntimeEvent({protocol:1,type:'sceneThumbnailFailed',requestId:'neighbor-1',sceneId:'adjacent',revision:0})).toBe(true);
});
