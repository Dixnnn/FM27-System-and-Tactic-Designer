// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter's tests (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder.

using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using FM27TacticBuilder.Setup;
using Xunit;

namespace FM27TacticBuilder.Tests
{
    public class SteamLibrariesTests
    {
        private const string Vdf = "\"libraryfolders\"\n{\n\t\"0\"\n\t{\n\t\t\"path\"\t\t\"C:\\\\Program Files (x86)\\\\Steam\"\n\t\t\"apps\" { }\n\t}\n\t\"1\"\n\t{\n\t\t\"path\"\t\t\"T:\\\\SteamUbisoft\"\n\t}\n}\n";

        [Fact]
        public void Reads_library_paths_from_vdf()
        {
            Assert.Equal(new[] { @"C:\Program Files (x86)\Steam", @"T:\SteamUbisoft" }, SteamLibraries.ParseLibraryFolders(Vdf));
        }

        [Fact]
        public void Finds_game_in_second_library()
        {
            var steam = @"C:\Program Files (x86)\Steam";
            var expected = Path.Combine(@"T:\SteamUbisoft", "steamapps", "common", "Football Manager 27");
            var found = SteamLibraries.FindGameFolder(new[] { steam },
                path => path == Path.Combine(steam, "steamapps", "libraryfolders.vdf") ? Vdf : null,
                path => path == Path.Combine(expected, "fm.exe"));
            Assert.Equal(expected, found);
        }

        [Fact]
        public void Returns_null_without_game()
        {
            Assert.Null(SteamLibraries.FindGameFolder(new[] { "", @"C:\Steam" }, _ => null, _ => false));
        }
    }

    public class BepInExConfigFileTests
    {
        private const string Cfg = "[Export]\n\n## Output folder.\n# Setting type: String\n# Default value: \nOutputFolder = \n\n## Style\nCsvStyle = English\n\n[Hotkeys]\n\nExport = F9\n";

        [Fact]
        public void Reads_values()
        {
            var cfg = new BepInExConfigFile(Cfg);
            Assert.Equal("English", cfg.Get("Export", "CsvStyle"));
            Assert.Equal("", cfg.Get("Export", "OutputFolder"));
            Assert.Equal("F9", cfg.Get("Hotkeys", "Export"));
            Assert.Null(cfg.Get("Export", "FilePrefix"));
        }

        [Fact]
        public void Changes_value_and_keeps_comments()
        {
            var cfg = new BepInExConfigFile(Cfg);
            cfg.Set("Export", "CsvStyle", "German");
            var text = cfg.ToString();
            Assert.Contains("CsvStyle = German", text);
            Assert.Contains("## Output folder.", text);
            Assert.Equal("German", new BepInExConfigFile(text).Get("Export", "CsvStyle"));
        }

        [Fact]
        public void Adds_missing_key_to_its_section()
        {
            var cfg = new BepInExConfigFile(Cfg);
            cfg.Set("Export", "FilePrefix", "fc-bayern");
            var text = cfg.ToString();
            Assert.True(text.IndexOf("FilePrefix = fc-bayern", StringComparison.Ordinal) < text.IndexOf("[Hotkeys]", StringComparison.Ordinal));
            Assert.Equal("fc-bayern", new BepInExConfigFile(text).Get("Export", "FilePrefix"));
        }

        [Fact]
        public void Creates_file_from_scratch()
        {
            var cfg = new BepInExConfigFile("");
            cfg.Set("Export", "Timestamp", "false");
            cfg.Set("Hotkeys", "Export", "F8");
            var reread = new BepInExConfigFile(cfg.ToString());
            Assert.Equal("false", reread.Get("Export", "Timestamp"));
            Assert.Equal("F8", reread.Get("Hotkeys", "Export"));
        }
    }

    public class GameInstallationTests : IDisposable
    {
        private readonly string _game = Path.Combine(Path.GetTempPath(), "fmve-setup-" + Guid.NewGuid().ToString("N"));

        public GameInstallationTests()
        {
            Directory.CreateDirectory(_game);
            File.WriteAllText(Path.Combine(_game, "fm.exe"), "");
        }

        public void Dispose() => Directory.Delete(_game, true);

        private static readonly string[] PackageFiles =
        {
            "winhttp.dll", "doorstop_config.ini", "FM27 Tactic Builder - README.txt", "BepInEx/core/BepInEx.Core.dll",
            "BepInEx/core/BepInEx.Unity.IL2CPP.dll", "dotnet/coreclr.dll",
            "BepInEx/plugins/FM27TacticBuilder/FM27TacticBuilder.dll", "BepInEx/config/fm27.tacticbuilder.cfg"
        };

        private static MemoryStream Package()
        {
            var stream = new MemoryStream();
            using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
            {
                foreach (var name in PackageFiles)
                {
                    using var writer = new StreamWriter(zip.CreateEntry(name).Open());
                    writer.Write("new " + name);
                }
            }
            stream.Position = 0;
            return stream;
        }

        private void Write(string relative, string content)
        {
            var path = Path.Combine(new[] { _game }.Concat(relative.Split('/')).ToArray());
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            File.WriteAllText(path, content);
        }

        /// <summary>Runtime as left by another mod or an earlier install.</summary>
        private void ExistingRuntime(string core = "other core")
        {
            Write("winhttp.dll", "mine winhttp");
            Write("doorstop_config.ini", "[General]\nenabled = true\n# mine");
            Write("BepInEx/core/BepInEx.Core.dll", core);
            Write("BepInEx/core/BepInEx.Unity.IL2CPP.dll", "mine il2cpp");
            Write("dotnet/coreclr.dll", "mine coreclr");
        }

        /// <summary>Returns versions by file content (the test files are not real DLLs).</summary>
        private GameInstallation WithVersions(string installed, string packaged)
        {
            return new GameInstallation(_game)
            {
                ReadProductVersion = path => File.ReadAllText(path) == "new BepInEx/core/BepInEx.Core.dll" ? packaged : installed
            };
        }

        private string Read(string relative) => File.ReadAllText(Path.Combine(new[] { _game }.Concat(relative.Split('/')).ToArray()));

        [Fact]
        public void Installs_package_and_keeps_existing_settings()
        {
            var config = Path.Combine(_game, "BepInEx", "config");
            Directory.CreateDirectory(config);
            File.WriteAllText(Path.Combine(config, "fm27.tacticbuilder.cfg"), "mine");

            var install = new GameInstallation(_game);
            Assert.True(install.IsGameFolder);
            install.Install(Package(), pluginOnly: false);

            Assert.True(install.HasBepInEx);
            Assert.True(install.HasPlugin);
            Assert.Equal("mine", Read("BepInEx/config/fm27.tacticbuilder.cfg"));
        }

        [Fact]
        public void Update_replaces_only_the_plugin()
        {
            File.WriteAllText(Path.Combine(_game, "winhttp.dll"), "old");
            new GameInstallation(_game).Install(Package(), pluginOnly: true);
            Assert.Equal("old", Read("winhttp.dll"));
            Assert.Equal("new BepInEx/plugins/FM27TacticBuilder/FM27TacticBuilder.dll", Read("BepInEx/plugins/FM27TacticBuilder/FM27TacticBuilder.dll"));
        }

        [Fact]
        public void Uninstall_removes_everything_without_other_plugins()
        {
            var install = new GameInstallation(_game);
            install.Install(Package(), pluginOnly: false);
            install.Uninstall();
            Assert.False(File.Exists(Path.Combine(_game, "winhttp.dll")));
            Assert.False(File.Exists(Path.Combine(_game, "FM27 Tactic Builder - README.txt")));
            Assert.False(Directory.Exists(Path.Combine(_game, "BepInEx")));
            Assert.True(File.Exists(Path.Combine(_game, "fm.exe")));
        }

        [Fact]
        public void Uninstall_keeps_bepinex_for_other_plugins()
        {
            var install = new GameInstallation(_game);
            install.Install(Package(), pluginOnly: false);
            Directory.CreateDirectory(Path.Combine(_game, "BepInEx", "plugins", "OtherMod"));
            install.Uninstall();
            Assert.False(install.HasPlugin);
            Assert.True(install.HasBepInEx);
        }

        // Other mods' patchers

        [Fact]
        public void Other_plugins_include_patchers()
        {
            Directory.CreateDirectory(Path.Combine(_game, "BepInEx", "patchers", "OtherMod"));
            Assert.Equal(new[] { "patchers/OtherMod" }, new GameInstallation(_game).OtherPlugins());
        }

        [Fact]
        public void Uninstall_keeps_bepinex_and_patcher_files_for_other_patchers()
        {
            var install = new GameInstallation(_game);
            install.Install(Package(), pluginOnly: false);
            Write("BepInEx/patchers/OtherMod/OtherMod.dll", "foreign");

            install.Uninstall();

            Assert.False(install.HasPlugin);
            Assert.False(File.Exists(install.ConfigPath));
            Assert.True(install.HasBepInEx);
            Assert.True(File.Exists(Path.Combine(_game, "doorstop_config.ini")));
            Assert.Equal("foreign", Read("BepInEx/patchers/OtherMod/OtherMod.dll"));
        }

        [Fact]
        public void Uninstall_with_other_plugin_removes_only_exporter_files()
        {
            var install = new GameInstallation(_game);
            install.Install(Package(), pluginOnly: false);
            Write("BepInEx/plugins/OtherMod/OtherMod.dll", "foreign");

            install.Uninstall();

            Assert.False(install.HasPlugin);
            Assert.False(File.Exists(install.ConfigPath));
            Assert.True(install.HasBepInEx);
            Assert.Equal("foreign", Read("BepInEx/plugins/OtherMod/OtherMod.dll"));
        }

        [Fact]
        public void Uninstall_of_exporter_only_installation_ignores_empty_patcher_folder()
        {
            var install = new GameInstallation(_game);
            install.Install(Package(), pluginOnly: false);
            Directory.CreateDirectory(Path.Combine(_game, "BepInEx", "patchers"));

            install.Uninstall();

            Assert.False(Directory.Exists(Path.Combine(_game, "BepInEx")));
            Assert.False(File.Exists(Path.Combine(_game, "winhttp.dll")));
        }

        // Install mode

        [Fact]
        public void Mode_is_full_only_without_usable_runtime()
        {
            Assert.Equal(InstallMode.Full, GameInstallation.ChooseMode(RuntimeState.Missing));
            Assert.Equal(InstallMode.Full, GameInstallation.ChooseMode(RuntimeState.Incomplete));
            Assert.Equal(InstallMode.Full, GameInstallation.ChooseMode(RuntimeState.Outdated));
            Assert.Equal(InstallMode.PluginOnly, GameInstallation.ChooseMode(RuntimeState.Compatible));
            Assert.Equal(InstallMode.PluginOnly, GameInstallation.ChooseMode(RuntimeState.Unknown));
        }

        [Theory]
        [InlineData("6.0.0-be.755+3fab71a", 755)]
        [InlineData("6.0.0-be.791+abcdef0", 791)]
        [InlineData("5.4.23.2", null)]
        [InlineData(null, null)]
        public void Reads_bepinex_build_number(string? version, int? expected)
        {
            Assert.Equal(expected, GameInstallation.BuildNumber(version));
        }

        [Fact]
        public void Fresh_install_installs_runtime_and_exporter()
        {
            var install = new GameInstallation(_game);
            var result = install.Install(Package());

            Assert.Equal(RuntimeState.Missing, result.Runtime);
            Assert.Equal(InstallMode.Full, result.Mode);
            Assert.True(install.HasBepInEx);
            Assert.True(install.HasPlugin);
            Assert.Equal("new doorstop_config.ini", Read("doorstop_config.ini"));
            Assert.Equal("new dotnet/coreclr.dll", Read("dotnet/coreclr.dll"));
        }

        [Fact]
        public void Reinstall_over_own_runtime_updates_only_the_plugin()
        {
            var install = new GameInstallation(_game);
            install.Install(Package());
            Write("doorstop_config.ini", "custom");
            Write("BepInEx/plugins/FM27TacticBuilder/FM27TacticBuilder.dll", "old plugin");

            var result = install.Install(Package());

            Assert.Equal(RuntimeState.Compatible, result.Runtime);
            Assert.Equal(InstallMode.PluginOnly, result.Mode);
            Assert.Equal("custom", Read("doorstop_config.ini"));
            Assert.Equal("new BepInEx/plugins/FM27TacticBuilder/FM27TacticBuilder.dll", Read("BepInEx/plugins/FM27TacticBuilder/FM27TacticBuilder.dll"));
        }

        [Fact]
        public void Update_with_newer_runtime_keeps_loader_files_and_settings()
        {
            ExistingRuntime();
            Write("BepInEx/plugins/FM27TacticBuilder/FM27TacticBuilder.dll", "old plugin");
            var install = WithVersions(installed: "6.0.0-be.791+abc", packaged: "6.0.0-be.755+3fab71a");

            var result = install.Install(Package());

            Assert.Equal(RuntimeState.Compatible, result.Runtime);
            Assert.Equal(InstallMode.PluginOnly, result.Mode);
            Assert.Equal("new BepInEx/plugins/FM27TacticBuilder/FM27TacticBuilder.dll", Read("BepInEx/plugins/FM27TacticBuilder/FM27TacticBuilder.dll"));
            Assert.Equal("mine winhttp", Read("winhttp.dll"));
            Assert.Equal("[General]\nenabled = true\n# mine", Read("doorstop_config.ini"));
            Assert.Equal("other core", Read("BepInEx/core/BepInEx.Core.dll"));
            Assert.Equal("mine coreclr", Read("dotnet/coreclr.dll"));
        }

        [Fact]
        public void Runtime_of_unknown_version_is_left_alone()
        {
            ExistingRuntime();
            var install = WithVersions(installed: "", packaged: "6.0.0-be.755+3fab71a");

            var result = install.Install(Package());

            Assert.Equal(RuntimeState.Unknown, result.Runtime);
            Assert.Equal(InstallMode.PluginOnly, result.Mode);
            Assert.Equal("other core", Read("BepInEx/core/BepInEx.Core.dll"));
            Assert.True(install.HasPlugin);
        }

        [Fact]
        public void Outdated_runtime_is_renewed_but_loader_settings_stay()
        {
            ExistingRuntime();
            var install = WithVersions(installed: "6.0.0-be.700+aaa", packaged: "6.0.0-be.755+3fab71a");

            var result = install.Install(Package());

            Assert.Equal(RuntimeState.Outdated, result.Runtime);
            Assert.Equal(InstallMode.Full, result.Mode);
            Assert.Equal("new BepInEx/core/BepInEx.Core.dll", Read("BepInEx/core/BepInEx.Core.dll"));
            Assert.Equal("new winhttp.dll", Read("winhttp.dll"));
            Assert.Equal("[General]\nenabled = true\n# mine", Read("doorstop_config.ini"));
        }

        [Fact]
        public void Incomplete_runtime_is_repaired()
        {
            ExistingRuntime();
            File.Delete(Path.Combine(_game, "dotnet", "coreclr.dll"));
            var install = new GameInstallation(_game);

            var result = install.Install(Package());

            Assert.Equal(RuntimeState.Incomplete, result.Runtime);
            Assert.Equal(InstallMode.Full, result.Mode);
            Assert.Equal("new dotnet/coreclr.dll", Read("dotnet/coreclr.dll"));
            Assert.Equal("[General]\nenabled = true\n# mine", Read("doorstop_config.ini"));
            Assert.True(install.HasPlugin);
        }

        [Fact]
        public void Missing_doorstop_config_counts_as_incomplete_and_is_restored()
        {
            ExistingRuntime();
            File.Delete(Path.Combine(_game, "doorstop_config.ini"));
            var install = WithVersions(installed: "6.0.0-be.791+abc", packaged: "6.0.0-be.755+3fab71a");

            var result = install.Install(Package());

            Assert.Equal(RuntimeState.Incomplete, result.Runtime);
            Assert.Equal("new doorstop_config.ini", Read("doorstop_config.ini"));
        }
    }
}
