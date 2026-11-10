// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments.

using System.Text;
using System.Text.RegularExpressions;

namespace FM27TacticBuilder.Core
{
    /// <summary>
    /// Turns the text of a table cell into a clean value: strips rich-text tags such as
    /// &lt;color=...&gt; or &lt;link=...&gt; and collapses whitespace.
    /// </summary>
    public static class CellText
    {
        private static readonly Regex Tag = new("<[^<>]*>", RegexOptions.Compiled);
        private static readonly Regex Space = new(@"\s+", RegexOptions.Compiled);
        private static readonly Regex Decimal = new(@"^[+-]?\d+\.\d+(%|km)?$", RegexOptions.Compiled);

        public static string Clean(string? text)
        {
            if (string.IsNullOrEmpty(text))
                return string.Empty;
            var plain = Tag.Replace(text, string.Empty);
            return Space.Replace(plain, " ").Trim();
        }

        /// <summary>Joins several texts of one cell with spaces.</summary>
        public static string Join(System.Collections.Generic.IEnumerable<string> parts)
        {
            var builder = new StringBuilder();
            foreach (var part in parts)
            {
                var clean = Clean(part);
                if (clean.Length == 0)
                    continue;
                if (builder.Length > 0)
                    builder.Append(' ');
                builder.Append(clean);
            }
            return builder.ToString();
        }

        /// <summary>
        /// Writes plain decimals such as "0.75" or "12.5%" with the decimal mark of the CSV style.
        /// Other text (money, dates, names) is left alone.
        /// </summary>
        public static string ForCsv(string value, CsvStyle style)
        {
            if (style == CsvStyle.English || !Decimal.IsMatch(value))
                return value;
            return value.Replace('.', style.DecimalSeparator());
        }
    }
}
