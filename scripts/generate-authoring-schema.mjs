import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
const files=['packages/story-domain/src/legacy/story-data.ts','packages/compatibility/src/shortstory.ts'];
const program=ts.createProgram(files,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,resolveJsonModule:true,esModuleInterop:true,skipLibCheck:true,strictNullChecks:true});
const checker=program.getTypeChecker();
function encode(type,seen=new Set()){
 const f=type.flags;
 if(f&ts.TypeFlags.StringLiteral)return {kind:'literal',value:type.value};
 if(f&ts.TypeFlags.NumberLiteral)return {kind:'literal',value:type.value};
 if(f&ts.TypeFlags.BooleanLiteral)return {kind:'literal',value:type.intrinsicName==='true'};
 for(const [flag,kind] of [[ts.TypeFlags.String,'string'],[ts.TypeFlags.Number,'number'],[ts.TypeFlags.Boolean,'boolean'],[ts.TypeFlags.Undefined,'undefined'],[ts.TypeFlags.Null,'null']])if(f&flag)return {kind};
 if(type.isUnion())return {kind:'union',variants:type.types.map(t=>encode(t,new Set(seen)))};
 if(checker.isArrayType(type))return {kind:'array',element:encode(checker.getTypeArguments(type)[0],new Set(seen))};
 if(f&ts.TypeFlags.Object){
  if(seen.has(type))throw Error(`Recursive authoring type: ${checker.typeToString(type)}`);seen.add(type);
  const properties={},required=[];
  for(const symbol of checker.getPropertiesOfType(type)){
   const declaration=symbol.valueDeclaration??symbol.declarations?.[0];
   try{properties[symbol.name]=encode(checker.getTypeOfPropertyOfType(type,symbol.name)??checker.getTypeOfSymbolAtLocation(symbol,declaration),new Set(seen));}catch(error){throw Error(`${symbol.name}: ${error.message}`);}
   if(!(symbol.flags&ts.SymbolFlags.Optional))required.push(symbol.name);
  }
  if(!Object.keys(properties).length)throw Error(`Unresolved authoring type: ${checker.typeToString(type)}`);
  return {kind:'object',properties,required};
 }
 throw Error(`Unsupported authoring type: ${checker.typeToString(type)}`);
}
function root(file,name){const source=program.getSourceFile(file);const declaration=source.statements.find(node=>ts.isTypeAliasDeclaration(node)&&node.name.text===name);if(!declaration)throw Error(name);return encode(checker.getTypeAtLocation(declaration));}
const output='packages/compatibility/src/authoring-field-schema.json';
const generated=JSON.stringify({schemaVersion:1,knolstory:root(files[0],'StoryProject'),shortstory:root(files[1],'ShortStoryProject')},null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(output,'utf8')!==generated)throw Error('Authoring schema is stale. Run node scripts/generate-authoring-schema.mjs');}
else writeFileSync(output,generated);
