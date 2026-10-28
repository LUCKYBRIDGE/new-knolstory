"""Build the pinned real Ren'Py Web presenter (no alternative renderer)."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

from loading import brand_loading_html
from pixel_budget import cap_runtime_pixel_ratio
from asset_versions import version_runtime_html

ROOT = Path(__file__).resolve().parents[2]
subprocess.run(['python3', str(ROOT / 'scripts/check-service-audio.py'), '--source-only'], check=True)
version = (ROOT / 'renpy/RENPY_VERSION').read_text().strip()
sdk = Path(os.environ.get('KNOL_RENPY_SDK', ROOT / '.cache/renpy' / f'renpy-{version}-sdk'))
project = ROOT / 'renpy/responsive-spike'
output = ROOT / 'apps/web/public/runtime'
tokens = json.loads((ROOT / 'packages/design-tokens/tokens.json').read_text())
generated = ['# Generated from packages/design-tokens/tokens.json.']
for source, target in [('paper', 'paper'), ('ink', 'ink'), ('mint', 'mint'), ('dialogueSpeakerInk', 'speaker_ink')]:
    generated.append(f'define knol_{target} = {json.dumps(tokens[source])}')
generated.append('define config.gl_clear_color = ' + json.dumps(tokens['paper']))
generated.append('define knol_actor_colors = ' + repr([tokens[k] for k in ['gold', 'coral', 'mintStrong', 'navy']]))
# Nine-slice SVG frames preserve native rounded corners at every Core textbox size.
ui = project / 'game/ui'
ui.mkdir(exist_ok=True)
for name, fill, border, radius in [
    ('dialogue-paper', tokens['dialoguePaper'], tokens['dialogueBorder'], tokens['dialogueRadius']),
    ('dialogue-speaker', tokens['dialogueSpeaker'], tokens['dialogueSpeaker'], tokens['dialogueSpeakerRadius']),
]:
    (ui / f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect x="1" y="1" width="126" height="126" rx="{radius}" fill="{fill}" stroke="{border}" stroke-width="2"/></svg>')
(ui / 'dialogue-next.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16"><path d="M4 4 L12 12 L20 4" fill="none" stroke="{tokens["ink"]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>')
(project / 'game/tokens.rpy').write_text('\n'.join(generated) + '\n')
font = ROOT / '.cache/renpy/NotoSansKR.ttf'
if not font.exists():
    raise SystemExit('Download the OFL NotoSansKR font as documented in spikes/renpy-web/README.md.')
if hashlib.sha256(font.read_bytes()).hexdigest() != '194018e6b2b293a7964f037b25c0249ce1418bc9ab3c971060a03aa57861e252':
    raise SystemExit('Unexpected NotoSansKR font checksum; review font upgrade explicitly.')
shutil.copy2(font, project / 'game/NotoSansKR.ttf')
shutil.copy2(ROOT / 'spikes/renpy-web/FONT-LICENSE.txt', project / 'game/NotoSansKR-LICENSE.txt')
# One shared asset corpus, never a story-specific runtime package.
assets = ROOT / 'apps/web/public/assets'
if assets.exists():
    # Replace generated copies so deleted source assets cannot survive rebuilds.
    shutil.rmtree(project / 'game/assets', ignore_errors=True)
    # Cover fonts belong to static Web book UI, not the story presenter.
    approvals = json.loads((ROOT / 'packages/asset-registry/src/audio-service-approvals.json').read_text())
    streamed = {row['src'] for row in approvals['assets'] if row.get('delivery') == 'on-demand'}
    def ignore_service_assets(folder, names):
        return [name for name in names if name in {'cover-fonts', 'legacy-ui', 'loading'} or '/' + (Path(folder) / name).relative_to(ROOT / 'apps/web/public').as_posix() in streamed]
    shutil.copytree(assets, project / 'game/assets', ignore=ignore_service_assets)
env = dict(os.environ, SDL_VIDEODRIVER='dummy', SDL_AUDIODRIVER='dummy')
subprocess.run(['bash', str(sdk / 'renpy.sh'), str(sdk / 'launcher'), 'web_build', str(project), '--dest', str(output)], env=env, check=True)
# Bound the SDL framebuffer density, not browser DPR or authored coordinates.
engine_js = output / 'renpy.js'
engine_js.write_text(cap_runtime_pixel_ratio(engine_js.read_text()))
html = (output / 'index.html').read_text()
html = html.replace('<script src="renpy-pre.js">', '<script src="runtime-contract.js"></script>\n  <script src="knol-bridge.js"></script>\n  <script src="renpy-pre.js">')
# Spike stays local, avoids stale service-worker cache between builds.
start = html.index('      // Register the service worker.')
end = html.index('  </script>', start)
html = html[:start] + html[end:]
html = html.replace('</style>', '\n#ContextContainer { display:none !important; }\nhtml, #canvas { background: ' + tokens['paper'] + '; }\n</style>')
html = brand_loading_html(html)
(output / 'index.html').write_text(html)
for extension in ['css', 'js']:
    shutil.copy2(ROOT / f'spikes/renpy-web/loading.{extension}', output / f'knol-loading.{extension}')
shutil.copy2(ROOT / 'spikes/renpy-web/bridge.js', output / 'knol-bridge.js')
shutil.copy2(ROOT / 'spikes/renpy-web/FONT-LICENSE.txt', output / 'FONT-LICENSE.txt')
subprocess.run(['node', '-e', "const fs=require('fs'),ts=require('typescript');const audio=ts.transpileModule(fs.readFileSync(require('path').join(require('path').dirname(process.argv[1]),'audio.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const source=fs.readFileSync(process.argv[1],'utf8');const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;fs.writeFileSync(process.argv[2],'(()=>{const audioExports={};(()=>{const exports=audioExports;'+audio+'})();const require=()=>audioExports;const exports={};'+code+';window.KnolRuntimeContract=Object.freeze(exports);})();');", str(ROOT / 'packages/runtime-contract/src/index.ts'), str(output / 'runtime-contract.js')], cwd=ROOT, check=True)
# Apply content versions after all boot dependencies have been generated.
(output / 'index.html').write_text(version_runtime_html((output / 'index.html').read_text(), output))
print(f'Built Ren\'Py {version} to apps/web/public/runtime')
subprocess.run(['python3', str(ROOT / 'scripts/check-service-audio.py')], check=True)
