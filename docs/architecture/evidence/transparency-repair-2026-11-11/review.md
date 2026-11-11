# 흥부·놀부 투명 배경 교체와 다른 작품 점검

2026-11-11. 사용자가 흰 배경 잔여를 확인한 뒤 새 이미지 생성, 실제 교체, GitHub 업로드와 다른 컴퓨터의 개발 재개 기록을 요청했다. 이 기록은 Git 저장소의 교체와 로컬 검증 범위이며 운영 배포를 뜻하지 않는다.

## 확인한 결함과 적용

| 유지한 Asset ID | 확인한 결함 | 현재 실행 이미지 |
| --- | --- | --- |
| `heungbu.character.heungbu-pleading` | 다리·발목 사이의 불투명한 흰 배경 | `apps/web/public/assets/characters/transparency-v2/heungbu-pleading.webp` |
| `heungbu.character.nolbu-working` | 다리·괭이·땅 사이 및 팔 옆의 흰 배경 | `apps/web/public/assets/characters/transparency-v2/nolbu-working.webp` |

[생성·변환 기록](generation.json)은 이전 경로·revision·geometry, 생성 원본 PNG와 실행 WebP의 SHA-256, 같은 비율의 800×1200 변환, 투명해야 하는 틈과 보존해야 하는 옷의 검사 좌표를 소유한다. 같은 인물의 얼굴·복장·동작과 원래 캔버스/발 기준을 색 배경에서 대조했다. 생성 편집이므로 원본과 픽셀이 동일하다는 주장은 하지 않는다. 과거 원본 파일은 삭제하거나 덮어쓰지 않았다.

두 자산의 ID는 그대로이고 카탈로그의 경로·revision·geometry만 교정본으로 바뀐다. 기존 작품 파일의 본문·선택·갈래·자산 ID·배치와 개인 저장소를 migration하지 않는다. 이미지 수와 API에 등록할 ID도 늘리지 않는다. 실제 Ren’Py의 경로 허용 목록에는 이 두 경로만 추가한다. 임의 경로·외부 URL을 허용하지 않는다.

생성 원본은 `assets/source/characters/transparency-v2/`, 실행 이미지는 위 버전 경로에 Git으로 함께 보관한다. `.cache`나 Codex 생성 폴더를 다른 컴퓨터에 복사할 필요가 없다. 프로젝트 소유자의 교체·저장소 업로드 지시를 근거로 하며 기존 서비스 사용 범위를 유지한다. CC0 또는 제3자용 무제한 자료실 허가로 바꾸지 않는다.

## 다른 작품 점검의 범위

교체 전 [인물 목록·해시](character-audit-before.json)의 212개를 청록 배경에서 비교했다. 별주부전36·옹고집전84·선녀와 나무꾼52·흥부와 놀부40개다. [밝은 연결 영역](white-regions.json)107곳은 자주색 배경에서 확대했고, 두레박 줄·말 다리·활·빗자루·작업 자세·동석 인물의 틈은 별도 확대했다. 흰 옷·버선·수염·물보라·유령 표현은 배경 잔여와 구분했다. 다른 세 작품에서는 같은 결함을 추가 확정하지 못했다.

[배경221개 검사](background-border-check.json)는 alpha 범위와 흰 테두리 비율의 수치 검사다. 비율이 높게 나온 `heungbu.scene.shortstory-creative-12`와 `seonnyeo.scene.shortstory-classic-06`은 실제 눈·구름 묘사로 확인했다. 모든 배경 삽화를 전수 확대하거나 모든 실제 컷/배율/실기기를 검수했다는 뜻은 아니다. 점검 당시 해시를 교체 후 현재 해시로 덮어쓰지 않는다.

## 다른 컴퓨터에서 이어서 작업하기

1. 이 변경을 포함한 `main`을 가져온다. 로컬 수정이 있으면 덮어쓰지 않고 먼저 보존한다.
2. 프로젝트에 고정된 Node/pnpm 및 `Pillow==11.3.0`, `fonttools==4.60.2`를 준비하고 `pnpm install --frozen-lockfile`을 실행한다.
3. `python3 scripts/prepare-transparency-assets.py`로 원본·실행파일 해시, ID 연결, geometry, 틈/옷 alpha를 검사한다. 두 실행 WebP가 없는 경우에만 `python3 scripts/prepare-transparency-assets.py --restore`로 Git에 포함된 PNG에서 복원한다. 이미 있는 수정 파일은 덮어쓰지 않고 중단한다.
4. 다른 기존 비공개 미디어/SDK는 [재현 환경 안내](../../reproducible-test-environment.md)에 따라 준비한다. `restore-legacy-media.py`는 교정본을 현행 Git 자산으로 확인하며 예전 흰 배경 그림으로 되돌리지 않는다.
5. `pnpm runtime:build` 다음 `pnpm build`를 실행한다. 이미지 경로 허용 계약이 iframe 안의 생성 `runtime-contract.js`에 들어가야 하므로 Web만 빌드하지 않는다.
6. `pnpm exec playwright test --config tests/transparency-repair.playwright.config.ts`로 가로/세로 실제 재생·실행 이미지 해시·작품 파일 보존·새로고침을 확인한다. 이 설정은 검사 중에만 별도 루프백 포트를 사용한다.

## 현재 검증과 한계

실행 명령·결과·초기 실패와 보완은 [체크포인트](checkpoint.json)에 기록한다. 기본 CI에도 생성 원본과 실행 이미지 검사 명령을 추가했다. 예전 배포 runtime-review는 당시 봉인된 실행 묶음의 근거로 보존한다. 이번 로컬 빌드의 새 바이트를 예전 운영 승인으로 취급하지 않으며, 다음 운영 배포는 정확한 새 실행 묶음/권리 검토·배포 절차를 따로 거친다.
