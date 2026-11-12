"""Register versioned picture-book illustrations composed from verified KnolStory art."""
import hashlib
import json
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'apps/web/public'
REGISTRY = ROOT / 'packages/asset-registry/src'
PREFIX = 'shortstory.background.creative-'
SIZE = (1280, 720)

# Actors use visible alpha bounds. Their anchors are center X and ground Y.
SCENES = [
    ('moon-pond-promise', '달빛 연못의 약속', 'seonnyeo-moon-pond-v2',
     [('seonnyeo.character.M01-earth-neutral', 385, 640, 350), ('creative.character.woodcutter-thanks', 900, 647, 375)]),
    ('rainy-visitor', '빗속에서 찾아온 사슴', 'seonnyeo.background.cottage-rain-evening-v1',
     [('creative.character.seonnyeo-deer-listen', 425, 630, 290), ('seonnyeo.character.M01-earth-neutral', 850, 638, 360)]),
    ('market-greeting', '가을 장터에서 인사하기', 'heungbu-autumn-market-v2',
     [('creative.character.heungbu-neighbor-greet', 390, 660, 365), ('creative.character.heungbu-encourage', 860, 664, 395)]),
    ('market-help', '장터에서 내민 손', 'heungbu-autumn-market-v2',
     [('creative.character.heungbu-girl-standing', 430, 635, 249), ('creative.character.heungbu-encourage', 825, 637, 367)]),
    ('meadow-discovery', '꽃 들판에서 발견한 것', 'rabbit-meadow-pixel-v2',
     [('creative.character.rabbit-listen', 435, 620, 279), ('rabbit-turtle.character.turtle-unified-720x900', 850, 627, 246)]),
    ('meadow-counsel', '풀밭에서 듣는 의관의 이야기', 'rabbit-meadow-pixel-v2',
     [('creative.character.physician-explain', 410, 641, 363), ('creative.character.rabbit-listen', 875, 646, 288)]),
    ('winter-directions', '겨울 골목에서 길을 묻다', 'onggojib-winter-pixel-v2',
     [('creative.character.onggojib-stranger-ask', 445, 638, 370), ('creative.character.onggojib-guard-guide', 845, 638, 405)]),
    ('winter-welcome', '돌담길의 반가운 손인사', 'onggojib-winter-pixel-v2',
     [('creative.character.onggojib-child-wave', 420, 646, 258), ('creative.character.onggojib-real-explain', 850, 648, 389)]),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_image(asset):
    path = PUBLIC / asset['src'].lstrip('/')
    if digest(path) != asset['revision']:
        raise ValueError(f"Source revision changed: {asset['id']}")
    with Image.open(path) as image:
        return image.convert('RGBA')


def compose(background, actors):
    scene = ImageOps.fit(source_image(background), SIZE, Image.Resampling.LANCZOS)
    shade = Image.new('RGBA', SIZE)
    draw = ImageDraw.Draw(shade)
    figures = []
    for asset, center, ground, height in actors:
        sprite = source_image(asset)
        sprite = sprite.crop(sprite.getchannel('A').getbbox())
        width = round(sprite.width * height / sprite.height)
        sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
        radius = round(width * .37)
        draw.ellipse((center-radius, ground-9, center+radius, ground+13), fill=(27, 22, 28, 105))
        figures.append((sprite, (center-width//2, ground-height)))
    scene.alpha_composite(shade.filter(ImageFilter.GaussianBlur(9)))
    for sprite, position in figures:
        scene.alpha_composite(sprite, position)
    return scene.convert('RGB')


def register(slug, label, background, actors):
    asset_id = f'{PREFIX}{slug}-v1'
    destination = f'assets/illustrations/shortstory-v1/{slug}.webp'
    output = BytesIO()
    compose(background, actors).save(output, format='WEBP', quality=88, method=6)
    content = output.getvalue()
    sources = [background, *(asset for asset, *_ in actors)]
    return {
        'id': asset_id, 'displayName': label, 'label': label, 'story': background['story'],
        'type': 'background', 'group': '자유 창작 삽화', 'backgroundRole': 'scene',
        'src': f'/{destination}', 'sourcePath': 'scripts/prepare-shortstory-illustrations.py',
        'copyright': '놀퀴즈', 'revision': hashlib.sha256(content).hexdigest(), 'geometry': None,
        'metadata': {
            'kind': 'scene-illustration', 'placementRole': 'background-slot',
            'qualityStatus': 'approved', 'pickerVisibility': 'secondary', 'containsCharacters': True,
            'shortStoryCollection': 'creative',
            'searchTerms': [source['label'].split(' · ')[0] for source in sources],
            'sourceLayers': [{'id': source['id'], 'sha256': source['revision']} for source in sources],
        },
    }, content


def main():
    catalog_path = REGISTRY / 'catalog.json'
    sizes_path = REGISTRY / 'background-sizes.json'
    catalog = json.loads(catalog_path.read_text())
    sizes = json.loads(sizes_path.read_text())
    assets = {asset['id']: asset for asset in catalog}
    for slug, label, background, actors in SCENES:
        background_id = background if '.' in background else f'creative.background.{background}'
        layers = [(assets[asset_id], *placement) for asset_id, *placement in actors]
        row, content = register(slug, label, assets[background_id], layers)
        asset_id = row['id']
        if asset_id in assets and assets[asset_id] != row:
            raise ValueError(f'Existing illustration changed; use a new version: {asset_id}')
        path = PUBLIC / row['src'].lstrip('/')
        if path.exists() and digest(path) != row['revision']:
            raise ValueError(f'Existing illustration bytes changed: {asset_id}')
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        if asset_id not in assets:
            catalog.append(row)
            sizes[asset_id] = dict(zip(('width', 'height'), SIZE))
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    sizes_path.write_text(json.dumps(sizes, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
