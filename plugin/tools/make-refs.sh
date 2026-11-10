#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Based on FM View Exporter's tools/make-refs.sh (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
# Modified for FM27 Tactic Builder: English comments.
#
# Makes the reference assemblies in lib/ref from an FM installation in which BepInEx has run once.
# The files hold only interfaces, no program code.
#
#   ./tools/make-refs.sh "<game folder>" fm27 be755
#
# Needs: dotnet SDK and Refasmer (dotnet tool install -g JetBrains.Refasmer.CliTool).
set -euo pipefail

GAME="$1"
GAME_TAG="${2:-fm27}"
BEPINEX_TAG="${3:-be755}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GAME_OUT="$ROOT/lib/ref/$GAME_TAG"
BEPINEX_OUT="$ROOT/lib/ref/bepinex-$BEPINEX_TAG"
mkdir -p "$GAME_OUT" "$BEPINEX_OUT"

# Only Unity and .NET base libraries. Sports Interactive libraries (SI.*, FM.*)
# are deliberately not referenced; the plugin reads the UI through Unity only.
GAME_DLLS=(
  Il2Cppmscorlib Il2CppSystem Il2CppSystem.Core
  UnityEngine UnityEngine.CoreModule UnityEngine.UIElementsModule
  UnityEngine.TextCoreTextEngineModule UnityEngine.TextCoreFontEngineModule
  UnityEngine.HierarchyCoreModule UnityEngine.IMGUIModule UnityEngine.InputLegacyModule
  UnityEngine.InputForUIModule UnityEngine.PropertiesModule UnityEngine.SharedInternalsModule
  UnityEngine.TextRenderingModule UnityEngine.JSONSerializeModule
)
BEPINEX_DLLS=(
  BepInEx.Core BepInEx.Unity.IL2CPP BepInEx.Unity.Common BepInEx.Preloader.Core
  Il2CppInterop.Runtime Il2CppInterop.Common 0Harmony SemanticVersioning
)

for dll in "${GAME_DLLS[@]}"; do
  refasmer -c --omit-non-api-members=false -O "$GAME_OUT" "$GAME/BepInEx/interop/$dll.dll"
done
for dll in "${BEPINEX_DLLS[@]}"; do
  refasmer -c --omit-non-api-members=true -O "$BEPINEX_OUT" "$GAME/BepInEx/core/$dll.dll"
done

echo "Done: $GAME_OUT, $BEPINEX_OUT"
