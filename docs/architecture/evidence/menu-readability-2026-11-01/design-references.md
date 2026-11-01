# 메뉴 디자인 참고와 재사용 범위

2026-11-01 사용자 요청으로 공식 디자인 가이드와 이미 설치된 UI 개선 절차를 검토했다. 외부 제품의 화면·이미지·아이콘·문구·컴포넌트 소스를 복제하거나 새 패키지를 설치하지 않았다.

| 참고 | 이번 적용 | 재사용 범위 |
|---|---|---|
| [Microsoft Fluent 2 버튼](https://fluent2.microsoft.design/components/web/react/core/button/usage/) | 계속 읽기·작품 파일 저장을 각 화면의 주요 동작으로 강조하고 나머지 실행 면은 중립 배경으로 구분. 선택 상태를 글과 색으로 표시 | 원칙 참고, 독자 구현 |
| [Microsoft Fluent 2 대화상자](https://fluent2.microsoft.design/components/web/react/core/dialog/usage) | 제목/닫기/본문 구분, 필요한 조작만 묶기, 스크롤과 키보드 종료/초점 복귀 | 원칙 참고, 독자 구현 |
| [Adobe Spectrum 대화상자](https://spectrum.adobe.com/web/rsp/components/standard-dialog) | 창 제목·본문·작업 영역을 구분하고 모바일에서 읽을 수 있게 배치 | 원칙 참고, 독자 구현 |

Fluent UI 코드 저장소의 [MIT 라이선스](https://github.com/microsoft/fluentui/blob/master/LICENSE)는 확인했으나 이번에는 해당 코드·폰트·이미지·아이콘을 가져오지 않았다. 가이드 페이지와 브랜드 자산 전체를 그 코드 라이선스로 취급하지 않는다. 새로 배포할 외부 자산이나 고지 추가는 없다. 기존 작품 자산·글꼴의 권리 기록은 이 참고로 변경되지 않는다.

설치된 `make-interfaces-feel-better` 절차의 조작 영역·테두리·초점 상태·설명 줄바꿈 원칙도 검토했다. 이 프로젝트의 기존44px 조작 기준을 유지하고 접힌 도움말의 문장은 `text-wrap:pretty`로 다듬었다. 불필요한 모션이나 UI 프레임워크 의존성은 추가하지 않았다. 스킬 자체를 저장소나 제품에 복사하지 않았다.
