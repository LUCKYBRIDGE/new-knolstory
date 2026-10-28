import {expect,it} from 'vitest';
import {snapTimePlacement} from './time-placement-assistance';
const item={key:'chosen',clock:'컷 시작',startMs:300,durationMs:600};
const peer={key:'other',clock:'컷 시작',startMs:2000,durationMs:1000};
it('snaps either edge to the movable guide, retaining length',()=>{
 expect(snapTimePlacement(item,1370,[item],2000,100)).toEqual({startMs:1400,edge:'end',guideMs:2000});
 expect(snapTimePlacement(item,1970,[item],2000,100)).toEqual({startMs:2000,edge:'start',guideMs:2000});
});
it('uses same-clock neighbour edges and excludes itself and unknown or repeating ends',()=>{
 expect(snapTimePlacement(item,2370,[item,peer],8000,100)).toMatchObject({startMs:2400,edge:'end',guideMs:3000});
 expect(snapTimePlacement(item,2370,[item,{...peer,clock:'1번째 클릭'}],8000,100)).toEqual({startMs:2370});
 expect(snapTimePlacement({...item,loop:true},1370,[],2000,100)).toEqual({startMs:1370});
 expect(snapTimePlacement({...item,durationMs:undefined},1370,[],2000,100)).toEqual({startMs:1370});
 expect(snapTimePlacement(item,330,[item],8000,50)).toEqual({startMs:330});
 expect(snapTimePlacement(item,2370,[{...peer,loop:true}],8000,100)).toEqual({startMs:2370});
});
it('keeps starts within 0 to 10 seconds and uses the closest edge with guide tie priority',()=>{
 expect(snapTimePlacement(item,0,[],100,200)).toMatchObject({startMs:0});
 expect(snapTimePlacement(item,10000,[],10620,30)).toEqual({startMs:10000});
 expect(snapTimePlacement(item,1400,[{...peer,startMs:1420}],1990,30)).toMatchObject({startMs:1390,edge:'end',guideMs:1990});
 expect(snapTimePlacement(item,1400,[{...peer,startMs:1390}],2010,30)).toMatchObject({startMs:1410,edge:'end',guideMs:2010});
 expect(snapTimePlacement(item,1990,[],2000,0)).toEqual({startMs:1990});
});
