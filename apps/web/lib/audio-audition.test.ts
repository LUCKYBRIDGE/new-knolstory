import {it,expect} from 'vitest';
import {audioAuditionBounds,audioAuditionPosition} from './audio-audition';
it('resolves a non-destructive range against actual decoded duration',()=>{
 expect(audioAuditionBounds({sourceStartMs:200,sourceEndMs:800},8)).toEqual({start:.2,end:.8});expect(audioAuditionBounds({},8)).toEqual({start:0,end:8});expect(audioAuditionBounds({sourceStartMs:500},1.2)).toEqual({start:.5,end:1.2});expect(audioAuditionBounds({sourceEndMs:1500},1.2)).toEqual({start:0,end:1.2});
 expect(audioAuditionBounds({sourceStartMs:2000},1.2)).toBeNull();expect(audioAuditionBounds({sourceEndMs:0},8)).toBeNull();expect(audioAuditionBounds({},NaN)).toBeNull();expect(audioAuditionBounds({sourceStartMs:-1},8)).toBeNull();
});
it('replays from start, preserves in-range position and stops exactly at end without loop',()=>{
 const range={start:.2,end:.8};expect(audioAuditionPosition(range,.8,'play')).toEqual({position:.2,stop:false});expect(audioAuditionPosition(range,0,'play')).toEqual({position:.2,stop:false});expect(audioAuditionPosition(range,.4,'play')).toEqual({position:.4,stop:false});expect(audioAuditionPosition(range,.9,'time')).toEqual({position:.8,stop:true});expect(audioAuditionPosition(range,0,'seek')).toEqual({position:.2,stop:false});expect(audioAuditionPosition(range,.9,'seek')).toEqual({position:.8,stop:true});
});
