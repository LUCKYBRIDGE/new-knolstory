import {describe,expect,it} from 'vitest';
import {assertUploadSize,formatBytes,storageSummary,uploadSize,workSizeNotice,WORK_LIMIT_BYTES} from './online-storage';
const MB=1024*1024;
describe('online storage wording',()=>{
 it('formats sizes in KB and MB the way people read them',()=>{
  expect(formatBytes(0)).toBe('0KB');expect(formatBytes(300)).toBe('1KB');expect(formatBytes(40_500)).toBe('40KB');
  expect(formatBytes(1.1*MB)).toBe('1.1MB');expect(formatBytes(16*MB)).toBe('16MB');expect(formatBytes(500*MB)).toBe('500MB');
 });
 it('warns about large works only past 8MB and blocks past 16MB',()=>{
  expect(workSizeNotice(200_000)).toBeNull();
  expect(workSizeNotice(9*MB)?.level).toBe('info');
  expect(workSizeNotice(15*MB)?.level).toBe('warn');
  expect(workSizeNotice(WORK_LIMIT_BYTES+1)).toMatchObject({level:'block',text:expect.stringContaining('작품 파일로 저장')});
  expect(()=>assertUploadSize({text:'가'.repeat(6*MB)})).toThrow('온라인에 올리거나 제출할 수 없어요');
  expect(()=>assertUploadSize({text:'짧은 작품'})).not.toThrow();
  expect(uploadSize({a:'가'})).toBe(new TextEncoder().encode('{"a":"가"}').length);
 });
 it('summarizes usage with the classroom pool and flags 80% and full',()=>{
  expect(storageSummary({works:2,worksLimit:5,bytes:1.2*MB,bytesLimit:30*MB,workBytesLimit:16*MB})).toEqual({text:'온라인 2/5개 · 1.2MB / 30MB',warn:false,full:false});
  expect(storageSummary({works:4,worksLimit:5,bytes:MB,bytesLimit:30*MB,workBytesLimit:16*MB}).warn).toBe(true);
  const pooled=storageSummary({works:1,worksLimit:5,bytes:MB,bytesLimit:30*MB,workBytesLimit:16*MB,classroom:{bytes:500*MB,limit:500*MB}});
  expect(pooled).toMatchObject({text:'온라인 1/5개 · 1MB / 30MB · 학급 500MB / 500MB',full:true});
  expect(storageSummary({works:3,worksLimit:null,bytes:0,bytesLimit:null,workBytesLimit:16*MB}).text).toBe('온라인 3개');
  // A student's submission space is shown apart and does not raise the personal warning.
  expect(storageSummary({works:1,worksLimit:5,bytes:MB,bytesLimit:10*MB,workBytesLimit:16*MB,submissions:{bytes:9.5*MB,limit:10*MB}})).toEqual({text:'온라인 1/5개 · 1MB / 10MB · 제출 9.5MB / 10MB',warn:false,full:false});
 });
});
