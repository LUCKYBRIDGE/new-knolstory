import {lstat,realpath,chmod} from 'node:fs/promises';
import {isAbsolute,dirname,resolve} from 'node:path';

const invalid=()=>Error('Invalid protected ingress socket configuration.');
/** Trust only the owner principal of a private directory, never a path name alone. */
export async function validateProtectedSocket(socketPath){
 if(typeof socketPath!=='string'||!isAbsolute(socketPath)||resolve(socketPath)!==socketPath||Buffer.byteLength(socketPath)>100||/[\x00-\x1f\x7f]/.test(socketPath)||typeof process.getuid!=='function')throw invalid();
 const parent=dirname(socketPath),stat=await lstat(parent);
 if(!stat.isDirectory()||stat.isSymbolicLink()||await realpath(parent)!==parent||stat.uid!==process.getuid()||(stat.mode&0o777)!==0o700)throw invalid();
 // A private child is insufficient when another principal can rename its parent.
 // Sticky ancestors are allowed only with trusted owners throughout the chain.
 for(let ancestor=parent;;ancestor=dirname(ancestor)){
  const directory=await lstat(ancestor);
  if(!directory.isDirectory()||directory.isSymbolicLink()||![0,process.getuid()].includes(directory.uid)||((directory.mode&0o022)!==0&&(directory.mode&0o1000)===0))throw invalid();
  if(ancestor===dirname(ancestor))break;
 }
 try{await lstat(socketPath);}catch(error){if(error.code==='ENOENT')return;throw invalid();}
 // Never delete an existing file, link or socket. Ownership alone is not consent.
 throw invalid();
}
/** Bind exclusively inside the checked private directory; do not repair its state. */
export async function listenProtectedSocket(server,socketPath){
 await validateProtectedSocket(socketPath);
 await new Promise((resolve,reject)=>{
  const failed=error=>reject(error);server.once('error',failed);
  server.listen(socketPath,()=>{server.off('error',failed);resolve();});
 });
 try{
  const stat=await lstat(socketPath);
  if(!stat.isSocket()||stat.uid!==process.getuid()||server.address()!==socketPath)throw invalid();
  await chmod(socketPath,0o600);
 }catch(error){await new Promise(resolve=>server.close(resolve));throw error;}
}
