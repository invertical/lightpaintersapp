#!/usr/bin/env bash
# Provision a lightpaintersapp worktree that EMDASH created and bring its dev
# server up on 8012: orphan sweep, the one-at-a-time gate, Claude's local
# settings, deps, server, port report.
# The Emdash-side twin of ../../wtup/scripts/new-worktree.sh, which is left
# untouched -- read its comments for the reasoning behind every step copied
# here. Deliberately absent:
#
#   git worktree add     Emdash already created the worktree.
#   root-on-main gate,   both guard the moment the branch is CUT; here the
#   staged-changes gate  branch exists before this script starts.
#   EnterWorktree, IDE,  not part of this flow.
#   window placement
#
# The server comes up here, in the background, with the repo's
# docker-compose.yml: `docker compose up -d` as project lightpaintersapp-<task>
# on EXPO_PORT=8012, so it outlives this script; its state lives OUTSIDE the
# worktree (see emdash-common.sh).
#
# Called by .emdash.json's scripts.setup on task activation, and by /up (which
# passes --restart). Non-interactive and idempotent: the settings file is
# copied only when absent, npm ci runs only when node_modules is missing or
# older than the lockfile, and a stack already running from this worktree is
# kept (restarted with --restart).
#
#   emdash-setup.sh [<worktree-path>] [--restart]
#
# Identity: see emdash-common.sh -- the worktree comes from the argument or cwd
# before EMDASH_TASK_PATH, and the task name from the folder. EMDASH_PORT is
# ignored: always 8012. Emdash nests worktrees; no folder depth is assumed.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=emdash-common.sh
. "$HERE/emdash-common.sh"
ROOT="$EMD_ROOT"
PORT="$EMD_PORT"
die() { emd_die "$@"; }
say() { emd_say "$@"; }

RESTART=0 ARG=""
for a in "$@"; do
  case "$a" in
    --restart) RESTART=1 ;;
    -*)        die "unknown flag: $a" ;;
    *)         ARG="$a" ;;
  esac
done

# ---------------------------------------------------------------- 1. preflight
emd_resolve_wt "$ARG" || die "no worktree path: pass one, or run inside the worktree"
[[ -d "$WT" ]] || die "$WT does not exist"
[[ "$WT" != "$ROOT" ]] || die "this is the root checkout, not a worktree -- it owns $EMD_ROOT_PORT and is never provisioned"
git -C "$ROOT" worktree list --porcelain | grep -qx "worktree $WT" \
  || die "$WT is not a registered git worktree of $ROOT"
BRANCH="$(git -C "$WT" branch --show-current)"
[[ -n "$BRANCH" ]] || die "$WT is on a detached HEAD; a task worktree needs its own branch"
[[ "$BRANCH" != main ]] || die "$WT has 'main' checked out; a task worktree needs its own branch"
emd_identity
[[ -z "$ENV_NOTE" ]] || echo "  note: $ENV_NOTE"
STATE="$(emd_state_dir "$NAME")"
PROJECT="$(emd_project "$NAME")"

# ------------------------------------------------------- 2. orphan sweep
# Deleting a task in Emdash runs no teardown, so its stack can still hold 8012
# with its worktree gone. Take those down, drop their state, carry on.
while IFS=$'\t' read -r o_task o_wt o_proj; do
  [[ -n "$o_task" ]] || continue
  say "orphan: task $o_task (worktree $o_wt is gone)${o_proj:+, compose project $o_proj} -- cleaning up"
  emd_clean_orphan "$o_task" "$o_wt" "$o_proj"
done < <(emd_find_orphans)

# ------------------------------------------------- 3. one worktree at a time
# /wtup's rule, widened to both kinds -- they all serve on 8012.
OTHERS="$("$HERE/other-worktrees.sh" "$ROOT" "$WT")"
if [[ -n "$OTHERS" ]]; then
  echo "$OTHERS" | sed 's/^/  /' >&2
  die "task '$NAME' refused: another lightpaintersapp worktree exists (above, branch then path) -- only one may exist at a time, since all of them serve on 8012. Finish it (/down or /down --discard, then delete its Emdash task; or /wtdown <name>) first."
fi

# ------------------------------------------------- 4. who holds 8012 now
if emd_port_busy && ! emd_server_ours "$WT"; then
  emd_describe_port >&2
  die "port $PORT is held by something other than this task's dev server (above) and it is not an orphaned Emdash stack -- stop it yourself, then re-run setup (/up)"
fi

# ---------------------------------------------- 5. Claude's local settings
# Copied only when absent: Claude may add permissions to it during the task.
SETL="$WT/.claude/settings.local.json"
if [[ ! -e "$SETL" && -f "$ROOT/.claude/settings.local.json" ]]; then
  mkdir -p "$WT/.claude"
  cp -p "$ROOT/.claude/settings.local.json" "$SETL"
  echo "  copied .claude/settings.local.json"
fi

# -------------------------------------------------------------- 6. dependencies
# npm ci, NEVER npm install -- see new-worktree.sh. The container runs expo
# from this worktree's node_modules (docker-compose.yml mounts . at /app).
if [[ ! -f "$WT/node_modules/.package-lock.json" || "$WT/package-lock.json" -nt "$WT/node_modules/.package-lock.json" ]]; then
  say "npm ci (about a minute)"
  ( cd "$WT" && npm ci --no-audit --no-fund )
else
  echo "  node_modules is current -- skipping npm ci"
fi

# --------------------------------------- 7. nothing here may dirty the worktree
# /down refuses a dirty worktree. node_modules is in the repo's .gitignore;
# .claude/settings.local.json only in Dan's global ignore. Anything not ignored
# goes in the repo's info/exclude (shared, untracked). The server's .expo/ and
# expo-env.d.ts are in .gitignore; its logs are docker's.
EXCLUDE="$(git -C "$WT" rev-parse --path-format=absolute --git-common-dir)/info/exclude"
for f in .claude/settings.local.json node_modules/ .expo/ expo-env.d.ts; do
  if ! git -C "$WT" check-ignore -q "$f"; then
    mkdir -p "$(dirname "$EXCLUDE")"
    printf '%s\n' "/$f" >> "$EXCLUDE"
    echo "  added /$f to $EXCLUDE"
  fi
done

# -------------------------------------------------------------- 8. dev server
HTTP_CODE=""
mkdir -p "$STATE" && echo "$WT" > "$STATE/worktree" && echo "$PROJECT" > "$STATE/project"
if emd_server_ours "$WT" && (( RESTART )); then
  say "restarting the dev server on $PORT"
  emd_stop_server "$PROJECT" || true
fi
if emd_server_ours "$WT"; then
  echo "  dev server already running from this worktree -- kept"
  HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "http://localhost:$PORT/" || true)"
else
  say "starting the dev server on $PORT (docker compose project $PROJECT)"
  emd_start_server "$WT" "$STATE" "$PROJECT" || true
fi

DIRTY="$(git -C "$WT" status --porcelain)"
if [[ -n "$DIRTY" ]]; then
  echo "  WARNING: the worktree has uncommitted or untracked files:"
  echo "$DIRTY" | sed 's/^/    /'
fi

# ------------------------------------------------- 9. port report, last on screen
if [[ "$HTTP_CODE" == 200 ]]; then
  say "task $NAME is answering on port $PORT"
else
  say "task $NAME: dev server on $PORT returned ${HTTP_CODE:-nothing} -- see the log"
fi
cat <<EOF
  port     $PORT
  url      http://localhost:$PORT
  http     ${HTTP_CODE:-000}
  task     $NAME
  branch   $BRANCH
  path     $WT
  project  $PROJECT
  log      docker compose -p $PROJECT logs -f
EOF
[[ "$HTTP_CODE" == 200 ]]
