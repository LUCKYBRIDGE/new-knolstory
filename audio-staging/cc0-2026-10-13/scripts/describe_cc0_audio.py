"""Add practical Korean descriptions and generate one complete audio guide."""
import csv
import json
from pathlib import Path
from describe_editor_audio import enrich, write_guide

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'assets/metadata/audio/cc0-library.json'
SPECIAL={
 'oga-aquaria':'제작자가 수중 분위기와 정확한 반복 지점을 안내한 앰비언트 음악입니다. 용궁·바닷속 풍경의 후보이며 실제 물소리 녹음은 아닙니다.',
 'oga-exploration-theme':'제작자가 신스·피아노와 은은한 수중 느낌, 연속 반복을 안내한 음악입니다. 별주부의 물길 이동·탐색에 활용할 후보입니다.',
 'oga-ancient-mysteries':'제작자가 신비로운 선율과 긴장 분위기를 안내한 반복 음악입니다. 도술·비밀·의심의 후보이며 국악이나 전통 궁중음악은 아닙니다.',
 'oga-tension':'제작자가 RPG의 불안·긴장으로 분류한 음악입니다. 욕심·대립·협상에 낮게 깔 후보이며 강한 부분은 청취 후 조정합니다. 반복 연결은 보장되지 않습니다.',
 'oga-pianosoft8':'제작자가 부드럽고 슬픈 피아노로 설명한 곡입니다. 곤궁한 생활·소외·겨울 장면에 낮게 깔 후보입니다. 반복 연결은 보장되지 않습니다.',
 'oga-emotional-piano-solo':'제작자가 느리고 감성적인 곡의 피아노 독주 버전으로 공개한 파일입니다. 그리움·고백·뒤늦은 후회에 활용할 후보입니다. 반복 연결은 보장되지 않습니다.',
 'oga-once-upon-a-time':'동화 분위기의 피아노·오케스트라 음악. 이야기의 도입이나 밝은 장면에 활용할 후보입니다.',
 'oga-bards-tale':'류트·플루트 중심의 중세풍 음악. 평화로운 마을과 옛이야기 도입에 활용할 후보입니다.',
 'oga-old-tower-inn':'중세풍 여관을 배경으로 한 음악. 마을에서 쉬거나 인물들이 대화하는 장면에 활용할 후보입니다.',
 'oga-market-day':'밝은 중세풍 장터 음악. 장날이나 활기찬 마을 장면에 활용할 후보입니다.',
 'oga-minstrel-dance':'경쾌한 중세풍 춤 음악. 축제나 즐거운 결말에 활용할 후보입니다.',
 'oga-rising-moon':'바람 부는 밤을 위한 판타지 음악. 달밤이나 신비로운 장소에 활용할 후보입니다.',
 'oga-forest-ambience':'숲을 소재로 한 잔잔한 배경음악입니다. 자연 새소리 녹음과 구분하여 숲속 탐험 장면에 활용합니다.',
 'oga-new-sunrise':'영화 장면을 위해 제작자가 작곡한 음악입니다. 새 출발이나 아침 장면에 활용할 후보입니다.',
 'oga-determined-pursuit':'빠른 현악·호른·드럼이 있는 긴박한 오케스트라 반복 음악. 추격이나 시간에 쫓기는 장면에 활용할 후보입니다.',
 'oga-treasure-hunter':'단순한 오케스트라 반복 음악. 보물 찾기나 모험 장면에 활용할 후보입니다.',
 'oga-jrpg-calm':'잔잔한 RPG용 반복 음악입니다. 인물의 대화·휴식·일상 장면에 활용할 후보입니다. 개별 곡명의 한국어 의미는 아래 제목에 반영했습니다.',
 'oga-piano-emotional':'부드러운 피아노 독주곡. 회상이나 마음을 전하는 장면에 활용할 후보입니다.',
 'oga-first-light':'부드러운 피아노와 앰비언트 패드 중심의 음악. 꿈·첫 빛·회상·조용한 탐험 장면에 활용할 후보입니다.',
 'oga-sunset-plains':'부드러운 기타·패드·선율의 차분한 음악. 들판이나 조용한 풍경, 인물의 생각을 표현할 후보입니다.',
 'oga-school-day':'학교와 추억을 소재로 한 피아노 배경음악입니다. 원곡·비 효과 포함·맑은 날 효과 포함 버전이 있습니다.',
 'oga-rain':'25~45초 길이의 반복 가능한 비 소리 녹음 묶음입니다. 비가 오는 창밖이나 날씨 장면에 활용할 후보입니다.',
 'oga-rain-thunder':'비와 천둥이 있는 어두운 밤 분위기의 환경음. 폭풍우나 긴장감 있는 야외 장면에 활용할 후보입니다.',
 'oga-animal-synth':'새·귀뚜라미·개구리·모기 등을 표현한 합성 효과음입니다. 실제 동물 녹음이 아니라 만화적 장면의 소리 후보입니다.',
 'oga-park':'호주 애들레이드 공원에서 겨울에 녹음한 환경음입니다. 새·작은 강과 낙차·넓은 들판의 바람을 각각 담았습니다.'
}
GROUPS={'bgm':'배경음악','ambience':'자연·장소 환경음','foley':'인물 동작·물체 효과음','sfx':'동물 합성 효과음','ui':'버튼·선택 효과음','jingle':'전환·엔딩 음악'}
CALM={'Calm1 - A Place I Call Home':'내가 집이라 부르는 곳','Calm2 - Childhood Friends':'어린 시절 친구들','Calm3 - Peaceful Days':'평화로운 날들','Calm4 - Sand Castles':'모래성','Calm5 - Summer Memories':'여름의 추억','Calm6 - Innocence':'순수한 마음'}

def description(asset):
    pack=asset['sourcePack']
    name=asset['originalFilename'].lower()
    if pack in SPECIAL:
        text=SPECIAL[pack]
        if pack=='oga-park':
            text += ' 이 파일은 '+ ('새와 나무 주변 소리입니다.' if 'birds' in name else '작은 강과 물의 낙차 소리입니다.' if 'river' in name else '들판의 바람 소리입니다.')
        if pack=='oga-school-day':
            text += ' 이 파일은 '+('비 효과 포함 버전입니다.' if 'rain' in name else '맑은 날 효과 포함 버전입니다.' if 'sun' in name else '기본 버전입니다.')
        return text
    if pack=='kenney-interface':
        kind=next((ko for en,ko in [('error','오류 안내'),('confirmation','확인'),('click','클릭'),('switch','스위치 조작'),('select','선택'),('back','뒤로 이동'),('open','열기'),('close','닫기'),('tick','짧은 클릭'),('pluck','튕기는 음'),('bong','알림 음'),('drop','떨어지는 음'),('glass','유리 느낌 알림')] if en in name),'버튼과 화면 조작')
        return kind+'에 쓸 짧은 인터페이스 소리입니다. 번호가 다른 파일은 소리 변형이므로 청취 후 선택합니다.'
    if pack=='kenney-jingles':
        flavor=next((ko for en,ko in [('8bit','8비트'),('pizzi','현악 피치카토'),('piano','피아노'),('sax','색소폰'),('steel','스틸'),('banjo','밴조')] if en in name),'게임풍')
        return flavor+' 징글입니다. 장면 전환·선택 결과·완결 표시 등에 활용할 짧은 음악 후보입니다. 장편 BGM과 구분합니다.'
    action=next((ko for en,ko in [('footstep','걷거나 이동하는'),('doorclose','문을 닫는'),('dooropen','문을 여는'),('bookflip','책장을 넘기는'),('bookclose','책을 덮는'),('bookopen','책을 여는'),('bookplace','책을 내려놓는'),('coin','동전을 다루는'),('cloth','옷이나 천을 다루는'),('leather','가죽 물건을 다루는'),('creak','삐걱이는'),('knife','칼을 다루는'),('chop','내리치는'),('belt','허리띠를 다루는'),('metallatch','금속 걸쇠를 조작하는'),('metalpot','금속 냄비를 다루는'),('glass','유리가 부딪히는'),('wood','나무 물체가 부딪히는'),('metal','금속 물체가 부딪히는'),('stone','돌 물체가 부딪히는'),('plate','접시가 부딪히는'),('tin','얇은 금속 물체가 부딪히는')] if en in name),'물체나 인물의 움직임을 표현하는')
    return action+' 장면의 효과음 후보입니다. 파일명의 소재·번호를 참고해 비슷한 변형 중 장면에 맞는 소리를 선택합니다.'

def main():
    manifest=json.loads(PATH.read_text(encoding='utf-8'))
    for asset in manifest['assets']:
        asset['descriptionKo']=description(asset)
        stem=Path(asset['originalFilename']).stem
        if stem in CALM:
            asset['titleKo']=CALM[stem]+' · '+stem
        if asset['sourcePack']=='oga-treasure-hunter':
            asset['loop']['publisherClaimed']=True
        if asset['qa']['peakDbfs'] is not None:
            asset['suggestedGainDb']=min(asset['suggestedGainDb'], round(-1-asset['qa']['peakDbfs'],2))
        enrich(asset)
    PATH.write_text(json.dumps(manifest,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    fields=['id','category','titleKo','descriptionKo','author','license','sourceUrl','durationSeconds','runtimePath','sourcePath','licenseVerifiedOn','curationStatus']
    with PATH.with_suffix('.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=fields,extrasaction='ignore'); writer.writeheader(); writer.writerows(manifest['assets'])
    pack_count=len({a['sourcePack'] for a in manifest['assets']})
    bgm_count=manifest['countsByCategory']['bgm']; ambience_count=manifest['countsByCategory']['ambience']
    lines=['# 뉴놀스토리 CC0 음원 안내','',f"2026-10-13 확보 · 중복 제거 후 **{manifest['count']}개** · **{pack_count}개 배포 자료**",'',
      '이 문서는 확보한 음원의 종류, 장면 활용 후보, 출처와 병합 방법을 한곳에 정리한 자료입니다. 분위기 설명은 제작자의 설명과 파일명에 근거한 활용 제안이며, 전체 청취 평가를 완료했다는 의미는 아닙니다.', '',
      '## 바로 들어보기','', '[검색·분류·청취 목록](../../assets/audio-preview.html)을 브라우저에서 열면 파일을 직접 들을 수 있습니다. 목록은 자동 재생하지 않으며 초기 볼륨은 35%입니다. 제목과 태그로 검색하고, 필요한 분류만 표시할 수 있습니다.', '',
      '### 배경음과 환경음 함께 비교하기','',
      f'청취 화면 위쪽에서 배경음 {bgm_count}개와 환경음 {ambience_count}개를 각각 선택해 동시에 재생할 수 있습니다. 마을 음악+새소리, 잔잔한 음악+비, 달밤 음악+폭풍우의 세 가지 조합을 시작점으로 제공합니다. 배경음 22~25%, 환경음 8~12%는 비교용 시작값이며 작품의 최종 믹싱 수치는 아닙니다.', '',
      '재생 중 **배경음만 듣기 → 환경음만 듣기 → 함께 듣기**를 눌러 비교합니다. 단독 듣기는 한 채널을 음소거하므로 두 소리의 재생 위치는 계속 흐릅니다. 환경음이 멜로디나 대사를 가리는지, 음악의 악기·속도와 장소가 어울리는지, 천둥 같은 순간 소리가 지나치게 튀는지 확인합니다. 환경음 볼륨을 낮춘 상태에서 조금씩 올려 보세요. 두 파일은 각자 반복하며 연결부 청취는 별도로 확인합니다.', '',
      '목록에서 개별 파일을 재생하면 함께 듣기는 정지합니다. 검색·분류는 함께 듣기를 멈추지 않으며, 모두 정지는 두 채널과 목록 재생을 모두 멈춥니다. 이 화면은 확보한 에셋의 비교용이며 앱 런타임 통합은 별도 작업입니다.', '',
      '## 확보 현황','', '| 종류 | 개수 | 찾을 수 있는 소리 |','|---|---:|---|']
    uses={'bgm':'동화, 일상, 마을, 카페, 여행, 회상, SF, 어두운 판타지, 칩튠·전자음악','ambience':'비, 천둥, 새, 강물, 바람, 장작불, 해변 파도, 물·기포','foley':'발걸음, 문, 책, 옷, 동전, 물체, 물튀김·기포·슬라임 질감','sfx':'새, 귀뚜라미, 개구리, 모기 등 합성음','ui':'클릭, 확인, 선택, 오류, 화면 조작','jingle':'선택 결과, 장면 전환, 끝맺음'}
    for cat,label in GROUPS.items():
        lines.append(f"| {label} | {manifest['countsByCategory'][cat]} | {uses[cat]} |")
    lines+=['','## 사용 전에 알아둘 점','',
      '- 모든 신규 음원은 개별 배포 페이지에 CC0가 명시된 파일입니다. 원본 배포 자료와 제작자 표기를 보관했습니다.',
      '- 파일 전체 디코딩과 SHA-256 검사는 통과했습니다. 장면 적합성·잡음·반복 연결부 청취 검토는 남아 있습니다.',
      '- 중세풍 BGM은 한국 전통 악기 음악과 구분합니다. 동물 합성음은 실제 동물 녹음과 구분합니다.',
      '- 반복 가능 표시는 제작자가 안내한 내용입니다. 실제 런타임에서는 연결부와 대사 간섭을 청취 확인합니다.',
      '- 같은 이름이나 같은 분위기만으로 기존 음원을 삭제하지 않습니다. 번호별 변형은 별도 소리이며, 완전히 같은 바이트의 2개 파일만 중복 별칭으로 정리했습니다.',
      '- 게인 제안은 재생 시 적용할 값입니다. 원본 음량을 변경하지 않았으며, 피크가 큰 파일은 추가로 낮추도록 메타데이터에 기록했습니다.', '',
      '## 기존 로컬 음원과 합치는 방법','',
      '새 음원 ID는 `audio.cc0.<출처 묶음>.<파일명>` 형식이고, 재생본은 `assets/runtime/audio/cc0/<출처 묶음>/v1/` 아래에 있습니다. 기존 음원 ID·파일·라이선스는 유지하면서 새 음원만 추가합니다. 기존 작품이 참조하는 ID를 신규 ID로 임의 치환하지 않습니다.', '',
      '이번 환경의 새 저장소와 로컬 legacy 저장소에서 기존 음원 파일은 발견하지 못했습니다. 개발 중인 다른 로컬의 음원과 실제 중복 비교는 아직 하지 못했습니다. 다음 검사 명령을 그 로컬에서 실행하면 파일 해시·동일 이름·ID 충돌을 보고서로 만들며 기존 파일은 수정하지 않습니다.', '',
      '```powershell', 'python scripts/compare_cc0_audio.py --existing-root "기존 음원 또는 기존 프로젝트 폴더" --existing-catalog "기존 음원 JSON 목록" --output "docs/assets/cc0-merge-check.json"', '```', '',
      '기존 JSON 목록이 없으면 `--existing-catalog`를 생략합니다. JSON은 배열 또는 `assets` 배열을 가진 객체를 지원하며, 파일 연결은 `sourcePath`, `runtimePath`, `path`, `src`, `url` 필드를 읽습니다. 다른 스키마면 필드 매핑을 먼저 조정해야 합니다. 동일 바이트는 기존 ID를 보존하고 새 ID를 별칭으로 연결할 후보입니다. 인코딩·편집이 다른 파일은 해시가 달라 청취나 오디오 지문 비교가 추가로 필요합니다. 기존 음원의 이용 조건을 신규 CC0로 바꾸지 않습니다.', '',
      '## 곡별·파일별 설명','',
      '표의 길이는 실제 재생 파일에서 읽었습니다. 파일명을 함께 표시하므로 별도 로컬의 음원과 대조하기 쉽습니다. 효과음 설명은 파일명과 묶음 분류에 근거한 용도 안내입니다.']
    for cat,label in GROUPS.items():
        lines+=['',f'### {label}','','| 이름 · 원본 파일 | 길이 | 설명 | 출처 |','|---|---:|---|---|']
        for a in manifest['assets']:
            if a['category']==cat:
                duration=f"{round(a['durationSeconds']*1000)}ms" if a['durationSeconds']<1 else f"{a['durationSeconds']:.1f}초"
                lines.append(f"| {a['titleKo'].replace('|','/')} | {duration} | {a['descriptionKo']} | [{a['author']}]({a['sourceUrl']}) |")
    lines+=['','## 개발·병합 자료','',
      '- [CC0·CC BY·CC BY-NC 재점검 결과와 근거](CC0_LICENSE_AUDIT.md)',
      '- [추가 배경음 6곡과 작품별 활용](CC0_BGM_SUPPLEMENT.md)',
      '- [추후 작품 편집용 추가 음원](CC0_EDITOR_EXPANSION.md)',
      '- [작품별 장·컷 음원 제안표](STORY_AUDIO_TABLES.md)',
      '- [확보본 폴더와 재실행 안내](../../assets/CC0_AUDIO_README.md)',
      '- [전체 음원 JSON 목록](../../assets/metadata/audio/cc0-library.json)',
      '- [표 계산용 CSV 목록](../../assets/metadata/audio/cc0-library.csv)',
      '- [제작자·배포 URL·다운로드 해시](../../assets/metadata/audio/cc0-sources.json)',
      '- [전체 디코딩 검사 요약](../../assets/metadata/audio/cc0-validation.json)',
      '- [공식 CC0 안내](https://creativecommons.org/publicdomain/zero/1.0/)', '',
      '이 자료는 음원 확보 단계의 문서입니다. 앱 Asset Registry 등록, Ren\'Py Web 재생 검증, 기존 로컬 음원의 라이선스 확인은 추후 통합 작업에서 진행합니다.','']
    guide=ROOT/'docs/assets/CC0_AUDIO_GUIDE.md';guide.parent.mkdir(parents=True,exist_ok=True);guide.write_text('\n'.join(lines),encoding='utf-8')
    template=(ROOT/'scripts/audio_preview.template.html').read_text(encoding='utf-8')
    data=json.dumps(manifest['assets'],ensure_ascii=False).replace('<','\\u003c')
    (ROOT/'assets/audio-preview.html').write_text(template.replace('__AUDIO_DATA__',data),encoding='utf-8')
    write_guide(manifest)
    print(f"Descriptions and guide written for {len(manifest['assets'])} audio assets")

if __name__=='__main__':main()
