#!/usr/bin/env bash
set -euo pipefail

# Whole spec files are fine when they exercise public-checkout behavior.
# Pick specific journeys from mixed suites that also contain native/media tests.
suite='(^|/)(classroom|editing-workbench|shortstory|four-work-shortstory|accessibility|editor-term-guide)\.spec\.ts$'
titles=(
  'teacher builds a class'
  'a student submits a picture book while image changes are restricted'
  'a teacher opening the student screen can log out'
  'several cut texts edit directly'
  'background workbench updates separate cuts'
  'popup audit: import confirmation traps focus'
  'popup audit: ShortStory delete cancel'
  'popup audit: corrupt ShortStory recovery'
  'ShortStory edits static pages'
  'ShortStory pictures and Excel survive'
  'reading a picture book on a phone'
  'original copy, three-face cover'
  '(rabbit|onggojib|seonnyeo|heungbu) personal picture book copy'
  'bookshelf drawer exposes its existing label'
  'guide preserves author drafts'
  'ShortStory guide leaves edited page text untouched'
  'current vocabulary distinguishes work files'
  'authoring labels distinguish file save'
)
grep_pattern=$(IFS='|'; printf '(%s)' "${titles[*]}")
PLAYWRIGHT_HTML_OUTPUT_DIR=playwright-report/host \
PLAYWRIGHT_JSON_OUTPUT_FILE=test-results/host-summary.json \
  pnpm exec playwright test --project=host "$suite" --grep "$grep_pattern" \
    --workers=2 --global-timeout=420000 --reporter=line,html,json --output=test-results/host
