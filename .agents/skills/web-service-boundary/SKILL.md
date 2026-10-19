# Web Service Boundary Skill

Use for editor/service shell, persistence, accounts, classes, assignments, submissions or sharing.

1. Read [STATUS](../../../STATUS.md), [storage contract](../../../docs/architecture/authoring-storage-contract.md) and the relevant ADR. Unresolved policy is not permission to decide it silently.
2. Web owns editing/local persistence and Runtime Core owns playback state. Ren'Py presents scenes and audio; it never owns accounts, classroom data, submission rules or DB access. ShortStory rendering/print stays Web/CSS.
3. Reuse pure archive validation and `prepareJsonbSnapshot`/`restoreJsonbSnapshot` for server boundaries. JSONB serialization tests do not prove a real API/PostgreSQL implementation.
4. Keep owner/permissions/class relations/server revision separate from authored content. Server projection, binary storage, concurrency and submission policy require explicit design and tests before completion claims.
5. Keep editing local-first. Do not sync pointer movements. Import validates and previews before applying an independent copy; errors/cancel preserve the current manuscript and existing work.
6. Preserve `knolstory-*` storage and recovery behavior; never mutate legacy IDB or `storygame*` keys.
7. Update the affected contract, integration/recovery tests and [documentation governance](../../../docs/architecture/documentation-governance.md). Distinguish implemented, proposed and verified operations.

사용자에게 보이는 기능 이름과 설명은 [제품 용어 기준](../../../docs/architecture/editor-terminology-and-time.md#제품-용어-사용-기준--2026-10-19)을 따른다. 내부 키·현재 파일 계약과 과거 검증 기록은 용어 정리로 바꾸지 않는다.

- 지연된 계정 연결 요청은 마운트 여부만 확인하지 않는다. 계정 재확인 이벤트와 현재 계정/CSRF를 확인하고 오래된 응답·실패·종료 처리가 새 요청에 영향을 주지 않는지 검증한다. 오류 안내는 [저장 계약](../../../docs/architecture/authoring-storage-contract.md)에 따라 원고 보존·다음 행동을 설명하고 원시 서버/브라우저 오류를 복사하지 않는다.

- 공유 보관함의 쓰기 제한과 현재 글 초안 편집을 구분한다. 기본 현재 컷 글을 메모리에서 수정/파일로 보관할 수 있게 하더라도, 다른 편집 도구·탐색·자동 보관의 소유권 조건을 함께 풀지 않는다. 불가 상태의 파일 내용·원시 보관함 유지와 정상 소유 상태의 자동 보관을 대조한다.
