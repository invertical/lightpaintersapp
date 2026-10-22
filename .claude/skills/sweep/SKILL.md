---
name: sweep
description: "Clean up after Emdash tasks of lightpaintersapp that were deleted without a teardown: docker compose down -v a dev server stack (lightpaintersapp-<task>, port 8012) whose worktree folder is gone and remove its state dir. /sweep --dry-run only lists what it would remove. Trigger: /sweep, /sweep --dry-run. Use when 8012 is held after a task was deleted, or setup complains about port 8012."
---

# /sweep

```
/sweep --dry-run   # list what would be stopped and removed; change nothing
/sweep             # do it
```

Run (any directory):

```bash
/var/www/personal/lightpainters/lightpaintersapp/.claude/skills/sweep/scripts/sweep.sh [--dry-run]
```

Print its output and finish with whether port 8012 is free.

## What counts as an orphan

Deleting a task in Emdash runs **no** teardown, so its compose stack can
outlive its worktree. An orphan is either:

- a state dir in `~/.local/state/lightpaintersapp-emdash/<task>/` whose
  recorded worktree no longer exists (with its stack, if still there), or
- a `lightpaintersapp-*` compose project whose working dir was under
  `/var/www/emdash-worktrees` and is gone.

Each stack is removed with `docker compose -p lightpaintersapp-<task> down -v`
and its state dir deleted. The same sweep runs at the start of every Emdash
setup.

## What it never touches

A stack whose worktree still exists, anything else on 8012 (it is only
described), the root checkout's 8011 stack (project `lightpaintersapp`), and
git — registered worktrees whose folder is gone are reported, with
`git worktree prune` as the fix.
