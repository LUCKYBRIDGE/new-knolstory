# 검토와 수정 기록

- 공식 archive25MB와 편집UI20MB 한도 불일치: UI를25MB에 맞춰 수정.
- 편집 deep link에서 내장 작품 ID가 유지될 수 있는 경로: independentImportedWork로 기존작품/기본작품 충돌 시 새 ID 발급. 승인된 사본 적용은 중복거부를 다시 거치지 않음. 제목/장/컷/원고는 그대로 보존.
- union 타입 오류에서 undefined 분기를 먼저 골라 nested unknown 필드 경로를 잃던 진단: 실제입력 타입에 맞는 대안을 우선 검사. futureMotion 경로 RED→GREEN.
- 실제 Googlexlsx 반출의 빈후행열: 빈후행헤더만 정리하고 실제 작성한 알수없는셀은 여전히거부. 실제파일import 비교 통과.
- 확인전환에서 긴설명과 낮은가로무대의 확인버튼잘림: 실제Ren’Py재생 검증에서 재현, RuntimeScene 크기로 native 화면을 배치하고 설명/긴 버튼 문구를 스크롤하도록 수정. 원고/설정은 바꾸지 않음. 최종 native 4개 검사 통과(native-format-final.log).
- 전체 회귀의 일부 freshcontext주소가3000고정: 현재시험origin을 사용하도록 변경. 형식기능실패와시험주소결함을 구분하고 rerun 필요.

- 유효한 메모의 자유 인물 이름·미해결 장/컷 연결을 workbook이 거부하던 문제: 도메인의 보존/미해결 표시 의미에 맞추어 존재 목록 제약만 제거. owner/타입/종류/순서 검증 유지, 공식 archive/workbook/xlsx 정확한 왕복 RED→GREEN.
- 기존 Next plain v5의 중복 좌우 Asset ID와 StageComposition 불일치: plain 읽기 adapter에서 파생 필드만 정렬. 공식v2 엄격 검증 유지.
- 긴 실제 선녀 원고의 coverage 병렬 실행5초 timeout: 내용 비교는 유지하고 해당12작품 왕복 검사만20초로 조정. 최종980검사 통과.
- 최초 전체host 구도검사의 자산 배치 초기 준비5초 timeout: 최초 핸들 준비만20초로 기다리고 나머지 배치/파일 보존 assertions 유지. 별도 재검사 통과.

- JSON 동일 항목명(Unicode escape 포함)의 앞 값이 조용히 덮어써지는 경계: 공식 읽기에서 중복 항목명을 거부하도록 RED→GREEN.
- JSONB 입력의 NUL/잘못된 Unicode와 JSON 파일 허용 범위 차이: PostgreSQL 공식 문서 대조 후 snapshot 준비 단계에서 경로별 거부. 원본 문서 보존/정상 한국어·이모지/객체 key 순서 변경 검사 통과. 실제 DB 검증으로 주장하지 않음.

- 같은 음원 ID를 재사용하는 다른 작품의 이름/종류/출처 변경이 원작 반출에 영향을 주던 문제: 작품별 metadata/순서 저장, bytes 공용 재사용. provenance 부재·미사용 첨부·사본·역순 배열까지 보존. 단위/실제 IDB 브라우저 RED→GREEN.
- 한글 열 제목만으로 내부 선택 값이 의미를 전달하지 못하던 문제: 가역적인 한글 enum, 숨겨진 내부 키, 메모·선택 목록·사용 안내·자산 참고. 실제 Excel/Google 한글 편집과 전체 의미 비교 통과.
- 숏스토리 안내에 놀스토리의 장/컷/음원이 섞이던 문제: 종류별 안내·참고 자산 분리.
- XLSX 이중 해석에 따른 긴 원고 확인 지연: 로드한 workbook을 재사용하고 확인 상태 표시.
- 구조 오류의 0행 표시와 ID 중복 위치: 실제 원본 행·한글 열 표시, 구조 오류는 구조 확인으로 안내.
- Excel 자동 URL 링크: 표시 주소와 실제 링크가 같은 일반 URL은 보존. 다르면 의미를 버리지 않고 오류.
- XML에서 손실될 수 있는 제어 문자/잘못된 Unicode: XLSX 작성 전에 위치별 오류로 거부하고 원본 유지. 정상 한국어/이모지/줄바꿈·탭은 전수 fixture로 보존.
