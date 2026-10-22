---
name: wtup
description: "Stand up a multipass-app-v1 git worktree under /var/www/app-worktrees, install its deps, and serve its web view on port 8002. Trigger: /wtup <worktree-name>. Use when the user asks for a new worktree, a second checkout, or a branch to work on in the app."
---

# /wtup

```
/wtup <name>
```

`<name>` is both the git branch (cut from `main`) and the folder
`/var/www/app-worktrees/<name>`. Lowercase letters, digits and hyphens only.

**One worktree at a time, fixed port 8002.** Dan only ever has one app worktree
open, so there are no slots: a second `/wtup` is refused until `/wtdown` closes
the first. The root checkout's own dev server stays on 8001.

## Run it

**Three steps, in this order.**

1. Run the script from the root checkout:

   ```bash
   .claude/skills/wtup/scripts/new-worktree.sh <name>
   ```

   It takes about a minute, mostly `npm ci`.

2. If it succeeded, **call `EnterWorktree` with
   `path: /var/www/app-worktrees/<name>`** so the session follows the worktree.
   Pass `path`, never `name` — `name` would create a different worktree under
   `.claude/worktrees/`. Do not enter if the script failed.

3. **Say the URL in your reply** (`http://localhost:8002`), read from the
   script's final block. Every later browser check has to go to 8002 —
   hitting 8001 serves `main`'s code and reads exactly like the change not
   working.

## What the script does

1. **Preflight** — refuses, changing nothing, if: the name is invalid, the root
   checkout is not on `main` or has staged changes, an app worktree is already
   open, port 8002 is in use, or the folder/branch already exists.
2. `git worktree add -b <name> /var/www/app-worktrees/<name> main`.
3. Copies the gitignored files a checkout lacks: `.env.local`
   (`EXPO_PUBLIC_API_URL`) and `.claude/settings.local.json`. Never prints them.
4. **`npm ci`, never `npm install`** — `install` can rewrite
   `package-lock.json` and leave the worktree dirty from birth.
5. Starts `expo start --port 8002` detached under `setsid`, logging to
   `.expo/wtup-web.log` with its pid in `.expo/wtup-web.pid` (`.expo/` is
   gitignored, so the tree stays clean). No `--web` flag: it would open a
   browser, and Metro serves the web build on the port regardless.
6. Polls `http://localhost:8002/` for up to 90s until it returns 200. Because
   `web.output` is `static`, that first request renders the page, so a 200
   means the web view really works.
7. Prints the report last: port, URL, HTTP status, log, pid.

## Pools on this box

`/var/www/app-worktrees` is this app's pool. `/var/www/worktrees` is
multipass-web-v2's; `ll-worktrees` and `htl-worktrees` belong to the others.

## Retiring it

`/wtdown <name>` — commits, checks, merges into `main`, stops the server and
removes the worktree. See `.claude/skills/wtdown/SKILL.md`.
