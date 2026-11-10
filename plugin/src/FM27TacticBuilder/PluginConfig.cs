// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: own keys and settings, English descriptions.
// When you add a setting here, add it to Setup.Logic/BuilderSettings.cs too.

using System;
using System.IO;
using BepInEx.Configuration;

namespace FM27TacticBuilder
{
    /// <summary>Settings in BepInEx\config\fm27.tacticbuilder.cfg (the setup program edits them too).</summary>
    internal sealed class PluginConfig
    {
        public PluginConfig(ConfigFile config)
        {
            BuildHotkey = config.Bind("Hotkeys", "BuildTactic", "F8",
                "Reads the player list on screen and opens your tactic in the browser. Examples: F8, Ctrl+Shift+T.");
            ExportHotkey = config.Bind("Hotkeys", "ExportOnly", "Ctrl+F8",
                "Only saves the player list on screen as CSV (squad, player database or shortlist).");
            DiagnosticsHotkey = config.Bind("Hotkeys", "Diagnostics", "Ctrl+Shift+F8",
                "Writes a dump of the game's user interface (helps adapt the plugin to a new FM patch).");
            OpenInBrowser = config.Bind("Report", "OpenInBrowser", true,
                "true = open the tactic in your default browser after reading the squad.");
            InGameMessages = config.Bind("Report", "InGameMessages", true,
                "true = show a small message in the top right corner of the game while the plugin works.");
            InstallView = config.Bind("View", "InstallView", true,
                "true = copy the built-in squad view into FM27's views folder at start, so Import View finds it.");
            OutputFolder = config.Bind("Export", "OutputFolder", "",
                "Where the tactic page and the exports go. Empty = Documents\\Sports Interactive\\FM27 Tactic Builder.");
            ScanColumns = config.Bind("Export", "ScanColumns", false,
                "true = also scroll sideways through all columns. Slower; only needed if the game leaves off-screen columns empty.");
            FramesPerStep = config.Bind("Export", "FramesPerStep", 1,
                "Frames the game gets after each scroll step at least. Raise it if values are missing.");
            RowsPerStep = config.Bind("Export", "RowsPerStep", 200,
                "Rows the game draws at once while reading (the list is briefly made taller). More = faster. 0 = don't enlarge the list.");
        }

        public ConfigEntry<string> BuildHotkey { get; }
        public ConfigEntry<string> ExportHotkey { get; }
        public ConfigEntry<string> DiagnosticsHotkey { get; }
        public ConfigEntry<bool> OpenInBrowser { get; }
        public ConfigEntry<bool> InGameMessages { get; }
        public ConfigEntry<bool> InstallView { get; }
        public ConfigEntry<string> OutputFolder { get; }
        public ConfigEntry<bool> ScanColumns { get; }
        public ConfigEntry<int> FramesPerStep { get; }
        public ConfigEntry<int> RowsPerStep { get; }
    }

    internal static class OutputPaths
    {
        public static string SportsInteractiveFolder =>
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Sports Interactive");

        public static string BaseFolder
        {
            get
            {
                var configured = Plugin.Settings.OutputFolder.Value;
                return !string.IsNullOrWhiteSpace(configured) ? configured : Path.Combine(SportsInteractiveFolder, "FM27 Tactic Builder");
            }
        }

        public static string ExportsFolder => Path.Combine(BaseFolder, "exports");

        public static string DiagnosticsFolder => Path.Combine(BaseFolder, "Diagnostics");

        /// <summary>The tactic page; one fixed name, so the browser keeps your saved picks between exports.</summary>
        public static string PagePath => Path.Combine(BaseFolder, "FM27 Tactic Builder.html");

        public static string EnsureFolder(string folder)
        {
            Directory.CreateDirectory(folder);
            return folder;
        }
    }
}
