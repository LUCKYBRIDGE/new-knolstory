import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { isRuntimeScene,isRuntimeThumbnailRequest,isRuntimeServiceAudioResources,runtimeServiceAudioPaths } from '../../packages/runtime-contract/src/index';

const scene = { contractVersion: 1, sceneId: 'probe', revision: 1, width: 1280, height: 720,
  actors: [{ id: 'heungbu', name: '흥부', rect: { x: 20, y: 20, width: 100, height: 200 } }],
  dialogue: { speaker: '흥부', text: '안녕하세요' } };
function bridge() {
  const listeners: Record<string, (event: unknown) => void> = {};
  const events: unknown[] = [];
  const frameElement = {};
  const attrs=new Map<string,string>([['tabindex','-1']]);
  const canvas={getBoundingClientRect:()=>({x:0,y:0,width:800,height:600}),getAttribute:(name:string)=>attrs.get(name)??null,setAttribute:(name:string,value:string)=>attrs.set(name,value),removeAttribute:(name:string)=>attrs.delete(name)};
  const parent = { postMessage: (event: unknown) => events.push(event), document: {activeElement: frameElement as unknown} };
  const window: Record<string, unknown> = { KnolRuntimeContract: { isRuntimeScene,isRuntimeThumbnailRequest,isRuntimeServiceAudioResources,runtimeServiceAudioPaths }, frameElement };
  runInNewContext(readFileSync('spikes/renpy-web/bridge.js', 'utf8'), {
    window, parent, location: { origin: 'https://story.knolquiz.com' }, structuredClone,
    addEventListener: (name: string, fn: (event: unknown) => void) => { listeners[name] = fn; },
    document: { getElementById: () => canvas },
  });
  const api = window.knolBridge as { drain(): string; emit(event: unknown): void };
  const send = (revision = 1, seq = revision, payload: unknown = { ...scene, revision }, overrides = {}) => listeners.message({
    origin: 'https://story.knolquiz.com', source: parent,
    data: { protocol: 1, type: 'loadScene', seq, revision, payload }, ...overrides,
  });
  return { api, events, send, parent, frameElement, listeners,canvas };
}
describe('actual runtime iframe bridge', () => {
  it('renders at most two editing thumbnails without replacing the active scene or revision',()=>{
    const {api,send,listeners,parent,events}=bridge();send(1,1,{...scene,mode:'edit'});api.drain();
    const request=(requestId:string,overrides={})=>listeners.message({origin:'https://story.knolquiz.com',source:parent,data:{protocol:1,type:'renderSceneThumbnail',requestId,payload:{...scene,sceneId:requestId,revision:0,mode:'edit'}},...overrides});
    request('wrong-origin',{origin:'https://other.invalid'});request('one');request('two');request('three');
    expect(JSON.parse(api.drain()).map((c:{requestId:string})=>c.requestId)).toEqual(['two','three']);
    send(2,2,{...scene,mode:'edit',revision:2});expect(JSON.parse(api.drain())[0].revision).toBe(2);expect(events).toEqual([]);
    send(3,3,{...scene,mode:'play',revision:3});api.drain();request('during-play');expect(api.drain()).toBe('[]');
  });
  it('accepts complete resolved scene and drains only once', () => {
    const { api, send } = bridge(); send(); expect(JSON.parse(api.drain())[0].payload).toEqual(scene); expect(api.drain()).toBe('[]');
  });
  it('accepts portrait runtime dimensions without forcing a desktop canvas', () => {
    const {api,send}=bridge(); send(1,1,{...scene,width:720,height:1600});
    expect(JSON.parse(api.drain())[0].payload.height).toBe(1600);
  });
  it('rejects messages from another origin or source', () => {
    const { api, send } = bridge(); send(1, 1, scene, { origin: 'https://attacker.invalid' }); send(1, 1, scene, { source: {} }); expect(api.drain()).toBe('[]');
  });
  it('coalesces bursts and rejects stale or duplicate revisions', () => {
    const { api, send } = bridge(); send(1); send(2); send(1, 3); send(3, 1); expect(JSON.parse(api.drain()).map((c: { revision: number }) => c.revision)).toEqual([2]);
  });
  it('uses canonical contract validation and reports malformed actors', () => {
    const { api, events, send } = bridge(); send(1, 1, { ...scene, actors: [{ ...scene.actors[0], rect: { x: -1, y: 20, width: 100, height: 200 } }] });
    expect(api.drain()).toBe('[]'); expect(events).toEqual([expect.objectContaining({ type: 'error', code: 'INVALID_SCENE' })]);
  });
  it('passes resolved images, presentation and play choices without receiving a StoryDocument', () => {
    const { api, send } = bridge();
    const playable = { ...scene, mode: 'play', reducedMotion: true,
      background: { imagePath: 'assets/legacy-18da4fc/BG04-cottage-day.webp' },
      actors: [{ ...scene.actors[0], imagePath: 'assets/legacy-18da4fc/heungbu.character.heungbu-swallow-care.webp', opacity: .7, flipX: true, spectral: true, emphasis: 'dim', depth: 1 }],
      choices: [{ id: 'branch-a', text: '도와준다' }],
      presentation: { effects: [{ type: 'crack', intensity: 'strong', trigger: 'after-delay', delayMs: 80 }], look: { type: 'flashback', intensity: 'normal' } } };
    send(1, 1, playable);
    expect(JSON.parse(api.drain())[0].payload).toEqual(playable);
  });
  it('rejects traversal and host URLs in native image paths', () => {
    for (const imagePath of ['../secret', 'https://example.com/image.webp', '/assets/image.webp']) {
      const { api, events, send } = bridge();
      send(1, 1, { ...scene, background: { imagePath } });
      expect(api.drain()).toBe('[]');
      expect(events).toEqual([expect.objectContaining({ code: 'INVALID_SCENE' })]);
    }
  });
  it('uses engine transform instead of assuming a centered canvas viewport', () => {
    const { api, events } = bridge(); api.emit({ protocol: 1, type: 'sceneRendered', engineViewport: { x: 40, y: 0, width: 720, height: 450, physicalWidth: 800, physicalHeight: 600 } });
    expect(events).toEqual([expect.objectContaining({ rendererRect: { x: 40, y: 0, width: 720, height: 450 } })]);
  });
  it('reports actual fitted renderer rect including letterbox offset', () => {
    const { api, events } = bridge(); api.emit({ protocol: 1, type: 'ready' }); expect(events).toEqual([expect.objectContaining({ rendererRect: { x: 0, y: 75, width: 800, height: 450 } })]);
  });
});

// SDK canvas mouseenter calls window.focus; a host editing control must keep ownership.
it('does not let passive canvas hover take focus from the Web authoring controls',()=>{
 const {listeners,parent}=bridge();parent.document.activeElement={tagName:'TEXTAREA'};let blocked=0;
 expect(listeners.mouseenter).toBeDefined();listeners.mouseenter({target:{id:'canvas'},stopImmediatePropagation:()=>{blocked++;}});expect(blocked).toBe(1);
});
it('preserves existing native focus and leaves noncanvas hover events intact',()=>{
 const {listeners,parent,frameElement}=bridge();let blocked=0;const event=(id:string)=>({target:{id},stopImmediatePropagation:()=>{blocked++;}});
 expect(listeners.mouseenter).toBeDefined();parent.document.activeElement=frameElement;listeners.mouseenter(event('canvas'));parent.document.activeElement={tagName:'INPUT'};listeners.mouseenter(event('presplash'));expect(blocked).toBe(0);
});

it('makes only the current locked audio stage keyboard reachable and restores SDK attributes',()=>{
 const {api,send,canvas}=bridge();
 const playable={...scene,mode:'play',audio:{version:1,sessionId:'keyboard',music:{action:'play',audioPath:'assets/audio/music.ogg',volume:1,loop:true,fadeInMs:0,fadeOutMs:0},sounds:[]}};
 expect(isRuntimeScene(playable)).toBe(true);send(1,1,playable);api.emit({protocol:1,type:'sceneRendered',sceneId:'probe',revision:1,audioState:{unlocked:false}});
 expect(canvas.getAttribute('tabindex')).toBe('0');expect(canvas.getAttribute('role')).toBe('button');expect(canvas.getAttribute('aria-label')).toContain('Enter');
 api.emit({protocol:1,type:'sceneRendered',sceneId:'probe',revision:0,audioState:{unlocked:true}});expect(canvas.getAttribute('role')).toBe('button');
 api.emit({protocol:1,type:'sceneRendered',sceneId:'probe',revision:1,audioState:{unlocked:true}});
 expect(canvas.getAttribute('tabindex')).toBe('-1');expect(canvas.getAttribute('role')).toBeNull();expect(canvas.getAttribute('aria-label')).toBeNull();
 send(2,2,{...playable,revision:2});api.emit({protocol:1,type:'sceneRendered',sceneId:'probe',revision:2,audioState:{unlocked:false}});expect(canvas.getAttribute('role')).toBe('button');
 send(3,3,{...scene,revision:3,mode:'edit'});expect(canvas.getAttribute('role')).toBeNull();
 api.emit({protocol:1,type:'sceneRendered',sceneId:'probe',revision:2,audioState:{unlocked:false}});expect(canvas.getAttribute('role')).toBeNull();
});

it('coalesces native page requests separately and clears them on a newer scene',()=>{
 const {api,send,listeners,parent}=bridge();send(1,1,{...scene,mode:'play'});
 const request=(overrides={})=>listeners.message({origin:'https://story.knolquiz.com',source:parent,data:{protocol:1,type:'nextDialoguePage',sceneId:'probe',revision:1},...overrides});
 request({origin:'https://other.invalid'});request({source:{}});expect(JSON.parse(api.drain()).map((c:{type:string})=>c.type)).toEqual(['loadScene']);
 request();request();expect(JSON.parse(api.drain())).toEqual([{protocol:1,type:'nextDialoguePage',sceneId:'probe',revision:1}]);expect(api.drain()).toBe('[]');
 request();send(2,2,{...scene,revision:2,mode:'play'});expect(JSON.parse(api.drain()).map((c:{type:string})=>c.type)).toEqual(['loadScene']);request();expect(api.drain()).toBe('[]');
});
it('rejects page requests before a scene and for editing scenes or malformed revisions',()=>{
 const {api,send,listeners,parent}=bridge();
 const request=(revision:unknown=1)=>listeners.message({origin:'https://story.knolquiz.com',source:parent,data:{protocol:1,type:'nextDialoguePage',sceneId:'probe',revision}});
 request();expect(api.drain()).toBe('[]');send();api.drain();request();expect(api.drain()).toBe('[]');
 send(2,2,{...scene,revision:2,mode:'play'});api.drain();for(const revision of [-1,1,2.5,'2'])request(revision);expect(api.drain()).toBe('[]');
});
