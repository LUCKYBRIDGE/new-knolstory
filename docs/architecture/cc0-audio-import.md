# CC0 외부 소리 등록

작성일: 2026-10-10. 이후 일괄 제외 판단을 최신 사용자 결정으로 수정했다. 현재 선택은 [권리 계약](audio-service-rights.md)의61개(CC047/Pixabay 장면용 조건부14)다. 이 문서는 Pixabay와 별개로 추가한 무료·상업 이용 가능 CC0 자료21개의 현재 상태를 소유한다.

## 등록 기준

기본 제공 자료로 넣는 소리는 사용자가 작품을 만들고 `.knolstory`, Excel, Google Sheets로 옮기는 흐름에서도 원본 이름·출처·권리 기록을 유지한다. 그래서 단순한 “완성 영상에 사용 가능”보다 더 좁게 보아, 상업적 사용과 수정·복사·재배포가 명확한 CC0 자료만 이번 기본 목록에 넣었다.

## 등록 목록

| 출처 | 등록 수 | 분류 | 등록 이름 |
|---|---:|---|---|
| Kenney RPG Audio | 16 | 효과음 | 책여는소리1, 책닫는소리1, 책장넘기는소리1-2, 책놓는소리1, 옷자락소리1-2, 문여는소리1, 문닫는소리1, 삐걱소리1, 발걸음소리1-2, 동전소리1-2, 냄비소리1-2 |
| OpenGameArt Rain (Loopable) | 4 | 주변 소리 | 비소리1-4 |
| OpenGameArt Forest Ambience | 1 | 배경음 | 숲분위기배경음1 |

정식 카탈로그는 [external-cc0-audio.json](../../packages/asset-registry/src/external-cc0-audio.json)이다. 각 항목은 한글 이름, 원래 파일명, source, author, license, terms URL, origin URL을 가진다. 실제 파일은 `apps/web/public/assets/audio/cc0/`에 있다.

## 권리와 보존

모든 항목은 `origin.license=CC0-1.0`, `origin.commercialUse=permitted`로 기록한다. 출처 표시는 필수가 아니어도, 편집자가 원한다면 원래 출처와 원명을 확인할 수 있도록 보존한다. CC0 권리 근거와 사이트별 판단은 [상업용 음원 제공처 검토](commercial-audio-sources.md)가 소유한다.

## 검증

- 원본 다운로드, archive hash, 개별 파일 SHA-256, 실제 길이와 디코딩 결과: [downloads.json](evidence/cc0-audio/downloads.json)
- 카탈로그/RuntimeAudio 경로 허용 RED/GREEN: [paths-red.log](evidence/cc0-audio/paths-red.log), [paths-catalog-green.log](evidence/cc0-audio/paths-catalog-green.log)
- unit/coverage: [unit-coverage.log](evidence/cc0-audio/unit-coverage.log)
- 브라우저 host E2E: [host.log](evidence/cc0-audio/host.log)
- Ren'Py Web native E2E: [native.log](evidence/cc0-audio/native.log)
- runtime/web/type/lint/provenance: [runtime-build.log](evidence/cc0-audio/runtime-build.log), [web-build.log](evidence/cc0-audio/web-build.log), [typecheck.log](evidence/cc0-audio/typecheck.log), [lint.log](evidence/cc0-audio/lint.log), [provenance-check.log](evidence/cc0-audio/provenance-check.log)

검증은 실제 디코딩과 재생 가능성을 확인하지만 전문적인 청취 품질 판정은 아니다. 기존 원작이나 사용자 작품에는 자동 배치하지 않는다.

## 검증 상세와 한계

이 CC0 추가 검증 당시 총61개: 배경음13·주변 소리13·효과음35. 이는 카탈로그 등록 수이며 모든 자료의 공용 제공 권리 판정이 아니다. 숲 분위기는 제공처의 Music 분류를 따라 배경음으로 넣었다. Content ID 등록 여부는 확인하지 않았으므로 미등록이라고 단정하는 값도 넣지 않았다.

전체 unit/integration108개 파일/1,085개 통과. Statements93.43%/branches91.01%/functions96.73%/lines98.67%. Host2개, Native1개 통과(전체 bytes 검사1개는 Host에서만 실행). 분배미디어1,421개 검증.

[참조 왕복](evidence/cc0-audio/references-roundtrip.log)은21개 ID를 실제 원고에 넣어 archive/JSONB/workbook/XLSX 전체 비교를 수행했다. 기본 제공 bytes는 공유 자산에서 해석하며 작품에 중복 첨부하지 않는다. [브라우저 측정](evidence/cc0-audio/browser-decode.json)은21개 전체 파일을 fetch·AudioContext.decodeAudioData로 검사했다. 일부 OGG의 HTML `canplay` 시점 길이는 임시값이어서 전체 bytes 디코딩으로 검사했다.

Host는 원명·출처·복합 필터와 책장넘기는소리2 선택→저장→파일 반출→사본 재반입→reload 보존을 확인했다. Native는 숲 배경음/비소리의 경로와 재생 위치 증가, 책장 넘기기 정확히1회, 편집 복귀/선택 보존을 확인했다. [리뷰 범위 재검사](evidence/cc0-audio/targeted-unit-rerun.log), [문서 검사기](evidence/cc0-audio/docs-test.log)도 통과했다. 최종 파일 hash와 범위는 [manifest](evidence/cc0-audio/final-manifest.json)에 기록했다.

현재 archive2/StoryDocument6/workbook5/JSONB1은 유지했다. 이번 카탈로그 추가에서는 실제 Excel·Google 앱의 새로운 수동 편집이나 물리 기기 검증을 하지 않았다. 공통 양식/XLSX 검사와 과거 실제 앱 검증을 구분한다. 전문 청취·모든 장면 믹스·음성 언어·반복 접합은 별도 미검증이다. 이전26개/40개 manifest는 당시 증거로 보존한다.

후속 목표·우선순위·의존성·완료 조건은 [상업용 제공처 검토](commercial-audio-sources.md)가 소유한다. [Suno·Google 프롬프트7쌍](music-generation-prompts.md)은 준비했으며 실제 생성·청취·권리 확인·등록은 후속이다.

## 전달 점검

`agent-self-evaluation` 기준: 정확성4(개별 CC0/원본/전체 디코딩·native 증거, 전문 청취와 기존 비CC0 제공 범위는 별도), 완결성4(21개 등록·프롬프트7종·여덟 제공처 판정; 한국 녹음/생성 결과는 후속), 명료성4(등록수와 권리 판정 구분), 실행 가능성4(선택·저장·반출·재반입·재생·복귀), 간결성4(상태/계약/증거 역할 분리). 평균4.0. 우선 보강은 비CC0 공용 제공 범위, 한국 공간 녹음, 생성 결과 청취/권리다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
