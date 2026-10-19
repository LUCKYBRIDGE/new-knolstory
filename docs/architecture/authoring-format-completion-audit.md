# 공식 저작 형식 완료 감사

판정일: 2026-10-10. 대상: `authoring-format-development-plan.md`의 현재 저작 파일·표·저장 계약 목표. **현재 형식 목표 완료**, 실제 서버/DB·계정/학급 구현과 실기기/보조 기술 확인은 후속 범위다.

## 요구별 근거

| 요구 | 현재 구현·검증 근거 | 판정 |
|---|---|---|
| 지침·현황·설계와 현재 타입 조사 | AGENTS/STATUS/Blueprint/DESIGN 및 관련 경계, [필드 인벤토리](authoring-format-field-inventory.md), 타입에서 생성한 schema와 drift check | 완료 |
| 모든 현재 저작 요소 직접 편집 | 작품·출처·기획·메모·장·컷·인물·Flow·StageComposition·오디오·연출·세 면 표지/레이어·숏스토리.35/7개 편집 탭. 숨겨진 프로젝트 JSON payload 없이 행에서 문서 구성 | 완료 |
| 전수 필드와 실제 작품 보존 | [318/95개 scalar path 기록](evidence/authoring-format/all-fields-coverage.json), 구조 variant의 archive/workbook/xlsx/JSONB 및 Core 컴파일, 네 작품의 원작·놀스토리·숏스토리12종 전체 비교 | 완료 |
| 사람이 이해하는 한글 양식 | 한글 항목·선택 값·dropdown·열 메모, 숨겨진 내부 키, 종류별 사용 안내와 자산 참고. 필수/빈값/범위/참조/새 행 안내. 한글·영문 호환 역변환 | 완료 |
| 새 작품·새 행·수정·삭제 | 빈 공식 양식 UI, 새 컷의 명시적 owner 행, Flow/선택지/엔딩과 전체 요소 fixture에서 행 추가/수정·구조 없는 값 충돌·누락/중복 참조 검사 | 완료 |
| 실제 Excel·Google 시트 | 실제 앱/서비스에서 수정·저장·반출한 놀스토리/숏스토리, 한글 enum 수정, 전체 미수정 필드/음원 bytes 비교. Google 실제 note/validation 판독도 기록 | 완료 |
| 파일 이동·독립 사본·저장/reload·오류/복귀 | PC1280, 태블릿820, 폰390, 가로844 viewport의 preview 취소/확인·헤더/수식 오류·원고 유지·새 ID·저장/reload. Web 실제 외부 파일 재반입 | 완료 |
| 같은 음원의 작품별 정보·첨부 보호 | 같은 Asset ID의 이름/종류/출처/순서 분리, 부재 provenance·미사용 첨부, 다른 작품 자료 자동 첨부 방지, 사본 metadata 복사. 실제 IDB A/B/사본/reload/export 검사 | 완료 |
| 실제 재생과 인쇄 | 외부 Excel/Google 및 한글 변형의 두 엔딩 Ren’Py, 긴 전환 설명/버튼 PC·폰6개 검사. 숏스토리 실제 외부 파일 A4 쪽수/용지 크기 및 렌더링 확인 | 완료 |
| JSON/JSONB 경계와 향후 서비스 재사용 | 공통 순수 archive validator, 버전 분리, 중복 JSON key·손실 정규화·hash/bytes·unknown fields 거부. JSONB 직렬화/해시/자산 참조 복원, PostgreSQL UTF8 제약. 서비스 관계/권한/revision 별도 | 설계·순수 계약 완료 |
| 현재 Next 보호·원칙 유지 | plain Next 명시적 adapter. v2 엄격 검증. Asset ID·Flow·Stage semantics와 Core→Ren’Py 경계 유지. 숏스토리/A4는 Web/CSS. 기존 story-maker 파일 호환·서버 정책을 임의 추가하지 않음 | 완료 |
| 기록·후속 목표 | STATUS/DESIGN/형식·저장 계약/비교 기록과 최종 source/evidence hash. SV-CONTRACT, SV-CLASS, QA-DEVICE의 상태·우선순위·의존성·완료 조건 | 완료 |

## 검사 결과의 범위

- `pnpm test:coverage`: **1,007 통과**, statements93.33%/branches90.58%/functions96.47%/lines98.60%. [로그](evidence/authoring-format/final-coverage.log).
- typecheck·lint·최종 정적 build·schema drift check·diff check 통과. Python24개 통과. [빌드](evidence/authoring-format/final-build.log), [typecheck](evidence/authoring-format/final-typecheck.log), [lint](evidence/authoring-format/final-lint.log), [Python](evidence/authoring-format/final-python.log).
- 최초 전체 host는130pass/28skip/3fail이다. 이 실행을 green으로 바꾸어 적지 않는다. 준비/정적 빌드 확인 후 영향26pass/1skip으로 세 실패 경로를 재검사했다. 이후 한글 양식9pass, 음원·사본·표지10pass/3skip, 마지막 외부 파일·저장·인쇄9pass, 실제 음원 선택 이름·미사용 첨부·사본3pass를 확인했다. [전체 원기록](evidence/authoring-format/final-host.log), [영향 재검사](evidence/authoring-format/final-affected-host.log), [한글](evidence/authoring-format/korean-host.log), [최종 동선](evidence/authoring-format/final-actions-host.log), [음원 최종](evidence/authoring-format/audio-metadata-final.log).
- 실제 Ren’Py6개와 관련 연출/오디오5pass/3skip을 확인했다. [외부 파일 native](evidence/authoring-format/native-format-final.log), [관련 회귀](evidence/authoring-format/native-regression.log). 최종 public runtime과 정적 export runtime453개 파일의 SHA-256이 일치한다. [빌드 일치](evidence/authoring-format/runtime-build-coherence.json).
- 실제 Excel2종 + 한글 놀스토리, 실제 native Google2종 + 한글 놀스토리를 반출했다. [Excel](evidence/authoring-format/excel-native-roundtrip.log), [Google](evidence/authoring-format/google-native-import.log), [한글](evidence/authoring-format/korean-native-roundtrip.log), [실제 Google note/validation](evidence/authoring-format/google-korean-cells.json).
- [최종 manifest](evidence/authoring-format/final-manifest.json)는 이 판정에 사용한 코드·검사·외부 반출·형식 artifacts를 상대 경로와 hash로 연결한다.

## 구분해서 남기는 범위

실제 PostgreSQL/API 배치·권한·revision 충돌·멱등성·자산 객체 저장·백업 복구를 실행한 것은 아니다. 로그인·학급·과제·제출·공유의 운영 정책은 아직 결정하지 않았다. 물리 Windows/Android 기기 및 스크린리더 검사는 viewport/실제 Mac Excel 검증과 구분한다. 이 범위의 완료 조건은 [후속 목표](authoring-format-development-plan.md#남은-판정과-후속-목표)에 있다. 이번 작업은 기존 story-maker 파일이나 DB 이전을 구현하지 않는다.

한 셀30,000자·파일25MB·오디오5MiB/개·20MiB encoded aggregate 등의 한도를 안내한다. 지원하지 않는 수식·다른 대상의 링크·XML에서 손실될 문자·미래 필드/버전은 원고를 유지한 채 오류로 거부한다. 지원 범위를 넘어선 데이터를 조용히 잘라내지 않는다.

## 자체 검토

정확성4/5: 실제 앱/서비스와 deep comparison으로 확인했고 DB·실기기는 미검증으로 표시했다. 완결성4/5: 현재 형식 목표는 충족하지만 제품 출시와 서버 범위는 남아 있다. 명료성4/5: 계약·구현·실행 증거와 후속을 분리했다. 실행성5/5: 양식·안내·오류 위치·기록과 후속 완료 조건을 제공한다. 간결성4/5: 상세 내용은 파일에서 관리하며 목표 프롬프트는 짧게 참조한다.
