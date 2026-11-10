// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English messages, Name property.

using System;
using System.Runtime.InteropServices;
using FM27TacticBuilder.Core;

namespace FM27TacticBuilder.Input
{
    /// <summary>
    /// Asks Windows directly whether a key combination is pressed. That works whatever input system
    /// the game uses, and only reacts while the game window is in front.
    /// </summary>
    internal sealed class HotkeyWatcher
    {
        private readonly Hotkey _hotkey;
        private bool _wasDown;

        private HotkeyWatcher(Hotkey hotkey)
        {
            _hotkey = hotkey;
        }

        public string Name => _hotkey.ToString();

        public static HotkeyWatcher? FromConfig(string text, string purpose, string fallback)
        {
            if (Hotkey.TryParse(text, out var hotkey))
                return new HotkeyWatcher(hotkey);

            Plugin.Logger.LogWarning($"Key \"{text}\" for {purpose} not recognised, using {fallback}.");
            return Hotkey.TryParse(fallback, out hotkey) ? new HotkeyWatcher(hotkey) : null;
        }

        public bool WasPressed()
        {
            var down = IsDown(_hotkey.VirtualKey)
                && IsDown(Hotkey.VkControl) == _hotkey.Ctrl
                && IsDown(Hotkey.VkShift) == _hotkey.Shift
                && IsDown(Hotkey.VkAlt) == _hotkey.Alt;

            var pressed = down && !_wasDown && GameWindowHasFocus();
            _wasDown = down;
            return pressed;
        }

        private static bool IsDown(int virtualKey) => (GetAsyncKeyState(virtualKey) & 0x8000) != 0;

        private static bool GameWindowHasFocus()
        {
            var window = GetForegroundWindow();
            if (window == IntPtr.Zero)
                return false;
            GetWindowThreadProcessId(window, out var processId);
            return processId == (uint)Environment.ProcessId;
        }

        [DllImport("user32.dll")]
        private static extern short GetAsyncKeyState(int vKey);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    }
}
