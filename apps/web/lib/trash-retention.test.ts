import {describe,expect,it} from 'vitest';
import {trashExpiryNotice} from './trash-retention';
const DAY=24*60*60*1000,t=1_800_000_000_000;
describe('trash expiry notice',()=>{
 it('counts whole days left in the 10-day trash',()=>{
  expect(trashExpiryNotice(t,t)).toBe('10일 뒤 영구 삭제돼요');
  expect(trashExpiryNotice(t,t+1)).toBe('10일 뒤 영구 삭제돼요');
  expect(trashExpiryNotice(t,t+DAY)).toBe('9일 뒤 영구 삭제돼요');
  expect(trashExpiryNotice(t,t+8*DAY+1)).toBe('2일 뒤 영구 삭제돼요');
 });
 it('says soon within the last day, even past the boundary before the hourly purge runs',()=>{
  expect(trashExpiryNotice(t,t+9*DAY)).toBe('곧 영구 삭제돼요');
  expect(trashExpiryNotice(t,t+11*DAY)).toBe('곧 영구 삭제돼요');
 });
 it('shows nothing for works that are not in the trash',()=>{
  expect(trashExpiryNotice(null,t)).toBeNull();
  expect(trashExpiryNotice(undefined,t)).toBeNull();
 });
});
