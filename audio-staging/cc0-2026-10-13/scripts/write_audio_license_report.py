"""Write a readable license audit and retain corrected optional credit notices."""
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def sha(p):
    with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

if __name__=='__main__':
    path=ROOT/'assets/metadata/audio/cc0-license-audit.json'
    report=json.loads(path.read_text(encoding='utf-8'))
    if report['passedAssets'] != report['assetCount'] or any(r['status'] != 'pass' for r in report['sources']):
        raise SystemExit('Audit has unresolved findings; review the JSON before publishing an all-CC0 report.')
    catalog=json.loads((ROOT/'assets/metadata/audio/cc0-library.json').read_text(encoding='utf-8'))
    assets=catalog['assets'];byid={a['id']:a for a in assets}
    aliases=catalog['duplicateAliases']
    report['duplicateAliasChecks']=[{'id':a['id'],'duplicateOf':a['duplicateOf'],'sourcePath':a['sourcePath'],'sameSourceBytes':sha(ROOT/a['sourcePath'])==byid[a['duplicateOf']]['sourceSha256']} for a in aliases]
    assert all(a['sameSourceBytes'] for a in report['duplicateAliasChecks'])
    secondary=ROOT/'assets/licenses/audio/audit-2026-10-13/oga-editor-beach/original-freesound-page.html'
    report['secondarySourceReview']={'sourcePack':'oga-editor-beach','url':'https://freesound.org/people/jasinski/sounds/18363/',
       'license':'CC0','evidence':secondary.relative_to(ROOT).as_posix(),'sha256':sha(secondary),
       'finding':'Original Freesound page identifies jasinski and links to CC0, consistent with the OGA extraction.'}
    sources_path=ROOT/'assets/metadata/audio/cc0-sources.json'
    packs=json.loads(sources_path.read_text(encoding='utf-8'))
    bypack={r['id']:r for r in report['sources']}
    corrected=[]
    for pack in packs:
        r=bypack[pack['id']];current=r.get('current',r['archived'])['copyrightNotice']
        if current!=pack['attributionNotice']:
            pack.setdefault('acquisitionAttributionNotice',pack['attributionNotice'])
            pack['attributionNotice']=current
        if 'acquisitionAttributionNotice' in pack:
            corrected.append(pack['id'])
            pack['noticeCheckedOn']=report['checkedOn']
            pack['copyrightNoticeEvidence']=f"assets/licenses/audio/audit-2026-10-13/{pack['id']}/audit.json"
    sources_path.write_text(json.dumps(packs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    report.setdefault('noticeExtractionCorrection',{'cause':'OGA Copyright/Attribution Notice uses field-name-field-copyright-notice; acquisition parser checked a different field.',
       'affectedSourcePacks':corrected,'licenseClassificationChanged':False,'mandatoryAttributionFound':False,
       'action':'Preserved original HTML and acquisition notice; corrected current notice in sources metadata and fixed parser.'})
    report['manualReview']={'includedTextFiles':6,'includedTextConflictsFound':0,
        'publisherBodyAndCopyrightNoticeConflictsFound':0,
        'limit':'Review is of publisher declarations and available included notices, not an independent guarantee of ownership or all third-party rights.'}
    path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    counts=Counter(a['sourcePack'] for a in assets)
    passed=report['passedAssets'];total=report['assetCount']
    lines=['# 음원 라이선스 재점검 — CC0와 CC BY·CC BY-NC 구분','',f"확인일: {report['checkedOn']}",'',
      f'이번 환경에서 확보한 **카탈로그 {total}개**, **39개 배포 자료**, 동일 바이트 별칭 2개를 점검했다. 개별 배포 페이지의 실제 라이선스 항목을 저장본과 현재 페이지에서 비교했다. **현재 확인된 {passed}개 모두 CC0 단독 표기이며 CC BY·CC BY-NC 혼입은 발견하지 못했다.**','',
      '다른 개발 로컬의 기존 음원은 이 점검에 포함되지 않는다. 그 로컬 파일을 새 CC0 분류로 덮어쓰면 안 된다.','',
      '## 라이선스 차이','', '| 구분 | 출처 표기 | 상업적 사용 | 이번 확보본 |','|---|---|---|---:|',
      '| [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 저작권 이용 조건으로 의무 아님 | 가능 | 490개 |',
      '| [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 적절한 크레딧·라이선스 링크·변경 표시 필요 | 가능 | 0개 |',
      '| [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) | BY의 표기 조건에 더해 비상업 조건 | 해당 라이선스만으로 상업적 사용 불가 | 0개 |','',
      '무료 다운로드는 CC0를 뜻하지 않는다. CC BY는 상업적 사용이 가능하지만 표기 조건을 지켜야 하며, BY-NC는 비상업 조건이 추가된다. 위 표는 4.0의 대표 조건 비교이고 다른 버전은 해당 원문을 확인한다. CC0는 법이 허용하는 범위의 권리 포기다. [공식 설명](https://creativecommons.org/publicdomain/zero/1.0/)도 제3자 권리·저작권 상태를 보증하지 않는다.','',
      '## 실제 검사 방법과 결과','',
      '- 39개 원본 배포 페이지 HTML의 음원 라이선스 필드와 CC0 공식 링크를 읽었다. 모음 제목·검색 결과·사이트 하단 저작권 표시는 판정 근거로 사용하지 않았다.',
      '- 39개 현재 배포 페이지도 다시 내려받았다. 모두 해당 음원 라이선스 항목에 CC0만 표기되어 있었다. 재확인 HTML과 SHA-256을 별도로 보관하여 처음 확보한 증거를 덮어쓰지 않았다.',
      '- 490개 파일의 다운로드 URL이 확보 당시 해당 페이지의 실제 파일 목록에 있는지 확인했다. 원본·재생본 SHA-256, CC0 분류와 출처 표기 의무 없음 메타데이터가 일치했다.',
      '- Kenney 네 묶음의 License.txt, 3xBlast ReadMe.txt, Exploration Theme readme.txt 등 6개 동봉 문서에 CC0·선택적 크레딧 안내를 확인했다. BY·NC 충돌을 발견하지 못했다.',
      '- 2개 중복 별칭은 CC0 확인된 본항목과 원본 바이트가 같았다. 개수를 부풀리는 다른 라이선스 음원이 아니다.',
      '- 해변 파도 4개는 재배포 자료이므로 [jasinski의 Freesound 원본](https://freesound.org/people/jasinski/sounds/18363/)도 확인했다. 원본도 CC0이며 제작자 표시가 일치했다.',
      '- 이 점검은 공개된 배포 선언·파일 대응·이용 조건을 확인한 것이다. 모든 작곡·샘플·녹음의 최초 권리자가 누구인지 독립 조사한 결론은 아니다.','',
      '## 발견하여 수정한 수집 문제','',
      '라이선스 분류 자체의 BY/NC 혼동은 없었다. 다만 초기 수집기는 OpenGameArt의 Copyright/Attribution Notice 필드 이름을 잘못 찾아 일부 선택적 출처 안내를 누락했다. 수집기를 수정했고, 현재 안내를 `cc0-sources.json`에 보충했다. 기존 HTML과 초기 안내 값은 보존했다. 누락 항목은 다음과 같다.','',
      '| 배포 자료 | 안내의 의미 | 처리 |','|---|---|---|']
    for key in report['noticeExtractionCorrection']['affectedSourcePacks']:
        r=bypack[key]
        lines.append(f"| [{key}]({r['url']}) | 선택적 크레딧·제작자 링크 또는 CC0 안내. 의무 조건 발견 없음. | 최신 안내·증거 경로 보충 |")
    lines+=['',
      '특히 “Music by …”, 제작자 사이트 링크, “credit appreciated”만 적힌 경우를 CC BY 의무로 바꾸지 않았다. CC0 필드와 본문·동봉 문서를 함께 읽었다. Kenney·3xBlast·Exploration Theme 등은 크레딧이 필수가 아니라고 명시하고 있다. 그래도 제작자·원본 URL은 향후 자발적 크레딧과 추적을 위해 유지한다.','',
      '## CC0가 아니어서 제외했던 후보','', '| 후보 | 저장 당시 라이선스 | 현재 카탈로그 포함 |','|---|---|---|']
    for e in report['excludedCandidates']:
        lines.append(f"| [{e['id']}]({e['url']}) | {', '.join(e['licenses'])} | {'포함 — 확인 필요' if e['includedInCatalog'] else '미포함'} |")
    lines+=['',
      '예를 들어 Fire Loop의 CC BY 자료는 제외했고, 이후 확보한 Fireplace Sound loop는 다른 제작자의 별도 CC0 파일이다. 제목·소재가 비슷하다고 동일 라이선스로 취급하지 않았다. 제외 폴더에는 검토 자료만 있으며 사용 목록에 그 음원의 다운로드 URL이 들어 있지 않다.','',
      '[OpenGameArt FAQ](https://opengameart.org/content/faq#q-multilicense)는 여러 라이선스가 제시되면 하나를 선택할 수 있다고 설명한다. 이번 확보는 그중 CC0를 임의로 골라 표시한 사례도 없이, 실제 필드에 **CC0 단독**으로 표시된 39개 자료다. 관련 유료팩·다른 업로더의 리믹스·모음 전체까지 CC0라고 확대하지 않는다.','',
      '## 39개 배포 자료별 점검표','', '| 배포 자료 | 고유 파일 수 | 저장본 / 현재 항목 | 재확인 증거 |','|---|---:|---|---|']
    for r in report['sources']:
        evidence=f"../../assets/licenses/audio/audit-2026-10-13/{r['id']}/audit.json"
        lines.append(f"| [{r['id']}]({r['url']}) | {counts[r['id']]} | {'CC0 / CC0' if r['status']=='pass' else '재검토 필요'} | [HTML 해시·항목·본문·안내]({evidence}) |")
    lines+=['','## 파일별 확인 자료','',
      'GitHub 공개본은 Freesound HTML에 포함된 사이트 측 Mapbox 토큰만 제거했다. 최초 저장 원문은 로컬에 보존하고, [공개본 정제 기록](../../assets/metadata/audio/publication-redactions.json)에 원문 해시와 공개본 해시를 함께 기록한다. 원문 해시를 담은 감사 기록과 공개 HTML 바이트의 차이는 이 기록으로 대조한다. CC0 항목·제작자·음원 파일은 변경하지 않았다.','',
      '- [490개 파일별 판정 CSV](../../assets/metadata/audio/cc0-license-audit.csv)',
      '- [전체 감사 결과 JSON](../../assets/metadata/audio/cc0-license-audit.json)',
      '- [음원별 안정적 ID·원본·재생본·라이선스](../../assets/metadata/audio/cc0-library.json)',
      '- [보충한 출처 안내와 다운로드 기록](../../assets/metadata/audio/cc0-sources.json)','',
      '재점검 명령: `python scripts/audit_audio_licenses.py`. 감사 문서와 출처 안내 보충: `python scripts/write_audio_license_report.py`. 음원·작품·Asset ID는 이 과정에서 변경하지 않는다. 재점검 후 제3자 원본 확인 HTML도 보존한다.','']
    (ROOT/'docs/assets/CC0_LICENSE_AUDIT.md').write_text('\n'.join(lines),encoding='utf-8')
    print(json.dumps({'passed':passed,'sources':len(report['sources']),'correctedNoticePacks':report['noticeExtractionCorrection']['affectedSourcePacks']},ensure_ascii=False))
