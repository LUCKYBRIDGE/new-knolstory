import {readFileSync} from 'node:fs';
// Same URL rules as packages/asset-registry/src/image-catalog.ts, read from the registry JSON
// (Playwright cannot import the registry module's JSON without import attributes).
const catalog=JSON.parse(readFileSync('packages/asset-registry/src/catalog.json','utf8')) as {id:string;src:string;revision:string}[];
const previews=JSON.parse(readFileSync('packages/asset-registry/src/image-previews.json','utf8')) as {directory:string;hashLength:number};
const byId=new Map(catalog.map(asset=>[asset.id,asset]));
/** Original image URL (reading, stage, print) and preview URL (picker, shelf, page lists). */
export function catalogImage(id:string){
 const asset=byId.get(id);if(!asset)throw Error(`Unknown catalogue image: ${id}`);
 const version=asset.revision.slice(0,previews.hashLength);
 return {src:`${asset.src}?v=${version}`,previewSrc:`/${previews.directory}/${version}.webp`};
}
