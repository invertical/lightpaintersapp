#!/usr/bin/env bash
# Check an Emdash task's worktree, merge it into main, check main again, then
# tear the task down (../../up/scripts/emdash-teardown.sh: stop its 8012 server,
# remove what setup created). Called by the /down skill. The merge half of
# ../../wtdown/scripts/merge-worktree.sh, which is left untouched -- its comments
# carry the reasoning for every gate copied here. Deliberately absent: removing
# the folder and deleting the branch -- Dan deletes the task in Emdash with
# "worktree" and "branch" checked (deleting runs no teardown, hence this one).
# If the checks or the merge fail, NOTHING is torn down.
#
#   merge-into-main.sh [<worktree-path>] [--dry-run]
#
# The worktree must already be committed: /down commits before calling this.
# The path defaults to the git toplevel of cwd. Nothing is pushed.
set -euo pipefail

UP="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../up/scripts" && pwd -P)"
# shellcheck source=../../up/scripts/emdash-common.sh
. "$UP/emdash-common.sh"
ROOT="$EMD_ROOT"
BASE=main
CHECKS="$ROOT/.claude/skills/lib/run-checks.sh"
DRY=0
WT=""

for a in "$@"; do
  case "$a" in
    --dry-run|-n) DRY=1 ;;
    -*)           echo "unknown flag: $a" >&2; exit 2 ;;
    *)            WT="$a" ;;
  esac
done

die() { echo "ERROR: $*" >&2; exit 1; }
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- 1. gates
emd_resolve_wt "$WT" || die "no worktree: pass its path, or run inside it"
[[ -d "$WT" ]] || die "$WT does not exist"
[[ "$WT" != "$ROOT" ]] || die "this is the root checkout -- run /down inside a task worktree"
git -C "$ROOT" worktree list --porcelain | grep -qx "worktree $WT" \
  || die "$WT is not a registered git worktree of $ROOT"

# THE ACTUAL BRANCH, never the folder name -- Emdash names the branch itself and
# nests the folder (<pool>/<project>-<hash>/emdash-<task>-<random>).
BRANCH="$(git -C "$WT" branch --show-current)"
[[ -n "$BRANCH" ]] || die "$WT is on a detached HEAD; check out a branch first"
[[ "$BRANCH" != "$BASE" ]] || die "refusing to merge $BASE into itself"

# Task identity from the folder; refuse when Emdash's own values for THIS
# worktree name a different task (see emdash-common.sh).
emd_identity
[[ -z "$ENV_NOTE" || $ENV_CONFLICT == 1 ]] || echo "  note: $ENV_NOTE"
(( ! ENV_CONFLICT )) || die "task identity disagrees: $ENV_NOTE -- refusing to merge. Check which task this worktree belongs to."

DIRTY="$(git -C "$WT" status --porcelain)"
[[ -z "$DIRTY" ]] || { echo "$DIRTY" | sed 's/^/  /'; die "$WT has uncommitted changes (above) -- commit them first"; }

cur="$(git -C "$ROOT" branch --show-current)"
[[ "$cur" == "$BASE" ]] || die "root checkout is on '$cur', not '$BASE'"
git -C "$ROOT" diff --cached --quiet || die "root checkout has staged changes -- commit or unstage them first"

# A file the merge touches that is also modified in the root would make git
# refuse mid-way; name them up front.
mapfile -t INCOMING < <(git -C "$ROOT" diff --name-only "$BASE...$BRANCH")
CLASH=()
while IFS= read -r line; do
  f="${line:3}"
  for i in "${INCOMING[@]}"; do [[ "$f" == "$i" ]] && CLASH+=("$f"); done
done < <(git -C "$ROOT" status --porcelain)
if (( ${#CLASH[@]} )); then
  printf '  %s\n' "${CLASH[@]}"
  die "the above files are modified in $ROOT and also changed by $BRANCH -- commit, stash or revert them first"
fi

# ------------------------------------------------------------------- 2. plan
AHEAD="$(git -C "$ROOT" rev-list --count "$BASE..$BRANCH")"
say "plan for task $NAME, branch $BRANCH"
cat <<EOF
  worktree  $WT
  branch    $BRANCH  ($AHEAD commit(s) ahead of $BASE, ${#INCOMING[@]} file(s) changed)
  1. checks in the worktree (lint, typecheck, expo-doctor) -- stop on failure
  2. git merge --no-ff $BRANCH into $BASE in $ROOT
  3. npm ci in $ROOT if package-lock.json changed
  4. checks on $BASE
  5. teardown: docker compose down -v the $EMD_PORT server, remove copied
     settings, node_modules and the state dir -- only if 1-4 all pass
  the folder and branch are left for Emdash's delete
EOF
[[ $DRY == 0 ]] || { echo; echo "dry run -- nothing changed"; exit 0; }

# ------------------------------------------------- 3. checks in the worktree
say "checks in the worktree"
if ! "$CHECKS" "$WT"; then
  echo
  echo "ERROR: checks failed in the worktree -- NOTHING WAS MERGED." >&2
  echo "  Fix them in $WT, then /down again." >&2
  exit 1
fi

# ------------------------------------------------------------------- 4. merge
say "git merge --no-ff $BRANCH (in $ROOT)"
PRE="$(git -C "$ROOT" rev-parse HEAD)"
if ! git -C "$ROOT" merge --no-ff --no-edit "$BRANCH"; then
  if git -C "$ROOT" rev-parse -q --verify MERGE_HEAD >/dev/null; then
    git -C "$ROOT" merge --abort
    echo "ERROR: merge conflicted and was aborted -- nothing changed." >&2
    echo "  Resolve it in the worktree:  cd $WT && git merge $BASE" >&2
    echo "  then /down again." >&2
  else
    echo "ERROR: git refused to start the merge (see its message above)." >&2
  fi
  exit 1
fi
CHANGED="$(git -C "$ROOT" diff --name-only "$PRE" HEAD)"

# --------------------------------------------------------------- 5. root sync
if grep -qx 'package-lock.json' <<<"$CHANGED"; then
  say "package-lock.json changed: npm ci in $ROOT"
  ( cd "$ROOT" && npm ci --no-audit --no-fund )
  echo "  NOTE: restart the root dev server on $EMD_ROOT_PORT (docker compose restart in $ROOT) -- its node_modules were replaced."
fi

# ---------------------------------------------------------- 6. checks on main
say "checks on $BASE"
if ! "$CHECKS" "$ROOT"; then
  echo
  echo "ERROR: checks FAILED on $BASE after the merge. The merge is committed." >&2
  echo "  Undo it with:  git -C $ROOT revert -m 1 HEAD" >&2
  exit 1
fi

say "$BRANCH is merged into $BASE"
echo "  $BASE is now at $(git -C "$ROOT" log --oneline -1)"
if [[ -z "$CHANGED" ]]; then
  echo "  the branch brought no changes -- $BASE is unchanged"
else
  echo "  $(wc -l <<<"$CHANGED") file(s) changed; nothing pushed"
fi
MERGED="$(git -C "$ROOT" rev-parse --short HEAD)"

# ---------------------------------------------------------------- 7. teardown
"$UP/emdash-teardown.sh" "$WT"

echo
echo "Merged $BRANCH into $BASE at $MERGED. Port $EMD_PORT is free."
echo "Next: DELETE task $NAME in Emdash with \"worktree\" and \"branch\" checked."
