"""Build the pinned real Ren'Py Web presenter (no alternative renderer)."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
version = (ROOT / 'renpy/RENPY_VERSION').read_text().strip()
sdk = Path(os.environ.get('KNOL_RENPY_SDK', ROOT / '.cache/renpy' / f'renpy-{version}-sdk'))
project = ROOT / 'renpy/responsive-spike'
output = ROOT / 'apps/web/public/runtime'
tokens = json.loads((ROOT / 'packages/design-tokens/tokens.json').read_text())
generated = ['# Generated from packages/design-tokens/tokens.json.']
for source, target in [('paper', 'paper'), ('ink', 'ink'), ('mint', 'mint')]:
    generated.append(f'define knol_{target} = {json.dumps(tokens[source])}')
generated.append('define config.gl_clear_color = ' + json.dumps(tokens['paper']))
generated.append('define knol_actor_colors = ' + repr([tokens[k] for k in ['gold', 'coral', 'mintStrong', 'navy']]))
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
    shutil.copytree(assets, project / 'game/assets', ignore=shutil.ignore_patterns('cover-fonts'))
env = dict(os.environ, SDL_VIDEODRIVER='dummy', SDL_AUDIODRIVER='dummy')
subprocess.run([str(sdk / 'renpy.sh'), str(sdk / 'launcher'), 'web_build', str(project), '--dest', str(output)], env=env, check=True)
html = (output / 'index.html').read_text()
html = html.replace('<script src="renpy-pre.js">', '<script src="runtime-contract.js"></script>\n  <script src="knol-bridge.js"></script>\n  <script src="renpy-pre.js">')
# Spike stays local, avoids stale service-worker cache between builds.
start = html.index('      // Register the service worker.')
end = html.index('  </script>', start)
html = html[:start] + html[end:]
html = html.replace('</style>', '\n#ContextContainer { display:none !important; }\nhtml, #canvas { background: ' + tokens['paper'] + '; }\n</style>')
(output / 'index.html').write_text(html)
shutil.copy2(ROOT / 'spikes/renpy-web/bridge.js', output / 'knol-bridge.js')
shutil.copy2(ROOT / 'spikes/renpy-web/FONT-LICENSE.txt', output / 'FONT-LICENSE.txt')
subprocess.run(['node', '-e', "const fs=require('fs'),ts=require('typescript');const audio=ts.transpileModule(fs.readFileSync(require('path').join(require('path').dirname(process.argv[1]),'audio.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const source=fs.readFileSync(process.argv[1],'utf8');const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;fs.writeFileSync(process.argv[2],'(()=>{const audioExports={};(()=>{const exports=audioExports;'+audio+'})();const require=()=>audioExports;const exports={};'+code+';window.KnolRuntimeContract=Object.freeze(exports);})();');", str(ROOT / 'packages/runtime-contract/src/index.ts'), str(output / 'runtime-contract.js')], cwd=ROOT, check=True)
print(f'Built Ren\'Py {version} to apps/web/public/runtime')
