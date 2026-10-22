---
name: down
description: "Finish an Emdash task: commit, run the checks, merge the worktree's branch into main, then tear the task down (docker compose down -v its 8012 server, remove what setup created) and tell Dan to delete the task in Emdash with worktree and branch checked. /down --discard abandons the task instead: shows what would be lost, asks, tears down. Trigger: /down, /down --discard. Use inside an Emdash task worktree. For a /wtup worktree use /wtdown instead."
---

# /down

```
/down             # commit, checks, merge into main, teardown
/down --discard   # show what would be lost, confirm, teardown — no checks, commit or merge
```

The Emdash-flow counterpart of `/wtdown`. Takes **no name**: it acts on the
worktree the session is in, and passes that path explicitly to every script —
this session may carry **another task's** `EMDASH_*` values. **Emdash owns the
folder and the branch**: Dan deletes the task there; this never removes either,
and never calls `ExitWorktree`.

Scripts are always the root checkout's copies (absolute paths):

```
S=/var/www/personal/lightpainters/lightpaintersapp/.claude/skills
WT="$(git rev-parse --show-toplevel)"
```

## /down

**Four steps, in this order.** Stop at the first that fails and say why.

1. **Check where you are.** `$WT` must not be `/var/www/personal/lightpainters/lightpaintersapp`.
   Read the branch with `git branch --show-current` — Emdash names it; it is
   not the folder name.

2. **Plan + identity gate:** `$S/down/scripts/merge-into-main.sh "$WT" --dry-run`.
   It refuses if the task name from the folder disagrees with Emdash's
   `EMDASH_TASK_NAME` for this worktree — stop and report it. (Run it before
   committing; it will list the uncommitted files.)

3. **Commit.** If `git status --porcelain` is non-empty: read the status and
   diffs, then `git add -A && git commit -F <message-file>` with a real one-line
   message — never "WIP" — ending with the attribution lines.

4. **Run it:** `$S/down/scripts/merge-into-main.sh "$WT"` with a 10-minute
   timeout. Invoking `/down` is the approval; do not ask again.

   It runs the checks in the worktree, merges into `main` (`--no-ff`), runs the
   checks on `main`, and **only if all of that passed** runs the teardown.
   A check failure or a conflict tears nothing down. A post-merge check failure
   leaves the merge committed and gives `git -C /var/www/personal/lightpainters/lightpaintersapp revert -m 1 HEAD`.

Then end with: **"Merged `<branch>` into main at `<sha>`; port 8012 is free.
Delete task `<task>` in Emdash with "worktree" and "branch" checked."** If the
post-merge checks failed, say so first with the revert command.

## /down --discard

No checks, no commit, no merge.

1. **Show what would be lost:** `$S/down/scripts/discard-task.sh "$WT"` — it
   lists uncommitted changes and commits not in `main`, and changes nothing.
   Print it.
2. **Ask Dan to confirm** (AskUserQuestion: discard / keep). Anything but an
   explicit discard: stop.
3. **On confirmation:** `$S/down/scripts/discard-task.sh "$WT" --yes` — the same
   teardown `/down` runs.

Then end with: **"Task `<task>` discarded; port 8012 is free. Delete it in
Emdash with "worktree" and "branch" checked."**

## What merge-into-main.sh does

The merge half of `wtdown/scripts/merge-worktree.sh` (untouched), then teardown:

- **Gates**: registered worktree; real branch, not `main` or detached; task
  identity agrees; clean worktree; root on `main` with nothing staged; no file
  the merge touches is locally modified in the root.
- **Checks in the worktree** — `lib/run-checks.sh` (`expo lint`,
  `tsc --noEmit`, `expo-doctor`; the app has no test runner).
- **`git merge --no-ff --no-edit <branch>`** into `main`; on conflict it aborts
  and prints `git merge main` for the worktree.
- **`npm ci` in the root** if `package-lock.json` changed (restart the root's
  8011 stack: `docker compose restart` in the root).
- **Checks on `main`.**
- **Teardown** — `up/scripts/emdash-teardown.sh "$WT"`:
  `docker compose -p lightpaintersapp-<task> down -v`, copied settings,
  `node_modules`, state dir.

Nothing is pushed.
