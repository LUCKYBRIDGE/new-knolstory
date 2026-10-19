# 편집 화면 개편 이미지 도안

2026-10-10. 사용자는 제품 개편 전에 웹·태블릿·휴대폰 이미지 도안을 먼저 완성해 검토하기로 했다. 현재 산출물은 디자인 검토용이며 실제 편집기 개편이나 Ren’Py 재생 구현이 아니다.

## 확정 결정

사용자는 첫 도안의 화자 이름 표시·대사 글씨체 느낌·전반적인 글 상자를 승인했다. 따뜻한 종이색의 둥근 글 상자, 상단 왼쪽에 붙는 작은 둥근 화자 이름표, 또렷한 한글 sans 대사와 넉넉한 행간을 유지한다. 화자색은 인물 식별 색상이며 글 원문·기존 자유 배치·저장된 글꼴을 일괄 덮어쓰는 승인으로 해석하지 않는다. 구체적인 글꼴은 기존 프로젝트의 KnolStorySans를 도안에서 사용하며, 생성 이미지에서 정확한 폰트명은 추정하지 않는다.

새 배경/인물을 생성해 화면에 넣지 않는다. 모든 최종 도안은 기존 자산의 원본 bytes를 HTML 이미지로 배치했다. Stage 예시는 `BG-forest-roots.webp`, `M02-neutral.webp`, `M01-soft-smile.webp`이다. 각 ID는 현재 registry의 `seonnyeo.background` 계열 원래 ID와 `seonnyeo.character.M02-neutral`, `seonnyeo.character.M01-soft-smile`을 그대로 사용한다. 정확한 배경 ID는 [자산 목록](../../packages/asset-registry/src/catalog.json)이 소유한다.

## 검토용 화면

- [웹 v2](evidence/editor-redesign/web-v2.png): 기본 글/장면 + 연출 작업 패널.
- [태블릿 v2](evidence/editor-redesign/tablet-v2.png): 기본 터치 배치 + 소리 작업 패널.
- [휴대폰 v2](evidence/editor-redesign/phone-v2.png): 기본 화면 + 한국어 키보드 입력 중 + 선택지 편집 창.
- [글 상자 확정 방향](evidence/editor-redesign/dialogue-v2.png).
- [편집 가능한 도안 소스](evidence/editor-redesign/mockups.html), [렌더 스크립트](evidence/editor-redesign/render.mjs), [원본 이미지/글꼴 로드 확인](evidence/editor-redesign/inspection.json).

기본 화면은 글 입력과 배경/인물 배치 중심이다. 연출·소리·선택지는 ‘이 컷에 추가’에서 선택해 하나씩 연다. 웹/태블릿 가로는 장면 옆 패널, 휴대폰은 큰 하단 편집 창이다. 입력 중에는 글 칸을 확보하고 현재 장면/컷/원고/인물 선택을 유지한다. 장면과 별도 입력칸은 같은 원고를 보여주는 두 표현이며 데이터 원본을 복제하지 않는다.

## 구현 전에 검토할 범위

전체 레이아웃은 아직 검토 도안이다. 글 상자 디자인만 사용자 승인 방향으로 확정했다. 웹 컷 목록 폭, 태블릿 세로/휴대폰 가로 전환, 인물 선택 도구, 도구 열기/닫기, 긴 원고/여러 화자/4인 배치와 키보드 실제 동작은 후속 구현·검증이 필요하다. 도안의 선택지/소리 문구는 예시이며 기본 작품 데이터에 적용하지 않았다. 실제 런타임은 Core→Ren’Py 소유와 현재 Stage Layout을 유지하고 별도 Web Player를 만들지 않는다.

UI 그림은 기존 디자인 토큰을 사용했다. 글 상자 기준은 off-white 배경94%·17px 둥근 모서리·가벼운 경계와 그림자, 화자표시 pill14px, 대사20px/행간1.6(휴대폰16px)다. 이는 검토 도안의 수치이며 Ren’Py logical size/실제 표시 배율에 맞춰 환산해야 한다.

## 여러 버전·상황 도안 v3

실제 자산 기반30개 화면을 A 균형형/B 장면 집중형/C 대본 집중형으로 준비했다. 각 안의 기기별 기본과 연출/소리/선택지, 자료 선택·한국어 키보드·4인·긴 글·빈 컷·분기·화면 방향을 포함한다. [비교 문서와 이미지 목록](editor-redesign-versions.md)을 기준으로 나중에 종합한다. 글 상자 디자인은 승인 방향을 유지하고 전체 레이아웃은 아직 검토 후보다.

## 최종안 결정

사용자가 후보를 종합해 최종안을 결정하도록 요청했다. [최종 구성과 누락 감사·구현 기준](editor-redesign-final.md)이 앞으로의 개편 기준이며, [최종 종합 이미지](evidence/editor-redesign/final-master.png)와 [상태별 상세 이미지](evidence/editor-redesign/gallery-final.html)를 따른다. 이전 A/B/C와 v2는 비교 이력으로 보존한다. 현재는 도안 완료이며 실제 제품 개편 완료가 아니다.
