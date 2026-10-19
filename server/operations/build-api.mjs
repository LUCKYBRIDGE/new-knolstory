import {build} from 'esbuild';
import {mkdir,copyFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),output=new URL('dist/',root);
await mkdir(output,{recursive:true});
await build({entryPoints:[fileURLToPath(new URL('migrations/production.ts',root))],outfile:fileURLToPath(new URL('migrate.mjs',output)),bundle:true,platform:'node',target:'node22',format:'esm',external:['pg'],sourcemap:false});
await build({entryPoints:[fileURLToPath(new URL('main.ts',root))],outfile:fileURLToPath(new URL('main.mjs',output)),bundle:true,platform:'node',target:'node22',format:'esm',external:['pg','jose'],alias:{'@knolstory/story-domain':fileURLToPath(new URL('../packages/story-domain/src/index.ts',root)),'@knolstory/asset-registry':fileURLToPath(new URL('../packages/asset-registry/src/index.ts',root))},sourcemap:false});
for(const name of await readdir(new URL('migrations/',root)))if(name.endsWith('.sql'))await copyFile(new URL(`migrations/${name}`,root),new URL(name,output));
