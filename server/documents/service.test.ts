import {describe,expect,it,vi} from 'vitest';
import {createDocumentService} from './service';
const context={token:'s'.repeat(43),accountId:'11111111-1111-4111-8111-111111111111'};
describe('private document service boundary',()=>{
 it('validates identifiers and request keys before database access',async()=>{
  const connect=vi.fn(),service=createDocumentService({connect});
  await expect(service.read(context,'not-a-uuid')).rejects.toMatchObject({code:'INVALID_REQUEST',status:400});
  await expect(service.list(context,{limit:51})).rejects.toMatchObject({code:'INVALID_REQUEST'});
  await expect(service.list(context,{cursor:'malformed'})).rejects.toMatchObject({code:'INVALID_REQUEST'});
  await expect(service.create(context,{payloadVersion:1,snapshot:{},idempotencyKey:'bad key'})).rejects.toMatchObject({code:'INVALID_REQUEST'});
  await expect(service.create(context,{payloadVersion:1,snapshot:{},idempotencyKey:'valid',ownerAccountId:context.accountId} as never)).rejects.toMatchObject({code:'INVALID_REQUEST'});
  await expect(service.save(context,context.accountId,{payloadVersion:1,snapshot:{},idempotencyKey:'valid',expectedRevision:0})).rejects.toMatchObject({code:'INVALID_REQUEST'});
  expect(connect).not.toHaveBeenCalled();
 });
 it('rejects malformed snapshots without acquiring a connection',async()=>{
  const connect=vi.fn(),service=createDocumentService({connect});
  await expect(service.create(context,{payloadVersion:1,snapshot:{},idempotencyKey:'valid'})).rejects.toMatchObject({code:'INVALID_SNAPSHOT',status:400});
  expect(connect).not.toHaveBeenCalled();
 });
});
