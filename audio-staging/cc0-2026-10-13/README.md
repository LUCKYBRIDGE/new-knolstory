# CC0 음원 병합 대기 자료 — 2026-10-13

이 폴더는 다른 개발 로컬에서 검토하고 필요한 음원만 도입하기 위한 독립 확보본이다. 앱 실행 코드·Asset Registry·StoryDocument·Ren'Py 설정에는 연결하지 않았다. 기존 개발 브랜치에 바로 전체 병합하거나 저장소 루트에 ZIP을 풀지 않는다.

## 어디에 무엇이 있는가

- **별도 브랜치:** `chore/cc0-audio-staging-2026-10-13`. 이 브랜치의 변경은 `audio-staging/cc0-2026-10-13/`에만 있다.
- **문서·메타데이터·출처 증거·도구:** 이 폴더에서 GitHub로 검토할 수 있다. 원본·재생본 바이너리는 Git에 넣지 않았다.
- **490개 음원과 동일한 문서 전체:** [병합 대기 Release](https://github.com/LUCKYBRIDGE/new-knolstory/releases/tag/audio-cc0-staging-2026-10-13-v1)의 ZIP. 서비스 배포 버전이 아니라 에셋 보관용 prerelease다.
- **무결성:** [bundle.manifest.json](bundle.manifest.json)의 ZIP 크기·SHA-256과 대조한다. 39개 배포 자료·490개 고유 파일, 동일 바이트 별칭 2개 포함. ZIP은 원본·재생본·증거를 함께 보관한다.
- **공개본 정제:** Freesound HTML의 사이트 측 Mapbox 토큰은 공개본에서 제거했다. [정제 기록](assets/metadata/audio/publication-redactions.json)의 원문·공개본 해시로 증거를 대조한다. 최초 원문은 로컬 보존이며 음원·라이선스 항목은 그대로다.

## 먼저 읽을 문서

1. [CC0·CC BY·CC BY-NC 점검](docs/assets/CC0_LICENSE_AUDIT.md) — 490개는 CC0 단독 표기. 다른 로컬의 기존 음원은 이 결론에 포함되지 않는다.
2. [음원 설명](docs/assets/CC0_AUDIO_GUIDE.md), [추후 편집용 83개](docs/assets/CC0_EDITOR_EXPANSION.md).
3. [작품별 장·컷 제안표](docs/assets/STORY_AUDIO_TABLES.md) — 고정 legacy 기준의 제안이며 현재 개발 작품에 자동 적용하지 않는다. 분위기가 이어지는 여러 컷·장에서는 같은 음원을 유지한다.
4. [확보본 구조와 도구 안내](assets/CC0_AUDIO_README.md), [인수인계](docs/handoffs/2026-10-13-cc0-audio-merge.md).

## 다른 로컬에서 안전하게 받기

현재 개발 체크아웃을 전환하거나 수정할 필요 없이 Release에서 별도 폴더에 받는다. GitHub CLI와 Python 3.11 이상을 사용한다. 이미 같은 경로가 있으면 새 경로를 선택한다.

```powershell
$audioImportRoot = Join-Path $env:USERPROFILE 'Downloads\knolstory-audio-2026-10-13'
if (Test-Path -LiteralPath $audioImportRoot) { throw '기존 폴더가 있습니다. 새 수납 경로를 선택하세요.' }
New-Item -ItemType Directory -Path $audioImportRoot | Out-Null
gh release download audio-cc0-staging-2026-10-13-v1 --repo LUCKYBRIDGE/new-knolstory --dir $audioImportRoot
if ($LASTEXITCODE -ne 0) { throw 'Release 다운로드 실패' }
$audioManifest = Get-Content -Raw -LiteralPath (Join-Path $audioImportRoot 'new-knolstory-cc0-audio-2026-10-13.manifest.json') | ConvertFrom-Json
$audioZip = Join-Path $audioImportRoot $audioManifest.filename
if ((Get-Item -LiteralPath $audioZip).Length -ne $audioManifest.bytes) { throw 'ZIP 크기 불일치' }
if ((Get-FileHash -LiteralPath $audioZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $audioManifest.sha256) { throw 'ZIP SHA-256 불일치' }
$audioPackageRoot = Join-Path $audioImportRoot 'package'
Expand-Archive -LiteralPath $audioZip -DestinationPath $audioPackageRoot
python (Join-Path $audioPackageRoot 'scripts\verify_cc0_audio.py')
if ($LASTEXITCODE -ne 0) { throw '확보본 검증 실패. 병합하지 마세요.' }
```

ZIP 내부의 `assets/…`, `docs/…`, `scripts/…`는 이 독립 `package` 폴더를 기준으로 한 경로다. 개발 저장소의 같은 이름 폴더에 덮어쓰는 지시가 아니다. GitHub에 있는 이 폴더만 clone하면 음원 파일은 없으므로 파일 검증·재생에는 Release ZIP이 필요하다.

## 병합은 보고서를 읽고 선택적으로 진행한다

1. 기존 개발 로컬의 미커밋 작업을 보존한 상태로 음원 폴더와 기존 Asset 목록을 준비한다.
2. 확보본의 `scripts/compare_cc0_audio.py`를 `--existing-root`, 선택적 `--existing-catalog`, `--output`으로 실행한다. 아래 자리표시자는 실제 경로로 교체한다. 이 도구는 비교 보고서만 작성하며 기존 음원·목록을 수정하지 않는다.

   ```powershell
   python (Join-Path $audioPackageRoot 'scripts\compare_cc0_audio.py') --existing-root '<기존 음원 루트>' --existing-catalog '<기존 JSON 목록>' --output (Join-Path $audioImportRoot 'existing-audio-comparison.json')
   ```

3. 동일 바이트는 기존 ID를 우선 보존하고 새 ID의 별칭 연결을 검토한다. 같은 파일명만으로 중복 삭제하지 않는다. 포맷·편집이 다른 같은 곡은 별도 청취·비교가 필요하다. 기존 음원에 CC0 권리를 덮어씌우지 않는다.
4. 필요한 신규 음원의 `audio.cc0.<pack>.<slug>` ID와 `revision: 1`, 원본·재생본 해시·증거를 유지하면서 실제 Asset Registry 스키마에 명시적으로 매핑한다. 확보용 JSON을 기존 Registry 파일 위에 복사하지 않는다.
5. 실제 개발 브랜치에서 별도 통합 변경으로 반영한다. 이 브랜치·ZIP·공용 상태 문서·스크립트를 통째로 덮어쓰지 않는다. 기존 작품·Flow·StageComposition은 그대로 두고 필요한 참조만 별도로 검토한다.
6. 전체 청취·반복 연결부·음량·대사 간섭·Ren'Py Web 채널 동작은 아직 미확인이다. 작품별 표는 적용 후보다. 적절한 효과음이 없으면 빈칸을 유지한다.

## 미리 듣기

ZIP의 `package` 폴더에서 `python -m http.server 8766 --bind 127.0.0.1`을 실행하고 `http://127.0.0.1:8766/assets/audio-preview.html`을 연다. 배경음·환경음 동시 비교용 수납 도구이며 서비스의 공식 플레이어가 아니다.

이 확보본과 main의 관계는 검토용 draft PR에 기록한다. main에 자동 병합하지 않고 다른 로컬의 기존 개발 흐름과 실제 파일을 확인한 뒤 통합한다.
