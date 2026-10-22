---
name: downpush
description: "Finish an Emdash task and ship it to staging: everything /down does (commit, checks, merge into main, teardown), then publish main to the Expo staging branch with scripts/publish-staging.sh (EAS Update, live API). Offers a new Android/iOS build only when the script says one is needed. Trigger: /downpush. Use inside an Emdash task worktree. For a merge without publishing use /down."
---

# /downpush

```
/downpush   # /down, then publish main to EAS Update branch "staging"
```

Invoking `/downpush` is the approval to merge **and** to publish the update; do
not ask again for either. Starting a **build** still needs Dan's yes (it uses the
monthly build quota).

```
S=/var/www/personal/lightpainters/lightpaintersapp/.claude/skills
ROOT=/var/www/personal/lightpainters/lightpaintersapp
WT="$(git rev-parse --show-toplevel)"
```

## 1. Run /down

Follow `$S/down/SKILL.md` § "/down" steps 1–4 exactly (no `--discard`). Keep
the commit message from step 3 — it becomes the update message.

If any step fails, or the post-merge checks on `main` failed: **stop, publish
nothing**, and report as `/down` would.

## 2. Publish to staging

From the root checkout, with a 10-minute timeout:

```
"$ROOT/scripts/publish-staging.sh" -m "<commit subject> · <short sha>" --skip-checks --yes --report-builds
```

- `--skip-checks`: `/down` just ran lint and typecheck on `main`.
- `--yes` skips the publish prompt; `--report-builds` prints why a build is
  suggested but never starts one.
- Its gates (on `main`, clean, `node_modules` matches the lock, logged in to
  Expo, the live API answers, the EAS `preview` env's API address) stop it
  before anything is published. Report the gate's message and its fix — e.g.
  Dan runs `! npx eas-cli@latest login`. The merge stays and the task is
  already torn down, so the retry is the script itself, not `/downpush`:
  `$ROOT/scripts/publish-staging.sh`.
- If it says the bundles' API address looks wrong, print its
  `update:republish` instructions first, before anything else.

## 3. Builds (only if suggested)

If the output contains "A new Android build is suggested" or "A new iOS build
is suggested", show the reasons it printed and ask Dan (AskUserQuestion,
multiSelect: Android / iOS / neither). An update can't add native code, so a
phone without a new build may crash on it when native files changed.

- Android: run `cd $ROOT && npx --yes eas-cli@latest build --platform android --profile preview --message "<message>" --non-interactive --no-wait`.
- iOS: it's interactive (Apple sign-in, provisioning), so give Dan the command
  to run: `! cd $ROOT && npx eas-cli@latest build --platform ios --profile preview --no-wait`.

## Report

End with: **"Merged `<branch>` into main at `<sha>` and published it to
staging; port 8012 is free. Delete task `<task>` in Emdash with "worktree" and
"branch" checked."** Then one line on builds: none needed / started (link) /
suggested but skipped. Phones get the update on the next app restart — often
the second one, since the first downloads it.
