// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments; CsvStyle kept in this file.

using System.Collections.Generic;
using System.IO;
using System.Text;

namespace FM27TacticBuilder.Core
{
    /// <summary>Separator and decimal mark of the CSV file.</summary>
    public enum CsvStyle
    {
        /// <summary>Comma separator, decimal point (English Excel).</summary>
        English,

        /// <summary>Semicolon separator, decimal comma (German Excel).</summary>
        German,
    }

    public static class CsvStyleExtensions
    {
        public static char Delimiter(this CsvStyle style) => style == CsvStyle.German ? ';' : ',';

        public static char DecimalSeparator(this CsvStyle style) => style == CsvStyle.German ? ',' : '.';
    }

    /// <summary>
    /// Writes an <see cref="ExportTable"/> as RFC 4180 CSV (CRLF, quotes where needed).
    /// The file gets a UTF-8 BOM so Excel reads accents correctly.
    /// </summary>
    public static class CsvWriter
    {
        public static void Write(ExportTable table, TextWriter writer, CsvStyle style)
        {
            var delimiter = style.Delimiter();
            WriteLine(writer, table.Headers, delimiter, null);
            foreach (var row in table.Rows)
                WriteLine(writer, row, delimiter, style);
        }

        public static void WriteFile(ExportTable table, string path, CsvStyle style)
        {
            using var writer = new StreamWriter(path, false, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
            Write(table, writer, style);
        }

        public static string ToCsv(ExportTable table, CsvStyle style)
        {
            using var writer = new StringWriter();
            Write(table, writer, style);
            return writer.ToString();
        }

        internal static string Escape(string value, char delimiter)
        {
            var needsQuotes = value.IndexOf(delimiter) >= 0
                || value.IndexOf('"') >= 0
                || value.IndexOf('\r') >= 0
                || value.IndexOf('\n') >= 0
                || (value.Length > 0 && (char.IsWhiteSpace(value[0]) || char.IsWhiteSpace(value[value.Length - 1])));

            return needsQuotes ? "\"" + value.Replace("\"", "\"\"") + "\"" : value;
        }

        private static void WriteLine(TextWriter writer, IReadOnlyList<string> cells, char delimiter, CsvStyle? numbers)
        {
            for (var i = 0; i < cells.Count; i++)
            {
                if (i > 0)
                    writer.Write(delimiter);
                writer.Write(Escape(numbers.HasValue ? CellText.ForCsv(cells[i], numbers.Value) : cells[i], delimiter));
            }
            writer.Write("\r\n");
        }
    }
}
