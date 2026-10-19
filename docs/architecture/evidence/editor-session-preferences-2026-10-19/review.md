# 편집 세션 설정 검토

2026-10-19 독립 소스 검토: 차단할 결함 없음.

- 서버 렌더는 기본편집 snapshot, 브라우저는 안정된 캐시 snapshot으로 hydration 후 설정 복원.
- 작품 ID별 sessionStorage/Map 분리, 개별 고급 기능 닫기와 선택 화면 fallback을 함께 정규화.
- 저장소 차단·용량 초과·잘못된 JSON/버전/값은 원고 편집을 막지 않음.
- allowlist에 있는 UI 필드만 직렬화; StoryProject/작품 파일 변경 없음.
- 이번 브라우저 검사는 host 설정 동작에 한정. 기존 native geometry/엔진 검증을 새로 수행한 것으로 주장하지 않음.
