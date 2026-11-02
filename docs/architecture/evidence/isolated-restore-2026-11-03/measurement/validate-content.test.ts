import {it} from 'vitest';
import {readFileSync,lstatSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {restoreProjectedSnapshot} from '../../../../../server/storage/snapshot-projection';
import {STORAGE_MIGRATIONS} from '../../../../../server/migrations/runner';

it('reads the private restored projections with the current validators and immutable migrations',async()=>{
 const filename=process.env.KNOL_RESTORE_PRIVATE_RECORDS_FILE;
 if(!filename)throw Error('A private audit input is required.');
 const path=resolve(filename),root=resolve(homedir(),'.local/share/knolstory-next-production/audits');
 const child=relative(root,path),stat=lstatSync(path);
 if(!child||isAbsolute(child)||child.startsWith('..')||stat.isSymbolicLink()||!stat.isFile()||(stat.mode&0o077))throw Error('Invalid private audit input boundary.');
 const input=JSON.parse(readFileSync(path,'utf8'));
 let knolstory=0,shortstory=0,resources=0;
 if(!Array.isArray(input.records)||!input.records.length||!Array.isArray(input.blobs)||!Array.isArray(input.migrations))throw Error('Restored input collections are missing.');
 try{
  for(const row of input.records){
   const snapshot=await restoreProjectedSnapshot(row.projection,async id=>{
    const blob=input.blobs.find((entry:{id:string})=>entry.id===id);
    return blob?new Uint8Array(Buffer.from(blob.bytes,'base64')):null;
   });
   const content=snapshot.content;
   const id=content.format==='knolstory'?content.document.project.id:content.project.id;
   if(content.format!==row.format||id!==row.clientProjectId||!Number.isSafeInteger(Number(row.revision))||Number(row.revision)<1)throw Error('Restored identity differs.');
   if(content.format==='knolstory'){knolstory++;resources+=content.audioResources.length;}else shortstory++;
  }
  if(input.migrations.length!==STORAGE_MIGRATIONS.length)throw Error('Migration count differs.');
  for(const [index,name] of STORAGE_MIGRATIONS.entries()){
   const expected=createHash('sha256').update(readFileSync(new URL(`../../../../../server/migrations/${name}`,import.meta.url))).digest('hex');
   if(input.migrations[index].version!==index+1||input.migrations[index].sha256!==expected)throw Error('Immutable migration hash differs.');
  }
 }catch{
  // Validation failures must not print private projection values or raw errors.
  throw Error('Current content or migration validation rejected the restored copy; private input preserved for diagnosis.');
 }
 console.info(JSON.stringify({restoredContent:{records:input.records.length,knolstory,shortstory,audioResources:resources,migrations:input.migrations.length},currentCanonicalValidationPassed:true,identitiesAndRevisionsPassed:true,immutableMigrationHashesPassed:true,rawContentPublished:false}));
});
