#!/usr/bin/env bash
# Builds the downloads from the finished plugin (based on FM View Exporter's packaging/package.sh):
#   FM27TacticBuilder-<version>-plugin.zip        only the plugin (BepInEx already installed)
#   FM27TacticBuilder-<version>-full-package.zip  BepInEx + plugin, extract next to fm.exe
#   FM27TacticBuilder-<version>-setup.exe         setup program with the full package inside
# Usage: plugin/packaging/package.sh <version> [--plugin-only]
# Needs: the built page (npm run build), dotnet 8 SDK, zip, curl. The full package downloads BepInEx.
set -euo pipefail

VERSION="${1:-dev}"
MODE="${2:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
# shellcheck source=bepinex.env
source "$ROOT/packaging/bepinex.env"
BEPINEX_URL="${BEPINEX_URL_OVERRIDE:-$BEPINEX_URL}"

DIST="$ROOT/dist"
STAGE="$DIST/stage"
NAME="FM27TacticBuilder"

rm -rf "$DIST"
mkdir -p "$STAGE"

dotnet build "$ROOT/src/$NAME" -c Release -p:InformationalVersion="$VERSION" -o "$STAGE/build" > "$STAGE/build.log" || { cat "$STAGE/build.log"; exit 1; }

# Only the plugin
PLUGIN="$STAGE/plugin/BepInEx/plugins/$NAME"
mkdir -p "$PLUGIN"
cp "$STAGE/build/$NAME.dll" "$PLUGIN/"
cp "$REPO/LICENSE" "$PLUGIN/LICENSE.txt"
cp "$ROOT/packaging/README.txt" "$PLUGIN/"
cp "$ROOT/packaging/THIRD-PARTY-NOTICES.txt" "$PLUGIN/"
mkdir -p "$PLUGIN/licenses"
cp "$ROOT/packaging/licenses/OFL-1.1.txt" "$PLUGIN/licenses/"
(cd "$STAGE/plugin" && zip -qr "$DIST/$NAME-$VERSION-plugin.zip" .)

if [ "$MODE" != "--plugin-only" ]; then
  # Full package with BepInEx
  FULL="$STAGE/full"
  mkdir -p "$FULL"
  curl -fsSL --retry 3 "$BEPINEX_URL" -o "$STAGE/bepinex.zip"
  ACTUAL_SHA="$(sha256sum "$STAGE/bepinex.zip" | cut -d' ' -f1)"
  echo "BepInEx #$BEPINEX_BUILD zip sha256: $ACTUAL_SHA"
  if [ -n "${BEPINEX_SHA256:-}" ] && [ "$ACTUAL_SHA" != "$BEPINEX_SHA256" ]; then
    echo "::error::BepInEx checksum differs: expected $BEPINEX_SHA256, got $ACTUAL_SHA"
    exit 1
  fi
  unzip -q "$STAGE/bepinex.zip" -d "$FULL"
  check_file() {
    local file="$1" expected="$2" actual
    actual="$(sha256sum "$file" | cut -d' ' -f1)"
    if [ -n "$expected" ] && [ "$actual" != "$expected" ]; then
      echo "::error::Checksum of $(basename "$file") differs: expected $expected, got $actual"
      exit 1
    fi
  }
  check_file "$FULL/BepInEx/core/BepInEx.Core.dll" "${BEPINEX_CORE_SHA256:-}"
  check_file "$FULL/winhttp.dll" "${WINHTTP_SHA256:-}"
  cp -r "$STAGE/plugin/BepInEx" "$FULL/"
  mkdir -p "$FULL/BepInEx/plugins/$NAME/licenses"
  cp "$ROOT/packaging/licenses/"*.txt "$FULL/BepInEx/plugins/$NAME/licenses/"
  cp "$ROOT/packaging/README.txt" "$FULL/FM27 Tactic Builder - README.txt"
  (cd "$FULL" && zip -qr "$DIST/$NAME-$VERSION-full-package.zip" .)
  PAYLOAD="-p:PayloadZip=$DIST/$NAME-$VERSION-full-package.zip"
else
  PAYLOAD=""
  echo "Plugin only: no full package, and the setup is a developer build without a package."
fi

# Setup program (.NET Framework 4.8) with the full package embedded
# shellcheck disable=SC2086
dotnet build "$ROOT/src/$NAME.Setup" -c Release $PAYLOAD -p:InformationalVersion="$VERSION" -o "$STAGE/setup" > "$STAGE/setup.log" || { cat "$STAGE/setup.log"; exit 1; }
cp "$STAGE/setup/$NAME-Setup.exe" "$DIST/$NAME-$VERSION-setup.exe"

(cd "$DIST" && sha256sum ./*.zip ./*.exe > SHA256SUMS.txt)
rm -rf "$STAGE"
ls -la "$DIST"
