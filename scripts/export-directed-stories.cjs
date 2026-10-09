/** Export existing manuscripts with additive editorial cues, never a newly authored test story. */
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const aliases={'@knolstory/story-domain':'packages/story-domain/src/index.ts','@knolstory/runtime-core':'packages/runtime-core/src/index.ts','@knolstory/asset-registry':'packages/asset-registry/src/index.ts','@knolstory/compatibility':'packages/compatibility/src/index.ts'};
const originalResolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...args){const typed=parent&&request.startsWith('.')&&!path.extname(request)?path.resolve(path.dirname(parent.filename),request+'.ts'):null;return originalResolve.call(this,aliases[request]?path.join(root,aliases[request]):typed&&fs.existsSync(typed)?typed:request,parent,...args);};
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);
const {representativeStories,classicStories,enhanceExistingStory}=require(path.join(root,aliases['@knolstory/compatibility']));
const {createStoryDocument,parseStoryDocument}=require(path.join(root,aliases['@knolstory/story-domain']));
const {compileStoryScene}=require(path.join(root,aliases['@knolstory/runtime-core']));
const out=path.join(root,'docs/architecture/evidence/existing-story-enhancement');fs.mkdirSync(out,{recursive:true});
const summary=[],verificationScenes=[];const verifyOnly=process.argv.includes('--runtime-cues');
const {storyDirectionManifest}=require(path.join(root,'packages/compatibility/src/story-direction.ts'));
for(const story of [...representativeStories,...classicStories]){
 const project=enhanceExistingStory(story.project);const document=createStoryDocument({project,savedAt:new Date().toISOString(),appVersion:'knolstory-existing-direction-v1'});const checked=parseStoryDocument(document);if(!checked.ok)throw Error(JSON.stringify(checked.issues));
 for(const line of project.lines)compileStoryScene(project,line.id,1,{mode:'edit'});
 if(verifyOnly){
  const current=JSON.parse(fs.readFileSync(path.join(out,`${story.id}.knolstory`),'utf8'));require('node:assert/strict').deepEqual(current.project,project);
  const work=storyDirectionManifest.works.find(w=>w.projectId===project.id);
  for(const cue of work.events){const scene=compileStoryScene(project,cue.lineId,verificationScenes.length+1,{mode:'play',presentationEntry:`cue-audit:${story.id}:${cue.lineId}`,viewport:{width:1280,height:720},playbackPath:[cue.lineId]});verificationScenes.push({catalogId:story.id,intent:cue.intent,scene});}
 }else fs.writeFileSync(path.join(out,`${story.id}.knolstory`),JSON.stringify(document,null,2)+'\n');summary.push({catalogId:story.id,projectId:project.id,title:project.title,chapters:project.chapters.length,cuts:project.lines.length,audioChapters:project.chapters.filter(c=>c.audio).length,soundCuts:project.lines.filter(l=>l.audio?.sounds?.length).length,transitions:project.lines.filter(l=>l.presentation?.transition).length});
}
if(verifyOnly){fs.writeFileSync(path.join(out,'runtime-cues.json'),JSON.stringify(verificationScenes,null,2)+'\n');console.log(`Compiled and checked ${verificationScenes.length} existing cue scenes`);}else fs.writeFileSync(path.join(out,'catalog-summary.json'),JSON.stringify({status:'compiled existing direction exports; native verification stored separately',works:summary},null,2)+'\n');console.log(summary);
