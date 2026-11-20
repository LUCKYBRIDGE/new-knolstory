# 세 작품의 그림책 첫 무대 검토

로컬 브라우저에서 각 원본의 검토용 사본을 만들고 ‘놀스토리로 보내기’ 준비 화면에 `review=recipes`를 적용했다. 각 쪽의 가로 16:9 편집 결과와 세로 9:16 읽기 결과 52장을 실제 Ren’Py에서 캡처했다. 캔버스 크기·응답 리비전·이미지 해시는 [캡처 목록](capture-index.json)에 기록했다. 26개 조합의 상태는 모두 `assembly-review`다.

세로 첫 해설 컷은 기존 규칙에 따라 인물 한 명에 시선을 맞춘다. 여러 인물이 함께 행동하는 쪽은 가로와 세로를 비교해 승인한다. 캡처 이미지는 저장소 규칙에 따라 로컬 증거 폴더에 보관한다.

## 새로 제작한 그림

| 장면 | 자산 ID | 제작 기록 |
|---|---|---|
| 흥부와 놀부 2쪽 · 빈 그릇 | `heungbu.character.picturebook-empty-grain-bowl-v1` | [PNG·WebP와 SHA-256](heungbu-empty-grain-bowl-generation.json) |
| 선녀와 나무꾼 1쪽 · 사슴을 감싸 숨기기 | `seonnyeo.character.picturebook-woodcutter-sheltering-deer-v1` | [PNG·WebP와 SHA-256](seonnyeo-woodcutter-sheltering-deer-generation.json) |
| 선녀와 나무꾼 6쪽 · 구름 위 골짜기 | `seonnyeo.background.picturebook-cloud-ascent-v1` | [PNG·WebP와 SHA-256](seonnyeo-aerial-generation.json) |
| 옹고집전 8쪽 · 밥 사발 건네기 | `onggojib.character.picturebook-real-offering-rice-v1` | [PNG·WebP와 SHA-256](onggojib-real-offering-rice-generation.json) |

흥부와 놀부 5쪽은 인물 없이 열린 박과 재물이 그려진 기존 배경을 사용했다. 선녀와 나무꾼 6쪽은 새 배경으로 고도가 드러나지만 기존 두레박 그림의 밧줄 윗 끝이 캔버스 안에 보인다. 옹고집전 마지막 쪽의 사발은 인물 그림에 붙어 있으며, 두 사람이 그릇을 함께 잡는 접촉까지는 표현하지 않았다.

## 이미지 찾기

기존 선택 가능 배경 72장과 인물 412장의 그림을 직접 대조했다. 배경 시간 67/72, 분위기 72/72, 계절 31/72, 날씨 49/72, 장소 상태 27/72를 기록했다. 인물은 장면 용도 412/412, 감정 406/412, 행동 409/412다. 빛이나 표정으로 판단하기 어려운 항목은 비워 뒀다. 자산 경로·리비전·권리는 기존 값을 보존했다.

현재 그림은 조건에 맞지 않아도 확인할 수 있게 다른 그림 목록에 남겨 두며, 추천 묶음에는 조건에 맞는 그림만 나온다. 다른 그림의 고정 정렬은 유지한다.

‘시간 → 저녁’은 12장이다. 낮의 산속 계곡이 현재 컷에 쓰여 있어 별도로 1장이 보존되며, 화면에는 이미지 13장이 표시된다. 추천과 다른 그림 사이의 중복은 없었다.

- 1280px [조건 개수](picker-time-1280.png) · [검색 결과](picker-time-1280-results.png)
- 390px [조건 개수](picker-time-390.png) · [검색 결과](picker-time-390-results.png)

## 마지막 쪽 선택

PC 화면의 쪽 목록 안쪽 스크롤을 제거했다. 마지막 쪽 버튼을 눌러 선택된 상태와 버튼줄 위에 남는 것을 확인했다. 휴대폰 쪽 목록은 가로 스크롤을 그대로 쓴다.

- 1280px [마지막 쪽 선택](last-page-1280.png)
- 390px [마지막 쪽 선택](last-page-390.png)

## 흥부와 놀부

| 쪽 | 가로 편집 | 세로 읽기 |
|---|---|---|
| 1쪽 | [가로](heungbu-01-landscape.png) | [세로](heungbu-01-portrait.png) |
| 2쪽 | [가로](heungbu-02-landscape.png) | [세로](heungbu-02-portrait.png) |
| 3쪽 | [가로](heungbu-03-landscape.png) | [세로](heungbu-03-portrait.png) |
| 4쪽 | [가로](heungbu-04-landscape.png) | [세로](heungbu-04-portrait.png) |
| 5쪽 | [가로](heungbu-05-landscape.png) | [세로](heungbu-05-portrait.png) |
| 6쪽 | [가로](heungbu-06-landscape.png) | [세로](heungbu-06-portrait.png) |
| 7쪽 | [가로](heungbu-07-landscape.png) | [세로](heungbu-07-portrait.png) |
| 8쪽 | [가로](heungbu-08-landscape.png) | [세로](heungbu-08-portrait.png) |

## 선녀와 나무꾼

| 쪽 | 가로 편집 | 세로 읽기 |
|---|---|---|
| 1쪽 | [가로](seonnyeo-01-landscape.png) | [세로](seonnyeo-01-portrait.png) |
| 2쪽 | [가로](seonnyeo-02-landscape.png) | [세로](seonnyeo-02-portrait.png) |
| 3쪽 | [가로](seonnyeo-03-landscape.png) | [세로](seonnyeo-03-portrait.png) |
| 4쪽 | [가로](seonnyeo-04-landscape.png) | [세로](seonnyeo-04-portrait.png) |
| 5쪽 | [가로](seonnyeo-05-landscape.png) | [세로](seonnyeo-05-portrait.png) |
| 6쪽 | [가로](seonnyeo-06-landscape.png) | [세로](seonnyeo-06-portrait.png) |
| 7쪽 | [가로](seonnyeo-07-landscape.png) | [세로](seonnyeo-07-portrait.png) |
| 8쪽 | [가로](seonnyeo-08-landscape.png) | [세로](seonnyeo-08-portrait.png) |
| 9쪽 | [가로](seonnyeo-09-landscape.png) | [세로](seonnyeo-09-portrait.png) |
| 10쪽 | [가로](seonnyeo-10-landscape.png) | [세로](seonnyeo-10-portrait.png) |

## 옹고집전

| 쪽 | 가로 편집 | 세로 읽기 |
|---|---|---|
| 1쪽 | [가로](onggojib-01-landscape.png) | [세로](onggojib-01-portrait.png) |
| 2쪽 | [가로](onggojib-02-landscape.png) | [세로](onggojib-02-portrait.png) |
| 3쪽 | [가로](onggojib-03-landscape.png) | [세로](onggojib-03-portrait.png) |
| 4쪽 | [가로](onggojib-04-landscape.png) | [세로](onggojib-04-portrait.png) |
| 5쪽 | [가로](onggojib-05-landscape.png) | [세로](onggojib-05-portrait.png) |
| 6쪽 | [가로](onggojib-06-landscape.png) | [세로](onggojib-06-portrait.png) |
| 7쪽 | [가로](onggojib-07-landscape.png) | [세로](onggojib-07-portrait.png) |
| 8쪽 | [가로](onggojib-08-landscape.png) | [세로](onggojib-08-portrait.png) |

## 통합 검사와 배포 확인 항목

- 전체 Vitest 2,720개 통과, 2개 건너뜀. 정적 웹 후보에서 전환·필터·포커스 E2E 10개 통과. 타입, 문서, Ren’Py·정적 Web 빌드도 통과했다.
- 새 그림 4점의 PNG와 WebP, 공개·런타임·정적 Web 파일의 해시를 대조했다. 미디어 파일 2,713개를 검증했다.
- 이번 후보의 `game.zip` SHA-256은 `ce20cd2b87f8040a93089d233467a89534ad64bee0620c0ecaf6fe9ad55c9063`다. 새 자료를 포함해 운영 패키지의 기준값과 달라졌으므로 승인 후 배포 시 후보 해시와 Web·API 카탈로그 일치를 함께 확인한다.
