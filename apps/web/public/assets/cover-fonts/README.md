# 놀스토리 표지용 무료 글꼴

원본: Google Fonts commit `9710da1eacb3be272583c3224dcb70f9da6eadbb`.
- https://github.com/google/fonts/tree/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/jua
- https://github.com/google/fonts/tree/9710da1eacb3be272583c3224dcb70f9da6eadbb/ofl/nanumpenscript

주아·손글씨 글꼴의 SIL OFL 1.1 고지 문구를 그대로 동봉한다(저장소 공백 검사에 맞춰 줄 끝 공백만 정리). 원본 TTF를 FontTools 4.60.2/WOFF2로 변환했다. 변환 과정에서 서명 테이블이 제거되므로 무수정 재포장이라고 주장하지 않는다. 나눔손글씨의 Reserved Font Name 조건에 따라 변환본의 내부 family/full/PostScript/unique 이름을 **Knol Story Pen**으로 변경했다. 원본 저작권 고지는 그대로 유지했다. cmap·글자 폭(hmtx)·변환본 이름(name) 테이블을 저장 전후 동일하게 확인했다. 글자/서브셋을 삭제하거나 글꼴 디자인을 변경하지 않았다. 앱 의존성 추가 없이 임시 변환 도구만 사용했다. 서비스는 정적 WOFF2를 선택된 글꼴에 사용하고 브라우저 캐시를 재사용한다. Google Fonts에 런타임 요청하지 않는다.

- 참고: https://openfontlicense.org/ofl-faq/ (2.2 웹 포맷 변환, 3.1 Reserved Font Name). 외부 장식/이미지/유료 폰트는 복사하지 않는다.

## 기본 명조·고딕도 OFL

같은 Google Fonts 고정 커밋의 `ofl/notoserifkr/NotoSerifKR[wght].ttf` 및 `ofl/notosanskr/NotoSansKR[wght].ttf`에서 변환했다. 각 OFL 원문을 함께 보관한다. 원본 저작권 고지는 유지하고 변환본 이름을 Knol Story Serif / Knol Story Sans로 구분했다. FontTools 4.60.2로 한글 완성형 11,172자·자모·기본 라틴·주요 문장부호를 남겨 용량을 줄였다. 원본의 한자/일부 외국 문자 등은 기기 fallback으로 표시된다. 모든 한글 완성형 포함과 남긴 문자의 원본 글자 폭을 확인한다. 서브셋은 Noto 계열에만 적용하며 주아/손글씨는 전체 문자 범위를 유지한다. 글꼴은 작품 JSON이나 공유 HTML에 바이너리로 넣지 않으며 공유 HTML도 같은 정적 주소를 참조한다.

- `Jua-Regular-cb995145.woff2`: 368,996 bytes; SHA-256 `cb995145eb03afc3ca5d714471d2183f58d56ed571001321e109170b421abcda`.

- `KnolStoryPen-Regular-d252740c.woff2`: 615,588 bytes; SHA-256 `d252740ccd0b3b52da84da532b7f668d85ddfc0f30dc2f07b8f47e824cd28a76`.

- `KnolStorySerif-b1c57b68.woff2`: 2,254,584 bytes; SHA-256 `b1c57b6813615f5638e1c24677589c0a3f15cc50cb03d25a6f38f983f988c83c`.

- `KnolStorySans-b75e6866.woff2`: 1,306,132 bytes; SHA-256 `b75e68666c22b6947beb56226d6183346e62065aa40bc917364aa6f4302778c4`.

배포 파일명에 SHA-256 앞 8자를 넣어 변경 시 URL이 달라지게 했다. Cloudflare 정적 응답에는 `public/_headers`로 이 폴더에 1년 immutable 캐시를 지정한다. 개발 서버/다른 호스트의 캐시 동작과 실제 배포 응답은 별도이며 아직 운영 배포하지 않았다. 네 파일 전체는 약 4.55MB이고 선택해서 사용한 글꼴만 요청한다. 디자인 갤러리를 열면 네 글꼴이 모두 쓰일 수 있다.
