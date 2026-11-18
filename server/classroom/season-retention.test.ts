import type {Pool} from 'pg';
import {afterEach,expect,it,vi} from 'vitest';
import {scheduleClassworkCleanup} from './season-retention';

afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it('retries a failed cleanup at the next hour without exposing database details',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2027-04-01T00:30:00+09:00'));
 const error=vi.spyOn(console,'error').mockImplementation(()=>{});
 const info=vi.spyOn(console,'info').mockImplementation(()=>{});
 const query=vi.fn().mockRejectedValueOnce(new Error('private database details'))
  .mockResolvedValueOnce({rows:[{now:Date.now()}]}).mockResolvedValueOnce({rows:[{total:'2'}]});
 scheduleClassworkCleanup({query} as unknown as Pool);
 await vi.advanceTimersByTimeAsync(0);
 expect(error).toHaveBeenCalledExactlyOnceWith(JSON.stringify({event:'classroom_season_purge_failed'}));
 await vi.advanceTimersByTimeAsync(30*60*1000);
 expect(info).toHaveBeenCalledExactlyOnceWith(JSON.stringify({event:'classroom_season_purged',total:2}));
});
