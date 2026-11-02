import {expect,it} from 'vitest';
import {isRuntimeImagePreparationRequest,isRuntimeEvent} from './index';
const path='assets/legacy-18da4fc/BG04-cottage-day.webp';
const request={protocol:1,type:'prepareImages',requestId:'images/1',paths:[path],required:[path]};
it('accepts resolved image preparation without a document or scene revision',()=>{
 expect(isRuntimeImagePreparationRequest(request)).toBe(true);
 expect(isRuntimeImagePreparationRequest({...request,paths:[],required:[]})).toBe(true);
 for(const change of [{paths:['../private']},{paths:[path,path]},{required:Array(9).fill(path)},{requestId:''},{paths:Array(1025).fill(path)}])expect(isRuntimeImagePreparationRequest({...request,...change})).toBe(false);
});
it('validates readiness and preparation results strictly',()=>{
 expect(isRuntimeEvent({protocol:1,type:'ready',contractVersion:1,runtimeVersion:'8.5.3',imagePreparationVersion:1})).toBe(true);
 expect(isRuntimeEvent({protocol:1,type:'ready',contractVersion:1,runtimeVersion:'8.5.3',imagePreparationVersion:2})).toBe(false);
 const event={protocol:1,type:'imagesPrepared',requestId:'images/1',ok:true,prepared:1,total:1};
 expect(isRuntimeEvent(event)).toBe(true);
 for(const change of [{ok:'yes'},{prepared:2},{prepared:-1},{total:9},{requestId:''}])expect(isRuntimeEvent({...event,...change})).toBe(false);
});
