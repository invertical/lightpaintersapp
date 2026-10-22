---
name: wtdown
description: "Commit a multipass-app-v1 worktree, run the checks, merge it into main, stop its port-8002 server, remove it, and run the checks again on main. Trigger: /wtdown <worktree-name>. Use when an app worktree is finished and should be merged back. The inverse of /wtup."
---

# /wtdown

```
/wtdown <name>
```

`<name>` is the folder under `/var/www/app-worktrees/`. With no name, use the
one open app worktree (`git worktree list`).

## Run it

**Four steps, in this order.**

1. **`ExitWorktree` with `action: "keep"`**, if the session is in the worktree.
   Before the script, because the script deletes that directory. Call it once;
   a second call comes back error-shaped. Never `"remove"` — the script does
   the teardown.

2. **Write the commit message.** If `git -C /var/www/app-worktrees/<name> status`
   shows changes, read the diff and write a one-line message describing them.

3. **Print the plan:**

   ```bash
   .claude/skills/wtdown/scripts/merge-worktree.sh <name> --dry-run
   ```

4. **Run it:**

   ```bash
   .claude/skills/wtdown/scripts/merge-worktree.sh <name> --yes --message "<message>"
   ```

   Invoking `/wtdown` is the request to do this; do not ask again after the
   dry run unless it shows something unexpected (a wrong branch, files that
   should not be committed).

## What the script does

1. **Gates** — the folder is a registered worktree; its branch (read from the
   worktree, not assumed) is not `main`; the root checkout is on `main` with a
   clean index; the script is not running from inside the worktree.
2. **Commits** everything uncommitted in the worktree (`git add -A`) with the
   message and the Co-Authored-By trailer.
3. **Checks in the worktree** — `.claude/skills/lib/run-checks.sh`:
   `expo lint`, `tsc --noEmit`, `expo-doctor`. The app has no test runner, so
   these three are the full suite. **A failure stops here: nothing is merged**,
   and the worktree and its server stay up so it can be fixed there.
4. **`git merge --no-ff` into `main`** in the root checkout, so the worktree's
   commits can be reverted as a unit. On a conflict it aborts, leaves
   everything in place, and prints how to resume
   (`cd <worktree> && git merge main`, then `/wtdown` again).
5. **Teardown**, only after a clean merge: stops the 8002 server (its process
   group, from `.expo/wtup-web.pid`), `git worktree remove` (no `--force`),
   `git branch -d`.
6. **`npm ci` in the root** if the merge changed `package-lock.json`, and says
   to restart the 8001 server.
7. **Checks on `main`** again. A failure is reported with
   `git revert -m 1 HEAD` as the undo — the script never reverts on its own.

Nothing is pushed.

## After it finishes

Report: whether both check runs passed, the merge commit, and that port 8002 is
free. If the post-merge checks failed, say so first and give the revert
command.
