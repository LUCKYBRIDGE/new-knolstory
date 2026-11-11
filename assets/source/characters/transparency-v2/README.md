# 투명 배경 교체 원본

2026-11-11에 프로젝트 소유자가 생성·교체·GitHub 업로드를 요청한 흥부와 놀부 인물의 원본 PNG다. 이 원본과 실행 WebP를 함께 Git으로 보관한다. PNG를 실행 최적화 파일로 덮어쓰지 않는다.

[생성·원본/실행 해시와 변환 기록](../../../../docs/architecture/evidence/transparency-repair-2026-11-11/generation.json), [결함·교체·개발 재개 기록](../../../../docs/architecture/evidence/transparency-repair-2026-11-11/review.md)을 따른다. 기존 놀스토리 서비스 사용 범위를 유지하며 CC0/무제한 제3자 자료실 허가가 아니다.

```sh
python3 scripts/prepare-transparency-assets.py
# 실행 WebP가 없는 경우에만 Git 원본 PNG에서 복원한다.
python3 scripts/prepare-transparency-assets.py --restore
```

명령은 저장소 루트에서 실행한다. 수정된 기존 파일은 덮어쓰지 않는다.
