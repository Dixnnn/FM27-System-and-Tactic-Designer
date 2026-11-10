// SPDX-License-Identifier: GPL-3.0-or-later
// FM27 Tactic Builder: puts the built-in squad view (.fmf) where FM27's "Import View…" finds it.

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace FM27TacticBuilder.Core
{
    /// <summary>
    /// FM keeps your own views as .fmf files in the "views" folder of its user folder,
    /// e.g. Documents\Sports Interactive\Football Manager 27\views. The plugin copies its view
    /// there (and into its own folder), under its own file name. It never changes or deletes
    /// another file, and it never touches saves or game files.
    /// </summary>
    public static class ViewFiles
    {
        public const string FileName = "FM27 Tactic Builder - Squad.fmf";

        /// <summary>The name the built-in view has inside FM27 (stored in the .fmf itself).</summary>
        public const string ViewName = "FM27TFT";

        /// <summary>
        /// A quick sanity check of an FM27 view file: the "afe." header, then a table of contents
        /// starting with "fmf." followed by a zstd frame. Catches a wrong or damaged file before it ships.
        /// </summary>
        public static bool LooksLikeView(byte[] file)
        {
            if (file.Length < 64 || file[0] != 2 || file[1] != 1 || file[2] != (byte)'a' || file[3] != (byte)'f' || file[4] != (byte)'e' || file[5] != (byte)'.')
                return false;
            var toc = file.AsSpan().LastIndexOf(new[] { (byte)'f', (byte)'m', (byte)'f', (byte)'.' });
            return toc > 0 && toc + 11 <= file.Length && file.AsSpan(toc + 7, 4).SequenceEqual(new byte[] { 0x28, 0xB5, 0x2F, 0xFD });
        }

        // "Football Manager 27", "Football Manager 2027", "Football Manager 27 Demo", …
        private static readonly Regex Fm27Folder = new(@"^Football Manager (20)?27(\b|$)", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        /// <summary>The FM27 user folders inside Documents\Sports Interactive.</summary>
        public static List<string> GameUserFolders(string sportsInteractive, Func<string, IEnumerable<string>> listFolders)
        {
            try
            {
                return listFolders(sportsInteractive)
                    .Where(path => Fm27Folder.IsMatch(Path.GetFileName(path.TrimEnd('\\', '/'))))
                    .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            catch (Exception)
            {
                return new List<string>();
            }
        }

        /// <summary>
        /// Writes the view as <see cref="FileName"/> into each folder (created if needed), unless the
        /// same file is already there. Returns the files written and the folders that failed.
        /// </summary>
        public static (List<string> Written, List<string> Failed) Install(byte[] view, IEnumerable<string> viewFolders)
        {
            var written = new List<string>();
            var failed = new List<string>();
            foreach (var folder in viewFolders)
            {
                var path = Path.Combine(folder, FileName);
                try
                {
                    if (File.Exists(path) && File.ReadAllBytes(path).AsSpan().SequenceEqual(view))
                        continue;
                    Directory.CreateDirectory(folder);
                    File.WriteAllBytes(path, view);
                    written.Add(path);
                }
                catch (Exception)
                {
                    failed.Add(folder);
                }
            }
            return (written, failed);
        }

        /// <summary>The "views" folders to fill: the plugin's own folder and each FM27 user folder.</summary>
        public static List<string> Targets(string ownFolder, IEnumerable<string> gameUserFolders)
        {
            var result = new List<string> { Path.Combine(ownFolder, "views") };
            result.AddRange(gameUserFolders.Select(f => Path.Combine(f, "views")));
            return result;
        }
    }
}
