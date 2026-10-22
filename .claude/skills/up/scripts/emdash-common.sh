# Shared by the Emdash-flow scripts (setup, run, teardown, /down, /sweep).
# SOURCED, not run. Defines task identity, the per-task state dir, and starting,
# stopping and sweeping the port-8012 dev server (a docker compose stack).
#
# ── TASK IDENTITY ───────────────────────────────────────────────────────────
# Emdash terminals and Claude sessions can carry ANOTHER task's EMDASH_*
# values, so the worktree is found from the path argument or cwd first, and the
# task name comes from the worktree FOLDER: emdash-<task>-<random> -> <task>.
# EMDASH_TASK_NAME is consulted only when EMDASH_TASK_PATH is this worktree.
#
# ── THE SERVER IS A COMPOSE STACK ───────────────────────────────────────────
# The repo's docker-compose.yml, brought up from the worktree as project
# lightpaintersapp-<task> with EXPO_PORT=8012 (the root checkout is project
# lightpaintersapp on 8011). Ownership is read from the containers' compose
# labels (project, working_dir), not from pids: the port's listener is
# docker-proxy, whose pid and cwd say nothing about the task.
#
# ── STATE, OUTSIDE THE WORKTREE ─────────────────────────────────────────────
# $EMD_STATE_ROOT/<task>/ holds `worktree` (its path) and `project` (its
# compose project). Outside the worktree so the worktree stays clean, and so a
# stack whose worktree was deleted (Emdash's "delete task" runs no teardown)
# can still be found and stopped by the next setup or by /sweep.

EMD_ROOT=/var/www/personal/lightpainters/lightpaintersapp
EMD_POOL=/var/www/emdash-worktrees
EMD_PORT=8012
EMD_ROOT_PORT=8011
EMD_PROJECT_PREFIX=lightpaintersapp
EMD_STATE_ROOT="${XDG_STATE_HOME:-$HOME/.local/state}/lightpaintersapp-emdash"
EMD_POLL_SECONDS=90

emd_die() { echo "ERROR: $*" >&2; exit 1; }
emd_say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# emd_resolve_wt [<path>] -> sets WT (real path when it exists).
# Order: the argument; else the git toplevel of cwd unless that is the root
# checkout; else EMDASH_TASK_PATH. cwd beats the env so a session holding
# another task's EMDASH_TASK_PATH still acts on the worktree it is in.
emd_resolve_wt() {
  local cand="${1:-}" top
  if [[ -z "$cand" ]]; then
    top="$(git rev-parse --show-toplevel 2>/dev/null || true)"
    if [[ -n "$top" && "$(cd "$top" && pwd -P)" != "$EMD_ROOT" ]]; then
      cand="$top"
    else
      cand="${EMDASH_TASK_PATH:-}"
    fi
  fi
  [[ -n "$cand" ]] || return 1
  cand="${cand%/}"
  [[ -d "$cand" ]] && cand="$(cd "$cand" && pwd -P)"
  WT="$cand"
}

# emd_identity -> sets NAME, ENV_NOTE, ENV_CONFLICT (0/1) for $WT.
emd_identity() {
  local base env_path=""
  base="$(basename "$WT")"
  ENV_NOTE="" ENV_CONFLICT=0
  if [[ -n "${EMDASH_TASK_PATH:-}" ]]; then
    env_path="${EMDASH_TASK_PATH%/}"
    [[ -d "$env_path" ]] && env_path="$(cd "$env_path" && pwd -P)"
  fi
  if [[ "$base" =~ ^emdash-(.+)-[A-Za-z0-9]+$ ]]; then
    NAME="${BASH_REMATCH[1]}"
  elif [[ "$env_path" == "$WT" && -n "${EMDASH_TASK_NAME:-}" ]]; then
    NAME="$EMDASH_TASK_NAME"
  else
    NAME="$base"
  fi
  if [[ -n "$env_path" && "$env_path" != "$WT" ]]; then
    ENV_NOTE="EMDASH_TASK_PATH names another task ($env_path) -- ignored"
  elif [[ "$env_path" == "$WT" && -n "${EMDASH_TASK_NAME:-}" && "$EMDASH_TASK_NAME" != "$NAME" ]]; then
    ENV_NOTE="EMDASH_TASK_NAME is '$EMDASH_TASK_NAME' but the folder says '$NAME'"
    ENV_CONFLICT=1
  fi
}

emd_state_dir() { echo "$EMD_STATE_ROOT/$1"; }

# emd_project <task> -> lightpaintersapp-<task>, made a valid compose project
# name (lowercase letters, digits, '-' and '_').
emd_project() {
  local t="${1,,}"
  t="$(sed 's/[^a-z0-9_-]/-/g' <<<"$t")"
  echo "$EMD_PROJECT_PREFIX-$t"
}

# emd_compose <project> <args...>: docker compose for a project by name alone,
# run from / so no compose file is picked up -- works with the worktree gone.
emd_compose() { local p="$1"; shift; ( cd / && docker compose -p "$p" "$@" ); }

emd_port_busy() { ss -Hltn "sport = :$EMD_PORT" | grep -q .; }

# Containers publishing the port, one per line: "<project>\t<working_dir>".
emd_port_stacks() {
  docker ps --filter "publish=$EMD_PORT" \
    --format '{{.Label "com.docker.compose.project"}}	{{.Label "com.docker.compose.project.working_dir"}}' 2>/dev/null \
    | sort -u
}

# emd_project_exists <project> -> 0 if it has any container, running or not.
emd_project_exists() {
  docker ps -aq --filter "label=com.docker.compose.project=$1" 2>/dev/null | grep -q .
}

# emd_stop_server <project>: `docker compose down -v`. 1 if it had nothing.
emd_stop_server() {
  emd_project_exists "$1" || return 1
  emd_compose "$1" down -v
}

# emd_server_ours <worktree> -> 0 if a stack on the port was brought up from it.
emd_server_ours() {
  local proj wd
  while IFS=$'\t' read -r proj wd; do
    [[ -n "$proj" && "$wd" == "$1" ]] && return 0
  done < <(emd_port_stacks)
  return 1
}

# emd_start_server <worktree> <state-dir> <project>: `docker compose up -d`
# from the worktree, on 8012. Waits for a 200.
emd_start_server() {
  local wt="$1" st="$2" proj="$3" code=000 i
  mkdir -p "$st"
  echo "$wt" > "$st/worktree"
  echo "$proj" > "$st/project"
  ( cd "$wt" && COMPOSE_PROJECT_NAME="$proj" EXPO_PORT="$EMD_PORT" docker compose up -d ) || return 1
  # The first request renders the page (web.output is "static"), so a 200
  # means the bundle compiled, not just that the port is open.
  for ((i = 0; i < EMD_POLL_SECONDS; i += 2)); do
    emd_compose "$proj" ps -q --status running | grep -q . \
      || { emd_compose "$proj" logs --tail 20 >&2; return 1; }
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "http://localhost:$EMD_PORT/" || true)"
    [[ "$code" == 200 ]] && break
    sleep 2
  done
  HTTP_CODE="$code"
  [[ "$code" == 200 ]]
}

# emd_find_orphans -> one line per orphan: "<task>\t<worktree>\t<project>".
# An orphan is a task whose worktree folder is gone but whose state dir or
# stack remains: a state dir naming a missing worktree, or a
# lightpaintersapp-* compose project whose working_dir was inside $EMD_POOL
# and no longer exists. <project> is empty when no stack is left.
emd_find_orphans() {
  local d wt task proj seen=" "
  for d in "$EMD_STATE_ROOT"/*/; do
    [[ -d "$d" ]] || continue
    task="$(basename "$d")"; wt="$(cat "$d/worktree" 2>/dev/null || true)"
    [[ -n "$wt" && -d "$wt" ]] && continue
    proj="$(cat "$d/project" 2>/dev/null || emd_project "$task")"
    seen+="$proj "
    emd_project_exists "$proj" || proj=""
    printf '%s\t%s\t%s\n' "$task" "${wt:-?}" "$proj"
  done
  while IFS=$'\t' read -r proj wt; do
    [[ "$proj" == "$EMD_PROJECT_PREFIX"-* && "$seen" != *" $proj "* ]] || continue
    [[ "$wt" == "$EMD_POOL"/* && ! -d "$wt" ]] || continue
    printf '%s\t%s\t%s\n' "(no state)" "$wt" "$proj"
  done < <(docker ps -a --filter label=com.docker.compose.project \
    --format '{{.Label "com.docker.compose.project"}}	{{.Label "com.docker.compose.project.working_dir"}}' 2>/dev/null | sort -u)
}

# emd_clean_orphan <task> <worktree> <project>: down -v, drop its state dir.
emd_clean_orphan() {
  local task="$1" proj="$3"
  [[ -n "$proj" ]] && emd_compose "$proj" down -v
  [[ "$task" != "(no state)" ]] && rm -rf "${EMD_STATE_ROOT:?}/$task"
}

# emd_describe_port -> one line per stack on the port, else the raw listener.
emd_describe_port() {
  local proj wd
  while IFS=$'\t' read -r proj wd; do
    [[ -n "$proj$wd" ]] && printf '  compose project %s  dir %s\n' "${proj:-?}" "${wd:-?}"
  done < <(emd_port_stacks)
  emd_port_stacks | grep -q . || ss -Hltnp "sport = :$EMD_PORT" | sed 's/^/  /'
}
