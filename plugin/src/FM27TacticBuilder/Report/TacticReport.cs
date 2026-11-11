// SPDX-License-Identifier: GPL-3.0-or-later
// FM27 Tactic Builder: saves what was read and opens the tactic page with the squad loaded.

using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using FM27TacticBuilder.Core;
using FM27TacticBuilder.Ui;
using UnityEngine;

namespace FM27TacticBuilder.Report
{
    internal static class TacticReport
    {
        /// <summary>How many earlier squad reads go into the page for the progress comparison.</summary>
        private const int MaxHistory = 6;

        /// <summary>
        /// Writes the list as CSV into the exports folder and, for F8, the tactic page
        /// (FM27 Tactic Builder.html) with the squad inside, then opens it in the default browser.
        /// </summary>
        public static void Deliver(ExportTable table, string viewName, bool openPage, bool buildMode)
        {
            var csvName = ExportFileNames.Build(viewName, table.CreatedAt) + ".csv";
            var csvPath = Path.Combine(OutputPaths.EnsureFolder(OutputPaths.ExportsFolder), csvName);
            CsvWriter.WriteFile(table, csvPath, CsvStyle.English);
            Plugin.Logger.LogInfo($"Saved {csvPath}");

            var summary = Summarise(table);
            if (!buildMode)
            {
                Toast.Show("List saved", $"{table.Rows.Count} players saved to {csvPath}", 8f);
                return;
            }

            var source = $"{Application.productName} {Application.version}".Trim();
            var squadScreen = viewName == ViewNames.Squad;
            var exportFiles = Directory.GetFiles(OutputPaths.ExportsFolder, "*.csv");
            string squadName, squadCsv;
            DateTime squadTime;
            ExtraExport? scouting = null;
            string? squadPath;
            if (squadScreen)
            {
                squadName = csvName;
                squadCsv = CsvWriter.ToCsv(table, CsvStyle.English);
                squadTime = table.CreatedAt;
                squadPath = csvPath;
            }
            else
            {
                // F8 on a shortlist or player search: compare those players with your latest squad read.
                squadPath = ExportHistory.SquadExports(exportFiles, null, 1).FirstOrDefault();
                if (squadPath == null)
                {
                    Toast.Show("Read your squad first",
                        $"Open your Squad screen and press F8 once. After that, F8 on a {viewName.Replace('-', ' ')} shows which of its players would improve your team. (This list was saved.)", 14f, warning: true);
                    return;
                }
                squadName = Path.GetFileName(squadPath);
                squadCsv = File.ReadAllText(squadPath);
                squadTime = ExportHistory.TimeFromName(squadPath) ?? File.GetLastWriteTime(squadPath);
                scouting = new ExtraExport(csvName, CsvWriter.ToCsv(table, CsvStyle.English), table.CreatedAt);
            }
            // Earlier squad reads travel along, so the page can show who is improving.
            var history = ExportHistory.SquadExports(exportFiles, squadPath, MaxHistory)
                .Select(f => new ExtraExport(Path.GetFileName(f), File.ReadAllText(f), ExportHistory.TimeFromName(f)))
                .ToList();
            var page = TacticPage.Build(Resources.Text("FM27-Tactic-Builder.html"), squadName, squadCsv, squadTime, source, scouting, history);
            var pagePath = OutputPaths.PagePath;
            OutputPaths.EnsureFolder(Path.GetDirectoryName(pagePath)!);
            File.WriteAllText(pagePath, page, new UTF8Encoding(false));
            Plugin.Logger.LogInfo($"Tactic page written: {pagePath}");

            if (!openPage)
            {
                Toast.Show("Tactic page saved", $"{summary.Describe()} Open {pagePath} to see it.", 10f, warning: !summary.Usable);
                return;
            }

            var opened = Open(pagePath);
            var what = squadScreen ? "Tactic ready" : "Players compared";
            var detail = squadScreen ? summary.Describe() : $"{table.Rows.Count} players from this list scored against your squad (read {squadTime:d MMM, HH:mm}).";
            if (!summary.Usable)
                Toast.Show("Opened, but columns are missing", summary.Describe(), 14f, warning: true);
            else if (opened)
                Toast.Show(what, $"{detail} It has opened in your browser (Alt+Tab).", 10f);
            else
                Toast.Show(what, $"Open this file in your browser: {pagePath}", 14f, warning: true);
        }

        /// <summary>The quick column check; if it fails for any reason, the page still opens and checks in full.</summary>
        private static ExportSummary Summarise(ExportTable table)
        {
            try
            {
                return ExportCheck.Check(table.Headers, table.Rows.Count, Resources.Text("columns.json"));
            }
            catch (Exception ex)
            {
                Plugin.Logger.LogWarning($"Quick column check skipped: {ex.Message}");
                return new ExportSummary { Players = table.Rows.Count, Columns = table.Headers.Count, HasName = true, HasPosition = true };
            }
        }

        private static bool Open(string path)
        {
            try
            {
                Process.Start(new ProcessStartInfo(path) { UseShellExecute = true });
                return true;
            }
            catch (Exception ex)
            {
                Plugin.Logger.LogWarning($"Could not start the browser directly ({ex.Message}), trying through Unity.");
            }
            try
            {
                Application.OpenURL(new Uri(path).AbsoluteUri);
                return true;
            }
            catch (Exception ex)
            {
                Plugin.Logger.LogWarning($"Could not open the page: {ex.Message}");
                return false;
            }
        }
    }

    /// <summary>Files built into the plugin DLL.</summary>
    internal static class Resources
    {
        public static string Text(string name)
        {
            using var stream = Open(name) ?? throw new FileNotFoundException("Built-in file missing: " + name);
            using var reader = new StreamReader(stream, Encoding.UTF8);
            return reader.ReadToEnd();
        }

        public static byte[]? Bytes(string name)
        {
            using var stream = Open(name);
            if (stream == null)
                return null;
            using var copy = new MemoryStream();
            stream.CopyTo(copy);
            return copy.ToArray();
        }

        private static Stream? Open(string name) => Assembly.GetExecutingAssembly().GetManifestResourceStream(name);
    }

    /// <summary>Copies the built-in squad view where FM27's "Import View…" finds it (see ViewFiles).</summary>
    internal static class ViewInstaller
    {
        public static void Run()
        {
            try
            {
                var view = Resources.Bytes("view-squad.fmf");
                if (view != null && !ViewFiles.LooksLikeView(view))
                {
                    Plugin.Logger.LogWarning("The built-in squad view looks damaged; not installing it.");
                    return;
                }
                if (view == null)
                {
                    Plugin.Logger.LogInfo("This build has no built-in squad view yet; use the columns listed in the README.");
                    return;
                }
                if (!Plugin.Settings.InstallView.Value)
                    return;
                var gameFolders = ViewFiles.GameUserFolders(OutputPaths.SportsInteractiveFolder, Directory.GetDirectories);
                var (written, failed) = ViewFiles.Install(view, ViewFiles.Targets(OutputPaths.BaseFolder, gameFolders));
                foreach (var path in written)
                    Plugin.Logger.LogInfo($"Squad view copied to {path} (in the game it is called {ViewFiles.ViewName}; import it once with Import View…).");
                foreach (var folder in failed)
                    Plugin.Logger.LogWarning($"Could not copy the squad view to {folder}");
                if (gameFolders.Count == 0)
                    Plugin.Logger.LogInfo($"FM27's user folder was not found in {OutputPaths.SportsInteractiveFolder}; " +
                        $"import the view from {Path.Combine(OutputPaths.BaseFolder, "views")} instead.");
            }
            catch (Exception ex)
            {
                Plugin.Logger.LogWarning($"Could not install the squad view: {ex.Message}");
            }
        }
    }
}
