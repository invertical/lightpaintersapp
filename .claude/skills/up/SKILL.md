---
name: up
description: "Re-provision the current Emdash task worktree and restart its dev server — re-run the Emdash setup script (orphan sweep, one worktree at a time, settings, deps, docker compose dev server on 8012), then report the port and URL. Trigger: /up. Use inside an Emdash worktree when its server or deps are broken. For a new /wtup worktree use /wtup."
---

# /up

```
/up
```

Run from inside the worktree, passing its path explicitly:

```bash
/var/www/personal/lightpainters/lightpaintersapp/.claude/skills/up/scripts/emdash-setup.sh "$(git rev-parse --show-toplevel)" --restart
```

Always the root checkout's copy (absolute path), and always the explicit path —
this session may carry **another task's** `EMDASH_*` values. Then **say the
port report**: the URL `http://localhost:8012`, the `http` line and the
`project` line.

No IDE, no window placement, no `EnterWorktree`.

## The Emdash flow (no archiving)

| Step | Who | What |
|---|---|---|
| Create task | Emdash | worktree at `/var/www/emdash-worktrees/<project>-<hash>/emdash-<task>-<random>`, on a branch Emdash names |
| Activate task | Emdash → `emdash-setup.sh` | orphan sweep, one-at-a-time gate, settings, `npm ci`, **`docker compose up -d` on 8012**, port report |
| Run (optional) | Emdash → `emdash-run.sh` | makes sure the stack is up, prints `Web: http://localhost:8012`, follows its logs |
| Work | Claude in the worktree | `/up` restarts the server and re-runs setup |
| Finish | `/down` | checks, commit, merge into `main`, **teardown** |
| or abandon | `/down --discard` | shows what would be lost, asks, **teardown** |
| Delete task | Dan, in Emdash | with "worktree" and "branch" checked — runs **no** teardown |
| Strays | `/sweep` | takes down a stack whose task was deleted without teardown |

`.emdash.json` points `scripts.setup` / `run` / `teardown` at the scripts in
`scripts/`, by absolute path into the root checkout.

## Setup

`emdash-setup.sh` is `wtup/scripts/new-worktree.sh` minus `git worktree add`
and the two gates that guard cutting the branch. That script is untouched.
Shared code is in `scripts/emdash-common.sh`.

- **Task identity.** The worktree is the path argument, else cwd's git
  toplevel, else `EMDASH_TASK_PATH`. The task name comes from the folder
  (`emdash-<task>-<random>` → `<task>`). `EMDASH_TASK_NAME` is consulted only
  when `EMDASH_TASK_PATH` is this worktree; a disagreement is printed (and
  makes `/down` refuse). The branch is `git branch --show-current`.
- **Orphan sweep first**: a `lightpaintersapp-*` stack whose Emdash worktree is
  gone, or a state dir naming a missing worktree, is taken down
  (`down -v`) and removed. Anything else holding 8012 fails setup, naming its
  compose project and dir.
- **One worktree at a time, both kinds** (`scripts/other-worktrees.sh`):
  registered worktrees anywhere, plus folders in `/var/www/app-worktrees`
  (`/wtup`) and `/var/www/emdash-worktrees` whose `.git` points into this repo.
  Refused by branch and path.
- **Dev server**: the repo's `docker-compose.yml`, from the worktree:
  `COMPOSE_PROJECT_NAME=lightpaintersapp-<task> EXPO_PORT=8012 docker compose up -d`.
  The container runs `npx expo start` against the worktree's own
  `node_modules` (`.` is mounted at `/app`). Setup waits for a 200, then
  prints the port report. A stack already running from this worktree is kept;
  `--restart` (what `/up` passes) takes it down and up again. Logs:
  `docker compose -p lightpaintersapp-<task> logs -f`.
- **Root checkout**: project `lightpaintersapp` on 8011 (the compose file's
  defaults). Never touched by setup, teardown or `/sweep`.
- **State lives outside the worktree**:
  `~/.local/state/lightpaintersapp-emdash/<task>/` holds `worktree` and
  `project`. That is how a deleted task's stack is still found.
- **Never dirties the worktree**: every path it or the server writes is checked
  with `git check-ignore` and added to the repo's `info/exclude` if not ignored.
- **Idempotent**: settings copied only when absent; `npm ci` only when
  `node_modules` is stale.

## Teardown

`emdash-teardown.sh <worktree>` runs
`docker compose -p lightpaintersapp-<task> down -v`, removes
`settings.local.json` while it matches the root's copy, `node_modules`, and the
task's state dir. Never the folder or the branch. Safe twice; safe with the
folder gone. Run by `/down` and `/down --discard` — deleting a task in Emdash
does not run it.
