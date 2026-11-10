// SPDX-License-Identifier: GPL-3.0-or-later
// FM27 Tactic Builder: puts a squad export into the Tactic Builder page, so the page opens with the squad loaded.

using System;
using System.Globalization;
using System.IO;
using System.Text;

namespace FM27TacticBuilder.Core
{
    /// <summary>
    /// The Tactic Builder page (FM27-Tactic-Builder.html) has an empty slot for an export:
    /// <c>&lt;script type="application/json" id="fm27tb-export"&gt;null&lt;/script&gt;</c>.
    /// The plugin fills it with the squad it just read; the page reads the slot when it opens.
    /// A JSON script block is data, never run, and the page's security policy still blocks the internet.
    /// </summary>
    public static class TacticPage
    {
        public const string Slot = "<script type=\"application/json\" id=\"fm27tb-export\">null</script>";

        /// <summary>The page with the export in its slot.</summary>
        /// <param name="template">The page as built by <c>npm run build</c>.</param>
        /// <param name="fileName">Name of the CSV, shown in the page, e.g. "squad_20261110_180852.csv".</param>
        /// <param name="csv">The export as CSV text.</param>
        /// <param name="exportedAt">When the squad was read.</param>
        /// <param name="source">Where it came from, e.g. "Football Manager 27 27.1.0".</param>
        public static string Build(string template, string fileName, string csv, DateTime exportedAt, string source)
        {
            if (template == null)
                throw new ArgumentNullException(nameof(template));
            var at = template.IndexOf(Slot, StringComparison.Ordinal);
            if (at < 0)
                throw new InvalidDataException("The built-in Tactic Builder page has no slot for the squad. Rebuild it with 'npm run build'.");

            var json = new StringBuilder(csv.Length + 256)
                .Append("{\"name\":").Append(JsonText.Quote(fileName))
                .Append(",\"exportedAt\":").Append(JsonText.Quote(exportedAt.ToString("yyyy-MM-dd'T'HH:mm:ss", CultureInfo.InvariantCulture)))
                .Append(",\"source\":").Append(JsonText.Quote(source ?? ""))
                .Append(",\"text\":").Append(JsonText.Quote(csv))
                .Append('}')
                .ToString();
            var filled = Slot.Replace(">null<", ">" + json + "<");
            return template.Substring(0, at) + filled + template.Substring(at + Slot.Length);
        }
    }

    /// <summary>JSON strings that are also safe inside an HTML &lt;script&gt; block.</summary>
    public static class JsonText
    {
        private const char LineSeparator = (char)0x2028;
        private const char ParagraphSeparator = (char)0x2029;

        public static string Quote(string? value)
        {
            var text = value ?? "";
            var sb = new StringBuilder(text.Length + 2);
            sb.Append('"');
            foreach (var c in text)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    // "<" could end the script block ("</script>") or open a comment ("<!--").
                    case '<':
                    case '>':
                    case '&':
                    case LineSeparator:
                    case ParagraphSeparator:
                        sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                        break;
                    default:
                        if (c < 0x20)
                            sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                        else
                            sb.Append(c);
                        break;
                }
            }
            sb.Append('"');
            return sb.ToString();
        }
    }
}
