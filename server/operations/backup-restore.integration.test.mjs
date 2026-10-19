import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyBackupRestore} from './backup-restore.mjs';
// Explicit local operator command only; not part of root CI/unit discovery.
test('actual isolated snapshot archive restores exact rows and schema into a new database',async()=>{
 const result=await verifyBackupRestore();assert.equal(result.equal,true);assert.equal(result.sameExportedSnapshot,true);assert.equal(result.tables.length,10);assert(result.tables.find(row=>row.table==='knolstory_storage.blobs').rows>0);
});
