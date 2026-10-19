import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkedSnapshotId,checkedRestoreName,tableInventorySql,compareInventories} from './backup-restore.mjs';
test('only accepts generated isolated restore database names',()=>{
 assert.equal(checkedRestoreName('knolstory_next_restore_0123456789abcdef0123456789abcdef'),'knolstory_next_restore_0123456789abcdef0123456789abcdef');
 for(const value of ['knolstory_next_storage_test','postgres','legacy','knolstory_next_restore_x;DROP DATABASE postgres',null])assert.throws(()=>checkedRestoreName(value));
});
test('snapshot IDs and identifiers cannot inject SQL',()=>{
 assert.equal(checkedSnapshotId('00000003-00000A1F-1'),'00000003-00000A1F-1');
 for(const value of ["x';commit;--",'',null,1])assert.throws(()=>checkedSnapshotId(value));
 assert.match(tableInventorySql(['knolstory_storage.records']),/sha256/);
 for(const table of ['public.accounts','knolstory_storage.records;drop schema public','knolstory_auth."secret"'])assert.throws(()=>tableInventorySql([table]));
});
test('comparison fails on missing tables, changed bytes, counts or schema objects',()=>{
 const a={tables:[{table:'knolstory_storage.records',rows:2,sha256:'a'.repeat(64)}],schema:{columns:['title:text'],constraints:['primary']}};
 assert.deepEqual(compareInventories(a,structuredClone(a)),{equal:true});
 for(const b of [{...a,tables:[]},{...a,tables:[{...a.tables[0],rows:1}]},{...a,tables:[{...a.tables[0],sha256:'b'.repeat(64)}]},{...a,schema:{...a.schema,columns:['title:integer']}}])assert.throws(()=>compareInventories(a,b));
});

import {EventEmitter} from 'node:events';
import {closeSnapshotChild} from './backup-restore.mjs';
function fakeChild(){
 const child=new EventEmitter();child.exitCode=null;child.signalCode=null;child.signals=[];
 child.stdin=new EventEmitter();child.stdin.end=value=>{child.input=value;};
 child.kill=signal=>{child.signals.push(signal);return true;};return child;
}
const deadlines={graceMs:10,terminateMs:10,reapMs:10};
test('snapshot close sends rollback, observes close and cleans listeners',async()=>{
 const child=fakeChild(),closing=closeSnapshotChild(child,deadlines);
 assert.equal(child.input,'ROLLBACK;\n');child.exitCode=0;child.emit('close',0,null);await closing;
 assert.deepEqual(child.signals,[]);assert.equal(child.listenerCount('close'),0);assert.equal(child.stdin.listenerCount('error'),0);
});
test('snapshot close escalates TERM then KILL and waits for actual reap',async()=>{
 const child=fakeChild();child.kill=signal=>{child.signals.push(signal);if(signal==='SIGKILL')setImmediate(()=>child.emit('close',null,'SIGKILL'));return true;};
 await assert.rejects(closeSnapshotChild(child,deadlines),/Snapshot exporter/);
 assert.deepEqual(child.signals,['SIGTERM','SIGKILL']);assert.equal(child.listenerCount('close'),0);
});
test('snapshot close has a final bounded rejection when a child never reaps',async()=>{
 const child=fakeChild();await assert.rejects(closeSnapshotChild(child,deadlines),/Snapshot exporter/);
 assert.deepEqual(child.signals,['SIGTERM','SIGKILL']);
 // A late pipe/process error cannot crash the host after bounded rejection.
 child.stdin.emit('error',Error('late EPIPE'));child.emit('error',Error('late process error'));child.emit('close',null,'SIGKILL');
 assert.equal(child.listenerCount('close'),0);assert.equal(child.stdin.listenerCount('error'),0);
});
test('snapshot close handles pipe errors and synchronous end failures',async()=>{
 for(const failure of ['event','throw']){
  const child=fakeChild();child.stdin.end=()=>{if(failure==='throw')throw Error('broken pipe');child.stdin.emit('error',Error('broken pipe'));};
  child.kill=signal=>{child.signals.push(signal);setImmediate(()=>child.emit('close',null,signal));return true;};
  await assert.rejects(closeSnapshotChild(child,deadlines),/Snapshot exporter/);assert.deepEqual(child.signals,['SIGTERM']);
 }
});
test('snapshot close reaps children whose exit event has already occurred',async()=>{
 const child=fakeChild();child.exitCode=0;const closing=closeSnapshotChild(child,deadlines);assert.equal(child.input,undefined);child.emit('close',0,null);await closing;
});
test('snapshot close rejects invalid deadlines and recognizes already reaped children',async()=>{
 const child=fakeChild();child.closed=true;await closeSnapshotChild(child,deadlines);
 await assert.rejects(closeSnapshotChild(fakeChild(),{graceMs:0}),/deadline/);
 const failed=fakeChild();failed.closed=true;failed.exitCode=1;await assert.rejects(closeSnapshotChild(failed,deadlines),/Snapshot exporter/);
});
test('repeated pipe errors do not postpone the bounded forced reap',async()=>{
 const child=fakeChild(),closing=closeSnapshotChild(child,deadlines);
 child.stdin.emit('error',Error('EPIPE'));child.stdin.emit('error',Error('EPIPE'));
 child.kill=signal=>{child.signals.push(signal);throw Error('kill failed');};
 await assert.rejects(closing,/Snapshot exporter/);assert.deepEqual(child.signals,['SIGTERM','SIGKILL']);
 child.emit('close',null,'SIGKILL');
});
test('already signalled and reap-completed exporters reject close',async()=>{
 const child=fakeChild();child.closed=true;child.signalCode='SIGTERM';await assert.rejects(closeSnapshotChild(child,deadlines),/Snapshot exporter/);
});
