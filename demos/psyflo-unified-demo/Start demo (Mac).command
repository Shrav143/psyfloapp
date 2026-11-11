#!/bin/bash
# Double-click to start the Psyflo demo. Needs Node.js 20+ (nodejs.org).
cd "$(dirname "$0")" || exit 1
# Finder-launched scripts don't always see Node: add the usual install places
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.volta/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
if ! command -v node >/dev/null 2>&1; then
  echo "Could not find Node.js. Install the LTS version from https://nodejs.org, then double-click this again."
  read -p "Press Enter to close"; exit 1
fi
echo "Using Node $(node --version)"
(sleep 2; open "http://localhost:4000") &
echo "Psyflo demo running at http://localhost:4000 — keep this window open; close it to stop."
node server/index.js
read -p "The demo stopped. Press Enter to close"
