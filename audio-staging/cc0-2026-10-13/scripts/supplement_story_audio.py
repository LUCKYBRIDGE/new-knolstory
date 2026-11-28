"""Enrich the existing documentation tables; never modify story/runtime data."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
META = ROOT / 'assets/metadata/audio/cc0-library.json'
CUES = ROOT / 'docs/assets/story-audio-cue-tables.json'
TABLE = ROOT / 'docs/assets/STORY_AUDIO_TABLES.md'
PACKS = {
    'M8': 'oga-aquaria', 'M9': 'oga-exploration-theme',
    'M10': 'oga-ancient-mysteries', 'M11': 'oga-tension',
    'M12': 'oga-pianosoft8', 'M13': 'oga-emotional-piano-solo',
}
NAMES = {'M8':'물속의 신비', 'M9':'물길을 따라 탐색', 'M10':'오래된 비밀',
         'M11':'불안과 긴장', 'M12':'쓸쓸한 생활', 'M13':'그리움과 고백'}
REASONS = {'M8':'용궁·수중 풍경을 한 분위기로 이어가기',
           'M9':'물길 이동·귀환에 같은 탐색 주제 재사용',
           'M10':'비밀·의심·도술을 낮은 한 주제로 이어가기',
           'M11':'욕심·위험·협상에 낮은 긴장 주제 유지; 상해를 강조하는 충격음은 추가하지 않기',
           'M12':'곤궁함·소외·겨울 생활에 낮은 피아노 주제 유지',
           'M13':'후회·고백·이별에 낮은 피아노 주제 유지',
           'M2':'육지 대화·생활에 기존 생활 주제 유지',
           'M5':'신비로운 만남에 기존 꿈 주제 유지'}

def choose(c, s):
    theme, edition, key = c['theme'], c['edition'], c['chapterId']
    if edition == 'original':
        n = int(key.rsplit('-', 1)[1])
        if theme == 'heungbu': return 'M11' if n in (5,6) else 'M13' if n == 7 else 'M12'
        if theme == 'onggojib': return 'M12' if n == 5 else 'M10' if n == 4 else 'M11'
        if theme == 'rabbit':
            if n == 1: return 'M8'
            if n == 4 or (n == 3 and s['startCut'] >= 11): return 'M11'
            return 'M9'
        if theme == 'seonnyeo': return 'M10' if n == 1 else 'M5' if n == 2 and s['startCut'] < 3 else 'M13'
    if theme == 'heungbu':
        short = key.replace('chapter-', '')
        return 'M11' if short in ('8','9','10') else 'M12'
    if theme == 'onggojib':
        short = key.split(':', 1)[1]
        if short.startswith(('real-route','real-loop')) or short == 'b-fake-warning': return 'M10'
        if short.startswith(('part1-court','fake-route')): return 'M12'
        if short == 'b-final-acts': return 'M13'
        return 'M2' if short == 'b-meal-slip' else 'M11'
    if theme == 'rabbit':
        short = key.split(':', 1)[1]
        if short == 'start': return 'M8' if s['startCut'] < 50 else 'M2'
        if short in ('palace','shield-route'): return 'M11'
        if short in ('ending-1','ending-3'): return 'M13'
        return 'M2'
    if theme == 'seonnyeo':
        short = re.sub(r'-v\d+$', '', key)
        if short == 'P1': return 'M5'
        if short in ('P2','P3','1','C1','C1-A','C1-B') or (short == '14' and s['startCut'] == 1): return 'M11'
        if short in ('14','C4','H1','H2','H3','C4H','HB1','HB2','HB3','C5H'): return 'M10'
        return 'M13'
    raise ValueError(key)

def main():
    manifest = json.loads(META.read_text(encoding='utf-8'))
    assets = {a['id']:a for a in manifest['assets']}
    data = json.loads(CUES.read_text(encoding='utf-8'))
    text = TABLE.read_text(encoding='utf-8')
    for alias, pack in PACKS.items():
        found = [a for a in assets.values() if a['sourcePack'] == pack]
        assert len(found) == 1, pack
        assert (ROOT/found[0]['runtimePath']).is_file()
        data['audioAliases'][alias] = found[0]['id']
    # Existing aliases are immutable; all choices are documentation-only.
    fixed = {'M2':'내가 집이라 부르는 곳', 'M5':'첫 빛과 꿈'}
    rows = {}
    added = changed = 0
    for c in data['chapters']:
        for s in c['segments']:
            old = s.get('previousBgm', s['bgm'])
            prior_note = s.get('previousContinuity', s['continuity'])
            alias = None
            if old in ('무음(의도적)', '비움(미확보·미선정)'):
                alias = choose(c, s)
            elif old.startswith('M5') and c['theme'] == 'onggojib': alias = 'M10'
            elif old.startswith('M5') and c['theme'] == 'rabbit' and (c['edition'] == 'original' or c['chapterId'].endswith(':sea-route')): alias = 'M8'
            if alias:
                added += old.startswith(('무음','비움'))
                changed += 1
                s['previousBgm'] = old
                s['previousContinuity'] = prior_note
                s['bgm'] = alias+' '+NAMES.get(alias, fixed.get(alias,''))+'(저음량 후보; 무음 선택 가능)'
                rule = '음악 사용 시: '+REASONS[alias]+'. 앞 장과 같은 곡이면 재생 위치 유지; 선택 직후 재시작 없음.'
                if alias in ('M11','M12','M13'):
                    rule += ' 반복 미보장: 끝나면 페이드아웃, 연결부 검토 전 자동 반복 금지.'
                if old == '비움(미확보·미선정)':
                    # Replace acquisition gaps without implying missing effects were found.
                    if c['theme'] == 'rabbit':
                        detail = '수중·기침·군중 환경/효과음은 계속 비움. 작은 강 소리로 대체하지 않기.'
                    elif '22컷' in prior_note:
                        detail = '파괴 효과음은 비움. 22컷 주저앉음에서는 낮추거나 무음 선택.'
                    elif '16~19컷' in prior_note:
                        detail = '박·항아리·물바람·붕괴 효과음은 비움. 16~19컷에는 낮추거나 무음 선택.'
                    else:
                        detail = '제비 상해 전후에는 음악·새소리를 낮추거나 무음 선택. 상해 효과음 없음.'
                    s['continuity'] = rule+' 환경·효과음: '+detail
                elif old == '무음(의도적)':
                    s['continuity'] = rule+' 무음 대안·환경·효과음 참고: '+prior_note
                else:
                    s['continuity'] = rule+' 환경·효과음 참고: '+prior_note
            assert re.match(r'M\d+ ', s['bgm']), (c['chapterId'], s['bgm'])
            signature = (c['tableGroup'], s['startCut'], s['endCut'])
            values = (s['bgm'], s['continuity'])
            assert signature not in rows or rows[signature] == values, signature
            rows[signature] = values
    rebuilt=[]; count=0
    for line in text.splitlines():
        if re.match(r'^\| [HORS]-[OK]\d+ · ', line):
            cells=line.split('|')
            gid=cells[1].strip().split(' · ')[0]
            nums=[int(n) for n in re.findall(r'\d+',cells[2])]
            start,end=nums[0],nums[-1]
            bgm,note=rows[(gid,start,end)]
            cells[3]=' '+bgm.replace('|','/')+' '
            cells[6]=' '+note.replace('|','/')+' '
            line='|'.join(cells); count+=1
        rebuilt.append(line)
    assert count == data['validation']['rangeRowCount']
    text='\n'.join(rebuilt)+'\n'
    legend='\n'.join('| '+alias+' | '+NAMES[alias]+' · `'+assets[data['audioAliases'][alias]]['originalFilename']+'` |' for alias in PACKS)
    if '| M8 |' not in text:
        text=text.replace('\n| E1 |', '\n'+legend+'\n| E1 |',1)
    if 'CC0_BGM_SUPPLEMENT.md' not in text:
        text=text.replace('## 표 읽는 방법',
            '추가 배경음 확보를 반영했다. **모든 장·컷 범위에 배경음 후보를 마련**했으며, 기존 무음 연출은 대안으로 남겼다. 음원 부족으로 배경음을 비워 둔 구간은 없다. 정확한 효과음·환경음 부족은 계속 비움으로 표시한다. [추가 6곡 설명·출처·재생 파일](CC0_BGM_SUPPLEMENT.md).\n\n## 표 읽는 방법',1)
        text=text.replace('정확한 ID·재생 경로·출처는 [제안서의 후보 대응표]', '기존 M1~M7·E·S의 정확한 ID·재생 경로·출처는 [제안서의 후보 대응표]',1)
        text=text.replace('- 새로운 음원 확보, 작품 데이터 수정, 재생 기능 구현을 수행하지 않았다.', '- 추가 CC0 배경음 6곡을 확보했다. 작품 데이터 수정·재생 기능 구현은 수행하지 않았다.')
    data['validation']['bgmCandidateCoverage']='all 2970 cuts have an acquired BGM candidate; silence remains optional'
    data['bgmSupplement']={'document':'docs/assets/CC0_BGM_SUPPLEMENT.md','newAssetCount':6,'newBgmCandidateSegments':added,'changedChapterSegments':changed,'audition':'pending'}
    CUES.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    TABLE.write_text(text,encoding='utf-8')
    print(json.dumps(data['bgmSupplement'],ensure_ascii=False))

if __name__ == '__main__': main()
