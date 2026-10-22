#!/usr/bin/env bash
# Undo what emdash-setup.sh created for one task: take its dev server's compose
# stack down (`docker compose -p lightpaintersapp-<task> down -v`), remove the
# copied .claude/settings.local.json and node_modules from the worktree, and
# drop its state dir outside the worktree.
#
# Called by /down after a successful merge, by /down --discard after Dan
# confirms, and by .emdash.json's scripts.teardown (Emdash's archive -- this
# workflow deletes tasks instead, which runs NO teardown; /sweep and the next
# setup catch what that leaves behind).
#
# It does NOT merge, delete the branch or remove the folder -- Dan deletes the
# task in Emdash with "worktree" and "branch" checked. Safe to run twice, and
# safe when the folder is already gone.
#
#   emdash-teardown.sh [<worktree-path>]
#
# Identity: see emdash-common.sh -- argument or cwd before EMDASH_TASK_PATH;
# the task name from the folder.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=emdash-common.sh
. "$HERE/emdash-common.sh"
ROOT="$EMD_ROOT"
die() { emd_die "$@"; }
say() { emd_say "$@"; }

emd_resolve_wt "${1:-}" || die "no worktree path: pass one, or run inside the worktree"
[[ "$WT" != "$ROOT" ]] || die "refusing: $WT is the root checkout"
emd_identity
[[ -z "$ENV_NOTE" ]] || echo "  note: $ENV_NOTE"
STATE="$(emd_state_dir "$NAME")"
PROJECT="$(cat "$STATE/project" 2>/dev/null || emd_project "$NAME")"

# ------------------------------------------------------------ 1. the server
# Only this task's compose project -- never the root's lightpaintersapp on
# 8011, never another worktree's.
say "stopping task $NAME's dev server on port $EMD_PORT (docker compose -p $PROJECT down -v)"
if emd_stop_server "$PROJECT"; then echo "  stopped"; else echo "  none running"; fi

# ------------------------------------------------------------ 2. the files
if [[ -d "$WT" ]]; then
  # Removed only while identical to the root's copy, i.e. what setup copied in:
  # permissions Claude added during the task are kept.
  SETL="$WT/.claude/settings.local.json"
  if [[ -f "$SETL" ]] && cmp -s "$SETL" "$ROOT/.claude/settings.local.json"; then
    rm -f "$SETL"; echo "  removed .claude/settings.local.json"
  elif [[ -e "$SETL" ]]; then
    echo "  kept .claude/settings.local.json -- it differs from the root's copy"
  fi
  if [[ -d "$WT/node_modules" ]]; then
    rm -rf "$WT/node_modules"; echo "  removed node_modules"
  fi
else
  echo "  $WT is gone -- no files to remove"
fi

# ------------------------------------------------------------ 3. the state dir
if [[ -d "$STATE" ]]; then
  rm -rf "$STATE"; echo "  removed $STATE"
fi

say "task $NAME torn down -- the folder and branch are left for Emdash's delete"
