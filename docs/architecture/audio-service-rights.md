# 놀스토리 음원의 장면 사용·배포 범위

확인일: 2026-10-10. 최신 사용자 결정은 공용 선택을 유지하면서 원음의 독립 재배포를 제한하는 구조다. 앞선14개 일괄 제외/CC0만 허용 판단을 사용 범위별 정책으로 수정한다. 이전 판단의 증거는 `evidence/audio-service-rights/`와 ADR0020에 보존한다. 현재 구현은 [ADR0021](../decisions/0021-scene-integrated-audio-rights.md)이 소유한다.

## 현재 선택 자료와 권리 범위

현재 편집 목록530개: 배경음78·주변 소리28·효과음424. CC0 516개와 Pixabay14개를 같은 권리로 취급하지 않는다. 2026-10-13 추가469개·별칭23개와 현재 native 전달은 [편입 계약](cc0-library-integration-plan.md), [검증](cc0-library-integration-validation.md)이 소유한다. 기존61개 승인 행·ID·bytes·권리는 보존했다.

| 범위 | CC0 516개 | Pixabay14개 |
|---|---|---|
| 작품 장면에 결합한 사용 | 허용 | 공급자 라이선스 조건 아래 허용하는 범위로 복구 |
| 라이선스의 일반 재배포 허가 | CC0 허용 | 제한 유지 |
| 편집기의 들어보기 | 기존 오디오 미리 듣기 | 현재 컷을 읽어 장면과 함께 듣기 |
| 원음의 별도 다운로드 기능 | 서비스에서 제공하지 않음 | 서비스에서 제공하지 않음 |
| 작품 파일의 기본 음원 | 장면의 ID 참조 | 장면의 ID 참조, 원음 bytes 미첨부 |
| 판정 | CC0 범위 확인 | 개별 공급자 표시 확인·장면 사용 조건부 검토 |

[승인 범위 목록](../../packages/asset-registry/src/audio-service-approvals.json)은 내부 version2다. ID·src·SHA-256·license·commercialUse·redistribution·editorProvision 외에 usage, standaloneDownload, preview, exportMode를 기록한다. `standaloneDownload=permitted`는 CC0가 주는 권리 범위이며 서비스의 다운로드 기능을 뜻하지 않는다. Pixabay는 `scene-integrated / restricted / prohibited / scene / reference` 조합만 편입한다. 제공처 문자열이나 CC0라는 이름만으로 편입하지 않는다. 이번 음원 편입은 현재 StoryDocument7/archive2/workbook7/JSONB1 형식을 변경하지 않는다.

## 실제 공식 조건과 개별 검사

[Pixabay 공식 약관](https://pixabay.com/service/terms/)은 Content License의 상업적 사용을 허용하며 원형의 Standalone 배포를 제한한다. 이미지·글·오디오·편집 기법 등이 결합해 새 창작물을 이루는 사용을 따로 설명한다. [FAQ](https://pixabay.com/service/faq/)도 음악을 더 큰 창작물에 결합하는 사용과 별도 음악 제공을 구분한다. 편집 라이브러리 사례는 참고하되 우리의 개별 음원/서비스 범위를 대신 승인한 증거로 사용하지 않는다.

14개 원본 페이지의 제목·제공자와 Content License 표시를 다시 확인하고 기존 다운로드 bytes/hash와 대조했다. [개별 재검토](evidence/pixabay-scene-use/individual-review.json)가 날짜·출처·제작자·원명·조건부 범위·Content ID를 기록한다. 출처/권리 페이지와 한글 이름/속성은 편집기에서 확인할 수 있다. 두 배경음의 Content ID 표시는 유지하며 그 자체로 위법 또는 상업 이용 금지로 판단하지 않는다.

이 판정은 제공자가 게시한 라이선스와 서비스 사용 구조에 대한 조건부 검토다. 샘플·음성·개인 권리 등의 제삼자 권리를 독립적으로 보증하지 않는다. 개별 권리가 불명확해지거나 실제 사용 범위가 조건을 벗어나면 해당 항목만 제외한다. 제외된 ID를 다른 소리로 몰래 바꾸지 않는 기존 보호/안내 경로와 회귀 테스트는 유지한다.

직접 합성한26개는 [초기 제작 선언](../../apps/web/public/assets/audio/README.md), [작품용 제작 선언](../../apps/web/public/assets/audio/story-score/README.md)과 생성 코드/원본 manifest를 확인했다. 외부 CC021개는 [등록 기록](cc0-audio-import.md)의 개별 CC0 표시와 hash를 따른다.

## 구현 경계

1. 편집기에서 배경음/주변 소리/효과음을 이름·속성·Pixabay 출처로 고른다. Runtime Core가 장면의 cue를 해석하고 Ren’Py가 대사·이미지·선택지와 함께 재생한다.
2. Pixabay 선택에는 독립적인 원음 audio-controls 요소와 다운로드 버튼/링크를 만들지 않는다. 기존 ‘현재 컷부터 읽기’ 동선에서 듣는다. 그 외 미리 듣기에도 nodownload와 기본 컨텍스트 메뉴 억제를 적용한다.
3. 공용 기본 자료의 원본 파일 내보내기 기능을 제공하지 않는다. 출처 확인 링크는 공급자 페이지다. 서비스 원음 파일을 다운로드하는 링크로 바꾸지 않는다.
4. 현재 `.knolstory`/JSONB/Excel/Google 공통 양식은 편집용 작품 형식이다. 원고·Flow·Stage·점수·장면별 음원 ID를 보존하고 기본 음원 bytes를 audioResources나 별도 시트에 넣지 않는다. 재열기는 앱의 승인된 공용 자료를 참조한다. 독립적인 완성 영상/오디오 파일을 새로 제작하는 exporter를 구현했다고 주장하지 않는다.
5. 개인 첨부 파일은 기존 로컬 보관/편집 계약을 유지한다. 사용자에게 독립적인 원음 다운로드 기능을 새로 제공하지 않는다. 사용자 첨부 provenance를 운영자가 검토한 공용 승인으로 자동 변환하지 않는다. 공개 게시/완성 미디어 내보내기에서 첨부 원음을 어떻게 결합·제공할지는 해당 서비스 목표에서 별도로 검사한다.

웹 재생에는 음원 데이터 전송이 필요하다. 현재 정적 asset URL과 공유 Ren’Py ZIP(기존61개), 참조한 새 등록 파일의 on-demand 설치는 재생 자산 전달 경로이며 네트워크에서 접근할 수 있다. 다운로드 UI 제거는 DRM이나 원음 추출의 완전 차단이 아니다. 최종 서비스의 전달 방식·공용 선택·게시·완성 미디어 배포 범위가 개별 라이선스 조건에 부합하는지 추가 확인하는 한계를 명시한다. 이 조건부 검토를 원음 라이브러리 재배포 허가로 확대하지 않는다.

## 자동 검사와 검증

[검사기](../../scripts/check-service-audio.py)는 내부 승인version2의 정확한 권리 조합, 원본 hash·출처·provenance와 증거를 대조한다. CC0와 Pixabay의 제한을 각각 유지하며 모순된 정책은 거부한다. 미등록/이름 변경 파일, 바뀐 bytes, 경로 탈출, 낡은 ZIP과 ZIP 중복 엔트리 거부도 유지한다. runtime→Web build 순서와 두 SDK 내부 무음 파일의 정확한 hash/라이선스 보존도 유지한다.

실행 결과: unit/integration111개 파일/1,091개 통과, statements93.48%/branches91.07%/functions96.75%/lines98.68%. Python31개(권리 범위 검사7개 포함), Host4개, 실제 Ren’Py2개 통과(전체 파일 디코딩1개는 Host에서만 실행). 타입·lint·runtime→Web build·provenance1,421개·문서 링크/검사기3개를 확인했다. [전체 검사](evidence/pixabay-scene-use/unit-coverage.log), [범위 검사](evidence/pixabay-scene-use/scripts.log), [참조 내보내기](evidence/pixabay-scene-use/reference-export.log), [Host](evidence/pixabay-scene-use/host-final.log), [Native](evidence/pixabay-scene-use/native-final.log).

2026-10-10 Pixabay 장면 사용 검증 증거는 [장면 사용 manifest](evidence/pixabay-scene-use/final-manifest.json)에 남긴다. 14개 모두 작품에 넣어 archive/JSONB/workbook/XLSX의 참조·원본 미첨부·전체 문서 동등성을 검사하고, 실제 편집→저장→반출→재반입→reload→Ren’Py 세 채널 재생→편집 복귀를 확인한다. 원음 다운로드 UI와 Pixabay 단독 오디오 요소가 없는지도 검사한다. 과거47개 제외 검증과 새 장면 사용 검증을 구분한다. 새 실제 Excel/Google 수동 편집·실기기·전문 청취를 실행했다고 주장하지 않는다.

## 후속 목표

| 목표 | 상태·우선순위 | 의존성 | 완료 조건 |
|---|---|---|---|
| 최종 서비스의 장면용 전달/배포 범위 | 추가 확인 P1 | 실제 배포 방식·개별 권리·온라인 서비스 정책 | 공용 선택/재생/게시/완성 미디어 내보내기에서 독립 원음 제공이 아닌 사용 범위를 확인하고 필요한 공급자 확인·전달 검사 완료 |
| 한국 공간·한국풍 자료 보강 | 후보/프롬프트 준비 P1 | 개별 권리와 생성·다운로드·청취 | 한글 이름/속성/출처/권리와 실제 파일 등록·왕복·재생 검사 |
| 다른 조건부·유료 제공처 | 미편입 P2 | 공용 편집/장면 결합/파일 이동에 맞는 개별 조건과 필요 계약 | 제공처 이름만으로 복구하지 않고 개별 범위 확인 후 같은 승인 절차 적용 |

다른 여덟 제공처는 [제공처 검토](commercial-audio-sources.md), 음악 요청 문장은 [제작 프롬프트](music-generation-prompts.md)를 따른다. 이전 배제 결정을 새로운 사용자 결정으로 수정한 것이며, 운영 서버/계정/학급 정책을 새로 정하지 않는다.

## 전달 점검

`agent-self-evaluation`: 정확성4(공식 조건/14개 표시/원본·실제 동작, 조건부 한계 명시), 완결성4(선택/장면 듣기/다운로드 UI 제한/참조 내보내기 구현, 최종 전달·완성 미디어 출력 검토는 후속), 명료성4(CC0와 장면용 조건·이전 배제/현재 복구 구분), 실행 가능성4(편집·파일 이동·실제 Ren’Py), 간결성4(현재 계약·역사·검증 역할 분리), 평균4.0. 다음 보강은 최종 서비스 전달/게시 범위와 개인 첨부의 완성 미디어 제공이다.

## 2026-10-12 개인 외부 업로드 제외

사용자의 새 결정은 놀스토리에 등록된 그림·음원만 사용하고 편집자의 외부 업로드를 허용하지 않는 것이다. 위 5항의 개인 첨부 저작 허용은 새 업로드/가져오기 범위에서 대체한다. 기존 저장 작품의 첨부 bytes/ID를 자동 삭제하지 않지만 picker 신규 선택과 새 작품 파일·시트 첨부 가져오기는 차단한다. 공용 CC0/Pixabay 등록 자료의 권리/장면 사용 조건은 변경하지 않는다. [현행 계약](authoring-storage-contract.md), [검증](editor-view-and-cut-notes-validation.md).

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
