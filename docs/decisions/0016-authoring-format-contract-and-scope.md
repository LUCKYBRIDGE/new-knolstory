# ADR 0016 — 현재 저작 형식과 호환 범위

Status: Accepted for current authoring scope (2026-10-10). 사용자 확정 목표와 실제 구현을 기록한다. 서버 운영·전체 출시 정책의 승인으로 확장하지 않는다.

## 결정

현재 형식과 구성의 창작·편집·연출 충분성 및 가독성을 우선한다. 이전 파일 호환은 현재 개선을 제한하는 필수 조건이 아니다. 이미 작성된 Next 내용의 의미 보존은 별도로 확인한다.

- 콘텐츠 기준은 StoryDocument/ShortStoryProject다. 공식 archive v2와 workbook v2는 같은 콘텐츠의 파일/편집 표현이며, `.rpy`나 표 행을 별도 SSOT로 만들지 않는다.
- 공식 파일, 한글 다중 탭 Excel/실제 Google 시트 편집, 현재 Next 작품 보호가 우선이다. 기존 story-maker 파일·구형8/4탭 형식 호환은 사용자가 이 목표에서 제외했다. 도메인 v1–v5 migration과 기존 Next 읽기 adapter는 유지한다.
- ADR0009의 레거시 작품 파일 호환 의무와 ADR0010의 레거시 파일 이전 경로는 현재 목표의 필수 gate로 적용하지 않는다. 향후 필요가 확인되면 별도 범위·변환·보존 검증을 정한다. 레거시 원본 저장소 보호와 고정 기준의 기능/UX 조사 규칙은 그대로다.
- Next는 새 offline HTML exporter를 제공하지 않는다. 기존 legacy 파일의 보존과 미래 온라인 공유 구현은 별개이며, 공유 정책은 미확정이다.
- 파일/문서/API/revision 버전을 구분한다. 향후 JSONB에는 같은 공통 검증을 사용하고 계정·권한·학급 관계와 바이너리 저장 정책은 서비스 단계에서 정한다.
- 한글 표시·내부 키의 가역 변환, 무손실 검증, 작품별 음원 정보와 공용 bytes, 원본 보호 사본 적용을 현재 계약으로 사용한다.

## 근거와 변경 방법

[실행 계획과 사용자 범위](../architecture/authoring-format-development-plan.md), [저장 계약](../architecture/authoring-storage-contract.md), [양식](../architecture/authoring-workbook-v2.md), [완료 감사](../architecture/authoring-format-completion-audit.md).

이는 형식을 영구 동결하는 결정이 아니다. 필드·형식·목표를 바꾸면 영향/보존/버전·변환/검증 조건을 [변경 절차](../architecture/documentation-governance.md)에 따라 갱신한다. 새 사용자 요구를 오래된 계획 때문에 거부하거나, 미확정 운영 정책을 코드로 확정하지 않는다.

## 2026-10-14 사용자 재확인

사용자는 모든 옛 파일 양식 지원이 필요하지 않으며 뉴놀스토리의 현재 형식에 맞춰야 한다고 재확인했다. 지금도 필요한 옛 저작 내용이나 작업 표현은 현행 형식에 명시적으로 옮긴다. 역사적 원본은 증거/보존 대상으로 두고 현재 편집 UI나 형식을 옛 양식에 맞춰 되돌리지 않는다. 기존 Next 저작 보존과 신규 private 첨부 금지는 함께 유지한다. 새 generic legacy codec 지원을 추가하거나 현재 기능을 옛 형식에 맞춰 제한하지 않는다.
