// SPDX-License-Identifier: GPL-3.0-or-later
// FM27 Tactic Builder: a quick look at an export before the page opens, for the in-game message.
// The page itself checks the columns in full and says exactly which ones to add.

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace FM27TacticBuilder.Core
{
    public sealed class ExportSummary
    {
        public int Players { get; set; }
        public int Columns { get; set; }
        public int AttributesFound { get; set; }
        public int AttributesTotal { get; set; }
        public bool HasName { get; set; }
        public bool HasPosition { get; set; }

        /// <summary>Essential columns that are missing (FM27 header names).</summary>
        public List<string> MissingEssential { get; } = new();

        /// <summary>Enough to build a tactic: names, positions and at least half of the attributes.</summary>
        public bool Usable => Players > 0 && HasName && HasPosition && AttributesFound * 2 >= AttributesTotal;

        /// <summary>False when the check could not run (then the page checks in full).</summary>
        public bool Checked => AttributesTotal > 0;

        /// <summary>Short text for the in-game message.</summary>
        public string Describe()
        {
            if (Players == 0)
                return "The list was empty.";
            if (!Checked)
                return $"{Players} players.";
            if (Usable)
                return $"{Players} players, {AttributesFound} of {AttributesTotal} attributes.";
            var missing = string.Join(", ", MissingEssential.Take(4)) + (MissingEssential.Count > 4 ? $" and {MissingEssential.Count - 4} more" : "");
            return $"{Players} players, but this view lacks {missing}. Switch the squad view to \"FM27 Tactic Builder\".";
        }
    }

    public static class ExportCheck
    {
        /// <summary>Checks the headers against data/columns.json (the same file the page uses).</summary>
        public static ExportSummary Check(IReadOnlyList<string> headers, int players, string columnsJson)
        {
            var summary = new ExportSummary { Players = players, Columns = headers.Count };
            var present = new HashSet<string>(headers.Select(Normalize));
            using var doc = JsonDocument.Parse(columnsJson);

            foreach (var field in doc.RootElement.GetProperty("fields").EnumerateArray())
            {
                var found = Headers(field).Any(h => present.Contains(Normalize(h)));
                var name = field.GetProperty("field").GetString();
                if (name == "name")
                    summary.HasName = found;
                else if (name == "position")
                    summary.HasPosition = found;
                if (!found && Importance(field) == "essential")
                    summary.MissingEssential.Add(Headers(field).FirstOrDefault() ?? name ?? "?");
            }

            foreach (var attribute in doc.RootElement.GetProperty("attributes").EnumerateArray())
            {
                summary.AttributesTotal++;
                var headersOf = Headers(attribute).ToList();
                if (headersOf.Any(h => present.Contains(Normalize(h))))
                    summary.AttributesFound++;
                else if (Importance(attribute) == "essential")
                    summary.MissingEssential.Add(headersOf.LastOrDefault() ?? "?");
            }
            return summary;
        }

        private static IEnumerable<string> Headers(JsonElement item) =>
            item.TryGetProperty("headers", out var list) ? list.EnumerateArray().Select(h => h.GetString() ?? "") : Enumerable.Empty<string>();

        private static string Importance(JsonElement item) =>
            item.TryGetProperty("importance", out var value) ? value.GetString() ?? "" : "";

        /// <summary>Same rule as normHeader in src/parse/columns.js: lower case, letters and digits only.</summary>
        internal static string Normalize(string header)
        {
            var chars = (header ?? "").ToLowerInvariant().Where(c => (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')).ToArray();
            return new string(chars);
        }
    }
}
