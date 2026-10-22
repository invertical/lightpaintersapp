#!/usr/bin/env bash
# Publish main to the staging branch (EAS Update), and build a new Android APK
# or iOS app when one is needed.
#
#   scripts/publish-staging.sh [-m "message"] [--skip-checks] [--apk | --no-apk]
#                              [--ios | --no-ios] [--yes] [--report-builds]
#
# Run it on Dan's Linux machine, from anywhere inside the root checkout
# (/var/www/personal/lightpainters/lightpaintersapp). Phones get the update in the preview builds
# (channel "staging"): the APK on Android, the ad hoc build on iPhone. Expo Go
# still opens it too (project lightpainters, branch "staging"), but can't
# sign in with Apple, Google or Facebook. Nothing is pushed to GitHub and
# nothing goes to the API server.
#
# Before publishing it refuses unless: the checkout is on main with no
# uncommitted or untracked files, node_modules matches package-lock.json, you
# are logged in to Expo, the public API answers, and the EAS "preview" environment doesn't set a
# different API address. Then it runs lint and typecheck, shows what it will
# publish and asks to confirm. Afterwards it checks that the uploaded iOS and
# Android bundles really point at the public API, not the LAN one in .env.local.
#
# Then the builds, Android first, then iOS: each offers a new build (y/N) when
# you pass --apk / --ios, when there is no finished build, when package.json,
# package-lock.json, app.json, app.config.ts or eas.json changed since the last
# one (an update can't add native code), or when the last one's download link
# expires within 3 days (installed builds keep working). Otherwise it prints the
# latest build's link. --no-apk / --no-ios skip that platform; --yes answers yes
# to every question; --report-builds prints why a build is suggested but never
# starts one (for /downpush). A build uses 1 of the Free plan's 15 Android or 15 iOS
# builds a month and runs on Expo's servers; the script doesn't wait for it.
#
# iOS builds install only on registered iPhones: add one with
# `npx eas-cli@latest device:create`, and build again after adding a phone. The
# iOS build runs interactively, because EAS may ask for the Apple account (the
# first time) or to add newly registered phones to the provisioning profile.
set -euo pipefail

API_URL='https://www.lightpainters.com/v2'
BRANCH='staging'
ENVIRONMENT='preview'
EAS=(npx --yes eas-cli@latest)
BUILD_PROFILE='preview'
NATIVE_FILES=(package.json package-lock.json app.json app.config.ts eas.json)
EXPIRY_WARN_DAYS=3
BUILDS_URL='https://expo.dev/accounts/lightpainters/projects/lightpainters/builds'

MESSAGE=''
SKIP_CHECKS=0
ASSUME_YES=0
APK='auto'
IOS='auto'
REPORT_BUILDS=0

usage() { sed -n '2,35p' "$0" | sed 's/^# \{0,1\}//'; }
step() { printf '\n── %s\n' "$*"; }
die() {
  printf '\npublish-staging: %s\n' "$*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m | --message)
      MESSAGE="${2:?-m needs a message}"
      shift 2
      ;;
    --skip-checks)
      SKIP_CHECKS=1
      shift
      ;;
    --apk)
      APK='yes'
      shift
      ;;
    --no-apk)
      APK='no'
      shift
      ;;
    --ios)
      IOS='yes'
      shift
      ;;
    --no-ios)
      IOS='no'
      shift
      ;;
    -y | --yes)
      ASSUME_YES=1
      shift
      ;;
    --report-builds)
      REPORT_BUILDS=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) die "unknown option: $1 (try --help)" ;;
  esac
done

ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$ROOT"

step 'git'
BRANCH_NOW="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH_NOW" == main ]] || die "on branch '$BRANCH_NOW'; staging is published from main"
DIRTY="$(git status --porcelain)"
[[ -z "$DIRTY" ]] || die "uncommitted or untracked files would be published:
$DIRTY"
SHA="$(git rev-parse --short HEAD)"
echo "main at $SHA  $(git log -1 --format=%s)"
if AHEAD="$(git rev-list --count origin/main..HEAD 2>/dev/null)" && [[ "$AHEAD" -gt 0 ]]; then
  echo "note: $AHEAD commit(s) not on GitHub yet (as of the last fetch); publishing doesn't need them there"
fi

step 'dependencies'
npm ls --depth=0 >/dev/null 2>&1 || die 'node_modules does not match package-lock.json; run: npm ci'
echo 'node_modules matches package-lock.json'

step 'expo login'
WHO="$("${EAS[@]}" whoami 2>/dev/null | head -1)" || true
[[ -n "$WHO" && "$WHO" != *'Not logged in'* ]] || die 'not logged in to Expo; run: npx eas-cli@latest login'
echo "logged in as $WHO"

step "EAS '$ENVIRONMENT' environment"
SERVER_URL="$("${EAS[@]}" env:list "$ENVIRONMENT" 2>/dev/null | sed -n 's/^EXPO_PUBLIC_API_URL=//p')"
if [[ -n "$SERVER_URL" && "$SERVER_URL" != "$API_URL" ]]; then
  die "the EAS '$ENVIRONMENT' environment sets EXPO_PUBLIC_API_URL to $SERVER_URL, not $API_URL; fix it on expo.dev (project → Environment variables) first"
fi
echo "EXPO_PUBLIC_API_URL: ${SERVER_URL:-not set there; the command line sets it}"

step 'API'
# An update that can't reach its API is a sign-in screen that fails on every call.
API_STATUS="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$API_URL/countries" || true)"
[[ "$API_STATUS" == 200 ]] || die "$API_URL doesn't answer yet (GET /countries gave ${API_STATUS:-no answer}); publish once it's live"
echo "$API_URL answers"

if [[ $SKIP_CHECKS -eq 0 ]]; then
  step 'lint'
  npx expo lint || die 'lint failed'
  step 'typecheck'
  npx tsc --noEmit || die 'typecheck failed'
fi

MESSAGE="${MESSAGE:-Staging $(date +%F) · $SHA}"
step 'about to publish'
echo "  commit       $SHA"
echo "  branch       $BRANCH"
echo "  environment  $ENVIRONMENT"
echo "  API          $API_URL"
echo "  message      $MESSAGE"
if [[ $ASSUME_YES -eq 0 ]]; then
  read -r -p 'Publish to the team? [y/N] ' ANSWER
  [[ "$ANSWER" =~ ^[Yy]$ ]] || die 'cancelled; nothing published'
fi

step 'publish'
EXPO_PUBLIC_API_URL="$API_URL" "${EAS[@]}" update \
  --branch "$BRANCH" \
  --environment "$ENVIRONMENT" \
  --message "$MESSAGE" \
  --non-interactive

step 'verify the uploaded bundles'
LAN_URL="$(sed -n 's/^EXPO_PUBLIC_API_URL=//p' .env.local 2>/dev/null | tr -d "\"'" || true)"
BAD=0
for platform in ios android; do
  BUNDLE="$(ls dist/_expo/static/js/"$platform"/*.hbc 2>/dev/null | head -1)"
  if [[ -z "$BUNDLE" ]]; then
    echo "  $platform: no bundle found in dist/"
    BAD=1
  elif ! grep -aqF "$API_URL" "$BUNDLE"; then
    echo "  $platform: bundle does NOT contain $API_URL"
    BAD=1
  elif [[ -n "$LAN_URL" && "$LAN_URL" != "$API_URL" ]] && grep -aqF "$LAN_URL" "$BUNDLE"; then
    echo "  $platform: bundle contains the .env.local address"
    BAD=1
  else
    echo "  $platform: points at $API_URL"
  fi
done
if [[ $BAD -ne 0 ]]; then
  die "the update is published but its API address looks wrong. To put the previous one back:
  open expo.dev → lightpainters → Updates → $BRANCH, copy the previous update group ID, then run
  npx eas-cli@latest update:republish --group <that id>"
fi

echo "Published $SHA to $BRANCH."

# offer_build <platform> <auto|yes|no> <label>: print the latest build, and offer a new one
# when it's needed. Never fails the script: the update is already published.
offer_build() {
  local platform="$1" mode="$2" label="$3"
  [[ "$mode" == no ]] && return 0

  step "$label build"
  local builds_json
  if ! builds_json="$("${EAS[@]}" build:list --platform "$platform" --build-profile "$BUILD_PROFILE" --limit 10 --json --non-interactive 2>/dev/null)"; then
    echo "couldn't list the $label builds; the update is published. Check $BUILDS_URL"
    return 0
  fi
  # One line: running build id, then the newest finished build's id, commit, expiry date,
  # days until it expires. "-" for anything missing.
  local running_id last_id last_sha last_expires days_left
  read -r running_id last_id last_sha last_expires days_left < <(node -e '
    const builds = JSON.parse(require("fs").readFileSync(0, "utf8") || "[]");
    const running = builds.find((b) => ["NEW", "IN_QUEUE", "IN_PROGRESS", "PENDING_CANCEL"].includes(b.status));
    const done = builds.find((b) => b.status === "FINISHED");
    const expires = done && done.expirationDate;
    const days = expires ? Math.floor((Date.parse(expires) - Date.now()) / 86400000) : null;
    console.log([running && running.id, done && done.id, done && done.gitCommitHash, expires && expires.slice(0, 10), days]
      .map((v) => (v === null || v === undefined || v === "" ? "-" : v)).join(" "));
  ' <<<"$builds_json")

  if [[ "$running_id" != - ]]; then
    echo "A $label build is already running: $BUILDS_URL/$running_id"
    echo 'Not starting another. Install from that link when it finishes.'
    return 0
  fi

  local reasons=() changed
  [[ "$mode" == yes ]] && reasons+=("you asked for one")
  if [[ "$last_id" == - ]]; then
    reasons+=("there is no finished $label build yet")
  else
    if [[ "$last_sha" == - ]] || ! git cat-file -e "$last_sha^{commit}" 2>/dev/null; then
      reasons+=("the last build's commit isn't in this checkout, so native changes can't be ruled out")
    else
      changed="$(git diff --name-only "$last_sha" HEAD -- "${NATIVE_FILES[@]}" | paste -sd ' ')"
      [[ -n "$changed" ]] && reasons+=("changed since the last build (${last_sha:0:7}): $changed")
    fi
    if [[ "$days_left" != - && "$days_left" -lt "$EXPIRY_WARN_DAYS" ]]; then
      reasons+=("the last build's download link expires $last_expires")
    fi
    echo "Latest $label build: $BUILDS_URL/$last_id"
    echo "  built from ${last_sha:0:7}; download link expires $last_expires ($days_left day(s))"
  fi

  if [[ ${#reasons[@]} -eq 0 ]]; then
    echo "No new $label build needed: phones get this update in the build they have."
    return 0
  fi

  echo "A new $label build is suggested because:"
  printf '  - %s\n' "${reasons[@]}"
  echo "It uses 1 of the Free plan's 15 $label builds a month and takes about 10-25 minutes on Expo's servers."
  local answer flag
  flag="$([[ "$platform" == android ]] && echo apk || echo ios)"
  if [[ $REPORT_BUILDS -eq 1 ]]; then
    echo "Not started (--report-builds)."
    return 0
  fi
  if [[ $ASSUME_YES -eq 0 ]]; then
    read -r -p "Build a new $label app? [y/N] " answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
      echo "No $label build started. Run with --$flag later to build one."
      return 0
    fi
  fi

  step "build the $label app"
  if [[ "$platform" == android ]]; then
    "${EAS[@]}" build --platform android --profile "$BUILD_PROFILE" --message "$MESSAGE" --non-interactive --no-wait ||
      { echo "The Android build didn't start; see above."; return 0; }
    echo "Started. When it finishes, install it from the build link above (also listed at $BUILDS_URL)."
  else
    "${EAS[@]}" build --platform ios --profile "$BUILD_PROFILE" --message "$MESSAGE" --no-wait ||
      { echo "The iOS build didn't start; see above."; return 0; }
    echo "Started. When it finishes, open the build link above on a registered iPhone (also listed at $BUILDS_URL)."
  fi
}

offer_build android "$APK" Android
offer_build ios "$IOS" iOS
