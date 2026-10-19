# KnolStory — 현재 구조와 책임

현재 구현 상태는 [STATUS](../../STATUS.md), 단계/출시 조건은 [Blueprint](development-blueprint.md), 변경 절차는 [문서 관리](documentation-governance.md)를 따른다. 아래 책임은 서비스 목표 구조이며 모든 서비스 기능이 구현됐다는 뜻은 아니다.

```text
Web service/editor + local persistence
        ↓
StoryDocument / ShortStoryProject + archive attachments
        ↓                         ↓
Runtime Core                 ShortStory Web/CSS + A4
        ↓
RuntimeScene / RuntimeCommand / RuntimeEvent
        ↓
JS ↔ Ren’Py bridge → one persistent Ren’Py presenter

Future Server: auth/permissions/online data → validated document + asset storage
```

| 책임 | 현재 위치/기준 |
|---|---|
| Web 서비스 UX·편집·서재·준비·기기 저장 | `apps/web`; [저장 코드](../../apps/web/lib/workspace-storage.ts) |
| 도메인 문서·Flow·Stage·표지/기획/메모 의미 | `packages/story-domain`; [문서 계약](authoring-storage-contract.md) |
| Canonical layout·자산 해석·재생 상태·scene 생성 | `packages/runtime-core`; [구도/오디오](responsive-audio-authoring.md) |
| Bridge payload/type/guard | [runtime-contract](../../packages/runtime-contract/src/index.ts), [ADR0014](../decisions/0014-renpy-web-host-and-bridge-model.md) |
| 실제 장면/대사/선택/효과/소리 표시와 입력 event | `renpy/responsive-spike/game`, `spikes/renpy-web`; Core가 다음 컷/재생 상태를 결정 |
| 공식 파일·한글 Excel/Google 표·향후 JSONB adapter | `packages/compatibility`; [양식](authoring-workbook-v2.md), [완료 증거](authoring-format-completion-audit.md) |
| 안정적인 자산 ID/경로·메타데이터 | `packages/asset-registry`; 음원 bytes는 공유하고 작품별 정보를 보존 |
| 계정·권한·학급·과제·제출·온라인 저장 | [server](../../server/README.md): 아직 실제 서비스 미구현. 운영 정책/DB 구현은 후속 |

콘텐츠 SSOT는 문서이며 `.rpy`, 편집 표나 서버의 행 모델이 독립 해석기가 되지 않는다. Ren’Py는 StoryDocument를 받지 않는다. Stage Layout은 Core에 한 번 존재하고 현재 RuntimeScene의 동적 크기를 사용한다. 1280×720 `/probe`는 이전 좌표 시험 surface다.

놀스토리 Editor Stage/Preview/Player와 미래 제출·공유 viewer는 같은 Ren’Py 경계를 사용한다. HTML 편집 overlay는 입력 도구다. ShortStory 페이지/A4만 Web/CSS 예외다. [현행 범위](../decisions/0016-authoring-format-contract-and-scope.md)를 확인하며 계승 기능의 실제 legacy 조사에는 고정18da4fc를 사용한다.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.
