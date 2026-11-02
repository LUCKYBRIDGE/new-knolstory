import type {RuntimeImagePreparationRequest} from '@knolstory/runtime-contract';

export class ImagePreparationCancelled extends Error {}
type Reply=Readonly<{protocol:1;type:'imagesPrepared';requestId:string;ok:boolean;prepared:number;total:number}>;

/** Acknowledgements are independent of scene revisions and can never open a stale scene. */
export class RuntimeImagePreparation {
 private serial=0;
 private pending:{id:string;resolve:()=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}|null=null;
 constructor(private readonly post:(command:RuntimeImagePreparationRequest)=>void){}
 prepare(paths:readonly string[],required:readonly string[]):Promise<void>{
  this.cancel();const requestId=`images-${++this.serial}`;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{if(this.pending?.id!==requestId)return;this.pending=null;reject(new Error('그림을 받는 데 시간이 걸리고 있어요. 연결 상태를 확인하고 다시 받아 주세요.'));},45000);
   this.pending={id:requestId,resolve,reject,timer};
   try{this.post({protocol:1,type:'prepareImages',requestId,paths,required});}
   catch{clearTimeout(timer);this.pending=null;reject(new Error('그림 준비를 요청하지 못했어요. 다시 받아 주세요.'));}
  });
 }
 receive(event:Reply):void{
  const pending=this.pending;if(!pending||pending.id!==event.requestId)return;
  clearTimeout(pending.timer);this.pending=null;
  if(event.ok)pending.resolve();else pending.reject(new Error('그림을 받지 못했어요. 연결 상태를 확인하고 다시 받아 주세요.'));
 }
 cancel():void{
  const pending=this.pending;if(!pending)return;
  clearTimeout(pending.timer);this.pending=null;pending.reject(new ImagePreparationCancelled());
 }
}
