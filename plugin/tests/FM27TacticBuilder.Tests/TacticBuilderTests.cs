// SPDX-License-Identifier: GPL-3.0-or-later
// Tests for the parts FM27 Tactic Builder adds: the tactic page, the column check, the view files,
// and that the plugin, setup and app agree with each other.

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using FM27TacticBuilder.Core;
using FM27TacticBuilder.Setup;
using Xunit;

namespace FM27TacticBuilder.Tests
{
    internal static class Repo
    {
        /// <summary>The repository root (the folder with package.json).</summary>
        public static string Root
        {
            get
            {
                var dir = new DirectoryInfo(AppContext.BaseDirectory);
                while (dir != null && !File.Exists(Path.Combine(dir.FullName, "package.json")))
                    dir = dir.Parent;
                return dir?.FullName ?? throw new DirectoryNotFoundException("Repository root not found");
            }
        }

        public static string Read(params string[] parts) => File.ReadAllText(Path.Combine(new[] { Root }.Concat(parts).ToArray()));
    }

    public class TacticPageTests
    {
        private const string Template = "<html><body>" + TacticPage.Slot + "<script>app()</script></body></html>";

        private static JsonElement Payload(string page)
        {
            var match = Regex.Match(page, "<script type=\"application/json\" id=\"fm27tb-export\">(.*?)</script>", RegexOptions.Singleline);
            Assert.True(match.Success);
            return JsonDocument.Parse(match.Groups[1].Value).RootElement.Clone();
        }

        [Fact]
        public void Puts_the_export_into_the_slot()
        {
            var csv = "Unique ID,Player,Position\r\n1,Ana Silva,\"D (C), DM\"\r\n";
            var page = TacticPage.Build(Template, "squad_20261110_180852.csv", csv, new DateTime(2026, 11, 10, 18, 8, 52), "Football Manager 27 27.1");
            var data = Payload(page);
            Assert.Equal(csv, data.GetProperty("text").GetString());
            Assert.Equal("squad_20261110_180852.csv", data.GetProperty("name").GetString());
            Assert.Equal("2026-11-10T18:08:52", data.GetProperty("exportedAt").GetString());
            Assert.Equal("Football Manager 27 27.1", data.GetProperty("source").GetString());
            Assert.EndsWith("<script>app()</script></body></html>", page);
        }

        [Fact]
        public void A_player_called_script_cannot_break_out_of_the_page()
        {
            var csv = "Player\r\n</script><script>alert(1)</script>\r\n<!-- x & y \u2028\r\n";
            var page = TacticPage.Build(Template, "a.csv", csv, DateTime.Now, "");
            Assert.Equal(2, Regex.Matches(page, "</script>").Count);
            Assert.DoesNotContain("<!--", page);
            Assert.Equal(csv, Payload(page).GetProperty("text").GetString());
        }

        [Fact]
        public void Refuses_a_page_without_slot()
        {
            Assert.Throws<InvalidDataException>(() => TacticPage.Build("<html></html>", "a.csv", "x", DateTime.Now, ""));
        }

        [Fact]
        public void Quotes_control_characters()
        {
            Assert.Equal("\"a\\tb\\u0001\\\"\\\\\"", JsonText.Quote("a\tb\u0001\"\\"));
        }

        [Fact]
        public void The_built_app_has_exactly_one_slot()
        {
            var html = Repo.Read("FM27-Tactic-Builder.html");
            Assert.Single(Regex.Matches(html, Regex.Escape(TacticPage.Slot)));
        }
    }

    public class ExportCheckTests
    {
        private static readonly string Columns = Repo.Read("data", "columns.json");

        private static List<string> SampleHeaders() =>
            Repo.Read("samples", "squad_20261108_201500.csv").TrimStart('﻿').Split('\n')[0].Trim().Split(',').ToList();

        [Fact]
        public void The_sample_squad_is_usable()
        {
            var summary = ExportCheck.Check(SampleHeaders(), 29, Columns);
            Assert.True(summary.Usable, summary.Describe());
            Assert.Equal(47, summary.AttributesTotal);
            Assert.Equal(47, summary.AttributesFound);
            Assert.Empty(summary.MissingEssential);
            Assert.StartsWith("29 players, 47 of 47 attributes", summary.Describe());
        }

        [Fact]
        public void A_view_without_attributes_is_not_usable_and_says_what_is_missing()
        {
            var summary = ExportCheck.Check(new[] { "Player", "Age", "Club", "Wage" }, 30, Columns);
            Assert.False(summary.Usable);
            Assert.Contains("Position", summary.MissingEssential);
            Assert.Contains("FM27 Tactic Builder", summary.Describe());
        }

        [Fact]
        public void Headers_match_like_the_app_does()
        {
            Assert.Equal("rushingouttendency", ExportCheck.Normalize("Rushing Out (Tendency)"));
            var summary = ExportCheck.Check(new[] { "PLAYER", "position" }, 1, Columns);
            Assert.True(summary.HasName && summary.HasPosition);
        }
    }

    public sealed class ViewFilesTests : IDisposable
    {
        private readonly string _root = Path.Combine(Path.GetTempPath(), "fm27tb-views-" + Guid.NewGuid().ToString("N"));

        public void Dispose()
        {
            if (Directory.Exists(_root))
                Directory.Delete(_root, true);
        }

        [Fact]
        public void Finds_only_fm27_user_folders()
        {
            var folders = new[] { "Football Manager 26", "Football Manager 27", "Football Manager 2027", "Football Manager 27 Demo", "FM View Exporter", "Football Manager 270" }
                .Select(n => Path.Combine(_root, n)).ToList();
            var found = ViewFiles.GameUserFolders(_root, _ => folders).Select(Path.GetFileName).ToList();
            Assert.Equal(new[] { "Football Manager 2027", "Football Manager 27", "Football Manager 27 Demo" }, found);
        }

        [Fact]
        public void A_missing_documents_folder_is_not_an_error()
        {
            Assert.Empty(ViewFiles.GameUserFolders(Path.Combine(_root, "nope"), Directory.GetDirectories));
        }

        [Fact]
        public void Installs_the_view_once_and_never_touches_other_files()
        {
            var fm = Path.Combine(_root, "Football Manager 27");
            var views = Path.Combine(fm, "views");
            Directory.CreateDirectory(views);
            File.WriteAllText(Path.Combine(views, "My view.fmf"), "mine");
            var targets = ViewFiles.Targets(Path.Combine(_root, "FM27 Tactic Builder"), new[] { fm });

            var first = ViewFiles.Install(new byte[] { 1, 2, 3 }, targets);
            Assert.Equal(2, first.Written.Count);
            Assert.Empty(first.Failed);
            Assert.Equal(new byte[] { 1, 2, 3 }, File.ReadAllBytes(Path.Combine(views, ViewFiles.FileName)));
            Assert.Equal("mine", File.ReadAllText(Path.Combine(views, "My view.fmf")));

            Assert.Empty(ViewFiles.Install(new byte[] { 1, 2, 3 }, targets).Written);
            Assert.Equal(2, ViewFiles.Install(new byte[] { 4 }, targets).Written.Count);
        }
    }

    public class ConsistencyTests
    {
        [Fact]
        public void Versions_match_across_app_plugin_and_setup()
        {
            var package = JsonDocument.Parse(Repo.Read("package.json")).RootElement.GetProperty("version").GetString();
            var props = Regex.Match(Repo.Read("plugin", "Directory.Build.props"), "<Version>(.*?)</Version>").Groups[1].Value;
            var plugin = Regex.Match(Repo.Read("plugin", "src", "FM27TacticBuilder", "Plugin.cs"), "Version = \"(.*?)\"").Groups[1].Value;
            Assert.Equal(package, props);
            Assert.Equal(package, plugin);
        }

        [Fact]
        public void The_setup_edits_exactly_the_plugins_settings()
        {
            var source = Repo.Read("plugin", "src", "FM27TacticBuilder", "PluginConfig.cs");
            var bound = Regex.Matches(source, "config\\.Bind\\(\"(\\w+)\", \"(\\w+)\", (\"[^\"]*\"|true|false|\\d+)")
                .Select(m => (m.Groups[1].Value, m.Groups[2].Value, m.Groups[3].Value.Trim('"')))
                .OrderBy(x => x.Item1 + "/" + x.Item2).ToList();
            var edited = BuilderSettings.All.Select(s => (s.Section, s.Key, s.DefaultValue))
                .OrderBy(x => x.Section + "/" + x.Key).ToList();
            Assert.Equal(10, bound.Count);
            Assert.Equal(bound, edited);
        }

        [Fact]
        public void The_default_keys_parse_and_differ()
        {
            var keys = BuilderSettings.All.Where(s => s.Section == "Hotkeys").Select(s => s.DefaultValue).ToList();
            var parsed = keys.Select(k => Hotkey.TryParse(k, out var h) ? h.ToString() : "?").ToList();
            Assert.Equal(new[] { "F8", "Ctrl+F8", "Ctrl+Shift+F8" }, parsed);
            Assert.Equal(parsed.Count, parsed.Distinct().Count());
        }
    }
}
