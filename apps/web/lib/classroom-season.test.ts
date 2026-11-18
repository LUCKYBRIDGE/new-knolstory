import {expect,it} from 'vitest';
import {classroomSeason,seasonNotice} from './classroom-season';
import {retentionCutoff,schoolYearStart} from '../../../server/classroom/season-calendar';

const midnight=(month:number,day:number)=>Date.UTC(2027,month-1,day,-9);
const created=Date.UTC(2026,10,1);
it('switches phases at Korean midnight and repeats the two March reminders',()=>{
 const check=(month:number,day:number)=>classroomSeason(created,midnight(month,day));
 expect(check(2,14).soon).toBe(false);
 expect(check(2,15).soon).toBe(true);
 expect(check(3,1)).toMatchObject({season:2026,archived:true,daysLeft:31});
 expect(check(3,18).reminder).toBe(18);
 expect(check(3,25).reminder).toBe(25);
 expect(check(4,1)).toMatchObject({season:2027,archived:false,soon:false});
 expect(check(3,1).clearsOn).toBe('2027년 4월 1일');
 expect(seasonNotice(check(3,18),'teacher')).toContain('학급 자료 내려받기');
});
it('preserves March material and returns to the current year for newly opened rooms',()=>{
 expect(schoolYearStart(midnight(3,1)-1)).toBe(Date.UTC(2026,2,1,-9));
 expect(schoolYearStart(midnight(3,1))).toBe(midnight(3,1));
 expect(retentionCutoff(midnight(4,1)-1)).toBe(Date.UTC(2026,2,1,-9));
 expect(retentionCutoff(midnight(4,1))).toBe(midnight(3,1));
 expect(classroomSeason(midnight(3,1),midnight(3,18))).toMatchObject({season:2027,archived:false,soon:false});
});
