#!/usr/bin/env bash
# Commit a multipass-app-v1 worktree, check it, merge it into main, tear it
# down, and check main again. The inverse of /wtup.
#
#   merge-worktree.sh <name> --dry-run            # print the plan, change nothing
#   merge-worktree.sh <name> --yes [--message M]  # do it
#
# Sequence (nothing is modified before the gates pass):
#   1. gates
#   2. commit any uncommitted work in the worktree (message M)
#   3. checks IN THE WORKTREE — a failure stops here, nothing merged
#   4. git merge --no-ff into main, in the root checkout
#      conflict -> merge --abort, exit 1, worktree survives
#   5. stop the port-8002 server, remove the worktree, delete the branch
#   6. npm ci in the root if package-lock.json changed
#   7. checks ON MAIN — a failure is reported with the revert command, never
#      reverted automatically
# Nothing is pushed.
set -euo pipefail

ROOT=/var/www/multipass-app-v1
WT_ROOT=/var/www/app-worktrees
PORT=8002
BASE=main
CHECKS="$ROOT/.claude/skills/lib/run-checks.sh"
TRAILER="Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"

die() { echo "wtdown: $*" >&2; exit 1; }

NAME="" DRY=0 YES=0 MSG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|-n) DRY=1 ;;
    --yes|-y)     YES=1 ;;
    --message|-m) MSG="${2:?--message needs a value}"; shift ;;
    -*)           die "unknown flag: $1" ;;
    *)            [[ -z "$NAME" ]] || die "one name only"; NAME="$1" ;;
  esac
  shift
done
[[ -n "$NAME" ]] || die "usage: merge-worktree.sh <name> --dry-run | --yes [--message M]"
[[ $DRY == 1 || $YES == 1 ]] || die "pass --dry-run to see the plan or --yes to run it"
WT="$WT_ROOT/$NAME"

# ── gates ────────────────────────────────────────────────────────────────────
git -C "$ROOT" worktree list --porcelain | grep -qx "worktree $WT" \
  || die "$WT is not a registered worktree of $ROOT"

# Read the branch from the worktree — never assume it equals the folder name.
BRANCH=$(git -C "$WT" branch --show-current)
[[ -n "$BRANCH" ]] || die "$WT is on a detached HEAD"
[[ "$BRANCH" != "$BASE" ]] || die "refusing to merge $BASE into itself"

cur=$(git -C "$ROOT" branch --show-current)
[[ "$cur" == "$BASE" ]] || die "root checkout is on '$cur', not '$BASE'"

# git merge refuses to START if the root's index differs from HEAD at all, and
# its message names the staged file as if it were a conflict. Say it plainly.
git -C "$ROOT" diff --cached --quiet || die "root checkout has staged changes — commit or unstage them first"

# This script deletes $WT; running from inside it would pull the cwd away.
case "$PWD/" in "$WT"/*) die "run this from $ROOT, not from inside $WT (ExitWorktree first)" ;; esac

DIRTY=$(git -C "$WT" status --porcelain)
AHEAD=$(git -C "$ROOT" rev-list --count "$BASE..$BRANCH")

# ── plan ─────────────────────────────────────────────────────────────────────
echo "wtdown plan for $NAME"
echo "  worktree  $WT"
echo "  branch    $BRANCH  ($AHEAD commit(s) ahead of $BASE)"
if [[ -n "$DIRTY" ]]; then
  echo "  commit    uncommitted changes:"
  sed 's/^/              /' <<<"$DIRTY"
  echo "            message: ${MSG:-wtdown: $BRANCH}"
else
  echo "  commit    nothing to commit"
fi
echo "  1. checks in the worktree (lint, typecheck, expo-doctor) — stop on failure"
echo "  2. git merge --no-ff $BRANCH into $BASE in $ROOT"
echo "  3. stop the server on port $PORT, remove $WT, delete branch $BRANCH"
echo "  4. npm ci in $ROOT if package-lock.json changed"
echo "  5. checks on $BASE"
[[ $DRY == 0 ]] || { echo; echo "dry run — nothing changed"; exit 0; }
echo

# ── 1. commit ────────────────────────────────────────────────────────────────
if [[ -n "$DIRTY" ]]; then
  echo "── committing in $WT"
  git -C "$WT" add -A
  git -C "$WT" commit -q -m "${MSG:-wtdown: $BRANCH}" -m "$TRAILER"
  git -C "$WT" log --oneline -1
fi

# ── 2. checks in the worktree ────────────────────────────────────────────────
echo "── checks in the worktree"
if ! "$CHECKS" "$WT"; then
  echo
  echo "wtdown: checks failed in the worktree — NOTHING WAS MERGED." >&2
  echo "  Fix them in $WT (its server is still on port $PORT), then re-run /wtdown $NAME." >&2
  exit 1
fi

# ── 3. merge ─────────────────────────────────────────────────────────────────
echo "── git merge --no-ff $BRANCH (in $ROOT)"
PRE=$(git -C "$ROOT" rev-parse HEAD)
if ! git -C "$ROOT" merge --no-ff --no-edit "$BRANCH"; then
  if git -C "$ROOT" rev-parse -q --verify MERGE_HEAD >/dev/null; then
    git -C "$ROOT" merge --abort
    echo "wtdown: merge conflicted and was aborted — nothing was torn down." >&2
    echo "  Resolve it in the worktree:  cd $WT && git merge $BASE" >&2
    echo "  then re-run /wtdown $NAME." >&2
  else
    echo "wtdown: git refused to start the merge (see its message above) — nothing was torn down." >&2
  fi
  exit 1
fi
INCOMING=$(git -C "$ROOT" diff --name-only "$PRE" HEAD)

# ── 4. teardown ──────────────────────────────────────────────────────────────
PIDFILE="$WT/.expo/wtup-web.pid"
if [[ -f "$PIDFILE" ]]; then
  PID=$(cat "$PIDFILE")
  # /wtup started it under setsid, so its pid is its process group: this
  # stops Metro and its workers together.
  kill -TERM -- "-$PID" 2>/dev/null || kill -TERM "$PID" 2>/dev/null || true
fi
# Fallback: any listener on the port whose cwd is this worktree.
for ((i = 0; i < 10; i++)); do
  ss -Hltn "sport = :$PORT" | grep -q . || break
  if [[ $i == 5 ]]; then
    for p in $(ss -Hltnp "sport = :$PORT" | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u); do
      [[ "$(readlink "/proc/$p/cwd" 2>/dev/null)" == "$WT"* ]] && kill -KILL "$p" 2>/dev/null || true
    done
  fi
  sleep 1
done
if ss -Hltn "sport = :$PORT" | grep -q .; then
  echo "wtdown: WARNING port $PORT is still in use: $(ss -Hltnp "sport = :$PORT" | head -1)" >&2
else
  echo "── stopped the server on port $PORT"
fi

echo "── git worktree remove $WT"
# No --force: ignored files (node_modules, .expo, .env.local) do not block it,
# and anything that does is something worth seeing.
git -C "$ROOT" worktree remove "$WT"
git -C "$ROOT" branch -d "$BRANCH"

# ── 5. root sync ─────────────────────────────────────────────────────────────
if grep -qx 'package-lock.json' <<<"$INCOMING"; then
  echo "── package-lock.json changed: npm ci in $ROOT"
  (cd "$ROOT" && npm ci --no-audit --no-fund)
  echo "  NOTE: restart the root dev server on 8001 — its node_modules were replaced."
fi

# ── 6. checks on main ────────────────────────────────────────────────────────
echo "── checks on $BASE"
if ! "$CHECKS" "$ROOT"; then
  echo
  echo "wtdown: checks FAILED on $BASE after the merge. The merge is committed." >&2
  echo "  Undo it with:  git -C $ROOT revert -m 1 HEAD" >&2
  exit 1
fi

echo
echo "$BRANCH merged into $BASE and torn down"
git -C "$ROOT" log --oneline -1
if [[ -z "$INCOMING" ]]; then
  echo "  the branch brought no changes — $BASE is unchanged"
else
  echo "  $(wc -l <<<"$INCOMING") file(s) changed; nothing pushed"
fi
