# 프로젝트 이미지의 제작·계승과 서비스 사용 범위

2026-11-01. 사용자 설명과 현재 파일·고정 구 저장소 이력을 대조했다. 이 문서는 특정 서비스에서 프로젝트 이미지를 쓰는 권한과 파일의 제작·계승 근거를 구분한다. 모든 이미지에 CC0를 부여하거나 제3자 원본 라이브러리 재배포를 허용하는 문서가 아니다.

## 사용자 설명과 적용 범위

사용자는 다음과 같이 제작·계승 경위를 설명했다.

> 이미지는 대부분은 우리가 만든 거고, 가져왔다 해도 우리가 story-maker 리포지토리, 구 놀스토리에서 가져온 것들이다.

기존 [구 UI 복원 목록](../../../../packages/asset-registry/src/legacy-ui-media.json)에도 사용자가 2026-10-08 놀퀴즈·놀스토리·story-maker의 소유자라고 설명하고 기존 디자인·자료 재사용을 지시한 사실이 있다. 현재 [카탈로그](../../../../packages/asset-registry/src/catalog.json)의 421개 이미지 자산은 모두 저작권자를 `놀퀴즈`로 표시한다. 이 세 근거와 아래 고정 파일 대조를 함께 사용한다. 저작권자 문자열 하나나 구 저장소에 파일이 있다는 사실만으로 외부 자료의 권리를 판정하지 않았다.

사용 범위는 놀스토리의 웹 표시, 이야기 장면 재생, 편집기에서의 선택·미리보기, 같은 출처의 재생용 파일 전달, 작품 파일에서 자산 ID를 참조하는 동작이다. 전체 공개 원본 450개를 SHA-256으로 고정해 [프로젝트 서비스 사용 목록](../../../../packages/asset-registry/src/project-media-authorization.json)에 기록한다. 새로운 파일·변경된 바이트·외부 자료는 목록에 자동 편입하지 않는다.

소유자의 서비스 사용 지시를 `CC0-1.0`, 퍼블릭 도메인 기증, 모든 이미지의 직접 제작 확인 또는 제3자의 제한 없는 원본 라이브러리 재배포 허가로 바꾸지 않는다. 생성 방법이 기록되지 않은 자료는 `creationMethodEvidence: not-recorded`로 그대로 남긴다. 공개 표시에 사용할 수 있다는 사실과 창작자가 누구인지·어떤 도구로 최초 생성했는지는 별도 사실이다.

## 실제 파일 대조

구 저장소의 현재 브랜치를 읽지 않고, 고정 기준 커밋 `18da4fc5bd4bf2a9080b32903d31f1aacdd24a0b`의 blob을 `git cat-file --batch`로 읽어 대조했다. 저장소 경로는 작업 환경마다 다르므로 이 문서에 로컬 절대 경로를 기록하지 않는다.

| 현재 파일 묶음 | 파일 수 | 확인한 근거 |
|---|---:|---|
| 현재 이미지 카탈로그 | 421 | 418개는 배포 원본, 3개는 현재의 투명 여백 파생본. 각 자산의 구 원본 421/421이 고정 커밋 blob SHA와 일치하며 불일치 0개 |
| 보존한 어린 인물 원본 | 3 | 현재 카탈로그가 파생 경로로 옮겨진 뒤에도 남겨 둔 원본. 위 3개 파생본의 `sourceSha256` 및 구 blob과 일치 |
| 구 서재·소개 UI | 10 | `legacy-ui-media.json`의 파일·sourcePath·SHA와 고정 커밋 blob 10/10 일치 |
| 로딩 캐릭터·애니메이션 | 15 | 현재 로딩 README와 2026-10-20 생성·프레임·검증 기록, 현재 파일 SHA |
| 공통 놀퀴즈 브랜드 SVG | 1 | 현재 브랜드 README와 `e5c9b1368004d475c6d83dbe4afe69c7985a6cf4`의 프로젝트 원본 |
| **공개 원본 합계** | **450** | **433개 고유 SHA; 같은 그림의 별도 경로가 일부 존재** |

카탈로그의 `sourcePath`에는 PNG 시절의 경로가 남은 경우가 있다. [기존 복원 절차](../../../../scripts/restore-legacy-media.py)와 같이 먼저 고정 커밋의 `public/story-assets/<현재 원본 파일명>`을 확인하고, 그 파일이 없는 경우에만 기록된 sourcePath를 확인했다. 읽기·비교만 수행했으며 구 저장소나 현재 이미지 바이트를 수정하지 않았다.

어린 인물의 현재 파생본 3개는 [변환 코드](../../../../scripts/prepare-character-stature-assets.py)와 카탈로그의 `statureTransform`에 원본 SHA·배율·투명 여백·출력 SHA가 연결되어 있다. 원본을 보존하면서 그림을 줄이고 위쪽에 투명 공간을 넣은 명시적 계승 관계이며 새로운 이미지 생성 또는 별도 권리 취득으로 표시하지 않는다. 두 자라 원본과 선녀 두 아이 원본은 삭제하지 않았다.

## 직접 제작 기록을 추가로 찾은 범위

고정 구 저장소의 `docs/design/` JSON 제작 명세를 읽었다. 단순히 자산 ID가 참조 목록에 등장하는 경우는 제외하고, 해당 자산의 `result.sha256`, `finalSha256` 또는 `outputSha256`이 현재 원본 SHA와 맞는 경우만 셌다. 이 조건으로 현재 카탈로그 **248개**에 직접 생성 결과의 출력 해시 근거를 연결했다.

| 고정 구 저장소의 제작 명세 | 출력 SHA가 일치하는 현재 자산 |
|---|---:|
| `docs/design/worlds/onggojib/recast-20261002/production.json` | 126 |
| `docs/design/shortstory-images/seonnyeo-creative-20261002/production.json` | 20 |
| `docs/design/shortstory-images/seonnyeo-production-20261002.json` | 20 |
| `docs/design/shortstory-images/heungbu-20261002/manifest.json` | 18 |
| `docs/design/shortstory-images/heungbu-creative-20261002/manifest.json` | 16 |
| `docs/design/shortstory-images/rabbit-creative-20261002.json` | 16 |
| `docs/design/shortstory-images/scene-production-20261002.json` | 16 |
| `docs/design/worlds/character-expansion-20261002-receipts.json` | 7 |
| `docs/design/book-covers/creative-assets-receipts.json` | 5 |
| `docs/design/worlds/generation-20261002-v2-receipts.json` | 3 |
| `docs/design/worlds/character-expansion-20261002b-receipts.json` | 1 |

제작 명세에는 내장 `image_gen`/imagegen 사용, 참조 파일, 생성 원본·출력 파일 해시, 후처리와 프롬프트가 기록되어 있다. `creative-assets-20261002.md`는 외부 일러스트·책 도안·브랜드 캐릭터를 가져오지 않고 사용자 요청으로 AI 제작했다고 명시한다. `generation-20261002-v2.md`, `rabbit-classic-art.md`, `seonnyeo-classic-art.md`도 사용 도구와 생성·분리·변환 경위를 기록한다. 이 사실을 최초 생성 기록을 아직 찾지 못한 다른 자산까지 확대하지 않는다.

현재 [로딩 README](../../../../apps/web/public/assets/loading/README.md)는 토끼·자라 등 기존 프로젝트 캐릭터를 참조해 사용자 요청으로 imagegen 생성한 경위와 1→2→3→4→1 프레임 규칙을 설명한다. [첫 생성 기록](../story-loading-2026-10-20/checkpoint.json), [작품별 추가 기록](../story-loading-variants-2026-10-20/checkpoint.json), [네 프레임 기록](../story-loading-four-frame-2026-10-20/checkpoint.json)을 함께 연결한다. 이전 후보도 현재 배포 폴더에 남아 있어 15개를 모두 해시 목록에 포함한다.

공통 [브랜드 README](../../../../apps/web/public/brand/README.md)는 놀퀴즈·놀프린트·놀아트와 공유하는 프로젝트 원본 SVG라고 설명한다. 이를 CC0 아이콘이나 외부 아이콘 사이트에서 받은 자료로 분류하지 않는다.

## 923개 표시의 이미지 부분을 해석하는 방법

직전 정적 배포 감사의 923개 차단 표시는 918개 미확인 미디어 행과 5개 실행 파일 번들 행이었다. 그중 이미지 행은 897개였다.

| 이미지 미확인 행 | 수 | 해석 |
|---|---:|---|
| 공개 원본 | 450 | 위 프로젝트 서비스 사용 목록 대상 |
| `runtime/game/assets/` 복사본 | 424 | 공개 원본과 바이트가 같은 재생 사본. 경로 접두사가 달라 `RenPy SDK distribution`으로 오분류된 경우가 있었음 |
| 직접 작성한 runtime UI SVG | 6 | 프로젝트 UI 코드/생성기 근거를 별도 연결할 항목; 이 450개 목록에서 임의 승인하지 않음 |
| SDK 아이콘·presplash | 17 | SDK 출처/라이선스 근거를 별도로 확인할 항목; 프로젝트 자체 그림으로 표시하지 않음 |
| **합계** | **897** | 고유 SHA는 456개이며 독립된 897개의 원저작물 문제가 아님 |

따라서 447개의 `RenPy SDK distribution` 이미지 행 전체를 SDK 그림 또는 전체를 프로젝트 그림으로 처리하면 둘 다 잘못이다. 그 안의 424개는 우리 공개 이미지의 바이트 동일 복사본이고, 나머지 23개는 프로젝트 UI 6개와 SDK 자료 17개다. 런타임 복사본으로 권한 근거를 옮길 때는 정해진 공개 원본 경로와 SHA가 모두 일치해야 한다. 크기만 같거나 이름이 비슷하다는 이유로 전파하지 않는다.

## 외부 자료 예외와 한계

확인한 구 제작·디자인 기록에서 `Unsplash`, `Pexels`, `Freepik`, `Flaticon` 등 외부 이미지 편입의 확정 사례를 찾지 못했다. 표지 디자인 참고 문서는 외부 표지·브랜드·템플릿의 원본 그림과 코드를 복사하지 않았다고 명시한다. 이는 모든 과거 작업을 독립적으로 전수 고증했다는 뜻은 아니다.

폰트·음원·SDK 파일과 외부 콘텐츠 조건은 이 이미지 선언의 대상이 아니다. 기존 OFL 고지, CC0 음원 근거, 조건부 음원의 제한을 이 선언으로 지우지 않는다. 외부 권리자나 다른 제작 경위가 확인되면 해당 해시 항목을 따로 검토한다. 최초 생성 방법을 못 찾은 것과 프로젝트 소유자가 서비스 사용을 지시한 사실을 혼동하지 않는다.

이 문서와 데이터만으로 실제 배포 검사가 통과했다고 주장하지 않는다. 검사기 연결·회귀·최종 남은 항목은 부모 작업의 체크포인트가 소유한다.

## 공통 실행 UI 후속 확인

부모 작업에서 프로젝트가 직접 작성한 대사창·선택지 SVG 6개도 확인했다. `renpy/responsive-spike/game/ui/`의 추적된 원본과 실제 `runtime/game/ui/`의 SHA가 6/6 일치한다. 대사창 세 그림은 `spikes/renpy-web/build.py`와 디자인 토큰에서 재현되고 선택지 세 그림은 프로젝트의 기존 SVG다. 같은 서비스 사용 범위로 정확한 여섯 파일을 허가 목록에 추가했다. 따라서 최초 공개 원본450개에 이6개를 더한 최종 목록은456개다. SDK 아이콘·presplash17개와 불투명 실행 번들5개는 프로젝트 그림 허가로 승인하지 않는다.
