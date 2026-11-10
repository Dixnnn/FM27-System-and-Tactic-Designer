// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: own plugin identity, English messages, view install, own behaviour.

using BepInEx;
using BepInEx.Logging;
using BepInEx.Unity.IL2CPP;
using UnityEngine;

namespace FM27TacticBuilder
{
    internal static class PluginInfo
    {
        public const string Guid = "fm27.tacticbuilder";
        public const string Name = "FM27 Tactic Builder";
        // Keep in step with plugin/Directory.Build.props and package.json (a test checks this).
        public const string Version = "0.5.1";
    }

    /// <summary>
    /// Entry point for BepInEx. The plugin only reads what the game shows on screen: it never
    /// changes a save game, never edits game files and never connects to the internet.
    /// </summary>
    [BepInPlugin(PluginInfo.Guid, PluginInfo.Name, PluginInfo.Version)]
    public class Plugin : BasePlugin
    {
        internal static ManualLogSource Logger { get; private set; } = null!;
        internal static PluginConfig Settings { get; private set; } = null!;
        internal static BepInEx.Configuration.ConfigFile ConfigFile { get; private set; } = null!;

        public override void Load()
        {
            Logger = Log;
            ConfigFile = Config;
            Settings = new PluginConfig(Config);

            Logger.LogInfo($"{PluginInfo.Name} {PluginInfo.Version} loaded. Game: {Application.productName} {Application.version}, Unity {Application.unityVersion}");
            Logger.LogInfo($"Output folder: {OutputPaths.BaseFolder}");
            Logger.LogInfo($"Keys: {Settings.BuildHotkey.Value} = build a tactic from the list on screen, " +
                           $"{Settings.ExportHotkey.Value} = only save the list, {Settings.DiagnosticsHotkey.Value} = UI dump for troubleshooting.");

            AddComponent<TacticBuilderBehaviour>();
        }
    }
}
