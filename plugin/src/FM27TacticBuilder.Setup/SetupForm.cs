// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter's SetupForm (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: English only, own branding, settings, output folder and notes.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Text;
using System.Windows.Forms;

namespace FM27TacticBuilder.Setup
{
    /// <summary>Main window: choose the game folder, install/update/uninstall, edit the settings.</summary>
    internal sealed class SetupForm : Form
    {
        private const string Title = "FM27 Tactic Builder";
        private static readonly Color Brand = Color.FromArgb(0x16, 0x6E, 0x66);

        private readonly TextBox _folder = new TextBox { Dock = DockStyle.Fill };
        private readonly Label _status = new Label { AutoSize = true, Dock = DockStyle.Fill, Padding = new Padding(0, 6, 0, 6) };
        private readonly Button _install = new Button { AutoSize = true };
        private readonly Button _uninstall = new Button { AutoSize = true, Text = "Uninstall" };
        private readonly Button _openOutput = new Button { AutoSize = true, Text = "Open tactic folder" };
        private readonly Button _save = new Button { AutoSize = true, Text = "Save settings" };
        private readonly Label _saved = new Label { AutoSize = true, ForeColor = Color.SeaGreen, Padding = new Padding(8, 8, 0, 0) };
        private readonly Panel _settingsPanel = new Panel();
        private readonly Dictionary<SettingDefinition, Control> _editors = new Dictionary<SettingDefinition, Control>();
        private readonly TabControl _tabs = new TabControl { Dock = DockStyle.Fill };
        private readonly float _scale = 1f;

        public SetupForm()
        {
            Text = Title + " Setup";
            Font = new Font("Segoe UI", 9F);
            // Sizes are multiplied by the display scaling (S), so nothing is cut off at 125 % or 150 %.
            AutoScaleMode = AutoScaleMode.None;
            using (var graphics = CreateGraphics())
                _scale = Math.Max(1f, graphics.DpiX / 96f);
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(S(720), S(620));
            MinimumSize = new Size(S(600), S(480));
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

            _tabs.Padding = new Point(S(14), S(5));
            _tabs.TabPages.Add(Page("Install", BuildGamePage()));
            _tabs.TabPages.Add(Page("Settings", BuildSettingsPage()));
            _tabs.TabPages.Add(Page("About", BuildAboutPage()));

            // Docking runs in reverse order: the filling control first, then the header on top.
            Controls.Add(_tabs);
            Controls.Add(BuildHeader());

            _folder.TextChanged += (s, e) => RefreshState();
            Load += (s, e) =>
            {
                FitToScreen();
                _folder.Text = GameLocator.Find() ?? "";
                RefreshState();
            };
        }

        private int S(int pixels) => (int)Math.Round(pixels * _scale);

        private static TabPage Page(string title, Control content)
        {
            var page = new TabPage(title) { Padding = new Padding(10), UseVisualStyleBackColor = true };
            page.Controls.Add(content);
            return page;
        }

        /// <summary>Never larger than the free screen (small laptops, high scaling).</summary>
        private void FitToScreen()
        {
            var area = Screen.FromControl(this).WorkingArea;
            Width = Math.Min(Width, area.Width);
            Height = Math.Min(Height, area.Height);
            MinimumSize = new Size(Math.Min(MinimumSize.Width, area.Width), Math.Min(MinimumSize.Height, area.Height));
            Location = new Point(area.Left + (area.Width - Width) / 2, area.Top + (area.Height - Height) / 2);
        }

        private static string Version
        {
            get
            {
                var info = Assembly.GetExecutingAssembly().GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "";
                var plus = info.IndexOf('+');
                return (plus >= 0 ? info.Substring(0, plus) : info).TrimStart('v');
            }
        }

        private Control BuildHeader()
        {
            var panel = new Panel { Dock = DockStyle.Top, Height = S(68), BackColor = Brand };
            panel.Controls.Add(new Label
            {
                Text = Title,
                ForeColor = Color.White,
                Font = new Font("Segoe UI Semibold", 17F),
                AutoSize = true,
                Location = new Point(S(16), S(8))
            });
            panel.Controls.Add(new Label
            {
                Text = "Setup and settings" + (Version.Length > 0 ? "  ·  " + Version : ""),
                ForeColor = Color.FromArgb(214, 240, 236),
                AutoSize = true,
                Location = new Point(S(19), S(42))
            });
            return panel;
        }

        private Control BuildGamePage()
        {
            var grid = new TableLayoutPanel { Dock = DockStyle.Top, ColumnCount = 3, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink };
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));

            var intro = Para("The setup finds Football Manager 27 through Steam. If the game is somewhere else, choose the folder that contains fm.exe.");
            intro.Margin = new Padding(3, 0, 3, 12);
            grid.Controls.Add(intro, 0, 0);
            grid.SetColumnSpan(intro, 3);

            var browse = new Button { Text = "Browse…", AutoSize = true };
            browse.Click += (s, e) => BrowseGameFolder();
            grid.Controls.Add(new Label { Text = "Game folder", AutoSize = true, Anchor = AnchorStyles.Left, Padding = new Padding(0, 6, 8, 0) }, 0, 1);
            grid.Controls.Add(_folder, 1, 1);
            grid.Controls.Add(browse, 2, 1);
            _status.MaximumSize = new Size(S(640), 0);
            grid.Controls.Add(_status, 0, 2);
            grid.SetColumnSpan(_status, 3);

            var buttons = new FlowLayoutPanel { AutoSize = true, Dock = DockStyle.Fill, WrapContents = true, Margin = new Padding(0, 6, 0, 0) };
            _install.Click += (s, e) => Install();
            _uninstall.Click += (s, e) => Uninstall();
            _openOutput.Click += (s, e) => OpenOutputFolder();
            buttons.Controls.Add(_install);
            buttons.Controls.Add(_uninstall);
            buttons.Controls.Add(_openOutput);
            grid.Controls.Add(buttons, 0, 3);
            grid.SetColumnSpan(buttons, 3);

            var how = Para("How to use it\n" +
                           "1. Start FM27 (the first start after installing takes a few minutes).\n" +
                           "2. Open your Squad screen and switch the view to \"FM27TFT\" (see the README).\n" +
                           "3. Press F8. The plugin reads your players and opens your tactic in your browser.");
            how.Margin = new Padding(3, 16, 3, 3);
            grid.Controls.Add(how, 0, 4);
            grid.SetColumnSpan(how, 3);

            var hint = Para("The plugin only reads what the game shows. It never changes your saves or game files and never uses the internet. " +
                            "Updating keeps your settings; uninstalling never touches your saves.", SystemColors.GrayText);
            hint.Margin = new Padding(3, 12, 3, 3);
            grid.Controls.Add(hint, 0, 5);
            grid.SetColumnSpan(hint, 3);

            var scroll = new Panel { Dock = DockStyle.Fill, AutoScroll = true };
            scroll.Controls.Add(grid);
            return scroll;
        }

        private Label Para(string text, Color? color = null) => new Label
        {
            Text = text,
            AutoSize = true,
            MaximumSize = new Size(S(640), 0),
            ForeColor = color ?? SystemColors.ControlText
        };

        private Control BuildSettingsPage()
        {
            var grid = new TableLayoutPanel { Dock = DockStyle.Top, ColumnCount = 2, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink };
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

            var row = 0;
            foreach (var setting in BuilderSettings.All)
            {
                var label = new Label
                {
                    Text = setting.Label,
                    AutoSize = true,
                    MaximumSize = new Size(S(200), 0),
                    Anchor = AnchorStyles.Left | AnchorStyles.Top,
                    Padding = new Padding(0, 6, 12, 0)
                };
                var editor = CreateEditor(setting);
                var help = new Label
                {
                    Text = setting.Help,
                    AutoSize = true,
                    MaximumSize = new Size(S(400), 0),
                    ForeColor = SystemColors.GrayText,
                    Margin = new Padding(3, 0, 3, 8)
                };
                var cell = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, Dock = DockStyle.Fill, WrapContents = false };
                cell.Controls.Add(editor);
                cell.Controls.Add(help);
                grid.Controls.Add(label, 0, row);
                grid.Controls.Add(cell, 1, row);
                _editors[setting] = editor;
                row++;
            }

            var scroll = new Panel { Dock = DockStyle.Fill, AutoScroll = true };
            scroll.Controls.Add(grid);

            // Save stays at the bottom, so it is always visible while the list scrolls.
            var bar = new TableLayoutPanel { Dock = DockStyle.Bottom, ColumnCount = 2, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, Padding = new Padding(0, 8, 0, 0) };
            bar.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            bar.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            _save.Click += (s, e) => SaveSettings();
            bar.Controls.Add(_save, 0, 0);
            bar.Controls.Add(_saved, 1, 0);
            var note = Para("Changes apply from the next key press; changed keys after restarting the game.", SystemColors.GrayText);
            note.Margin = new Padding(3, 6, 3, 0);
            bar.Controls.Add(note, 0, 1);
            bar.SetColumnSpan(note, 2);

            _settingsPanel.Dock = DockStyle.Fill;
            _settingsPanel.Controls.Add(scroll);
            _settingsPanel.Controls.Add(bar);
            return _settingsPanel;
        }

        private Control CreateEditor(SettingDefinition setting)
        {
            switch (setting.Kind)
            {
                case SettingKind.Boolean:
                    return new CheckBox { AutoSize = true, Text = "on", Margin = new Padding(3, 5, 3, 0) };
                case SettingKind.Number:
                    return new NumericUpDown { Minimum = setting.Min, Maximum = Math.Max(setting.Min + 1, setting.Max), Width = S(90) };
                case SettingKind.Folder:
                    var panel = new FlowLayoutPanel { AutoSize = true, WrapContents = false, Margin = Padding.Empty };
                    var text = new TextBox { Width = S(320) };
                    var pick = new Button { Text = "…", Width = S(32) };
                    pick.Click += (s, e) =>
                    {
                        using (var dialog = new FolderBrowserDialog { SelectedPath = text.Text })
                        {
                            if (dialog.ShowDialog(this) == DialogResult.OK)
                                text.Text = dialog.SelectedPath;
                        }
                    };
                    panel.Controls.Add(text);
                    panel.Controls.Add(pick);
                    panel.Tag = text;
                    return panel;
                default:
                    return new TextBox { Width = S(220) };
            }
        }

        private Control BuildAboutPage()
        {
            var column = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoSize = true, Dock = DockStyle.Top };
            column.Controls.Add(new Label { Text = Title, Font = new Font("Segoe UI Semibold", 17F), AutoSize = true });
            column.Controls.Add(Para("Version " + (Version.Length > 0 ? Version : "?"), SystemColors.GrayText));
            column.Controls.Add(Para("\nReads your squad inside Football Manager 27 (F8) and designs a complete tactic for it: formations and roles " +
                                     "in and out of possession, team and player instructions, depth, set pieces and alternatives. " +
                                     "The tactic opens as a page in your browser; you enter it in FM27 by hand."));
            column.Controls.Add(Para("\nThe squad reader is based on FM View Exporter by ElectroHugin " +
                                     "(github.com/ElectroHugin/FM-View-Exporter), used and changed under the GNU GPL v3. " +
                                     "Role data was transcribed from FM27 by the FM Player Analyzer project."));
            column.Controls.Add(Para("\nFree software under the GNU General Public License v3 (LICENSE.txt in the plugin folder). " +
                                     "Comes with no warranty. Not affiliated with Sports Interactive or SEGA.", SystemColors.GrayText));
            column.Controls.Add(Para("\nThe full package contains BepInEx (LGPL-2.1) and its parts; see THIRD-PARTY-NOTICES.txt.", SystemColors.GrayText));
            var copy = new Button { Text = "Copy system info", AutoSize = true, Margin = new Padding(0, 14, 0, 0) };
            copy.Click += (s, e) =>
            {
                try { Clipboard.SetText(SystemInfo()); copy.Text = "Copied ✓"; } catch { }
            };
            column.Controls.Add(copy);
            var scroll = new Panel { Dock = DockStyle.Fill, AutoScroll = true };
            scroll.Controls.Add(column);
            return scroll;
        }

        private string SystemInfo()
        {
            var game = Game;
            return Title + " Setup " + Version + Environment.NewLine
                   + "Plugin: " + (game.HasPlugin ? InstalledVersion(game) : "-") + Environment.NewLine
                   + "BepInEx: " + (game.HasBepInEx ? "ok" : "-") + Environment.NewLine
                   + "FM View Exporter: " + (game.HasFmViewExporter ? "installed" : "-") + Environment.NewLine
                   + Environment.OSVersion.VersionString + (Environment.Is64BitOperatingSystem ? " (64-bit)" : "") + Environment.NewLine
                   + ".NET " + Environment.Version;
        }

        private GameInstallation Game => new GameInstallation(_folder.Text.Trim());

        private static Stream OpenPayload() => Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip");

        private static readonly bool HasPayload = Array.IndexOf(Assembly.GetExecutingAssembly().GetManifestResourceNames(), "payload.zip") >= 0;

        private void RefreshState()
        {
            var game = Game;
            var lines = new List<string>();
            if (!game.IsGameFolder)
            {
                lines.Add(_folder.Text.Trim().Length == 0
                    ? "FM27 was not found automatically. Please choose the folder that contains fm.exe."
                    : "There is no fm.exe in this folder.");
            }
            else if (!game.HasPlugin)
            {
                lines.Add("✗ FM27 Tactic Builder is not installed yet.");
            }
            else
            {
                var version = InstalledVersion(game);
                lines.Add("✓ FM27 Tactic Builder is installed" + (version.Length > 0 ? " (" + version + ")." : "."));
                lines.Add(game.HasBepInEx ? "✓ BepInEx is installed." : "✗ BepInEx is missing. Please install again.");
                if (!File.Exists(game.ConfigPath))
                    lines.Add("The settings file appears on the first game start; values saved here are kept.");
            }
            if (game.IsGameFolder && game.HasFmViewExporter)
                lines.Add("FM View Exporter is installed too. That's fine: both work side by side (F9 there, F8 here).");
            if (!HasPayload)
                lines.Add("Note: this setup contains no package (developer build), so installing is switched off.");
            _status.Text = string.Join(Environment.NewLine, lines);

            _install.Text = game.HasPlugin ? "Update" : "Install";
            _install.Enabled = game.IsGameFolder && HasPayload;
            _uninstall.Enabled = game.IsGameFolder && (game.HasPlugin || game.HasBepInEx);
            _settingsPanel.Enabled = game.IsGameFolder;
            _saved.Text = "";
            LoadSettings();
        }

        private static string InstalledVersion(GameInstallation game)
        {
            try
            {
                var info = FileVersionInfo.GetVersionInfo(Path.Combine(game.GameFolder, GameInstallation.PluginDll));
                return info.ProductVersion ?? info.FileVersion ?? "";
            }
            catch
            {
                return "";
            }
        }

        private void BrowseGameFolder()
        {
            using (var dialog = new FolderBrowserDialog { Description = "Football Manager 27 folder (with fm.exe)", SelectedPath = _folder.Text })
            {
                if (dialog.ShowDialog(this) == DialogResult.OK)
                    _folder.Text = dialog.SelectedPath;
            }
        }

        private bool GameIsRunning()
        {
            if (Process.GetProcessesByName("fm").Length == 0)
                return false;
            MessageBox.Show(this, "Football Manager is still running. Please quit the game first.", Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return true;
        }

        private void Install()
        {
            if (GameIsRunning())
                return;
            var game = Game;
            var update = game.HasPlugin;
            InstallResult result;
            try
            {
                Cursor = Cursors.WaitCursor;
                // A complete, matching BepInEx (also from other mods) stays; then only the plugin is copied.
                using (var payload = OpenPayload())
                    result = game.Install(payload);
            }
            catch (Exception ex)
            {
                ShowError(ex);
                return;
            }
            finally
            {
                Cursor = Cursors.Default;
            }

            var runtimeNote = result.Mode == InstallMode.Full && (result.Runtime == RuntimeState.Incomplete || result.Runtime == RuntimeState.Outdated)
                ? "\n\nBepInEx was incomplete or outdated and has been renewed. Existing loader settings (doorstop_config.ini) were kept."
                : "";
            MessageBox.Show(this, (update
                    ? "FM27 Tactic Builder was updated. Your settings were kept."
                    : "FM27 Tactic Builder is installed.\n\nThe first game start takes a few minutes while BepInEx prepares itself. " +
                      "Then open your Squad screen and press F8.") + runtimeNote,
                Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
            RefreshState();
        }

        private void Uninstall()
        {
            if (GameIsRunning())
                return;
            var game = Game;
            var others = game.OtherPlugins();
            var question = others.Count > 0
                ? "Remove FM27 Tactic Builder and its settings? BepInEx stays because other mods are installed: " + string.Join(", ", others)
                : "Remove FM27 Tactic Builder, its settings and BepInEx from the game folder? Your saves are not affected.";
            if (MessageBox.Show(this, question, Text, MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes)
                return;
            try
            {
                game.Uninstall();
            }
            catch (Exception ex)
            {
                ShowError(ex);
                return;
            }
            MessageBox.Show(this, "Removed. Your tactic pages and exports in Documents\\Sports Interactive\\FM27 Tactic Builder were kept.",
                Text, MessageBoxButtons.OK, MessageBoxIcon.Information);
            RefreshState();
        }

        private BepInExConfigFile ReadConfig()
        {
            var path = Game.ConfigPath;
            return new BepInExConfigFile(File.Exists(path) ? File.ReadAllText(path) : "");
        }

        private void LoadSettings()
        {
            if (!Game.IsGameFolder)
                return;
            BepInExConfigFile config;
            try
            {
                config = ReadConfig();
            }
            catch
            {
                config = new BepInExConfigFile("");
            }
            foreach (var pair in _editors)
                SetEditorValue(pair.Key, pair.Value, config.Get(pair.Key.Section, pair.Key.Key) ?? pair.Key.DefaultValue);
        }

        private void SaveSettings()
        {
            var game = Game;
            try
            {
                var config = ReadConfig();
                foreach (var pair in _editors)
                    config.Set(pair.Key.Section, pair.Key.Key, GetEditorValue(pair.Key, pair.Value));
                Directory.CreateDirectory(Path.GetDirectoryName(game.ConfigPath));
                File.WriteAllText(game.ConfigPath, config.ToString(), new UTF8Encoding(false));
            }
            catch (Exception ex)
            {
                ShowError(ex);
                return;
            }
            _saved.Text = "✓ Saved";
        }

        private static void SetEditorValue(SettingDefinition setting, Control editor, string value)
        {
            switch (setting.Kind)
            {
                case SettingKind.Boolean:
                    ((CheckBox)editor).Checked = string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
                    break;
                case SettingKind.Number:
                    var number = (NumericUpDown)editor;
                    number.Value = int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var n)
                        ? Math.Max(number.Minimum, Math.Min(number.Maximum, n))
                        : decimal.Parse(setting.DefaultValue, CultureInfo.InvariantCulture);
                    break;
                case SettingKind.Folder:
                    ((TextBox)editor.Tag).Text = value;
                    break;
                default:
                    editor.Text = value;
                    break;
            }
        }

        private static string GetEditorValue(SettingDefinition setting, Control editor)
        {
            switch (setting.Kind)
            {
                case SettingKind.Boolean:
                    return ((CheckBox)editor).Checked ? "true" : "false";
                case SettingKind.Number:
                    return ((int)((NumericUpDown)editor).Value).ToString(CultureInfo.InvariantCulture);
                case SettingKind.Folder:
                    return ((TextBox)editor.Tag).Text.Trim();
                default:
                    return editor.Text.Trim();
            }
        }

        private void OpenOutputFolder()
        {
            var configured = "";
            try
            {
                configured = ReadConfig().Get("Export", "OutputFolder") ?? "";
            }
            catch
            {
            }
            var folder = configured.Length > 0
                ? configured
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "Sports Interactive", "FM27 Tactic Builder");
            Directory.CreateDirectory(folder);
            try
            {
                Process.Start(new ProcessStartInfo(folder) { UseShellExecute = true });
            }
            catch
            {
            }
        }

        private void ShowError(Exception ex)
        {
            MessageBox.Show(this, "That did not work:\n\n" + ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
