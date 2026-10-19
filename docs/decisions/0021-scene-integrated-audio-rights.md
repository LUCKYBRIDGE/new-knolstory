# ADR0021 — 장면용 음원 선택과 독립 재배포의 분리

상태: Accepted with conditional provider review. 날짜: 2026-10-10.

사용자는 공용 음원 선택과 이야기 장면 결합을 유지하고 원음의 독립 재배포를 제한하는 방향으로 ADR0020의 일괄 제외를 수정했다. Pixabay는 개별 자료의 Content License 표시를 확인해 장면용 조건부 자료로 복구한다. 이것은 무제한 재배포 허가나 공급자의 별도 서비스 계약을 확보했다는 뜻이 아니다.

내부 승인version2는 usage·preview·standaloneDownload·exportMode를 추가해 CC0와 장면 결합 조건을 구분한다. Pixabay는 장면에서 들어보고 일반 원음 컨트롤/다운로드 기능을 제공하지 않는다. 현재 편집용 작품 형식은 기본 음원을 장면의 ID 참조로 유지한다. 완성된 영상·오디오 내보내기는 별도 구현/권리 검사가 필요하다.

ADR0020의 CC0-only/14개 일괄 제외와 Pixabay 경로 거부를 부분 대체한다. 원본/해시/증거 검증·미확인 항목 제외·기존 ID 보존·ZIP 중복 차단은 유지한다. archive2/StoryDocument6/workbook5/JSONB1은 변경하지 않는다. 실제 정적 asset/ZIP 전송은 DRM이 아니며 최종 서비스 범위의 추가 확인 조건을 유지한다.

현재 범위·개별 기록·검증·후속은 [음원 장면 사용 계약](../architecture/audio-service-rights.md)이 소유한다.
