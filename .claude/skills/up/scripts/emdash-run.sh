#!/usr/bin/env bash
# Emdash's Run button (.emdash.json scripts.run). Setup already brings the dev
# server's compose stack up; this makes sure it is up (starting it the same way
# if not), prints the URL to stdout so Emdash offers it in the in-app browser,
# then follows the stack's logs. Stopping Run stops the logs, not the server --
# teardown (/down) stops the server.
#
#   emdash-run.sh [<worktree-path>]
#
# Identity: see emdash-common.sh. EMDASH_PORT is ignored: always 8012.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=emdash-common.sh
. "$HERE/emdash-common.sh"
ROOT="$EMD_ROOT"
PORT="$EMD_PORT"
die() { emd_die "$@"; }

emd_resolve_wt "${1:-}" || die "no worktree: pass its path, or run inside it"
[[ -d "$WT" ]] || die "$WT does not exist"
[[ "$WT" != "$ROOT" ]] || die "this is the root checkout -- its server is 'docker compose up -d' on $EMD_ROOT_PORT"
emd_identity
STATE="$(emd_state_dir "$NAME")"
PROJECT="$(emd_project "$NAME")"
[[ -x "$WT/node_modules/.bin/expo" ]] || die "no node_modules in $WT -- run setup first (/up)"

if ! emd_server_ours "$WT"; then
  OTHERS="$("$HERE/other-worktrees.sh" "$ROOT" "$WT")"
  if [[ -n "$OTHERS" ]]; then
    echo "$OTHERS" | sed 's/^/  /' >&2
    die "task '$NAME' not started: another lightpaintersapp worktree exists (above) -- only one may serve on $PORT."
  fi
  if emd_port_busy; then
    emd_describe_port >&2
    die "port $PORT is held by something else (above) -- /sweep clears orphaned Emdash stacks"
  fi
  echo "starting the dev server for task $NAME ..."
  emd_start_server "$WT" "$STATE" "$PROJECT" || die "the dev server did not answer -- log: docker compose -p $PROJECT logs"
fi

echo "Web: http://localhost:$PORT"
exec docker compose -p "$PROJECT" logs -f --tail 20
