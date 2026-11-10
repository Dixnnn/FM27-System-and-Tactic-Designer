// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter's ExporterSettings (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: the plugin's own settings, English only.

using System.Collections.Generic;

namespace FM27TacticBuilder.Setup
{
    public enum SettingKind
    {
        Text,
        Folder,
        Boolean,
        Number
    }

    /// <summary>One plugin setting as it appears in the cfg file.</summary>
    public sealed class SettingDefinition
    {
        public SettingDefinition(string section, string key, SettingKind kind, string defaultValue, string label, string help, int min = 0, int max = 0)
        {
            Min = min;
            Max = max;
            Section = section;
            Key = key;
            Kind = kind;
            DefaultValue = defaultValue;
            Label = label;
            Help = help;
        }

        public string Section { get; }
        public string Key { get; }
        public SettingKind Kind { get; }
        public string DefaultValue { get; }
        public string Label { get; }
        public string Help { get; }

        /// <summary>Range of a number setting.</summary>
        public int Min { get; }
        public int Max { get; }
    }

    /// <summary>
    /// The settings from src/FM27TacticBuilder/PluginConfig.cs. Add new settings there and here
    /// (a test checks that both lists match).
    /// </summary>
    public static class BuilderSettings
    {
        public const string ConfigFileName = "fm27.tacticbuilder.cfg";

        public static readonly IReadOnlyList<SettingDefinition> All = new[]
        {
            new SettingDefinition("Hotkeys", "BuildTactic", SettingKind.Text, "F8",
                "Key: build tactic", "Reads the squad on screen and opens your tactic, e.g. F8 or Ctrl+Shift+T. Applies after restarting the game."),
            new SettingDefinition("Hotkeys", "ExportOnly", SettingKind.Text, "Ctrl+F8",
                "Key: only save the list", "Saves the list on screen as CSV without opening the tactic."),
            new SettingDefinition("Hotkeys", "Diagnostics", SettingKind.Text, "Ctrl+Shift+F8",
                "Key: diagnostics", "UI dump for troubleshooting after a game patch."),
            new SettingDefinition("Report", "OpenInBrowser", SettingKind.Boolean, "true",
                "Open the tactic in the browser", "off = only save the page; open it yourself from the output folder."),
            new SettingDefinition("Report", "InGameMessages", SettingKind.Boolean, "true",
                "Messages in the game", "A small box in the top right corner while the plugin works."),
            new SettingDefinition("View", "InstallView", SettingKind.Boolean, "true",
                "Install the squad view", "Copies the built-in view into FM27's views folder, so Import View finds it."),
            new SettingDefinition("Export", "OutputFolder", SettingKind.Folder, "",
                "Output folder", "empty = Documents\\Sports Interactive\\FM27 Tactic Builder"),
            new SettingDefinition("Export", "ScanColumns", SettingKind.Boolean, "false",
                "Also scroll sideways", "slower, not needed in FM27"),
            new SettingDefinition("Export", "FramesPerStep", SettingKind.Number, "1",
                "Wait per scroll step", "raise it if values are missing", 1, 60),
            new SettingDefinition("Export", "RowsPerStep", SettingKind.Number, "200",
                "Rows per scroll step", "more = faster; 0 = don't enlarge the list", 0, 1000),
        };
    }
}
