// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments; ExportFileNames merged into this file.

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace FM27TacticBuilder.Core
{
    /// <summary>
    /// Works out the name of the screen from the element names around the player table,
    /// for the file name: squad, player-database, shortlist.
    /// </summary>
    public static class ViewNames
    {
        public const string Squad = "squad";
        public const string PlayerDatabase = "player-database";
        public const string Shortlist = "shortlist";

        private const string TablePrefix = "playertable";

        /// <summary>Known FM27 panels whose names don't end in "Screen".</summary>
        private static readonly Dictionary<string, string> KnownPanels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["PlayerSearchReport"] = PlayerDatabase,
            ["RecruitmentShortlistTool"] = Shortlist,
        };

        /// <param name="tableNames">Names of the table and its descendants that start with "playertable"
        /// (in FM27 for example a #PlayerTable frame around #playertableshortlist).</param>
        /// <param name="ancestorNames">Names of the ancestors, nearest first.</param>
        public static string Guess(IEnumerable<string?> tableNames, IEnumerable<string?> ancestorNames)
        {
            // #playertableshortlist -> "shortlist"
            foreach (var name in tableNames)
            {
                if (name != null && name.Length > TablePrefix.Length && name.StartsWith(TablePrefix, StringComparison.OrdinalIgnoreCase))
                    return name.Substring(TablePrefix.Length).ToLowerInvariant();
            }

            foreach (var name in ancestorNames)
            {
                if (string.IsNullOrEmpty(name))
                    continue;
                if (KnownPanels.TryGetValue(name, out var known))
                    return known;
                // #SquadScreen -> "squad"
                if (name.EndsWith("Screen", StringComparison.Ordinal) && name.Length > "Screen".Length)
                    return name.Substring(0, name.Length - "Screen".Length).ToLowerInvariant();
            }

            // So far without a name of its own: the player database.
            return PlayerDatabase;
        }
    }

    public static class ExportFileNames
    {
        /// <summary>
        /// A file name without extension from the screen and an optional time stamp,
        /// e.g. "squad_20261029_201500".
        /// </summary>
        public static string Build(string viewName, DateTime? timestamp)
        {
            var name = Sanitize(viewName);
            if (timestamp.HasValue)
                name += "_" + timestamp.Value.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
            return name;
        }

        public static string Sanitize(string name)
        {
            var invalid = Path.GetInvalidFileNameChars();
            var builder = new StringBuilder(name.Length);
            foreach (var c in name.Trim().ToLowerInvariant())
            {
                if (char.IsWhiteSpace(c))
                    builder.Append('-');
                else if (Array.IndexOf(invalid, c) < 0 && c != '\\' && c != '/' && c != ':' && c != '*' && c != '?' && c != '"' && c != '<' && c != '>' && c != '|')
                    builder.Append(c);
            }
            return builder.Length == 0 ? "export" : builder.ToString();
        }
    }
}
