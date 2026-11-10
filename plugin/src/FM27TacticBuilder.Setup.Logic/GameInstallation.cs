// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments and messages, own plugin folder and files.

using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Text.RegularExpressions;

namespace FM27TacticBuilder.Setup
{
    /// <summary>
    /// Installs, updates and removes BepInEx and the plugin in the game folder.
    /// </summary>
    public sealed class GameInstallation
    {
        private static readonly char Sep = Path.DirectorySeparatorChar;
        public static readonly string PluginFolder = Path.Combine("BepInEx", "plugins", PluginName);
        public static readonly string PluginDll = Path.Combine(PluginFolder, PluginName + ".dll");
        public const string PluginName = "FM27TacticBuilder";
        public static readonly string ConfigFolder = Path.Combine("BepInEx", "config");

        /// <summary>What the full package puts next to fm.exe (besides the BepInEx folder).</summary>
        private static readonly string[] LoaderFiles =
        {
            "winhttp.dll", "doorstop_config.ini", ".doorstop_version", "changelog.txt", "FM27 Tactic Builder - README.txt"
        };

        private static readonly string[] LoaderFolders = { "BepInEx", "dotnet" };

        public GameInstallation(string gameFolder)
        {
            GameFolder = gameFolder ?? "";
        }

        public string GameFolder { get; }

        public bool IsGameFolder => File.Exists(Path.Combine(GameFolder, SteamLibraries.GameExe));
        public bool HasBepInEx => File.Exists(Path.Combine(GameFolder, "winhttp.dll")) && Directory.Exists(Path.Combine(GameFolder, "BepInEx"));
        public bool HasPlugin => File.Exists(Path.Combine(GameFolder, PluginDll));

        /// <summary>FM View Exporter is installed too. Both work side by side (F9 there, F8 here).</summary>
        public bool HasFmViewExporter => Directory.Exists(Path.Combine(GameFolder, "BepInEx", "plugins", "FMViewExporter"));
        public string ConfigPath => Path.Combine(GameFolder, ConfigFolder, BuilderSettings.ConfigFileName);

        /// <summary>
        /// Other mods next to this plugin (BepInEx\plugins and BepInEx\patchers); then BepInEx stays
        /// when uninstalling. Patchers are listed as "patchers/Name".
        /// </summary>
        public List<string> OtherPlugins()
        {
            var result = new List<string>();
            var plugins = Path.Combine(GameFolder, "BepInEx", "plugins");
            if (Directory.Exists(plugins))
            {
                foreach (var entry in Directory.GetFileSystemEntries(plugins))
                {
                    var name = Path.GetFileName(entry);
                    if (!string.Equals(name, PluginName, StringComparison.OrdinalIgnoreCase)
                        && !string.Equals(name, PluginName + ".dll", StringComparison.OrdinalIgnoreCase))
                        result.Add(name);
                }
            }
            var patchers = Path.Combine(GameFolder, "BepInEx", "patchers");
            if (Directory.Exists(patchers))
            {
                foreach (var entry in Directory.GetFileSystemEntries(patchers))
                    result.Add("patchers/" + Path.GetFileName(entry));
            }
            return result;
        }

        /// <summary>
        /// Files BepInEx can't start without. Only those that are in the package are checked.
        /// </summary>
        private static readonly string[] RuntimeFiles =
        {
            "winhttp.dll", "doorstop_config.ini",
            Path.Combine("BepInEx", "core", "BepInEx.Core.dll"),
            Path.Combine("BepInEx", "core", "BepInEx.Unity.IL2CPP.dll"),
            Path.Combine("dotnet", "coreclr.dll")
        };

        private static readonly string CoreDll = Path.Combine("BepInEx", "core", "BepInEx.Core.dll");

        /// <summary>Loader settings that are never overwritten when the file exists.</summary>
        private static readonly string[] KeptLoaderSettings = { "doorstop_config.ini" };

        /// <summary>
        /// Reads the product version of a DLL (e.g. "6.0.0-be.755+3fab71a"). Replaceable for tests.
        /// </summary>
        public Func<string, string> ReadProductVersion { get; set; } = DefaultProductVersion;

        /// <summary>
        /// Checks the installed BepInEx runtime against the package.
        /// </summary>
        public RuntimeState CheckRuntime(Stream package)
        {
            using var zip = new ZipArchive(package, ZipArchiveMode.Read, leaveOpen: true);
            return CheckRuntime(zip);
        }

        private RuntimeState CheckRuntime(ZipArchive zip)
        {
            var entries = new Dictionary<string, ZipArchiveEntry>(StringComparer.OrdinalIgnoreCase);
            foreach (var entry in zip.Entries)
                entries[Normalize(entry.FullName)] = entry;

            var present = 0;
            var required = 0;
            foreach (var file in RuntimeFiles)
            {
                if (!entries.ContainsKey(file))
                    continue;
                required++;
                if (File.Exists(Path.Combine(GameFolder, file)))
                    present++;
            }
            if (present == 0 && !Directory.Exists(Path.Combine(GameFolder, "BepInEx", "core")))
                return RuntimeState.Missing;
            if (present < required)
                return RuntimeState.Incomplete;

            if (!entries.TryGetValue(CoreDll, out var packagedCore))
                return RuntimeState.Compatible;
            var installedCore = Path.Combine(GameFolder, CoreDll);
            if (SameContent(packagedCore, installedCore))
                return RuntimeState.Compatible;

            var installedBuild = BuildNumber(SafeRead(installedCore));
            var packagedBuild = BuildNumber(ReadPackagedVersion(packagedCore));
            if (installedBuild == null || packagedBuild == null)
                return RuntimeState.Unknown;
            return installedBuild >= packagedBuild ? RuntimeState.Compatible : RuntimeState.Outdated;
        }

        /// <summary>
        /// Chooses what to install: with a complete, matching (or unknown, i.e. another mod's) runtime
        /// only the plugin, otherwise the full package (new install or repair).
        /// </summary>
        public static InstallMode ChooseMode(RuntimeState state) =>
            state == RuntimeState.Compatible || state == RuntimeState.Unknown ? InstallMode.PluginOnly : InstallMode.Full;

        /// <summary>
        /// Installs or updates and picks the scope itself (see <see cref="ChooseMode"/>).
        /// </summary>
        public InstallResult Install(Stream package)
        {
            using var zip = new ZipArchive(package, ZipArchiveMode.Read, leaveOpen: true);
            var state = CheckRuntime(zip);
            var mode = ChooseMode(state);
            return new InstallResult(state, mode, Install(zip, mode == InstallMode.PluginOnly));
        }

        /// <summary>
        /// Unpacks the full package into the game folder. Existing settings (BepInEx\config and
        /// doorstop_config.ini) are left alone. <paramref name="pluginOnly"/> = only the plugin files
        /// (update with BepInEx already there). Returns the number of files written.
        /// </summary>
        public int Install(Stream package, bool pluginOnly)
        {
            using var zip = new ZipArchive(package, ZipArchiveMode.Read, leaveOpen: true);
            return Install(zip, pluginOnly);
        }

        private int Install(ZipArchive zip, bool pluginOnly)
        {
            var written = 0;
            var root = Path.GetFullPath(GameFolder);
            foreach (var entry in zip.Entries)
            {
                if (string.IsNullOrEmpty(entry.Name))
                    continue; // folder
                var relative = Normalize(entry.FullName);
                if (pluginOnly && !relative.StartsWith(PluginFolder + Sep, StringComparison.OrdinalIgnoreCase))
                    continue;
                var target = Path.GetFullPath(Path.Combine(root, relative));
                if (!target.StartsWith(root.TrimEnd(Sep) + Sep, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("Invalid path in the package: " + entry.FullName);
                if (File.Exists(target) && IsKeptSetting(relative))
                    continue;

                Directory.CreateDirectory(Path.GetDirectoryName(target));
                using (var source = entry.Open())
                using (var destination = File.Create(target))
                    source.CopyTo(destination);
                written++;
            }
            return written;
        }

        private static bool IsKeptSetting(string relative)
        {
            if (relative.StartsWith(ConfigFolder + Sep, StringComparison.OrdinalIgnoreCase))
                return true;
            foreach (var file in KeptLoaderSettings)
            {
                if (string.Equals(relative, file, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        private static string Normalize(string zipPath) => zipPath.Replace('/', Sep).Replace('\\', Sep);

        private static bool SameContent(ZipArchiveEntry entry, string path)
        {
            try
            {
                var info = new FileInfo(path);
                if (!info.Exists || info.Length != entry.Length)
                    return false;
                using var a = entry.Open();
                using var b = File.OpenRead(path);
                var bufA = new byte[81920];
                var bufB = new byte[81920];
                while (true)
                {
                    var n = ReadFull(a, bufA);
                    var m = ReadFull(b, bufB);
                    if (n != m)
                        return false;
                    if (n == 0)
                        return true;
                    for (var i = 0; i < n; i++)
                    {
                        if (bufA[i] != bufB[i])
                            return false;
                    }
                }
            }
            catch (IOException)
            {
                return false;
            }
        }

        private static int ReadFull(Stream stream, byte[] buffer)
        {
            var total = 0;
            while (total < buffer.Length)
            {
                var n = stream.Read(buffer, total, buffer.Length - total);
                if (n == 0)
                    break;
                total += n;
            }
            return total;
        }

        private string ReadPackagedVersion(ZipArchiveEntry entry)
        {
            var temp = Path.Combine(Path.GetTempPath(), "fm27tb-" + Guid.NewGuid().ToString("N") + ".dll");
            try
            {
                using (var source = entry.Open())
                using (var destination = File.Create(temp))
                    source.CopyTo(destination);
                return SafeRead(temp);
            }
            finally
            {
                try { File.Delete(temp); } catch (IOException) { }
            }
        }

        private string SafeRead(string path)
        {
            try
            {
                return File.Exists(path) ? ReadProductVersion(path) : null;
            }
            catch (Exception)
            {
                return null;
            }
        }

        private static string DefaultProductVersion(string path) => FileVersionInfo.GetVersionInfo(path).ProductVersion;

        /// <summary>Build number from a BepInEx version such as "6.0.0-be.755+3fab71a", else null.</summary>
        public static int? BuildNumber(string version)
        {
            if (string.IsNullOrEmpty(version))
                return null;
            var match = Regex.Match(version, @"be\.(\d+)", RegexOptions.IgnoreCase);
            return match.Success && int.TryParse(match.Groups[1].Value, out var build) ? build : (int?)null;
        }

        /// <summary>
        /// Removes the plugin and its settings; without other mods also BepInEx itself.
        /// Returns what was removed.
        /// </summary>
        public List<string> Uninstall()
        {
            var removed = new List<string>();
            var keepLoader = OtherPlugins().Count > 0;

            DeleteDirectory(PluginFolder, removed);
            DeleteFile(Path.Combine("BepInEx", "plugins", PluginName + ".dll"), removed);
            DeleteFile(Path.Combine(ConfigFolder, BuilderSettings.ConfigFileName), removed);
            if (keepLoader)
                return removed;

            foreach (var file in LoaderFiles)
                DeleteFile(file, removed);
            foreach (var folder in LoaderFolders)
                DeleteDirectory(folder, removed);
            return removed;
        }

        private void DeleteFile(string relative, List<string> removed)
        {
            var path = Path.Combine(GameFolder, relative);
            if (!File.Exists(path))
                return;
            File.Delete(path);
            removed.Add(relative);
        }

        private void DeleteDirectory(string relative, List<string> removed)
        {
            var path = Path.Combine(GameFolder, relative);
            if (!Directory.Exists(path))
                return;
            Directory.Delete(path, true);
            removed.Add(relative + Sep);
        }
    }

    /// <summary>State of the BepInEx runtime in the game folder.</summary>
    public enum RuntimeState
    {
        /// <summary>No BepInEx.</summary>
        Missing,
        /// <summary>BepInEx partly there, required files missing.</summary>
        Incomplete,
        /// <summary>Complete, but older than the build in the package.</summary>
        Outdated,
        /// <summary>Complete, version unknown (e.g. from another mod).</summary>
        Unknown,
        /// <summary>Complete and at least as new as the build in the package.</summary>
        Compatible
    }

    public enum InstallMode
    {
        /// <summary>BepInEx and plugin.</summary>
        Full,
        /// <summary>Only the plugin files.</summary>
        PluginOnly
    }

    public sealed class InstallResult
    {
        public InstallResult(RuntimeState runtime, InstallMode mode, int filesWritten)
        {
            Runtime = runtime;
            Mode = mode;
            FilesWritten = filesWritten;
        }

        public RuntimeState Runtime { get; }
        public InstallMode Mode { get; }
        public int FilesWritten { get; }
    }
}
