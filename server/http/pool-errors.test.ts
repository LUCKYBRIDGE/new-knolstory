import {EventEmitter} from 'node:events';
import {describe,expect,it,vi} from 'vitest';
import {handlePoolErrors} from './pool-errors';

describe('idle database connection errors',()=>{
 it('keeps the listener alive and reports only a fixed message',()=>{
  const pool=new EventEmitter(),report=vi.fn();
  handlePoolErrors(pool,report);
  expect(()=>pool.emit('error',Error('password=private host=private'))).not.toThrow();
  expect(report).toHaveBeenCalledExactlyOnceWith('Database connection interrupted.');
 });
});
