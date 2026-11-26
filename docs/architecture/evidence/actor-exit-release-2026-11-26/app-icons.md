# 홈 화면 앱 아이콘 출처 (2026-11-26)

`apps/web/public/app-icons/`의 다섯 아이콘(`apple-touch-icon.png`, `favicon-48.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png`)은 커밋 `9d5357c5`(2026-11-23, 홈 화면 앱으로 추가)에서 들어왔다.

- 원본: `apps/web/public/assets/legacy-ui/knolstory-outline.png`(놀스토리 로고, sha256 `27b28f6b…`, story-maker `18da4fc`의 `public/brand/knolstory-outline-256.png`). 이 로고는 이미 프로젝트 소유자 서비스 사용 권한(`project-media-authorization.json`) 안에 있다.
- 만든 방법: 로고의 알파 채널만 가져와 금색(`#a98046`)으로 칠하고, 종이색(`#fbf5e9`) 정사각형 위에 가운데 놓은 뒤 크기를 바꿨다(Pillow, LANCZOS). 새로 그린 그림이나 외부 자료는 없다.
- 배포 전 정적 전달 검사가 이 다섯 파일을 `unverified-media-rights`로 막아서, 위 출처를 근거로 `derived-project` 항목으로 올렸다.
