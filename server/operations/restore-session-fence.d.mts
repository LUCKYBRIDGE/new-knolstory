import type {SqlPool} from '../storage/postgres-save-port';
export function validRestoreTarget(value:unknown):boolean;
export function fenceRestoredSessions(pool:SqlPool,target:string):Promise<{database:string;revokedSessions:number;removedFlows:number}>;
