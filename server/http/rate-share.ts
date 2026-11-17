import type {UploadBudget} from './upload-budget';

/** Capacity settings shared by the API routers. Rate counters live in each worker process, so each
 * worker enforces its share of a total; with round-robin dispatch the totals stay about the same. */
export type RateOptions=Readonly<{trustClientIp?:boolean;workers?:number;uploadBudget?:UploadBudget}>;
export function perWorker(total:number,workers=1):number{
 if(!Number.isSafeInteger(total)||total<1||!Number.isSafeInteger(workers)||workers<1)throw Error('Invalid rate share.');
 return Math.max(1,Math.ceil(total/workers));
}
