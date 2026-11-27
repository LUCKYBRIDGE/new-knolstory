---
name: bakssi-production
description: "박씨전 제공 작품의 원고, 인물과 배경의 그림 제작, 등록 및 실제 읽기 검증을 이어서 작업한다."
---

# 박씨전 제작

1. [Work 인수인계](../../../docs/reference/bakssi/WORK-HANDOFF.md)에서 브랜치와 남은 검사를 확인한다. [그림 제작 기준](../../../docs/reference/bakssi/art-production.md)과 [자산 작업](../asset-pipeline/SKILL.md), 그림책은 [숏스토리 작업](../shortstory-workflow/SKILL.md)을 적용한다. 비슷한 이전 실행 기록의 수치보다 현재 브랜치 파일을 우선한다.
2. [원작](../../../docs/reference/bakssi/박씨전_원작.md), [놀스토리](../../../docs/reference/bakssi/박씨전_놀스토리.md), [숏스토리](../../../docs/reference/bakssi/박씨전_숏스토리.md)의 현재 판을 읽는다. 사건표와 선택의 도착점이 맞는지 확인한다. 원고를 수정하면 `python3 scripts/prepare-bakssi-manuscripts.py`로 앱 데이터를 갱신한다.
3. [자산 레시피](../../../assets/source/bakssi/recipe.json)와 PNG 원본, 등록 기록을 비교한다. 기존에 만들어 둔 그림은 역할·화풍·인물·구도·이용 범위가 맞으면 같은 이름으로 쓰고, 빠진 그림과 검토에서 떨어진 그림을 제작한다.
4. **허물 전후 비교를 먼저 마친다.** 혼례복·평상복의 허물 전 박씨는 확실하게 못생긴 같은 얼굴이어야 한다. 허물 뒤 박씨는 얼굴의 구조가 뚜렷하게 달라져 한눈에 매우 아름답게 보여야 한다. 옷, 머리, 비녀, 키와 체격으로 동일 인물이 이어진다. 허물 전후 허리 위 비교와 실제 가로·세로 재생 크기 비교를 한 세트로 남긴다. 이 기준 그림을 잠근 뒤 숏스토리 1·2·3·5쪽과 변신 앞뒤 표정에 반영한다. 나머지 세부 기준은 그림 제작 문서를 따른다.
5. 소스 PNG를 `assets/source/bakssi/<id>.png`로 두고 `python3 scripts/prepare-bakssi-assets.py`를 돌린다. 등록기는 정확한 해시와 WebP, 인물 크기, 레지스트리, Runtime 입력 경로를 갱신한다. 후보를 바꿨으면 원본과 등록 결과의 변경을 함께 확인한다.
6. 완성 후보는 `--check --complete --require-emotions`와 `pnpm test:character-registration`을 통과시킨다. 실제 미디어가 없는 컷을 검출하는 검사에서 `KNOL_BAKSSI_REQUIRE_ART=1`을 켠다. Runtime을 Web보다 먼저 빌드한다. 서재의 세 방식, 여덟 갈래와 네 결말, 그림책 열 쪽과 사본·인쇄의 동작을 실제로 확인한다. 실행 명령과 기준은 Work 인수인계에 있다.
