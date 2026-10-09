"""Extract renderer-independent domain and four reading fixtures from the fixed baseline."""
from pathlib import Path
import subprocess, re, tempfile, json, sys
BASELINE = '18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b'
ROOT = Path(__file__).resolve().parents[1]
LEGACY = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / 'story-maker'
def source(name):
    return subprocess.check_output(['git','-C',str(LEGACY),'show',f'{BASELINE}:app/{name}'],text=True)
def closure(roots, output, domain=False):
    pending=list(roots); seen=set()
    while pending:
        name=pending.pop()
        if name in seen: continue
        seen.add(name); value=source(name)
        if name.endswith('.ts'):
            if domain and name=='story-data.ts':
                value=value[:value.index('export const DEFAULT_PROJECT')]
                value=re.sub(r'^import \{[^\n]*\} from "\./(?:story-stage-composition|story-presentation|story-speakers)";\n','',value,flags=re.M)
            if domain and name == 'story-stages.ts':
                # Import/validation needs canonical stage keys, not legacy recommendation UI.
                value = value[:value.index('export interface StoryStructureStep')] + value[value.index('export function isStoryStageKey'):value.index('export function getStructureOption')]
                value = value.replace('import type { Chapter, StoryPlanning } from "./story-data";', 'import type { StoryPlanning } from "./story-data";')
            if domain and name == 'story-scene-effect.ts':
                # Web Animation player helpers must not enter the Next renderer-independent domain.
                value = value[:value.index('export function sceneEffectAnimation')]
            if domain and name == 'creative-memos.ts':
                value = value[:value.index('export type CreativeMemoTemplate')] + value[value.index('function isMemoKind'):value.index('export function creativeMemoKindLabel')] + value[value.index('export function normalizeCreativeMemos'):value.index('export function creativeMemoDisplayTitle')]
            if domain and name == 'cover-design.ts':
                value = value[:value.index('function changeFace')]
            if domain and name == 'story-cover.ts':
                value = value[:value.index('export function resolveStoryCover')] + value[value.index('export const COVER_PRESET_OPTIONS'):value.index('/** Static recipes')]
                value = value.replace('import type { StoryProject } from "./story-data";\n', '')
                value = value.replace('cloneCoverDesign, ', '')
            dependencies=re.findall(r'(?:from\s*|import\()([\'"])(\./[^\'"]+)\1',value)
            for quote, path in dependencies:
                child=path[2:]
                if not child.endswith(('.ts','.json')): child += '.ts'
                pending.append(child)
                value=value.replace(quote+path+quote,quote+'./'+(child[:-3] if domain and child.endswith('.ts') else child)+quote)
            if name=='story-assets.ts':
                data=json.loads(value[value.index(' = [',value.index('export const STORY_ASSETS'))+3:].rstrip().rstrip(';'))
                # Cover recipe compatibility needs ID/type validation, not a renderer catalog.
                if domain: data=[{'id':a['id'],'type':a['type']} for a in data]
                (output/'story-assets.json').write_text(json.dumps(data,ensure_ascii=False))
                value=('import assets from "./story-assets.json" with {type:"json"};\n'
                       'export const STORY_ASSETS = assets;\n')
        (output/name).parent.mkdir(parents=True,exist_ok=True)
        (output/name).write_text(value)
    return seen
closure(['story-project-document.ts','story-flow.ts'],ROOT/'packages/story-domain/src/legacy',True)
with tempfile.TemporaryDirectory() as temp:
    output=Path(temp)
    closure(['story-classic-readings.ts','story-examples.ts'],output)
    script="""import {getExampleProject} from './story-examples.ts';
import {getClassicReading} from './story-classic-readings.ts';
console.log(JSON.stringify(Object.fromEntries(['seonnyeo','heungbu','onggojib','rabbit'].flatMap(id=>[[id,getExampleProject(id)],[id+'-classic',getClassicReading(id)]]))));"""
    (output/'extract.mjs').write_text(script)
    fixtures=json.loads(subprocess.check_output(['node','--experimental-strip-types',str(output/'extract.mjs')],text=True))
    for name,project in fixtures.items():
        (ROOT/f'tests/fixtures/stories/{name}.json').write_text(json.dumps(project,ensure_ascii=False,indent=2)+'\n')
print('Extracted fixed baseline domain +', ', '.join(fixtures))
