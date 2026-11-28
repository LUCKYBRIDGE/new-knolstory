"""Prepare reviewed Bakssi artwork from separate source PNGs."""
import argparse
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('assets/source/bakssi')
REGISTRY = Path('packages/asset-registry/src')
PUBLIC = Path('apps/web/public')
DELIVERY = Path('assets/bakssi-v1')
CONTRACT = Path('packages/runtime-contract/src/index.ts')
RECEIPT = SOURCE / 'generation.json'
CANVAS = (800, 1200)
GROUND = 1152
MARGIN = 8
STORY = '박씨전'
ART_FAMILY = 'bakssi-watercolor-v1'
MOOD_LABELS = {'neutral': '일상', 'joy': '기쁨', 'anger': '분노', 'sorrow': '슬픔', 'mirth': '즐거움'}
PATH_SECTION = re.compile(r'(^  // BEGIN BAKSSI IMAGE PATHS\n).*?(^  // END BAKSSI IMAGE PATHS$)', re.S | re.M)


def digest(contents):
    return sha256(contents).hexdigest()


def load(path):
    return json.loads(path.read_text())


def rendered_json(payload):
    return json.dumps(payload, ensure_ascii=False, indent=2) + '\n'


def alpha_box(image):
    return image.getchannel('A').point(lambda alpha: 255 if alpha >= 16 else 0).getbbox()


def normalize_sprite(source, reference, height_ratio):
    sprite = source.convert('RGBA')
    box = alpha_box(sprite)
    minimum, maximum = sprite.getchannel('A').getextrema()
    if not box or minimum != 0 or maximum < 250 or box == (0, 0, *sprite.size):
        raise ValueError('Character source must be an isolated sprite with a transparent surround.')
    sprite = sprite.crop(box)
    geometry = reference['geometry']
    canvas_width, canvas_height = CANVAS
    height = round(canvas_height * (geometry['bottom'] - geometry['top']) * height_ratio)
    width = round(sprite.width * height / sprite.height)
    if not 1 <= height <= GROUND - MARGIN or not 1 <= width <= canvas_width - 2 * MARGIN:
        raise ValueError('Character proportions cannot fit the stated height and transparent margins.')
    sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
    # Align measured visible edges after resampling, which can remove soft pixels.
    left, top, right, bottom = alpha_box(sprite)
    position = (round((canvas_width - right - left) / 2), GROUND - bottom)
    result = Image.new('RGBA', CANVAS)
    result.alpha_composite(sprite, position)
    left, top, right, bottom = alpha_box(result)
    if min(left, top, canvas_width - right, canvas_height - bottom) < MARGIN:
        raise ValueError('Normalized character leaves insufficient transparent margin.')
    return result, {
        'left': left / canvas_width, 'right': right / canvas_width,
        'top': top / canvas_height, 'bottom': bottom / canvas_height,
        'width': canvas_width, 'height': canvas_height,
    }


def character_metadata(recipe, catalogue, source):
    reference = catalogue.get(recipe['referenceId'])
    if not reference or reference['type'] != 'character' or not reference.get('geometry'):
        raise ValueError(f"{recipe['id']}: expected a measured reference character")
    asset, geometry = normalize_sprite(source, reference, recipe['heightRatio'])
    mood = MOOD_LABELS[recipe['emotionRole']]
    identity = recipe['identity']
    return asset, geometry, {
        'kind': 'character', 'placementRole': 'character-slot', 'framing': 'full',
        'bodyFraming': 'full', 'composition': 'single', 'characterIds': [identity],
        'primaryCharacterId': identity, 'expressions': [mood], 'emotionRole': recipe['emotionRole'],
        'actions': recipe.get('actions', ['서 있기']),
        **({'storyUses': recipe['storyUses']} if 'storyUses' in recipe else {}),
        'variantId': recipe.get('variant', '평상복'),
        'placementReview': {
            'referenceId': reference['id'], 'referenceRevision': reference['revision'],
            'heightRatio': recipe['heightRatio'], 'reason': recipe['sizeReason'],
        },
    }


def background_metadata(recipe):
    if recipe['role'] == 'stage':
        setting = {key: recipe[key] for key in ('location', 'space', 'time', 'season', 'weather') if key in recipe}
        return {'kind': 'background', 'containsCharacters': False, 'background': setting}
    if recipe['role'] == 'creative':
        sequence = {key: recipe[key] for key in ('seriesId', 'parentEventId', 'sequenceOrder') if key in recipe}
        return {
            'kind': 'scene-illustration', 'containsCharacters': True,
            'containedCharacterIds': recipe['characters'], 'shortStoryCollection': 'creative',
            'generationMethod': 'imagegen', 'storyRelation': 'independent-event',
            'description': recipe['description'], **sequence,
        }
    return {
        'kind': 'scene-illustration', 'containsCharacters': True,
        'containedCharacterIds': recipe['characters'], 'shortStoryCollection': 'story',
        'storyRelation': 'provided-story-event',
    }


def asset_id_for_role(role, asset_id):
    pattern = {
        'character': r'bakssi-character-[a-z][a-z0-9-]*',
        'stage': r'bakssi-stage-[a-z][a-z0-9-]*',
        'page': r'bakssi-shortstory-page-(0[1-9]|10)',
        'cover': r'bakssi-shortstory-cover',
        'creative': r'bakssi-creative-[a-z][a-z0-9-]*',
    }.get(role)
    return pattern is not None and re.fullmatch(pattern, asset_id) is not None


def prepare_one(root, recipe, catalogue, prompt_evidence, prior_receipt=None):
    asset_id = recipe['id']
    role = recipe['role']
    source_path = SOURCE / (asset_id + '.png')
    source_bytes = (root / source_path).read_bytes()
    source_hash = digest(source_bytes)
    prompt = recipe.get('prompt')
    if not prompt and not prompt_evidence:
        raise ValueError(f'{asset_id}: record the generation prompt before registration')
    prompt_fields = {'prompt': prompt} if prompt else {'promptEvidence': prompt_evidence}
    if prior_receipt and prior_receipt['sourceSha256'] == source_hash:
        # Keep the references used to create these exact source bytes.
        refs = prior_receipt['referenceAssets']
    else:
        refs = []
        for reference_id in recipe.get('artReferenceIds', []):
            reference = catalogue.get(reference_id)
            if not reference:
                raise ValueError(f'{asset_id}: unknown art reference {reference_id}')
            refs.append({'id': reference_id, 'sha256': reference['revision']})
    if role == 'character':
        with Image.open(BytesIO(source_bytes)) as source:
            image, geometry, metadata = character_metadata(recipe, catalogue, source)
        extra = {'framing': '전신'}
        group = recipe.get('characterName', recipe['label'])
        options = {'lossless': True}
    else:
        with Image.open(BytesIO(source_bytes)) as source:
            image = source.convert('RGB')
        if role != 'cover' and image.width <= image.height:
            raise ValueError(f'{asset_id}: stage and page artwork must be landscape')
        if role == 'creative' and abs((image.width / image.height) / (16 / 9) - 1) > .0025:
            raise ValueError(f'{asset_id}: creative illustration must be 16:9')
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        geometry = None
        metadata = {'placementRole': 'background-slot', **background_metadata(recipe)}
        extra = {'backgroundRole': {'stage': 'scenery', 'page': 'scene', 'cover': 'cover', 'creative': 'scene'}[role]}
        group = {'stage': recipe.get('location', recipe['label']), 'page': '작품 속 장면 삽화', 'cover': '표지', 'creative': '자유 창작 삽화'}[role]
        options = {'quality': 92}
    output = BytesIO()
    image.save(output, 'WEBP', method=6, **options)
    contents = output.getvalue()
    relative = DELIVERY / (asset_id + '.webp')
    revision = digest(contents)
    label = recipe['label']
    asset = {
        'id': asset_id, 'displayName': label, 'label': label, 'story': STORY,
        'type': 'character' if role == 'character' else 'background', 'group': group, **extra,
        'src': '/' + relative.as_posix(), 'sourcePath': RECEIPT.as_posix() + '#' + asset_id,
        'copyright': '놀퀴즈', 'revision': revision, 'geometry': geometry,
        'tags': [STORY, label, *recipe.get('searchTerms', [])],
        'metadata': {
            'generatedBakssiAsset': True, 'artFamily': ART_FAMILY, 'storyPackIds': ['bakssi'],
            'qualityStatus': 'approved', 'pickerVisibility': 'secondary' if role in ('cover', 'page', 'creative') else 'primary',
            'referenceAssets': refs, 'searchTerms': recipe.get('searchTerms', []), **metadata,
        },
    }
    receipt = {
        'id': asset_id, 'role': role, 'tool': 'built-in image_gen', **prompt_fields,
        'referenceAssets': refs, 'source': source_path.as_posix(), 'sourceSha256': source_hash,
        'output': (PUBLIC / relative).as_posix(), 'outputSha256': revision,
        'dimensions': {'width': image.width, 'height': image.height},
    }
    return asset, receipt, contents


def register_characters(registry, recipes, registered):
    path = registry / 'characters.json'
    old_rows = [item for item in load(path) if not item['id'].startswith('bakssi.')]
    new_rows = {}
    moods = {}
    for recipe in recipes:
        if recipe['role'] != 'character' or recipe['id'] not in registered:
            continue
        identity, asset_id = recipe['identity'], recipe['id']
        mood = recipe['emotionRole']
        if not recipe.get('variant'):
            moods.setdefault(identity, {}).setdefault(mood, asset_id)
        if mood == 'neutral' and identity not in new_rows:
            new_rows[identity] = {
                'id': identity, 'name': recipe.get('characterName', recipe['label']),
                'aliases': recipe.get('aliases', []), 'storyPackIds': ['bakssi'],
                'representativeAssetId': asset_id,
            }
    emotion_path = registry / 'character-emotions.json'
    emotion_catalog = load(emotion_path)
    old_emotions = [item for item in emotion_catalog['characters'] if not item['characterId'].startswith('bakssi.')]
    new_emotions = [
        {'characterId': identity, 'name': character['name'],
         'slots': {mood: moods[identity][mood] for mood in MOOD_LABELS if mood in moods[identity]}}
        for identity, character in new_rows.items() if set(moods.get(identity, {})) == set(MOOD_LABELS)
    ]
    return {
        path: rendered_json([*old_rows, *new_rows.values()]),
        emotion_path: rendered_json({**emotion_catalog, 'characters': [*old_emotions, *new_emotions]}),
    }


def with_emotion_recipes(recipes):
    for recipe in recipes:
        yield recipe
        if recipe['role'] != 'character' or recipe['emotionRole'] != 'neutral':
            continue
        for mood, title in MOOD_LABELS.items():
            if mood == 'neutral':
                continue
            yield {
                **recipe, 'id': f"{recipe['id']}-{mood}", 'label': f"{recipe['label']} · {title}",
                'emotionRole': mood, 'optionalEmotion': True,
                'artReferenceIds': [recipe['id'], *recipe.get('artReferenceIds', [])],
            }


def check_emotions(rows):
    by_identity = {}
    for row in rows:
        m = row['metadata']
        if row['type'] == 'character' and m['variantId'] == '평상복':
            by_identity.setdefault(m['primaryCharacterId'], {})[m['emotionRole']] = row['revision']
    for identity, moods in by_identity.items():
        if set(moods) != set(MOOD_LABELS) or len(set(moods.values())) != len(MOOD_LABELS):
            raise ValueError(f'{identity}: each expression must use a distinct reviewed image')


def prepare(root=ROOT, check=False, complete=False, require_emotions=False, replace_drafts=()):
    registry = root / REGISTRY
    catalog_path = registry / 'catalog.json'
    sizes_path = registry / 'background-sizes.json'
    auth_path = registry / 'project-media-authorization.json'
    contract_path = root / CONTRACT
    receipt_path = root / RECEIPT
    recipe = load(root / SOURCE / 'recipe.json')
    if recipe.get('version') != 1:
        raise ValueError('Unknown Bakssi asset recipe version.')
    recipes = list(with_emotion_recipes(recipe['assets']))
    prompt_evidence = recipe.get('promptEvidence')
    ids = {entry['id'] for entry in recipes}
    if len(ids) != len(recipes) or any(not asset_id_for_role(r['role'], r['id']) for r in recipes):
        raise ValueError('Invalid or duplicate Bakssi asset ID.')
    original_rows = load(catalog_path)
    prior_assets = {row['id']: row for row in original_rows if row.get('metadata', {}).get('generatedBakssiAsset')}
    old_rows = [row for row in original_rows if row['id'] not in prior_assets]
    old_catalogue = {row['id']: row for row in old_rows}
    if ids & old_catalogue.keys():
        raise ValueError('Bakssi asset IDs collide with an existing asset.')
    prior = {row['id']: row for row in load(receipt_path)['assets']} if receipt_path.exists() else {}
    if not (set(prior_assets) | set(prior)).issubset(ids):
        raise ValueError('A registered Bakssi asset recipe disappeared.')
    replacements = set(replace_drafts)
    if replacements and (check or not replacements.issubset(prior_assets.keys() & prior.keys())):
        raise ValueError('Draft replacement requires exact IDs already present in both registration files.')
    for asset_id in replacements:
        previous = prior[asset_id]
        expected_output = PUBLIC / DELIVERY / (asset_id + '.webp')
        output = root / expected_output
        if (previous['output'] != expected_output.as_posix() or not output.is_file()
                or digest(output.read_bytes()) != previous['outputSha256']
                or prior_assets[asset_id]['revision'] != previous['outputSha256']):
            raise ValueError(f'{asset_id}: prior output must match the registered draft')
    catalogue = []
    receipts = []
    files = {}
    catalogue_by_id = dict(old_catalogue)
    for entry in recipes:
        asset_id = entry['id']
        source = root / SOURCE / (asset_id + '.png')
        if not source.is_file():
            optional_emotion = entry.get('optionalEmotion', False)
            if require_emotions and optional_emotion and not entry.get('variant'):
                raise ValueError(f'{asset_id}: emotion source PNG missing')
            if (complete and not optional_emotion) or asset_id in prior_assets or asset_id in prior:
                raise ValueError(f'{asset_id}: source PNG missing')
            continue
        if asset_id in prior and asset_id not in replacements and digest(source.read_bytes()) != prior[asset_id]['sourceSha256']:
            raise ValueError(f'{asset_id}: source changed; review and register a new versioned asset')
        asset, receipt, contents = prepare_one(root, entry, catalogue_by_id, prompt_evidence, prior.get(asset_id))
        catalogue_by_id[asset_id] = asset
        if asset_id in prior_assets and asset_id not in replacements and prior_assets[asset_id]['revision'] != asset['revision']:
            raise ValueError(f'{asset_id}: registered derivative changed; verify the source and encoder')
        catalogue.append(asset)
        receipts.append(receipt)
        output = root / receipt['output']
        if asset_id not in replacements and output.is_file() and output.read_bytes() != contents:
            raise ValueError(f'{asset_id}: output differs; recover exact asset bytes')
        files[output] = contents
    if not catalogue:
        return 0
    if require_emotions:
        check_emotions(catalogue)
    sizes = {
        **load(sizes_path),
        **{r['id']: r['dimensions'] for r in receipts if r['role'] != 'character'},
    }
    authorization = load(auth_path)
    outputs = {r['output'] for r in receipts}
    declaration = {
        **authorization,
        'evidence': list(dict.fromkeys([*authorization['evidence'], RECEIPT.as_posix()])),
        'assets': [
            *[row for row in authorization['assets'] if row['file'] not in outputs],
            *[{
                'file': row['output'], 'sha256': row['outputSha256'], 'assetIds': [row['id']],
                'sourceKind': 'generated-project', 'lineageEvidence': [RECEIPT.as_posix() + '#' + row['id']],
                'creationMethodEvidence': 'built-in image_gen; project owner requested style-matched Bakssi production and KnolStory service use',
            } for row in receipts],
        ],
    }
    paths, found = PATH_SECTION.subn(
        lambda match: match[1] + ''.join(
            f'  "{Path(r["output"]).relative_to(PUBLIC).as_posix()}",\n' for r in receipts if r['role'] not in ('page', 'creative')
        ) + match[2], contract_path.read_text()
    )
    if found != 1:
        raise ValueError('Missing or duplicate Bakssi exact runtime path section.')
    manifests = {
        catalog_path: rendered_json([*old_rows, *catalogue]),
        sizes_path: rendered_json(sizes),
        auth_path: rendered_json(declaration),
        receipt_path: rendered_json({'version': 1, 'assets': receipts}),
        contract_path: paths,
        **register_characters(registry, recipes, {a['id'] for a in catalogue}),
    }
    for path, contents in [*files.items(), *((p, text.encode()) for p, text in manifests.items())]:
        if path.is_file() and path.read_bytes() == contents:
            continue
        if check:
            raise ValueError(f'Bakssi asset registration is stale or incomplete: {path.relative_to(root)}')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(contents)
    return len(catalogue)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--complete', action='store_true', help='Require every planned base artwork.')
    parser.add_argument('--require-emotions', action='store_true', help='Require five distinct expressions for each identity.')
    parser.add_argument('--replace-draft', action='append', default=[], metavar='ASSET_ID',
                        help='Replace a reviewed asset on the unpublished production branch only.')
    args = parser.parse_args()
    try:
        count = prepare(check=args.check, complete=args.complete, require_emotions=args.require_emotions,
                        replace_drafts=args.replace_draft)
    except (ValueError, OSError, KeyError) as error:
        raise SystemExit(str(error))
    print(f'Bakssi artwork: {count} registered assets.')
