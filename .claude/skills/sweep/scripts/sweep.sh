#!/usr/bin/env bash
# Clean up after Emdash tasks that were deleted without a teardown: a dev
# server's compose stack (lightpaintersapp-<task>) whose worktree folder is
# gone, and per-task state dirs naming a missing worktree. Each stack goes with
# `docker compose -p lightpaintersapp-<task> down -v`. The same sweep emdash-setup.sh runs
# before it provisions a task. Called by the /sweep skill.
#
#   sweep.sh --dry-run   # list what it would stop and remove; change nothing
#   sweep.sh             # do it
#
# It never touches a stack whose worktree still exists, the root checkout's
# 8011 stack, or git: registered worktrees whose folder is gone are only
# reported (`git worktree prune` drops those records).
set -uo pipefail

UP="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../up/scripts" && pwd -P)"
# shellcheck source=../../up/scripts/emdash-common.sh
. "$UP/emdash-common.sh"
DRY=0
for a in "$@"; do
  case "$a" in
    --dry-run|-n) DRY=1 ;;
    *)            emd_die "unknown argument: $a" ;;
  esac
done

mapfile -t ORPHANS < <(emd_find_orphans)
if (( ${#ORPHANS[@]} == 0 )); then
  emd_say "no orphaned Emdash tasks"
else
  emd_say "$( (( DRY )) && echo "would clean" || echo "cleaning") ${#ORPHANS[@]} orphaned task(s):"
  for line in "${ORPHANS[@]}"; do
    IFS=$'\t' read -r task wt proj <<<"$line"
    echo "  task $task"
    echo "    worktree   $wt  (gone)"
    if [[ -n "$proj" ]]; then echo "    server     compose project $proj -- docker compose -p $proj down -v"
    else echo "    server     none left"; fi
    [[ "$task" != "(no state)" ]] && echo "    state dir  $(emd_state_dir "$task")  -- remove"
    (( DRY )) || emd_clean_orphan "$task" "$wt" "$proj"
  done
fi

STALE="$(git -C "$EMD_ROOT" worktree list --porcelain | sed -n 's/^worktree //p' \
  | while read -r p; do [[ -d "$p" ]] || echo "$p"; done)"
if [[ -n "$STALE" ]]; then
  echo
  echo "  git still registers these missing worktrees (left alone; 'git worktree prune' drops them):"
  echo "$STALE" | sed 's/^/    /'
fi

echo
if emd_port_busy; then
  echo "port $EMD_PORT: in use"
  emd_describe_port
else
  echo "port $EMD_PORT: free"
fi
(( DRY )) && echo "dry run -- nothing changed"
exit 0
