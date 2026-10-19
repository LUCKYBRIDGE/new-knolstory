# 가로3줄·세로5줄 후보: 공식 사례 조사

2026-10-18. 사용자 요청에 따른 조사/권고이며 제품 코드는 변경하지 않았다. 현행 기본4/6줄을3/5줄로 확정·구현했다고 주장하지 않는다.

## 결론

가로3줄·세로5줄을 **기본 글씨의 페이지 분량 기준 후보**로 권고한다. 업계 공통 최대줄수가 아니라 뉴놀스토리의 장면/글 균형을 위한 값이다. 짧은 대사/해설은1–2줄에서도 끝낼 수 있고 패널을 최소화한다. 사용자 글씨 크기는 페이지 원문·경계를 바꾸지 않고 높이만 바꾼다. 화자/도구/페이지버튼은 본문줄수에 포함하지 않으며 Enter·빈 줄은 포함한다.

## 조사 방법과 한계

공식 엔진 문서/소스, 제작사 시스템 소개, 제작·배급사가 게시한 Steam 상품이미지를 사용했다. 원본을 내려받아 배포하지 않고 브라우저에서 실제 이미지를 열어 관찰했다. 게임을 구매/실행하거나 전체 원고를 조사한 것은 아니다. 표시된 줄 수는 특정 영문/일문 장면의 **관찰값**이며 최대지원줄수·평균·한국어분량이 아니다. 렌더링 버전/번역에 따라 달라진다. 링크는 아래 원본과 제작사페이지를 제공한다. 영문 `line of dialogue`는 한 발화를 뜻할 수 있으므로 물리적인 한 줄로 번역하지 않는다.

## 실제 확인한 사례

| 사례 | 공식 이미지에서 본 것 | 참고점/한계 |
|---|---|---|
| Doki Doki Literature Club! |1280×720상품이미지에서 이름표·본문2줄·하단 작은History/Skip/Auto/Save/Load/Settings. 인물은상체가크고대사창이하단에겹침.|짧은발화와작은도구의계층. 2줄이최대라는뜻아님.|
| Steam Prison |1280×720상품이미지에서 화자이름별도,영문2줄,하단반투명상자. 인물이넓은장면의주요요소.|본문외곽에여백은있지만화자·본문이하나의단위. 장식테두리는뉴놀스토리에복사할필요없음.|
| CLANNAD |확인한1280×960상품이미지에서화자와영문본문1줄,하단반투명대사창.|짧은문장을다음호흡으로넘김. 4:3관찰은현재두양식결정을되돌리는근거가아님.|
| planetarian ~the reverie of a little planet~ |800×600상품이미지에서해설1줄,하단영역과작은페이지/저장/자동도구.|해설도짧은단위로표시할수있음. NVL/장문지원전체를판단하는증거아님.|
| 이케멘 겐지전 |제작사시스템소개800×436합성이미지의세로3화면에서각본문2줄·2줄·3줄관찰,이름과작은조작은패널상단.|세로형도큰인물+짧은글.5줄최대표준이라는근거는없음. 개발중이미지표기있음.|
| 이케멘 라이브 |제작사시스템소개750×1334세로이미지에서큰인물,반투명하단본문1줄,화자·Auto·설정.|세로5줄은상시채우기보다상한여유로설계하는편이적절. 개발중이미지표기있음.|

### 원본 이미지와 공식 페이지

- DDLC: [공식소개](https://ddlc.moe/), [공식Steam이미지](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/698780/ss_3941e57f278958dd15c9855f42ab069da3a19608.1920x1080.jpg?t=1681943582)
- Steam Prison: [공식Steam등록](https://store.steampowered.com/app/977460/Steam_Prison/), [확인이미지](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/977460/ss_b72a7eb64267fb63e636a999472e6ab9daee2fc5.1920x1080.jpg?t=1789770309)
- CLANNAD: [공식Steam등록](https://store.steampowered.com/app/324160/CLANNAD/), [확인이미지](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/324160/ss_0ea83794c5f87b402f2975ad4000ce7eac42544f.1920x1080.jpg?t=1777413875)
- planetarian: [공식Steam등록](https://store.steampowered.com/app/316720/planetarian_the_reverie_of_a_little_planet/), [확인이미지](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/316720/ss_8c5b694511ee05b37f0c102eb124bab631a26ac5.1920x1080.jpg?t=1677887551)
- 이케멘 겐지전: [공식시스템소개](https://ikemen.cybird.ne.jp/title/genji/system/), [확인이미지](https://ikemen.cybird.ne.jp/wp-content/themes/ikemen/title/genji/original/images/system/system_pic_01.png)
- 이케멘 라이브: [공식시스템소개](https://ikemen.cybird.ne.jp/title/live/system/), [확인이미지](https://ikemen.cybird.ne.jp/wp-content/themes/ikemen/title/live/original/images/system/system_story_01.jpg)

## 엔진/조작 설명에서 확인한 것

[Ren’Py GUI문서](https://www.renpy.org/doc/html/gui.html#dialogue)는text_size/dialogue_width/textbox_height를각각조절한다. [공식gui소스](https://github.com/renpy/renpy/blob/master/gui/game/gui.rpy)의일반기준text22/textbox185,small변형text30/textbox240은크기·간격의변형이지3줄/5줄하드리밋이아니다. 본문상자와화자/도구/내부여백을구분해야하므로상자높이를글씨크기로나눠최대줄수라고단정할수없다.

[Ren’Py대사문서](https://www.renpy.org/doc/html/dialogue.html)는ADV발화단위와여러단위를누적하는NVL을구분한다. 뉴놀스토리는짧은발화/해설을넘기는ADV에가까운흐름을유지하는편이맞다.

[LOOPERS공식설명서](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1811500/manuals/LOOPERS_OnlineManual_en.pdf?t=1732683342)는메시지창·로그·자동/건너뛰기·저장/불러오기등의기능참고자료다. 확인한상품이미지두장은대사창없는CG이므로줄수사례에서는제외했다. IkemenPrince의확인된이미지또한홍보합성이라줄수근거에서제외했다.

## 뉴놀스토리의 판단

- 현행4→3줄은가로기준분량25%감소,6→5줄은세로약17%감소다. 실제문장경계분할로한페이지글자수가정확히그비율이되는것은아니다.
- 가로와세로가같은글을한페이지에반드시담는규칙은아니다. 현재내부폭/기준32를단순나누면한글약37자×3줄,약20자×5줄수준이며실제폰트와문장경계로달라진다. 3/5는총분량차이를완화하지만동일페이지를보장하지않는다.
- 기준은기본글씨만사용한다. 독자확대후실제표시가4줄/7줄이되어도같은페이지문장을그대로보여주고패널높이만늘린다. 글씨를몰래작게만들거나재분할하지않는다.
- 1–2줄대사도자연스럽게끝내고최대3/5줄을채우라고안내하지않는다. 화자변경·감정전환은작가가원고컷으로나누며기기쪽자동분할과구분한다.
- 다음비교는짧은대사·정확상한·초과해설·Enter/빈줄·선택지를동일원고로가로3/4와세로5/6에서관찰한다. 페이지수·본문실제크기·가려지는인물영역·진행횟수를함께비교한다. 이번조사로제품코드는변경하지않는다.
