#!/usr/bin/env bash
# Stand up a multipass-app-v1 worktree and serve its web view on port 8002.
#
#   new-worktree.sh <name>
#
# <name> is both the branch (cut from main) and the folder under $WT_ROOT.
#
# ONE WORKTREE AT A TIME, ONE FIXED PORT. Dan only ever has one app worktree
# open, so there are no slots: the worktree always answers on 8002, and a second
# /wtup is refused until /wtdown closes the first. The root checkout's own dev
# server is on 8001 (package.json "start") and is never touched.
#
# THE POOL IS $WT_ROOT, NOT /var/www/worktrees — that is the multipass-web-v2
# pool (with ll-worktrees and htl-worktrees for the other projects).
#
# Refuses rather than guesses: every precondition is checked before anything
# is created.
set -euo pipefail

ROOT=/var/www/multipass-app-v1
WT_ROOT=/var/www/app-worktrees
PORT=8002
BASE=main
POLL_SECONDS=90

die() { echo "wtup: $*" >&2; exit 1; }

NAME="${1:-}"
[[ -n "$NAME" ]] || die "usage: new-worktree.sh <name>"
[[ "$NAME" =~ ^[a-z0-9][a-z0-9-]*$ ]] || die "name '$NAME': lowercase letters, digits and hyphens only"
WT="$WT_ROOT/$NAME"

# ── preflight ────────────────────────────────────────────────────────────────
git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1 || die "$ROOT is not a git checkout"

cur=$(git -C "$ROOT" branch --show-current)
[[ "$cur" == "$BASE" ]] || die "root checkout is on '$cur', not '$BASE' — worktrees branch off $BASE"

# Only the index has to be clean: a staged change in the root would be left
# behind on main while the branch is cut from HEAD without it.
git -C "$ROOT" diff --cached --quiet || die "root checkout has staged changes — commit or unstage them first"

open=$(git -C "$ROOT" worktree list --porcelain | sed -n 's/^worktree //p' | grep "^$WT_ROOT/" || true)
[[ -z "$open" ]] || die "an app worktree is already open: $open — close it with /wtdown first"

if ss -Hltn "sport = :$PORT" | grep -q .; then
  die "port $PORT is already in use — $(ss -Hltnp "sport = :$PORT" | head -1)"
fi

[[ ! -e "$WT" ]] || die "$WT already exists"
! git -C "$ROOT" show-ref --verify --quiet "refs/heads/$NAME" || die "branch '$NAME' already exists"

# ── worktree ─────────────────────────────────────────────────────────────────
mkdir -p "$WT_ROOT"
echo "── git worktree add -b $NAME $WT $BASE"
git -C "$ROOT" worktree add -b "$NAME" "$WT" "$BASE"

# Gitignored files the app needs that a checkout does not carry. Copied, not
# symlinked, and never printed: .env.local holds EXPO_PUBLIC_API_URL.
for f in .env.local .claude/settings.local.json; do
  if [[ -f "$ROOT/$f" ]]; then
    mkdir -p "$(dirname "$WT/$f")"
    cp -p "$ROOT/$f" "$WT/$f"
    echo "── copied $f"
  fi
done

# ── dependencies ─────────────────────────────────────────────────────────────
# npm ci, NEVER npm install: install can rewrite package-lock.json, leaving the
# worktree dirty from birth (it bit multipass-web-v2). ci never writes it.
echo "── npm ci (about a minute)"
(cd "$WT" && npm ci --no-audit --no-fund)

# ── dev server ───────────────────────────────────────────────────────────────
# No --web: that opens a browser. Metro serves the web build on the same port
# regardless, exactly as the root checkout does on 8001.
# setsid puts the server in its own process group so /wtdown can stop Metro
# and its workers with one signal; the pid file lives in .expo/ (gitignored).
# The `&` must apply to setsid ALONE: `cd X && setsid … &` backgrounds the
# whole list as a bash subshell that waits on expo, holds the caller's stdout
# open (so the caller never returns) and is the pid $! reports.
mkdir -p "$WT/.expo"
LOG="$WT/.expo/wtup-web.log"
PIDFILE="$WT/.expo/wtup-web.pid"
echo "── starting expo on port $PORT"
cd "$WT"
setsid nohup ./node_modules/.bin/expo start --port "$PORT" >"$LOG" 2>&1 </dev/null &
PID=$!
echo "$PID" >"$PIDFILE"

# The first request renders the page (web.output is "static"), which compiles
# the bundle — so a 200 means the web view actually works, not just the port.
code=000
for ((i = 0; i < POLL_SECONDS; i += 2)); do
  kill -0 "$PID" 2>/dev/null || { tail -20 "$LOG" >&2; die "expo exited during startup — log: $LOG"; }
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "http://localhost:$PORT/" || true)
  [[ "$code" == 200 ]] && break
  sleep 2
done

# ── report (last thing on screen) ────────────────────────────────────────────
echo
if [[ "$code" == 200 ]]; then
  echo "worktree $NAME is answering on port $PORT"
else
  echo "worktree $NAME: expo is running but http://localhost:$PORT/ returned $code after ${POLL_SECONDS}s"
fi
echo "  path    $WT"
echo "  branch  $NAME (from $BASE)"
echo "  url     http://localhost:$PORT"
echo "  http    $code"
echo "  log     $LOG"
echo "  pid     $PID"
[[ "$code" == 200 ]] || exit 1
