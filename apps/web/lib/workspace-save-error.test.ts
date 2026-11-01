import {describe,it,expect} from 'vitest';
import {workspaceSaveFailure} from './workspace-save-error';
describe('temporary storage failure explanation',()=>{
 it('distinguishes capacity,permission,handover and unknown errors without echoing raw details',()=>{
  expect(workspaceSaveFailure(new DOMException('private browser path','QuotaExceededError'))).toContain('공간이 부족');
  expect(workspaceSaveFailure(new DOMException('secret','SecurityError'))).toContain('허용하지');
  expect(workspaceSaveFailure(new Error('다른 탭에서 저장한 내용을 먼저 불러오고 있어요'))).toContain('다른 탭');
  expect(workspaceSaveFailure(new Error('private manuscript excerpt'))).not.toContain('private');
 });
});
