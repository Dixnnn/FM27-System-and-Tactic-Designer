// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: build/export/diagnostics keys, in-game messages, view install.

using System;
using FM27TacticBuilder.Diagnostics;
using FM27TacticBuilder.Export;
using FM27TacticBuilder.Input;
using FM27TacticBuilder.Report;
using FM27TacticBuilder.Ui;
using UnityEngine;

namespace FM27TacticBuilder
{
    /// <summary>Runs every frame inside the game and reacts to the plugin's keys.</summary>
    public class TacticBuilderBehaviour : MonoBehaviour
    {
        private HotkeyWatcher? _build;
        private HotkeyWatcher? _export;
        private HotkeyWatcher? _diagnostics;
        private ExportRun? _run;
        private bool _greeted;

        public TacticBuilderBehaviour(IntPtr pointer) : base(pointer)
        {
        }

        public void Start()
        {
            _build = HotkeyWatcher.FromConfig(Plugin.Settings.BuildHotkey.Value, "building a tactic", "F8");
            _export = HotkeyWatcher.FromConfig(Plugin.Settings.ExportHotkey.Value, "saving the list", "Ctrl+F8");
            _diagnostics = HotkeyWatcher.FromConfig(Plugin.Settings.DiagnosticsHotkey.Value, "diagnostics", "Ctrl+Shift+F8");
            ViewInstaller.Run();
        }

        public void Update()
        {
            Toast.Tick();
            if (_run != null)
            {
                _run.Tick();
                if (_run.Finished)
                    _run = null;
            }

            try
            {
                if (_diagnostics != null && _diagnostics.WasPressed())
                {
                    var path = UiDumper.DumpToFile();
                    Toast.Show("UI dump written", path, 8f);
                }

                var build = _build != null && _build.WasPressed();
                var export = !build && _export != null && _export.WasPressed();
                if (build || export)
                {
                    if (_run != null)
                    {
                        Toast.Show("Still reading", "The plugin is still reading the list. Please wait a moment.", 4f);
                    }
                    else
                    {
                        _run = new ExportRun(openPage: build && Plugin.Settings.OpenInBrowser.Value, buildMode: build);
                    }
                }

                // A short hello the first time the user is in the game, so they know the plugin is there.
                if (!_greeted && Time.unscaledTime > 20f)
                {
                    _greeted = true;
                    if (Plugin.Settings.InGameMessages.Value)
                        Toast.Show($"{PluginInfo.Name} is ready",
                            $"Open your Squad screen, switch to the {Core.ViewFiles.ViewName} view and press {_build?.Name ?? "F8"} to build a tactic for your players.", 10f);
                }
            }
            catch (Exception ex)
            {
                Plugin.Logger.LogError($"Error while checking the keys: {ex}");
            }
        }
    }
}
