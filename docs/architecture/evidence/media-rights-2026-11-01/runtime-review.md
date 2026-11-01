# Ren’Py 실행 패키지의 출처·고지 대조

2026-11-02. [고정 실행 검토 명세](runtime-review.json)는 현재 서비스의 정확한 실행 파일 bytes에 대한 기술적 출처 감사다. SDK 자료에 프로젝트 이미지의 소유자 허가를 적용하지 않는다. 새로운 빌드나 파일 변경은 이 명세를 재생성·검토해야 하며, 앞으로 생성될 실행 파일을 자동 승인하는 기록이 아니다.

## 고정 원본과 고지

[준비 코드](../../../../scripts/prepare-runtime.py)의 공식 Ren’Py 8.5.3 SDK/Web 다운로드 URL·SHA를 로컬 아카이브와 대조했다. SDK 아카이브 SHA는 `eb0a9be7f0fb13632fe25ceade9a8bed5a1b4d6b6e83bd19eeeb29e1a1bb4a45`, Web 아카이브 SHA는 `954db897e65f51ea63cb2fb7b203d02be0447f4e22069514020bbe6c6691fdfc`로 일치한다. 설치 마커에 기록된 관련 원본 SHA와도 일치한다.

현재 `runtime/renpy.wasm`과 `runtime/renpy.data`는 SDK `web/`의 원본과 바이트 단위로 일치한다. 두 `.br` 전달 사본은 Node의 Brotli 해제로 원본 bytes와 다시 대조했다. 따라서 별도 압축 사본을 새 출처 불명 실행 파일로 취급할 이유는 없지만 원본 변경이나 해제 결과 불일치는 다시 차단해야 한다.

`game.zip`의 `renpy/LICENSE.txt`는 SDK 루트의 full license와 101,413바이트 전체가 같으며 SHA는 `b5d4610dfb530c53d5ce681e913f313903948616eb7b4ff8e8ddd19337852c1e`다. 이 고지에는 MIT·LGPL 및 포함 라이브러리의 조건과 소스 저장소 URL이 포함된다. 프로젝트가 사용한 Noto OFL도 ZIP에 보존되어 있다. SDK의 DejaVu Sans·Twemoji·OpenDyslexic·Quicksand 여섯 폰트 파일과 각각의 TXT/OFL 고지도 ZIP에 보존되고 SDK 원본과 일치한다.

[공식 라이선스 안내](https://www.renpy.org/doc/html/license.html) 및 고정 SDK의 라이선스 문구는 배포물의 고지 사본과 프로젝트 README/설명의 라이선스 링크를 권고한다. 별도 공개 고지 경로 `apps/web/public/licenses/RenPy-8.5.3-LICENSE.txt`의 필수 SHA를 명세에 넣었다. 이 경로의 사본 작성·배포 연결은 부모 구현이 담당하고, 파일 존재만으로 명세 자체가 자동 승인되지는 않는다.

## game.zip 전체 항목

총 1,076항목을 빠짐없이 분류했다. `archiveMembers`에는 각 항목 이름·bytes·SHA·분류와 대조한 원본의 상대 경로·SHA가 있다.

| 분류 | 항목 수 | 대조 방법 |
|---|---:|---|
| 디렉터리 | 45 | 파일 본문이 없는 ZIP 디렉터리 |
| 프로젝트 원본 | 62 | 현재 `renpy/responsive-spike/` 파일과 정확히 일치 |
| SDK 빌드 메타데이터 | 2 | SDK `tmp/responsive-spike/`의 `build_info.json`·`script_version.txt`와 일치 |
| 루트 실행 스크립트 | 2 | `main.py`·`knolstory-spike.py` 모두 SDK `renpy.py`와 일치 |
| SDK 원본 | 366 | SDK 파일과 일치. `renpy/LICENSE.txt`는 SDK 루트 라이선스와 대응 |
| SDK Python 바이트코드 | 166 | 설치 SDK `__pycache__/*.cpython-312.pyc`와 일치 |
| 이미지 placeholder | 432 | 아래 입력·생성 경로 확인 |
| progressive remote index | 1 | SDK progressive 빌드가 생성하는 `game/renpyweb_remote_files.txt` |
| **합계** | **1,076** | **미분류 항목 0** |

프로젝트 `.rpyc`와 cache는 현재 프로젝트의 실제 컴파일 산출물과 일치한다. 이는 다른 컴퓨터에서 바이트가 같은 컴파일을 재현했다는 뜻은 아니다. SDK Python 바이트코드는 설치 SDK의 실제 Python 3.12 캐시와 166개 모두 바이트가 같았다.

## placeholder와 SDK 그림

`_placeholders/`의 432개는 SDK의 1/32 PNG 생성 및 [64색 최적화](../../../../spikes/renpy-web/placeholders.py)를 거친 파생물이다. 이 중430개는 [프로젝트 서비스 허가](../../../../packages/asset-registry/src/project-media-authorization.json)의 정확한 입력 파일 경로·SHA와 연결된다. 남은2개는 `effects/crack.svg`·`effects/spotlight.svg`이며 [직접 작성 CC0 선언](../../../../renpy/responsive-spike/game/effects/README.md)과 현재 SVG 원본이 연결된다. 입력별 허가 참조는 각 명세 항목에 기록했다. 432개 placeholder 출력을 독립적으로 다시 생성해 SHA를 대조한 것은 아니다.

SDK 기본 presplash 한 개는 SDK `web/web-presplash.jpg`와 bytes가 같다. PWA 아이콘16개는 SDK `launcher/game/web.rpy`의 `generate_web_icons()`에서 기본 `web/web-icon.png`를 여러 크기와 maskable로 만드는 경로다. 프로젝트에 별도 `web-icon.png`가 없으며 현재512px 아이콘의 픽셀은 SDK 원본과 같다. 모든16개 출력을 독립 재생성한 것은 아니므로 명세의 `independentlyRegenerated`는 false다. 기본 아이콘·presplash를 프로젝트 소유 이미지 또는 CC0로 재표시하지 않는다.

## 적용 경계

이 감사는 정확한 현재 파일과 원본·생성 코드·고지의 기술적 연결이다. 각 상위 라이브러리·폰트의 법률 검토를 독립적으로 모두 수행했다는 뜻은 아니다. 서비스 승인 기록을 원본 자산 라이브러리의 무제한 제3자 재배포 허가로 확대하지 않는다. SDK 고지 누락·실행 파일/ZIP 멤버·허가된 입력의 SHA 변경은 새 검토가 필요하다. 구현·검사·실제 배포 상태는 부모 작업의 체크포인트가 소유한다.
