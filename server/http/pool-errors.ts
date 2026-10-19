/** Idle pool errors occur outside requests; never log provider/connection details. */
export function handlePoolErrors(
 pool:{on(event:'error',listener:(error:Error)=>void):unknown},
 report:(message:string)=>void,
):void{
 pool.on('error',()=>report('Database connection interrupted.'));
}
