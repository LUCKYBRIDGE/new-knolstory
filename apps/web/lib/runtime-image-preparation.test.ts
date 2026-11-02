import {describe,it,expect,vi} from 'vitest';
import {RuntimeImagePreparation,ImagePreparationCancelled} from './runtime-image-preparation';

describe('runtime image preparation acknowledgements',()=>{
 it('waits for matching native acknowledgement, rejects failure, ignores stale requests',async()=>{
  const sent:Record<string,unknown>[]=[];
  const delivery=new RuntimeImagePreparation(command=>sent.push(command));
  const first=delivery.prepare(['assets/a.webp'],['assets/a.webp']);
  const cancelled=expect(first).rejects.toBeInstanceOf(ImagePreparationCancelled);
  const second=delivery.prepare(['assets/b.webp'],['assets/b.webp']);
  await cancelled;
  delivery.receive({protocol:1,type:'imagesPrepared',requestId:sent[0]!.requestId as string,ok:true,prepared:1,total:1});
  let done=false;void second.then(()=>{done=true;});await Promise.resolve();expect(done).toBe(false);
  delivery.receive({protocol:1,type:'imagesPrepared',requestId:sent[1]!.requestId as string,ok:true,prepared:1,total:1});
  await second;expect(done).toBe(true);
  const failed=delivery.prepare(['assets/a.webp'],['assets/a.webp']);
  delivery.receive({protocol:1,type:'imagesPrepared',requestId:sent[2]!.requestId as string,ok:false,prepared:0,total:1});
  await expect(failed).rejects.toThrow('그림');
 });
 it('cancels a pending request and times out without treating missing images as ready',async()=>{
  vi.useFakeTimers();
  try{
   const delivery=new RuntimeImagePreparation(()=>{});
   const pending=delivery.prepare([],[]);const cancelled=expect(pending).rejects.toBeInstanceOf(ImagePreparationCancelled);delivery.cancel();await cancelled;
   const missing=delivery.prepare(['assets/a.webp'],['assets/a.webp']);const failed=expect(missing).rejects.toThrow('그림');
   await vi.advanceTimersByTimeAsync(45000);await failed;
  }finally{vi.useRealTimers();}
 });
});
