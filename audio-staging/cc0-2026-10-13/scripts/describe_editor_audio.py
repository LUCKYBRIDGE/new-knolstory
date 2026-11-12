"""Scene suggestions and a standalone catalog for future story editing."""
import json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PREFIX='oga-editor-'
TITLES={
 '3xBlast - The Sad Part':'슬픈 장면',
 '3xBlast - That\'s What Friends Do':'친구들이 해 주는 일',
 '3xBlast - That Optimisticly Sad Part':'희망이 섞인 슬픔',
 '3xBlast - Spy in the Skool':'학교의 비밀',
 '3xBlast - Snare to the Left':'전자 리듬의 장면',
 '3xBlast - Skate Fast, Stay in School':'활기찬 등굣길',
 '3xBlast - Now That\'s Automation v54':'자동화와 미래',
 '3xBlast - Just Add Synths':'신스 음악의 장면',
 '3xBlast - I\'m Biking to School':'자전거로 학교 가기',
 '3xBlast - I\'ll Blast You To Next Week':'대결과 게임풍 모험',
 '3xBlast - I Work in a Cafe Part-Time':'카페에서 일하는 하루',
 '3xBlast - Free as a Bird':'자유로운 여행',
 '3xBlast - Behind You':'뒤쪽의 낯선 기척',
 '3xBlast - 4xTheFloor':'전자 리듬과 활동',
 '3xBlast - 1001 Serum Patches':'전자음악과 미래 장면',
 'Town1 - Home Town':'고향 마을', 'Town2 - Where Time Stands Still':'시간이 멈춘 마을',
 'Town3 - Sunshine Coast':'햇살 비치는 해안', 'Town4 - Bazaar':'활기찬 시장',
 'Exploration1 - Grasslands':'초원 탐험', 'Exploration2 - Military Base':'비밀 기지',
 'Exploration3 - Tha\'el Mines':'광산 탐험', 'Exploration4 - Prairie Nights':'초원의 밤',
 'Exploration5 - Sneaking Around':'조심스러운 잠입', 'Exploration6 - Tropical Island':'열대 섬',
 'Evil1 - Ancient Evil Awakens':'오래된 악의 깨어남', 'Evil2 - Catacombs':'지하 묘지',
 'Evil3 - Apocalypse':'위기의 세계', 'Evil4 - Witch\'s Lair':'마녀의 은신처',
 'Evil5 - Whispers From Beyond':'저편에서 들리는 속삭임',
 'Buy Something!':'상점에서 잠시 쉬기', 'Buy Something! (Radio Edit)':'상점 음악의 라디오 버전',
 '8bit Bossa':'가벼운 보사노바', 'The Surreal Truth':'낯선 진실',
 'Infestation in the Control Room':'위험한 제어실', 'Final Captain\'s Log':'마지막 항해 기록',
 'The Depths of Hell':'어두운 깊은 곳', 'Cage of the Cryptid':'정체불명의 생물',
}
PACK_USES={
 '3xblast':'칩튠·전자음악·피아노 등 여러 스타일의 음악 묶음. 개별 곡의 이름을 참고해 현대·게임풍·긴장·감성 장면 후보를 고릅니다. 모든 곡에 같은 분위기 태그를 단정하지 않습니다.',
 'jrpg-towns':'마을·시장·휴식·인물의 일상 대화를 위한 게임풍 음악 후보입니다. 한국 전통 음악으로 분류하지 않습니다.',
 'jrpg-exploration':'초원·기지·광산·밤·잠입·섬을 소재로 한 탐험 음악입니다. 파일명에 맞는 장소·여행 장면에서 비교합니다.',
 'jrpg-evil':'지하 묘지·마녀·악의 등장 등 어두운 판타지 후보입니다. 인물 대사를 압도하는지 청취 후 선택합니다.',
 'shop':'보사노바 느낌의 상점·카페·가벼운 일상 음악입니다. Radio Edit는 스피커에서 들리는 듯한 별도 음색 버전으로, 기본판과 중복 파일이 아닙니다.',
 'bossa':'보사노바와 게임풍 음색을 결합한 음악입니다. 카페·쉬는 시간·가벼운 대화에 비교할 후보입니다.',
 'scifi':'제작자가 약 1분 반복용으로 안내한 어두운 SF 음악입니다. 우주선·제어실·미지의 장소에 쓰는 음악이며 실제 기계실 녹음은 아닙니다.',
 'fire':'장작이 타는 벽난로 환경음입니다. 실내 난롯가·야영 장면에서 거리와 음량을 조절할 후보입니다.',
 'beach':'해변 파도 녹음에서 추출한 짧은 변형입니다. 바닷가용이며 수중이나 작은 강 소리로 분류하지 않습니다. 장편 연속 반복은 보장되지 않습니다.',
 'water':'물·기포·물튀김·슬라임 계열의 효과음입니다. 실제 장면 동작과 소리 질감이 맞는지 청취 후 선택합니다.',
}

def enrich(asset):
    pack=asset['sourcePack']
    if not pack.startswith(PREFIX): return
    kind=pack[len(PREFIX):]
    stem=Path(asset['originalFilename']).stem
    asset['editorCollection']='future-story-editing-2026-10-13'
    asset['assignedToCurrentStories']=False
    if stem in TITLES: asset['titleKo']=TITLES[stem]+' · '+stem
    desc=PACK_USES[kind]
    if kind=='3xblast':
        desc='제작자가 여러 스타일을 모아 반복용으로 렌더링한 음악입니다. 제목 소재를 참고한 후보: '+TITLES[stem]+'. 실제 감정·악기·속도와 장면 적합성은 청취 후 결정합니다.'
    if kind=='water':
        if stem.startswith('loop_'):
            material='기포' if 'bubbles' in stem else '비' if 'rain' in stem else '물'
            asset['titleKo']='편집용 '+material+' 반복 환경음 · '+stem
            desc=material+'의 반복 환경음 후보입니다. 대사 아래에서 작게 깔고 연결부는 청취 확인합니다.'
            asset['tagsKo']=list(dict.fromkeys(asset['tagsKo']+['반복 환경음',material]))
        else:
            material='물 튀김' if stem.startswith('splash') else '슬라임 질감' if stem.startswith('slime') else '기포 단발음'
            asset['titleKo']='편집용 '+material+' · '+stem
            desc=material+'을 표현할 짧은 효과음입니다. 단발로 쓰고 반복 환경음과 구분합니다. 슬라임은 일상 물소리로 단정하지 않습니다.'
    asset['descriptionKo']=desc
    if asset['category']=='bgm' and asset['durationSeconds']<20:
        asset['tagsKo']=list(dict.fromkeys(asset['tagsKo']+['짧은 반복']))
        asset['descriptionKo']+=' 20초 미만의 짧은 반복 소재이므로 장편 곡과 구분해 선택합니다.'
    asset['selectionNotesKo']='청취 전 후보; 같은 분위기에서는 여러 컷에 이어 쓰기. 효과음은 실제 동작에만 사용.'

def write_guide(manifest):
    selected=[a for a in manifest['assets'] if a['sourcePack'].startswith(PREFIX)]
    counts=Counter(a['category'] for a in selected)
    lines=['# 추후 작품 편집용 CC0 음원 확장 목록','',
      '2026-10-13. 이번 네 작품에 배정하지 않고 추후 작품 편집에서 선택할 공용 음원을 추가 확보했다. 원본과 재생본, 개별 제작자 페이지의 CC0 근거를 함께 보관했다. 설명은 제작자 설명·파일명에 근거한 장면 후보이며 주관적 청취 완료 판정은 아니다.','',
      f"**이번 추가 {len(selected)}개**: 배경음 {counts['bgm']}곡, 환경음 {counts['ambience']}개, 동작 효과음 {counts['foley']}개. 전체 목록은 {manifest['count']}개, 배경음은 {manifest['countsByCategory']['bgm']}곡이다. 같은 곡의 여러 포맷은 한 곡으로 집계하며 번호가 다른 변형·라디오 편집본은 구분한다.",'',
      '## 편집할 때 찾는 방법','',
      '- [청취 목록](../../assets/audio-preview.html)에서 **편집용**을 검색한다. 각 분류와 함께 검색하면 배경음·환경음·효과음을 좁힐 수 있다.',
      '- 마을·여행·상점·보사노바·칩튠·전자음악·어두운 판타지·SF 음악을 확보했다. 음악의 가상 장소 설정은 실제 현장 녹음이라는 뜻이 아니다.',
      '- 장작불·해변 파도·물·비·기포 환경음과 물튀김·기포 단발·슬라임 질감 효과음을 확보했다. 파도 변형은 짧고 연속 반복 미보장이므로 같은 파일을 무조건 자동 반복하지 않는다.',
      '- 같은 분위기에서는 한 곡을 여러 컷·짧은 장에 이어 쓴다. 파일이 끝나면 연결부 검토 후 반복·크로스페이드하거나 페이드아웃한다. 선택 결과마다 징글을 넣지 않는다.',
      '- 반복 안내는 제작자의 주장과 파일명을 따른다. 모든 연결부와 대사 간섭은 아직 청취 미확인이다. 원본의 음량·재생 길이를 임의로 변경하지 않았다.',
      '- 20초 미만 배경음은 짧은 반복 소재로 표시했다. 일부 파일의 디코딩 피크가 0 dBFS를 넘으므로 목록의 `suggestedGainDb`를 참고해 낮춰 비교한다. 이 값은 원본을 수정하거나 청취 품질을 확정한 값이 아니다.',
      '- 기존 네 작품의 장·컷 제안표와 원래 407개 음원 ID·파일은 보존한다. 이번 파일의 `assignedToCurrentStories: false`는 현재 문서 제안표에 배정하지 않았다는 뜻이며 앱 사용 여부를 조회한 결과가 아니다.','',
      '## 배포 자료와 용도','', '| 배포 자료 | 추가 개수 | 용도 | CC0 확인 출처 |','|---|---:|---|---|']
    bypack={}
    for a in selected: bypack.setdefault(a['sourcePack'],[]).append(a)
    for pack,items in bypack.items():
        a=items[0]
        lines.append(f"| {pack} | {len(items)} | {PACK_USES[pack[len(PREFIX):]]} | [{a['author']}]({a['sourceUrl']}) |")
    labels={'bgm':'배경음악','ambience':'환경음','foley':'동작·질감 효과음'}
    for category,label in labels.items():
        lines+=['',f'## {label}','','| 이름 · 원본 파일 | 길이 | 장면 활용 후보 | 반복 안내 | 재생 파일 |','|---|---:|---|---|---|']
        for a in selected:
            if a['category']!=category: continue
            loop='제작자/파일명 반복 표기; 청취 미확인' if a['loop']['publisherClaimed'] else '연속 반복 미보장' if category in ('bgm','ambience') else '단발 효과음'
            lines.append(f"| {a['titleKo'].replace('|','/')} · `{a['originalFilename']}` | {a['durationSeconds']:.2f}초 | {a['descriptionKo']} | {loop} | [재생본](../../{a['runtimePath']}) |")
    lines+=['','## 병합·검증 자료','',
      '- [전체 음원 설명](CC0_AUDIO_GUIDE.md) · [JSON 목록](../../assets/metadata/audio/cc0-library.json) · [CSV 목록](../../assets/metadata/audio/cc0-library.csv)',
      '- [이번 추가 ID·파일·출처 목록](../../assets/metadata/audio/cc0-editor-expansion.json)',
      '- [배포 페이지·다운로드 근거](../../assets/metadata/audio/cc0-sources.json) · [전체 디코딩 검사](../../assets/metadata/audio/cc0-validation.json)',
      '- 원본은 `assets/source/audio/cc0/oga-editor-*/`, 재생본은 `assets/runtime/audio/cc0/oga-editor-*/v1/`에 있다. 기존 ID는 유지하며 신규 `audio.cc0.oga-editor-*` ID를 최종 Asset Registry에 매핑한다.',
      '- 현재 앱 등록·Ren\'Py Web 재생·다른 개발 로컬과 실제 중복 비교는 추후 작업이다. 음악과 효과음 파일을 작품마다 복제하지 않는다.','']
    (ROOT/'docs/assets/CC0_EDITOR_EXPANSION.md').write_text('\n'.join(lines),encoding='utf-8')
    data={'preparedOn':'2026-10-13','purpose':'Unassigned CC0 collection for future story editing',
          'count':len(selected),'countsByCategory':dict(counts),'sourceCount':len(bypack),
          'audition':'pending','currentStoryCueTablesModified':False,
          'assets':[{k:a[k] for k in ['id','category','titleKo','descriptionKo','editorCollection','assignedToCurrentStories','originalFilename','sourcePack','author','sourceUrl','license','licenseEvidence','sourcePath','sourceSha256','runtimePath','runtimeSha256','durationSeconds','loop']} for a in selected]}
    (ROOT/'assets/metadata/audio/cc0-editor-expansion.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    raise SystemExit('Run scripts/describe_cc0_audio.py to regenerate the catalog and guides together.')
