import {expect,it} from 'vitest';
import {millisecondsToSeconds,secondsToMilliseconds} from './authoring-time';
it('preserves integer millisecond precision in decimal second edits',()=>{
  expect(millisecondsToSeconds(230)).toBe('0.23');
  expect(secondsToMilliseconds('0.23')).toBe(230);
  expect(secondsToMilliseconds('0.001')).toBe(1);
  expect(secondsToMilliseconds('10')).toBe(10000);
  for(let ms=0;ms<=10000;ms++)expect(secondsToMilliseconds(millisecondsToSeconds(ms))).toBe(ms);
});
it('rejects unfinished, non-finite, overly precise and out of range input',()=>{
  for(const value of ['', ' ', 'NaN', 'Infinity', '-0.1', '10.001', '0.0001','1e2'])expect(secondsToMilliseconds(value)).toBeNull();
  expect(secondsToMilliseconds('0.399',400)).toBeNull();
  expect(secondsToMilliseconds('0.4',400)).toBe(400);
});
it('preserves an untouched existing fractional millisecond duration exactly',()=>{
  for(const currentMs of [0.5,600.1234567890124,9999.99999])expect(secondsToMilliseconds(millisecondsToSeconds(currentMs),0,10000,currentMs)).toBe(currentMs);
  expect(secondsToMilliseconds('0.23',0,10000,600.1234567890124)).toBe(230);
});
