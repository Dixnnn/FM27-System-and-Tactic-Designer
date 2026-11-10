// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments and messages.

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;

namespace FM27TacticBuilder.Setup
{
    /// <summary>
    /// Finds the Football Manager game folder in the Steam libraries.
    /// </summary>
    public static class SteamLibraries
    {
        public const string GameFolderName = "Football Manager 27";
        public const string GameExe = "fm.exe";

        private static readonly Regex PathEntry = new Regex("\"path\"\\s+\"((?:[^\"\\\\]|\\\\.)*)\"", RegexOptions.IgnoreCase);

        /// <summary>Reads the library folders from steamapps\libraryfolders.vdf.</summary>
        public static List<string> ParseLibraryFolders(string vdfText)
        {
            var result = new List<string>();
            foreach (Match match in PathEntry.Matches(vdfText ?? ""))
            {
                var path = Regex.Unescape(match.Groups[1].Value);
                if (path.Length > 0 && !result.Contains(path, StringComparer.OrdinalIgnoreCase))
                    result.Add(path);
            }
            return result;
        }

        /// <summary>
        /// Looks for the game folder in all libraries of the given Steam installations.
        /// <paramref name="readFile"/> returns a file's content or null, <paramref name="fileExists"/> checks a file.
        /// </summary>
        public static string FindGameFolder(IEnumerable<string> steamRoots, Func<string, string> readFile, Func<string, bool> fileExists)
        {
            var libraries = new List<string>();
            foreach (var root in steamRoots)
            {
                if (string.IsNullOrWhiteSpace(root))
                    continue;
                AddUnique(libraries, root);
                var vdf = readFile(Path.Combine(root, "steamapps", "libraryfolders.vdf"));
                if (vdf != null)
                {
                    foreach (var library in ParseLibraryFolders(vdf))
                        AddUnique(libraries, library);
                }
            }

            foreach (var library in libraries)
            {
                var folder = Path.Combine(library, "steamapps", "common", GameFolderName);
                if (fileExists(Path.Combine(folder, GameExe)))
                    return folder;
            }
            return null;
        }

        private static void AddUnique(List<string> list, string path)
        {
            var normalized = path.TrimEnd('\\', '/');
            if (!list.Contains(normalized, StringComparer.OrdinalIgnoreCase))
                list.Add(normalized);
        }

        private static bool Contains(this List<string> list, string value, StringComparer comparer)
        {
            foreach (var item in list)
            {
                if (comparer.Equals(item, value))
                    return true;
            }
            return false;
        }
    }
}
