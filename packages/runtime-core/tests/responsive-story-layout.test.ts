import { describe, expect, it } from 'vitest';
import { classicStories, representativeStories, resolveProvidedCatalogStory } from '@knolstory/compatibility';
import { ASSET_CATALOG, isSelectableAsset, resolveAsset } from '@knolstory/asset-registry';
import { compileStoryScene, createBlankStoryProject, patchStoryLine, resolveBackgroundRect, resolveStoryViewport } from '../src/index';
const child = 'onggojib.character.child-pixel';
const adult = 'onggojib.character.classic-master';
const source = () => patchStoryLine(createBlankStoryProject({ id: 'responsive', chapterId: 'chapter', lineId: 'cut' }), 'cut', {
  type:'dialogue',speaker:'left',speakerName:'아이',
  backgroundId: 'rabbit-turtle.background.rabbit-turtle-bg-grassland',
  stageComposition: { leftActors: [{ key: 'child', assetId: child }], rightActors: [{ key: 'adult', assetId: adult }] },
});

describe('responsive story framing', () => {
  it('uses fixed portrait or landscape stages and rejects invalid measurements', () => {
    expect(resolveStoryViewport({ width: 390, height: 844 })).toMatchObject({ width: 720, height: 1280 });
    expect(resolveStoryViewport({ width: 1000, height: 450 })).toMatchObject({ width: 1280, height: 720 });
    for (const viewport of [{ width: 0, height: 400 }, { width: 400, height: NaN }]) expect(() => resolveStoryViewport(viewport)).toThrow();
  });
  it('covers portrait backgrounds and moves the crop toward the authored focal point', () => {
    const centered = resolveBackgroundRect({ width: 1600, height: 900 }, { width: 720, height: 1600 }, 'cover');
    const right = resolveBackgroundRect({ width: 1600, height: 900 }, { width: 720, height: 1600 }, 'cover', { x: 1, y: .5 });
    expect(centered.height).toBe(1600); expect(centered.width).toBeGreaterThan(720);
    expect(right.x + right.width).toBeCloseTo(720); expect(right.x).toBeLessThan(centered.x);
    const contained = resolveBackgroundRect({ width: 1600, height: 900 }, { width: 720, height: 1600 }, 'contain');
    expect(contained.width).toBe(720); expect(contained.y).toBeGreaterThan(0);
    expect(() => resolveBackgroundRect({ width: 0, height: 900 }, { width: 720, height: 1600 }, 'cover')).toThrow();
    expect(() => resolveBackgroundRect({ width: 1600, height: 900 }, { width: 720, height: 1600 }, 'cover', { x: 2, y: .5 })).toThrow();
  });
  it.each([{ width: 390, height: 844 }, { width: 1000, height: 450 }, { width: 1280, height: 720 }])('preserves source stature and lower-body textbox overlap in $width × $height', viewport => {
    const project = source();
    const before = JSON.stringify(project);
    const scene = compileStoryScene(project, 'cut', 1, { mode: 'edit', viewport });
    expect(scene.viewportVersion).toBe(1);
    expect(scene.textboxRect).toBeDefined();
    expect(scene.dialogueStyle!.fontSize).toBe(32);
    const painted = scene.actors.map((actor, i) => {
      const geometry = resolveAsset(i === 0 ? child : adult)!.geometry!;
      expect(actor.rect.y + actor.rect.height * geometry.top).toBeGreaterThanOrEqual(8);
      expect(actor.rect.y + actor.rect.height * geometry.bottom).toBeGreaterThan(scene.textboxRect!.y);
      return actor.rect.height * (geometry.bottom - geometry.top);
    });
    if(viewport.width<viewport.height){expect(scene.actors.map(a=>a.id)).toEqual(['child']);}
    else {const childGeometry=resolveAsset(child)!.geometry!,adultGeometry=resolveAsset(adult)!.geometry!;expect(painted[0]/painted[1]).toBeCloseTo((childGeometry.bottom-childGeometry.top)/(adultGeometry.bottom-adultGeometry.top),6);expect(painted[0]/painted[1]).toBeLessThan(.9);}
    expect(scene.background!.rect).toBeDefined();
    expect(JSON.stringify(project)).toBe(before);
  });
  it.each(representativeStories)('compiles all inherited cuts of $label in portrait and wide displays', ({project}) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      for (const line of project.lines) {
        const scene = compileStoryScene(project, line.id, 1, { mode: 'edit', viewport });
        expect(scene.actors.every(a => Number.isFinite(a.rect.x) && Number.isFinite(a.rect.y))).toBe(true);
        expect(scene.textboxRect!.y + scene.textboxRect!.height).toBeLessThanOrEqual(scene.height);
        expect(scene.dialogue.text).toBe(line.text);
      }
    }
  }, 60000);
  it('keeps enough text height at small landscape preview sizes', () => {
    const view = resolveStoryViewport({ width: 390, height: 176 });
    expect(view.textboxRect.height).toBeGreaterThan(view.dialogueStyle.fontSize * 3 + 48);
    expect(view.textboxRect.y + view.textboxRect.height).toBeLessThan(view.height);
  });
  it('preserves manual anchors, center intent, original facing and empty POV cuts', () => {
    const project = patchStoryLine(source(), 'cut', { stageComposition: { leftActors: [{ key: 'adult', assetId: adult, position: 'center', facing: 'original', xAnchor: 40, scaleMultiplier: .8 }], rightActors: [] } });
    const scene = compileStoryScene(project, 'cut', 1, { mode: 'edit', viewport: { width:1280,height:720 } });
    expect(scene.actors[0].rect.x + scene.actors[0].rect.width / 2).toBeCloseTo(scene.width * .4);
    expect(scene.actors[0].flipX).toBe(false);
    const empty = patchStoryLine(project, 'cut', { stageComposition: { leftActors: [], rightActors: [] }, speakerName: '나' });
    expect(compileStoryScene(empty, 'cut', 2, { mode: 'edit', viewport: { width: 390, height: 844 } }).actors).toEqual([]);
  });
});

it('fills the responsive viewport for scene artwork and allows explicit whole-picture framing',()=>{
 const p=representativeStories.find(story=>story.id==='onggojib')!.project,l=p.lines[0];
 const first=compileStoryScene(p,l.id,1,{mode:'edit',viewport:{width:390,height:844}});
 expect(first.background?.fit).toBe('cover');
 const next={...p,lines:p.lines.map(line=>line.id===l.id?{...line,presentation:{...line.presentation,backgroundFit:'contain' as const}}:line)};
 expect(compileStoryScene(next,l.id,2,{mode:'edit',viewport:{width:390,height:844}}).background?.fit).toBe('contain');
});

it('keeps reference text and actors unchanged while reserving usable tools when the game canvas scales down',()=>{
 const viewport=resolveStoryViewport({width:1280,height:720},{width:374,height:440});
 const full=resolveStoryViewport({width:1280,height:720});
 expect(viewport.dialogueStyle.fontSize).toBe(full.dialogueStyle.fontSize);
 expect(viewport.dialogueStyle.paginationFontSize).toBe(full.dialogueStyle.paginationFontSize);
 expect(viewport.actorBaseHeight).toBe(full.actorBaseHeight);
 expect(viewport.actorBaseline).toBe(full.actorBaseline);
 expect(viewport.dialogueStyle.toolsHeight).toBeGreaterThan(full.dialogueStyle.toolsHeight);
});

it('keeps selectable center cards inside both stages without stretching', () => {
 const cards = ASSET_CATALOG.filter(asset => asset.type === 'character' && asset.geometry && isSelectableAsset(asset));
 for (const viewport of [{width:390,height:844},{width:844,height:390}]) for (const card of cards) {
  const id = card.id;
  const project = patchStoryLine(source(), 'cut', {
   stageComposition:{leftActors:[{key:'actor',assetId:id,position:'center',facing:'original'}],rightActors:[]},
  });
  const scene = compileStoryScene(project, 'cut', 1, {mode:'play',viewport});
  const {rect} = scene.actors[0];
  const g = resolveAsset(id)!.geometry!;
  expect(rect.x + rect.width*g.left).toBeGreaterThanOrEqual(19.99);
  expect(rect.x + rect.width*g.right).toBeLessThanOrEqual(scene.width-19.99);
  expect(rect.width/rect.height).toBeCloseTo(g.width/g.height, 8);
  expect(rect.y+rect.height*g.top).toBeGreaterThanOrEqual(8);
  expect(rect.y+rect.height*g.bottom).toBeLessThanOrEqual(scene.height);
 }
});

it('keeps most of a small solo sprite above the landscape dialogue panel', () => {
 const id = 'heungbu.character.swallow';
 const project = patchStoryLine(source(), 'cut', {
  stageComposition:{leftActors:[{key:'bird',assetId:id,position:'center'}],rightActors:[]},
 });
 const viewport = {width:844,height:390};
 const scene = compileStoryScene(project, 'cut', 1, {mode:'play',viewport,dialogueDock:{bottomInsetPx:0}});
 const {rect} = scene.actors[0];
 const g = resolveAsset(id)!.geometry!;
 const top = rect.y + rect.height*g.top;
 expect(scene.textboxRect!.y-top).toBeGreaterThanOrEqual(.8*rect.height*(g.bottom-g.top)-1e-8);
});

it('preserves the floor of small actors in authored compositions and portrait focus', () => {
 const bird = {key:'bird',assetId:'heungbu.character.swallow'};
 const cases = [
  {actor:{...bird,xAnchor:38},rightActors:[],viewport:{width:844,height:390}},
  {actor:{...bird,scaleMultiplier:.8},rightActors:[],viewport:{width:844,height:390}},
  {actor:{...bird,motion:{type:'move' as const,fromXAnchor:25}},rightActors:[],viewport:{width:844,height:390}},
  {actor:bird,rightActors:[{key:'adult',assetId:adult}],viewport:{width:390,height:844}},
 ];
 const geometry = resolveAsset(bird.assetId)!.geometry!;
 for (const {actor,rightActors,viewport} of cases) {
  const project = patchStoryLine(source(), 'cut', {stageComposition:{leftActors:[actor],rightActors}});
  const scene = compileStoryScene(project, 'cut', 1, {mode:'play',viewport,dialogueDock:{bottomInsetPx:0}});
  const {rect} = scene.actors[0];
  expect(rect.y+rect.height*geometry.bottom).toBeCloseTo(resolveStoryViewport(viewport).actorBaseline, 6);
  if ('xAnchor' in actor) expect(rect.x+rect.width/2).toBeCloseTo(scene.width*.38, 6);
 }
});

describe('portrait reading adapts authored direction', () => {
 const wide = {width:1280,height:720};
 const tall = {width:720,height:1280};
 const read = (project: ReturnType<typeof source>, viewport: typeof wide, effectStep=0) =>
  compileStoryScene(project,'cut',1,{mode:'play',viewport,playbackState:{lineId:'cut',path:['cut'],status:'reading',effectStep}});

 it('centers just one actor in portrait for ordinary dialogue and narration', () => {
  const project = source();
  const narration = patchStoryLine(project,'cut',{type:'narration',speaker:'narration'});
  const coSpeakers = patchStoryLine(project,'cut',{stageComposition:{
   ...project.lines[0].stageComposition!,speakerActorKeys:['child','adult'],
  }});
  for (const cut of [project,narration,coSpeakers]) {
   const scene = read(cut,tall);
   expect(scene.actors.map(actor=>actor.id)).toEqual(['child']);
   expect(scene.actors[0].handle!.x).toBeCloseTo(tall.width/2);
   expect(read(cut,wide).actors.map(actor=>actor.id)).toEqual(['child','adult']);
  }
 });

 it('keeps one subject with simultaneous targets and a click replacing an inherited effect', () => {
  const base = source();
  const cut = base.lines[0];
  const target = (actorKey: string) => ({kind:'actor' as const,actorKey});
  const project = {...base,lines:[
   {...cut,id:'earlier',order:1,presentation:{effects:[
    {id:'shared',type:'flash' as const,scope:'following' as const,target:target('child')},
   ]}},
   {...cut,order:2,presentation:{effects:[
    {id:'shared',type:'flash' as const,scope:'following' as const,trigger:'on-click' as const,target:target('adult')},
   ]}},
  ]};
  for (const effectStep of [0,1]) {
   const scene = compileStoryScene(project,'cut',1,{mode:'play',viewport:tall,
    playbackState:{lineId:'cut',path:['earlier','cut'],status:'reading',effectStep}});
   expect(scene.actors.map(actor=>actor.id)).toEqual(['adult']);
  }
 });

 it('centers the effect target alone before a click and preserves the dialogue and timing', () => {
  const project = patchStoryLine(source(),'cut',{presentation:{effects:[
   {type:'flash',target:{kind:'actor',actorKey:'adult'},trigger:'on-click',durationMs:450},
  ]}});
  const before = read(project,tall);
  const after = read(project,tall,1);
  expect(before.actors.map(actor=>actor.id)).toEqual(['adult']);
  expect(before.actors[0].emphasis).toBe('normal');
  expect(before.dialogue).toEqual(read(project,wide).dialogue);
  expect(after.actors).toEqual(before.actors);
  expect(before.presentation?.effects).toEqual([]);
  expect(after.presentation?.effects).toMatchObject([{target:{kind:'actor',actorId:'adult'},durationMs:450}]);
 });

 it('uses the visited branch for pending and continuing effects', () => {
  const base = source();
  const cut = base.lines[0];
  const target = {kind:'actor',actorKey:'adult'} as const;
  const branchCondition = {sourceLineId:'choice',choiceId:'directed'};
  const project = {...base,lines:[
   {...cut,id:'choice',order:1,flow:{type:'choice' as const,options:[
    {id:'directed',label:'연출',targetLineId:'cut'},
    {id:'plain',label:'일반',targetLineId:'cut'},
   ]}},
   {...cut,order:2,presentation:{effects:[{
    type:'flash' as const,trigger:'on-click' as const,scope:'following' as const,target,branchCondition,
   }]}},
   {...cut,id:'follow',order:3},
  ]};
  const at = (lineId: string, path: string[], choiceId: string) =>
   compileStoryScene(project,lineId,1,{mode:'play',viewport:tall,
    playbackState:{lineId,path,status:'reading',choiceHistory:[{pathIndex:0,choiceId}]}});
  expect(at('cut',['choice','cut'],'plain').actors.map(actor=>actor.id)).toEqual(['child']);
  expect(at('cut',['choice','cut'],'directed').actors.map(actor=>actor.id)).toEqual(['adult']);
  const following = at('follow',['choice','cut','follow'],'directed');
  expect(following.actors.map(actor=>actor.id)).toEqual(['adult']);
  expect(following.presentation?.effects).toMatchObject([{target:{kind:'actor',actorId:'adult'}}]);
 });

 it('keeps the original Onggojib courthouse and screen flash in a one-actor portrait', () => {
  const original = classicStories.find(item=>item.project.id==='classic-onggojib-tale')!;
  const project = resolveProvidedCatalogStory(original.project);
  for (const id of ['4-line-01','6-line-08']) {
   const cut = 'classic-onggojib-' + id;
   const scene = compileStoryScene(project,cut,1,{mode:'play',viewport:tall,playbackPath:[cut]});
   expect(scene.actors).toHaveLength(1);
   if (id === '6-line-08') expect(scene.presentation?.effects).toMatchObject([{type:'flash'}]);
  }
 });

 it('preserves the authored movement direction and timing when the subject is centered', () => {
  const project = patchStoryLine(source(),'cut',{stageComposition:{
   leftActors:[{key:'child',assetId:child}],
   rightActors:[{key:'adult',assetId:adult,motion:{type:'move',fromXAnchor:50,durationMs:450,delayMs:80}}],
  },type:'narration',speaker:'narration'});
  const landscape = read(project,wide).actors.find(actor=>actor.id==='adult')!.motion!;
  const scene = read(project,tall);
  expect(scene.actors.map(actor=>actor.id)).toEqual(['adult']);
  const portrait = scene.actors[0].motion!;
  expect(landscape.offsetX).toBeLessThan(0);
  expect(portrait.offsetX).toBeCloseTo(landscape.offsetX * 720 / 1280);
  expect(portrait).toMatchObject({durationMs:450,delayMs:80});
 });
});
