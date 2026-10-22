#!/usr/bin/env bash
# The app's full check suite: lint, typecheck, expo-doctor.
# Shared by /wtdown, which runs it twice — in the worktree before the merge, and
# in the root checkout after it. Owned by neither, which is why it lives in lib/.
#
#   run-checks.sh <dir>
#
# There is no test runner in this app (no Jest, no Playwright), so these three
# ARE the suite. AGENTS.md already requires lint + tsc before any task is done;
# expo-doctor was added for dependency health (it needs the network).
#
# Every check runs even after one fails, so a single run shows all of them.
# Exit status is non-zero if ANY failed.
set -uo pipefail

DIR="${1:?usage: run-checks.sh <dir>}"
cd "$DIR" || { echo "run-checks: no such directory: $DIR" >&2; exit 2; }

declare -a NAMES=(lint typecheck expo-doctor)
declare -a CMDS=("npx expo lint" "npx tsc --noEmit" "npx --yes expo-doctor")
declare -a RESULTS=()
FAILED=0

for i in "${!NAMES[@]}"; do
  echo "── ${NAMES[$i]}: ${CMDS[$i]}  (in $DIR)"
  if ${CMDS[$i]}; then
    RESULTS+=("PASS  ${NAMES[$i]}")
  else
    RESULTS+=("FAIL  ${NAMES[$i]}")
    FAILED=1
  fi
done

echo
echo "checks in $DIR"
printf '  %s\n' "${RESULTS[@]}"
exit "$FAILED"
