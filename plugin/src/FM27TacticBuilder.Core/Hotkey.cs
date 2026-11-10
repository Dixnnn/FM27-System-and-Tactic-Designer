// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments, ToString().

using System;
using System.Collections.Generic;

namespace FM27TacticBuilder.Core
{
    /// <summary>
    /// A key combination such as "F8" or "Ctrl+Shift+E", as a Windows virtual-key code.
    /// The plugin asks Windows for the key state, so it works whatever input system the game uses.
    /// </summary>
    public readonly struct Hotkey
    {
        public const int VkShift = 0x10;
        public const int VkControl = 0x11;
        public const int VkAlt = 0x12;

        private static readonly Dictionary<string, int> NamedKeys = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Insert"] = 0x2D, ["Delete"] = 0x2E, ["Home"] = 0x24, ["End"] = 0x23,
            ["PageUp"] = 0x21, ["PageDown"] = 0x22, ["Pause"] = 0x13, ["ScrollLock"] = 0x91,
        };

        public Hotkey(int virtualKey, bool ctrl, bool shift, bool alt)
        {
            VirtualKey = virtualKey;
            Ctrl = ctrl;
            Shift = shift;
            Alt = alt;
        }

        public int VirtualKey { get; }
        public bool Ctrl { get; }
        public bool Shift { get; }
        public bool Alt { get; }

        public static bool TryParse(string? text, out Hotkey hotkey)
        {
            hotkey = default;
            if (string.IsNullOrWhiteSpace(text))
                return false;

            bool ctrl = false, shift = false, alt = false;
            int? key = null;
            foreach (var rawPart in text!.Split('+'))
            {
                var part = rawPart.Trim();
                if (part.Equals("Ctrl", StringComparison.OrdinalIgnoreCase) || part.Equals("Control", StringComparison.OrdinalIgnoreCase))
                    ctrl = true;
                else if (part.Equals("Shift", StringComparison.OrdinalIgnoreCase))
                    shift = true;
                else if (part.Equals("Alt", StringComparison.OrdinalIgnoreCase))
                    alt = true;
                else if (key == null && TryParseKey(part, out var vk))
                    key = vk;
                else
                    return false;
            }

            if (key == null)
                return false;

            hotkey = new Hotkey(key.Value, ctrl, shift, alt);
            return true;
        }

        /// <summary>"Ctrl+Shift+F8" style text, for messages.</summary>
        public override string ToString()
        {
            var name = VirtualKey >= 0x70 && VirtualKey <= 0x87 ? "F" + (VirtualKey - 0x70 + 1)
                : VirtualKey >= '0' && VirtualKey <= 'Z' ? ((char)VirtualKey).ToString()
                : NameOf(VirtualKey);
            return (Ctrl ? "Ctrl+" : "") + (Shift ? "Shift+" : "") + (Alt ? "Alt+" : "") + name;
        }

        private static string NameOf(int vk)
        {
            foreach (var pair in NamedKeys)
            {
                if (pair.Value == vk)
                    return pair.Key;
            }
            return "0x" + vk.ToString("X2");
        }

        private static bool TryParseKey(string name, out int vk)
        {
            vk = 0;
            if (name.Length >= 2 && (name[0] == 'F' || name[0] == 'f')
                && int.TryParse(name.Substring(1), out var n) && n >= 1 && n <= 24)
            {
                vk = 0x70 + n - 1;
                return true;
            }

            if (name.Length == 1)
            {
                var c = char.ToUpperInvariant(name[0]);
                if ((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'))
                {
                    vk = c;
                    return true;
                }
            }

            return NamedKeys.TryGetValue(name, out vk);
        }
    }
}
