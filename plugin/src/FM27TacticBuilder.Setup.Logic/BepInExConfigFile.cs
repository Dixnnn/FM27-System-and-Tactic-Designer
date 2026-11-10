// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments and messages.

using System;
using System.Collections.Generic;
using System.Text;

namespace FM27TacticBuilder.Setup
{
    /// <summary>
    /// Reads and changes a BepInEx config file (sections in [brackets], lines "Key = Value",
    /// comments with #). Comments and order are kept.
    /// </summary>
    public sealed class BepInExConfigFile
    {
        private readonly List<string> _lines;

        public BepInExConfigFile(string text)
        {
            _lines = new List<string>((text ?? "").Replace("\r\n", "\n").Split('\n'));
            if (_lines.Count > 0 && _lines[_lines.Count - 1].Length == 0)
                _lines.RemoveAt(_lines.Count - 1);
        }

        /// <summary>The value, or null when the key is missing.</summary>
        public string Get(string section, string key)
        {
            var index = FindKey(section, key);
            return index < 0 ? null : ValueOf(_lines[index]);
        }

        public void Set(string section, string key, string value)
        {
            var index = FindKey(section, key);
            if (index >= 0)
            {
                _lines[index] = key + " = " + value;
                return;
            }

            var sectionIndex = FindSection(section);
            if (sectionIndex < 0)
            {
                if (_lines.Count > 0 && _lines[_lines.Count - 1].Trim().Length > 0)
                    _lines.Add("");
                _lines.Add("[" + section + "]");
                _lines.Add("");
                _lines.Add(key + " = " + value);
                return;
            }

            // Insert after the last entry of the section.
            var insertAt = sectionIndex + 1;
            for (var i = sectionIndex + 1; i < _lines.Count && !IsSection(_lines[i]); i++)
            {
                if (_lines[i].Trim().Length > 0)
                    insertAt = i + 1;
            }
            _lines.Insert(insertAt, key + " = " + value);
        }

        public override string ToString()
        {
            var builder = new StringBuilder();
            foreach (var line in _lines)
                builder.Append(line).Append("\r\n");
            return builder.ToString();
        }

        private int FindSection(string section)
        {
            for (var i = 0; i < _lines.Count; i++)
            {
                if (IsSection(_lines[i]) && string.Equals(_lines[i].Trim().Trim('[', ']').Trim(), section, StringComparison.OrdinalIgnoreCase))
                    return i;
            }
            return -1;
        }

        private int FindKey(string section, string key)
        {
            var start = FindSection(section);
            if (start < 0)
                return -1;
            for (var i = start + 1; i < _lines.Count && !IsSection(_lines[i]); i++)
            {
                var line = _lines[i].Trim();
                if (line.StartsWith("#", StringComparison.Ordinal))
                    continue;
                var eq = line.IndexOf('=');
                if (eq > 0 && string.Equals(line.Substring(0, eq).Trim(), key, StringComparison.OrdinalIgnoreCase))
                    return i;
            }
            return -1;
        }

        private static bool IsSection(string line)
        {
            var trimmed = line.Trim();
            return trimmed.StartsWith("[", StringComparison.Ordinal) && trimmed.EndsWith("]", StringComparison.Ordinal);
        }

        private static string ValueOf(string line)
        {
            var eq = line.IndexOf('=');
            return eq < 0 ? "" : line.Substring(eq + 1).Trim();
        }
    }
}
