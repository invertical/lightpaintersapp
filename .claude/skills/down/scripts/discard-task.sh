#!/usr/bin/env bash
# /down --discard: abandon an Emdash task. No checks, no commit, no merge.
#
#   discard-task.sh [<worktree-path>]          # show what would be lost; change nothing
#   discard-task.sh [<worktree-path>] --yes    # tear the task down
#
# Without --yes it lists the uncommitted changes and the commits not in main,
# so the /down skill can ask Dan to confirm. With --yes it runs the same
# teardown /down runs after a merge (../../up/scripts/emdash-teardown.sh). It
# never deletes the branch or the folder and never discards the changes itself
# -- Dan's delete in Emdash, with "worktree" and "branch" checked, does that.
set -euo pipefail

UP="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../up/scripts" && pwd -P)"
# shellcheck source=../../up/scripts/emdash-common.sh
. "$UP/emdash-common.sh"
ROOT="$EMD_ROOT"
BASE=main
die() { emd_die "$@"; }
say() { emd_say "$@"; }

YES=0 ARG=""
for a in "$@"; do
  case "$a" in
    --yes|-y) YES=1 ;;
    -*)       die "unknown flag: $a" ;;
    *)        ARG="$a" ;;
  esac
done

emd_resolve_wt "$ARG" || die "no worktree: pass its path, or run inside it"
[[ -d "$WT" ]] || die "$WT does not exist"
[[ "$WT" != "$ROOT" ]] || die "this is the root checkout -- run /down --discard inside a task worktree"
git -C "$ROOT" worktree list --porcelain | grep -qx "worktree $WT" \
  || die "$WT is not a registered git worktree of $ROOT"
BRANCH="$(git -C "$WT" branch --show-current)"
[[ "$BRANCH" != "$BASE" ]] || die "refusing: $WT has $BASE checked out"
emd_identity
[[ -z "$ENV_NOTE" || $ENV_CONFLICT == 1 ]] || echo "  note: $ENV_NOTE"
(( ! ENV_CONFLICT )) || die "task identity disagrees: $ENV_NOTE -- refusing. Check which task this worktree belongs to."

if (( ! YES )); then
  DIRTY="$(git -C "$WT" status --porcelain)"
  COMMITS="$(git -C "$WT" log --oneline "$BASE..HEAD")"
  say "discarding task $NAME (branch ${BRANCH:-detached}) would lose:"
  echo "  uncommitted changes:"
  if [[ -n "$DIRTY" ]]; then
    echo "$DIRTY" | sed 's/^/    /'
    git -C "$WT" diff --stat HEAD | tail -1 | sed 's/^/    /'
  else
    echo "    none"
  fi
  echo "  commits not in $BASE:"
  if [[ -n "$COMMITS" ]]; then echo "$COMMITS" | sed 's/^/    /'; else echo "    none"; fi
  echo
  echo "Nothing changed. Confirm, then run with --yes."
  exit 0
fi

"$UP/emdash-teardown.sh" "$WT"
echo
echo "Task $NAME discarded (not merged). Port $EMD_PORT is free."
echo "Next: DELETE task $NAME in Emdash with \"worktree\" and \"branch\" checked."
