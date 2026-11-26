#!/usr/bin/env bash
# Create a KnolStory worktree under KNOL_DEV_ROOT (the external dev disk), copy the git-ignored media
# it needs, and install dependencies there. See .agents/skills/dev-disk/SKILL.md.
#
#   scripts/dev-worktree.sh <name> [--branch <branch>] [--base <ref>] [--media-from <checkout>] [--no-install]
#
# <name>      folder suffix: the worktree becomes $KNOL_DEV_ROOT/new-knolstory-<name>
# --branch    new branch name (default: <name>); an existing branch is checked out instead
# --base      start point for a new branch (default: origin/main, fetched first)
# --media-from checkout to copy ignored media from (default: the checkout this script runs in)
set -euo pipefail

usage() { sed -n '5,10p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }
[[ $# -ge 1 && $1 != -* ]] || usage
name=$1; shift
branch=$name base=origin/main install=1
here=$(git rev-parse --show-toplevel)
media_from=$here
while [[ $# -gt 0 ]]; do
  case $1 in
    --branch) branch=$2; shift 2 ;;
    --base) base=$2; shift 2 ;;
    --media-from) media_from=$2; shift 2 ;;
    --no-install) install=0; shift ;;
    *) usage ;;
  esac
done

root=${KNOL_DEV_ROOT:?KNOL_DEV_ROOT is not set. Set it to the dev folder on the external disk (ADR 0012).}
[[ -d $root ]] || { echo "KNOL_DEV_ROOT ($root) does not exist. Is the external disk mounted?" >&2; exit 1; }
min=${KNOL_DISK_MIN_FREE_GB:-25}
free_gb=$(df -k "$root" | awk 'NR==2{print int($4/1048576)}')
(( free_gb >= min )) || { echo "Only ${free_gb}GB free on $root (minimum ${min}GB)." >&2; exit 1; }

target=$root/new-knolstory-$name
[[ ! -e $target ]] || { echo "$target already exists." >&2; exit 1; }

if git -C "$here" show-ref --verify --quiet "refs/heads/$branch"; then
  git -C "$here" worktree add "$target" "$branch"
else
  [[ $base == origin/* ]] && git -C "$here" fetch --quiet origin "${base#origin/}"
  git -C "$here" worktree add -b "$branch" "$target" "$base"
fi

# Git-ignored media the web app and the Ren'Py spike need. Copied, not linked: a runtime rebuild in one
# worktree must not change another, and links back to the internal disk would keep the data there.
media=$(git -C "$media_from" ls-files --others --ignored --exclude-standard --directory \
  -- apps/web/public renpy/responsive-spike/game/assets || true)
if [[ -n $media ]]; then
  while IFS= read -r path; do
    path=${path%/}
    mkdir -p "$target/$(dirname "$path")"
    rsync -a "$media_from/$path" "$target/$(dirname "$path")/"
  done <<< "$media"
  echo "Copied ignored media from $media_from:"; echo "$media" | sed 's/^/  /'
else
  echo "No ignored media found in $media_from; run pnpm env:prepare in the new worktree if it needs media."
fi

if (( install )); then
  (cd "$target" && pnpm install --frozen-lockfile)
  [[ -f $target/server/package.json ]] && (cd "$target/server" && pnpm install --ignore-workspace --frozen-lockfile)
fi

echo
echo "Worktree ready: $target (branch $branch)"
echo "Playwright output goes to \$KNOL_TEST_OUTPUT_ROOT when it is set."
