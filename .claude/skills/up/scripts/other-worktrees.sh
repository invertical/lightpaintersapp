#!/usr/bin/env bash
# Print every OTHER worktree of lightpaintersapp, one per line as
#   <name>  <path>
# where <name> is its branch (or folder, if detached). Empty output = none.
# Shared by emdash-setup.sh and emdash-run.sh for the one-worktree-at-a-time
# rule: /wtup and Emdash both serve on 8012, so either kind blocks the other.
#
#   other-worktrees.sh <root> [<self-path>]
#
# Sources, de-duplicated by real path:
#   1. `git worktree list` of the root -- every registered worktree, wherever it
#      lives: /wtup's /var/www/app-worktrees/<name>, Emdash's
#      /var/www/emdash-worktrees/<project>-<hash>/emdash-<task>-<random>.
#   Registered worktrees whose folder no longer exists are skipped.
#   2. folders in those two pools whose .git file points into this repo, even if
#      git has lost track of them (pruned metadata, half-finished archive).
#      No assumption about depth: the Emdash pool is searched to depth 3.
set -uo pipefail

ROOT="$(cd "${1:?usage: other-worktrees.sh <root> [<self-path>]}" && pwd -P)"
SELF="${2:-}"
[[ -n "$SELF" && -d "$SELF" ]] && SELF="$(cd "$SELF" && pwd -P)"
COMMON="$(cd "$ROOT" && cd "$(git rev-parse --git-common-dir)" && pwd -P)"
POOLS=(/var/www/app-worktrees /var/www/emdash-worktrees)

{
  git -C "$ROOT" worktree list --porcelain | sed -n 's/^worktree //p'
  for pool in "${POOLS[@]}"; do
    [[ -d "$pool" ]] || continue
    find "$pool" -mindepth 2 -maxdepth 4 -name .git -type f 2>/dev/null | while read -r g; do
      # .git file: "gitdir: <common>/worktrees/<id>"
      gd="$(sed -n 's/^gitdir: //p' "$g" 2>/dev/null)"
      [[ "$gd" == "$COMMON"/worktrees/* ]] && dirname "$g"
    done
  done
} | while read -r p; do
  # A registered worktree whose folder is gone (deleted without `git worktree
  # remove`) cannot serve anything; it is not counted. /sweep reports it.
  [[ -d "$p" ]] && (cd "$p" && pwd -P)
done | sort -u | while read -r p; do
  [[ "$p" == "$ROOT" || "$p" == "$SELF" ]] && continue
  name="$(git -C "$p" branch --show-current 2>/dev/null || true)"
  printf '%s  %s\n' "${name:-$(basename "$p")}" "$p"
done
exit 0
exit 0
exit 0
