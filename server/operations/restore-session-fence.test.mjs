import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fenceRestoredSessions} from './restore-session-fence.mjs';
const target='knolstory_next_restore_0123456789abcdef0123456789abcdef';
function harness({database=target,clients=0,failAt='',rollbackFailure=false}={}){
 const calls=[],released=[];const client={async query(sql){calls.push(sql);if(sql===failAt)throw Error('injected');if(sql==='ROLLBACK'&&rollbackFailure)throw Error('rollback failed');if(sql==='SELECT current_database() AS name')return {rows:[{name:database}],rowCount:1};if(sql.includes('pg_stat_activity'))return {rows:[{clients}],rowCount:1};if(sql.startsWith('UPDATE'))return {rows:[],rowCount:3};if(sql.startsWith('DELETE'))return {rows:[],rowCount:2};return {rows:[],rowCount:0};},release(error){released.push(error);}};
 let connected=0;return {pool:{async connect(){connected++;return client;}},calls,released,connections:()=>connected};
}
test('rejects non-restore targets before connecting',async()=>{
 for(const value of ['knolstory_next_storage_test','postgres','legacy',null,1,"x';DROP DATABASE postgres"]){const h=harness();await assert.rejects(fenceRestoredSessions(h.pool,value));assert.equal(h.connections(),0);}
});
test('refuses mismatched or active restore candidates without writing',async()=>{
 for(const options of [{database:'knolstory_next_storage_test'},{clients:1},{clients:'0'}]){const h=harness(options);await assert.rejects(fenceRestoredSessions(h.pool,target));assert(!h.calls.some(sql=>sql.startsWith('UPDATE')||sql.startsWith('DELETE')));assert.deepEqual(h.released,[undefined]);}
});
test('revokes historical sessions and removes pending flows in one transaction',async()=>{
 const h=harness();assert.deepEqual(await fenceRestoredSessions(h.pool,target),{database:target,revokedSessions:3,removedFlows:2});assert(h.calls.indexOf('COMMIT')>h.calls.findIndex(sql=>sql.startsWith('DELETE')));assert(!h.calls.includes('ROLLBACK'));assert.deepEqual(h.released,[undefined]);
});
test('rolls back both authentication changes if either write fails',async()=>{
 for(const failAt of ['UPDATE knolstory_auth.sessions SET revoked=true WHERE NOT revoked','DELETE FROM knolstory_auth.flows','COMMIT']){const h=harness({failAt});await assert.rejects(fenceRestoredSessions(h.pool,target));assert(h.calls.includes('ROLLBACK'));assert.deepEqual(h.released,[undefined]);}
});
test('evicts a connection when rollback also fails',async()=>{
 const h=harness({failAt:'DELETE FROM knolstory_auth.flows',rollbackFailure:true});await assert.rejects(fenceRestoredSessions(h.pool,target),AggregateError);assert.deepEqual(h.released,[true]);
});
