# 조연 중심 동작·표정 추가32종

2026-11-11 사용자가 “더 많이”, “주요 인물이 아니더라도”, “편집에 쓸 수 있게”를 요청한 후속이다. 이전16종과 원래 카탈로그를 보존하고16개 기존 인물·동물 정체성에 각2개의 자세를 추가한다. [선정/추가 전 카탈로그 해시](plan.json), [인물별 이전 수량과 추가ID](coverage.json), [생성·원본/실행해시·변환](generation.json), [현재 실행 결과](checkpoint.json)를 연결한다.

## 선정 범위

| 작품 | 대상 | 표현 |
| --- | --- | --- |
| 흥부와 놀부 | 첫째·둘째 아이, 이웃, 제비 | 기쁜 인사/걱정, 눈물/떡 나눔, 위로/놀람, 비행/다친 날개 |
| 옹고집전 | 포졸, 일꾼, 하인, 사또 | 제지/당황, 품삯 요구/땀 닦기, 사과/안도, 생각/경악 |
| 선녀와 나무꾼 | 큰선녀, 둘째선녀, 사냥꾼, 나무꾼 어머니 | 설명/만류, 웃음/걱정, 귀 기울임/당황, 기다림/위로 |
| 별주부전 | 용왕, 어의, 물고기 신하, 게 신하 | 회복의 기쁨/의심, 안도/만류, 보고/경악, 의견/사과 |

각 작품8종, 총32종이다. 처음16종과 합쳐 최근48종을 추가한다. 인물별 전체 행동/표정 조합이 완성됐다는 뜻은 아니다. 원래 이미지가1~3종뿐인 조연을 우선하되 이야기에서 역할을 구분해 쓸 동작을 선정했다.

## 생성·검토·보존

참조 그림에서 동일한 얼굴·나이·의복·머리·모자·신발·종별 신체와 화풍을 확인해 각각 생성했다. 색 배경에서 알파·빈틈·손/발/날개/집게·소품·몸의 비율을 검토한다. 아이·작은 게 신하를 어른 높이로 늘리지 않는다. 전신800×1200캔버스의 투명 여백과 참조 발/바닥 기준을 유지하고, 고개 숙임·팔 들기·비행은 자연스러운 자세 차이를 남긴다. 최종 채택·개별 보완과 실제 화면 검토는 체크포인트가 소유한다.

새32개는 `generatedExpressionAsset:true`, `expressionBatch:supporting-v2`로 구분한다. 기존449개 카탈로그 행·순서·값과 이전 생성 원본, 기존 작품/개인 원고/저장소는 변경하지 않는다. 제공 작품 컷의 이미지를 자동 교체하지 않고 사용자가 편집기에서 선택하도록 등록한다. 인물ID, 단일 전신 구도, 동작·표정·한글 이름의 검색과 선택 정책을 함께 연결한다. Ren’Py에는 이번32개 정확한 경로만 허용한다.

원본PNG는 `assets/source/characters/expressions-v2/`, 실행WebP는 `apps/web/public/assets/characters/expressions-v2/`이다. 같은 byte 해시를 재현하는 변환과 원본/결과/geometry 검사를 제공한다. 현행Git 생성 자료이므로 레거시 복원 도구가 옛 저장소에서 찾거나 덮어쓰지 않는다. 프로젝트 소유자가 요청한 서비스·편집 사용 범위를 유지하고 CC0/제3자용 무제한 자료실로 바꾸지 않는다.

## 편집·재생 검사

인물 이름·행동·감정 검색, 미리보기, 취소, 적용과 새로고침 저장을 새16개 정체성 각각에서 확인한다. 새32종 전부를 실제 Ren’Py로 가로/세로 재생해 정확한 준비 경로와 실행이미지SHA를 대조한다. 전체 작품 파일 내보내기와 재열기 원고 비교도 한다. 실행/실패/보완/미검증은 체크포인트에 남긴다. viewport 모의는 물리 휴대폰 검증이 아니다.

## 다른 컴퓨터에서 이어서 작업

```sh
pnpm install --frozen-lockfile
python3 -m pip install Pillow==11.3.0 fonttools==4.60.2
python3 scripts/prepare-expression-assets.py
# 실행WebP가 없을 때만 원본PNG에서 복원하며 기존 수정 파일은 보존한다.
python3 scripts/prepare-expression-assets.py --restore
pnpm runtime:build
pnpm build
KNOL_EXPRESSION_RECEIPT=docs/architecture/evidence/supporting-character-expansion-2026-11-11/generation.json pnpm exec playwright test --config tests/character-expressions.playwright.config.ts
```

PowerShell에서는 환경 변수를 `$env:KNOL_EXPRESSION_RECEIPT='docs/architecture/evidence/supporting-character-expansion-2026-11-11/generation.json'`으로 정한 뒤 위 Playwright 명령을 실행한다. 환경 변수를 정하지 않으면 이전16종을 검사한다. 공통 준비 검사는 두 묶음을 모두 확인한다. 기존 SDK/비공개 그림은 [재현 환경](../../reproducible-test-environment.md)을 따른다.

이32종 단계의 카탈로그는481행이었다. 이후 사용자 결정의 [전체 인물 감정 기준](../all-character-emotions-2026-11-11/review.md)이 현재 추가 범위와 총카탈로그를 소유한다. 신규ID를 사용하는 작품을 온라인에 올리려면 다음 API 배포도 그 현재 카탈로그를 포함해야 한다. 이번 저장소/로컬 추가만으로 운영API·인증 업로드·공개 사이트 배포가 완료된 것은 아니다. 재빌드한 실행 묶음은 과거 배포runtime-review의 승인을 자동 상속하지 않는다.
