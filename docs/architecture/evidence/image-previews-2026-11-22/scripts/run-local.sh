#!/bin/zsh
# Usage: run-local.sh <label> <static-candidate-dir>   (run from the repository root; stop other servers on :3000 first)
set -eu
label=$1; candidate=$2; here=${0:A:h}; out=${OUT:-$here/..}
python3 scripts/serve-static-candidate.py --candidate "$candidate" --port 3000 > "$out/server-$label.log" 2>&1 &
pid=$!
for i in {1..60}; do curl -sf http://127.0.0.1:3000/ >/dev/null && break; sleep 1; done
for f in measure editor thumbs; do BASE=http://127.0.0.1:3000 node "$here/$f.mjs" > "$out/local-$label-$f.json"; done
kill $pid; wait $pid 2>/dev/null || true
