/** JSON.parse alone silently discards earlier object members with the same key. */
export function parseAuthoringJson(text:string):unknown{
 let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw Error('작품 파일 JSON을 읽지 못했습니다.');}
 const scopes:({keys:Set<string>;expectKey:boolean}|null)[]=[];
 for(let index=0;index<text.length;index++){
  const char=text[index];
  if(char==='"'){
   const start=index++;
   while(index<text.length){if(text[index]==='\\'){index+=2;continue;}if(text[index]==='"')break;index++;}
   const scope=scopes.at(-1);
   if(scope?.expectKey){
    const key=JSON.parse(text.slice(start,index+1)) as string;
    if(scope.keys.has(key))throw Error(`작품 파일 JSON의 중복 항목 '${key}'을 확인해 주세요. 앞의 작성 값을 덮어쓸 수 없습니다.`);
    scope.keys.add(key);scope.expectKey=false;
   }
  }else if(char==='{')scopes.push({keys:new Set(),expectKey:true});
  else if(char==='[')scopes.push(null);
  else if(char==='}'||char===']')scopes.pop();
  else if(char===','){const scope=scopes.at(-1);if(scope)scope.expectKey=true;}
 }
 return parsed;
}
/** PostgreSQL UTF8 jsonb cannot store NUL or unpaired Unicode surrogates. */
export function assertJsonbText(value:unknown,path='$'):void{
 if(typeof value==='string'){
  for(let index=0;index<value.length;index++){
   const code=value.charCodeAt(index);
   if(code===0||code>=0xdc00&&code<=0xdfff)throw Error(`${path}: PostgreSQL jsonb에 저장할 수 없는 문자입니다. 원본은 유지됩니다.`);
   if(code>=0xd800&&code<=0xdbff){const next=value.charCodeAt(++index);if(!(next>=0xdc00&&next<=0xdfff))throw Error(`${path}: PostgreSQL jsonb에 저장할 수 없는 Unicode 문자입니다. 원본은 유지됩니다.`);}
  }
 }else if(Array.isArray(value))value.forEach((item,index)=>assertJsonbText(item,`${path}[${index}]`));
 else if(value!==null&&typeof value==='object')for(const [key,item] of Object.entries(value)){assertJsonbText(key,`${path}의 항목명`);assertJsonbText(item,`${path}.${key}`);}
}
