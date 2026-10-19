import {describe,expect,it,vi} from 'vitest';
import {createPostgresSavePort,type SqlClient,type SqlPool} from './postgres-save-port';
import {runStorageMigrations} from '../migrations/runner';

function client(failures:Record<string,Error>={}) {
 const query=vi.fn(async (sql:string)=>{
  if(failures[sql])throw failures[sql];
  if(sql==='SELECT current_database() AS name')return {rows:[{name:'knolstory_next_lifecycle_test'}],rowCount:1};
  return {rows:[],rowCount:0};
 });
 return {query,release:vi.fn()} satisfies SqlClient;
}
function port(connection:SqlClient) {
 return createPostgresSavePort({connect:async()=>connection},{authorize:async()=>true});
}

describe('SQL connection lifecycle',()=>{
 it('commits and releases a successful save callback',async()=>{
  const connection=client();
  expect(await port(connection).transaction(async()=>42)).toBe(42);
  expect(connection.query.mock.calls.map(([sql])=>sql)).toEqual(['BEGIN ISOLATION LEVEL READ COMMITTED','COMMIT']);
  expect(connection.release).toHaveBeenCalledExactlyOnceWith();
 });
 it('preserves the original save error after a successful rollback',async()=>{
  const original=Error('write failed'),connection=client();
  await expect(port(connection).transaction(async()=>{throw original;})).rejects.toBe(original);
  expect(connection.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(connection.release).toHaveBeenCalledExactlyOnceWith();
 });
 it('destroys a client after failed rollback and the next borrower gets a fresh client',async()=>{
  const original=Error('write failed'),rollback=Error('rollback cancelled');
  const damaged=client({ROLLBACK:rollback}),fresh=client();
  // Model the pool contract: ordinary release makes a connection reusable;
  // release(true) evicts it. A second transaction must never inherit this client.
  let reusable:SqlClient=damaged;
  damaged.release.mockImplementation((destroy?:boolean)=>{if(destroy)reusable=fresh;});
  const pool:SqlPool={connect:async()=>reusable};
  const adapter=createPostgresSavePort(pool,{authorize:async()=>true});
  await expect(adapter.transaction(async()=>{throw original;})).rejects.toMatchObject({errors:[original,rollback]});
  expect(damaged.release).toHaveBeenCalledExactlyOnceWith(true);
  await expect(adapter.transaction(async()=>42)).resolves.toBe(42);
  expect(fresh.query).toHaveBeenCalledWith('COMMIT');
  expect(damaged.query).toHaveBeenCalledTimes(2);
 });
 it('commits and releases a successful migration',async()=>{
  const connection=client();await runStorageMigrations({connect:async()=>connection});
  expect(connection.query).toHaveBeenLastCalledWith('COMMIT');
  expect(connection.release).toHaveBeenCalledExactlyOnceWith();
 });
 it('preserves the original migration error after a successful rollback',async()=>{
  const original=Error('journal unavailable');
  const connection=client({'SELECT version,sha256 FROM knolstory_storage.migrations ORDER BY version':original});
  await expect(runStorageMigrations({connect:async()=>connection})).rejects.toBe(original);
  expect(connection.query).toHaveBeenLastCalledWith('ROLLBACK');
  expect(connection.release).toHaveBeenCalledExactlyOnceWith();
 });
 it('destroys the migration client and retains both errors when rollback fails',async()=>{
  const original=Error('journal unavailable'),rollback=Error('rollback cancelled');
  const connection=client({'SELECT version,sha256 FROM knolstory_storage.migrations ORDER BY version':original,ROLLBACK:rollback});
  await expect(runStorageMigrations({connect:async()=>connection})).rejects.toMatchObject({errors:[original,rollback]});
  expect(connection.release).toHaveBeenCalledExactlyOnceWith(true);
 });
});
