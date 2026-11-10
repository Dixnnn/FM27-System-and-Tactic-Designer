// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments and messages, in-game progress
// messages, and the result goes to TacticReport (CSV + tactic page) instead of CSV/HTML files.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Text;
using FM27TacticBuilder.Core;
using FM27TacticBuilder.Report;
using FM27TacticBuilder.Ui;
using UnityEngine;

namespace FM27TacticBuilder.Export
{
    /// <summary>
    /// One read of the player list. The game only draws the visible rows (and maybe only the visible
    /// columns), so the list is scrolled step by step, with frames in between for the game to fill the
    /// rows. Afterwards the scroll position and frame rate are put back as they were.
    /// </summary>
    internal sealed class ExportRun
    {
        private const int MaxSteps = 5000;
        private const int MaxSettleFrames = 30;
        private const string KeyHeader = "Unique ID";

        // Share of the visible height per scroll step. The overlap is merged through "Unique ID";
        // without it, the reader scrolls back a little.
        private const float PageFraction = 0.95f;

        private readonly IEnumerator<int> _steps;
        private readonly bool _openPage;
        private readonly bool _buildMode;
        private int _waitFrames;
        private Action? _cleanup;
        private int _frames;
        private double _frameSeconds;
        private double _slowestFrame;

        /// <param name="openPage">Open the tactic page in the browser when done.</param>
        /// <param name="buildMode">true = the user asked for a tactic (F8), false = only save the list.</param>
        public ExportRun(bool openPage, bool buildMode)
        {
            _openPage = openPage;
            _buildMode = buildMode;
            _steps = Run().GetEnumerator();
        }

        public bool Finished { get; private set; }

        /// <summary>Call once per frame.</summary>
        public void Tick()
        {
            if (Finished)
                return;
            // How long the game takes per frame (for the timing line in the log).
            var delta = Time.unscaledDeltaTime;
            _frames++;
            _frameSeconds += delta;
            _slowestFrame = Math.Max(_slowestFrame, delta);
            if (_waitFrames > 0)
            {
                _waitFrames--;
                return;
            }
            try
            {
                // "yield return n" means: carry on in n frames. This frame counts as the first.
                if (_steps.MoveNext())
                    _waitFrames = Math.Max(0, _steps.Current - 1);
                else
                    Finished = true;
            }
            catch (Exception ex)
            {
                Finished = true;
                Plugin.Logger.LogError($"Reading stopped: {ex}");
                Toast.Show("Something went wrong", "Reading the list stopped. Details are in BepInEx\\LogOutput.log.", 10f, warning: true);
            }
            if (Finished)
                RunCleanup();
        }

        private IEnumerable<int> Run()
        {
            var watch = Stopwatch.StartNew();

            // Read the settings again on every run, so changes apply without a restart.
            try
            {
                Plugin.ConfigFile.Reload();
            }
            catch (Exception ex)
            {
                Plugin.Logger.LogWarning($"Could not reload the settings: {ex.Message}");
            }
            var table = PlayerTable.Find();
            if (table == null)
            {
                Toast.Show("No player list on screen",
                    "Open your Squad screen (the list of your players) and press the key again.", 9f, warning: true);
                try
                {
                    var hints = PlayerTable.DescribeCandidates();
                    if (hints.Count == 0)
                        Plugin.Logger.LogInfo("Diagnostics: no table parts visible. A UI dump (Ctrl+Shift+F8) helps find the cause.");
                    foreach (var hint in hints)
                        Plugin.Logger.LogInfo("Diagnostics: " + hint);
                }
                catch (Exception ex)
                {
                    Plugin.Logger.LogInfo($"Diagnostics not possible: {ex.Message}");
                }
                yield break;
            }

            var headers = table.ReadHeaders();
            var keyColumn = headers.IndexOf(KeyHeader);
            Plugin.Logger.LogMessage($"Reading started: screen \"{table.ViewName}\", {headers.Count} columns" +
                (keyColumn < 0 ? " (no \"Unique ID\" column, duplicate rows are recognised by their whole content)." : "."));
            Toast.Show(_buildMode ? "Building your tactic…" : "Saving the list…",
                "Reading the players on screen. Please don't click until this message changes.", 0f);

            var rows = new RowCollector(headers.Count, keyColumn);
            var scroll = table.Rows;
            var original = scroll.scrollOffset;
            var sweepColumns = Plugin.Settings.ScanColumns.Value;
            var settle = Math.Max(1, Plugin.Settings.FramesPerStep.Value);
            var mismatchReported = false;
            var gapReported = false;

            // The plugin waits in frames, so reading runs as fast as the frame rate.
            var frameRate = FrameRateUnlock.Apply();

            // Make the list taller: more rows per step, so fewer steps.
            TallList? tall = null;
            var rowHeight = 30f;
            var rowsPerStep = Plugin.Settings.RowsPerStep.Value;
            try
            {
                var firstRows = table.FindVisibleRows();
                if (firstRows.Count > 1 && Math.Abs(firstRows[1].Top - firstRows[0].Top) > 1f)
                    rowHeight = Math.Abs(firstRows[1].Top - firstRows[0].Top);
                tall = TallList.Apply(scroll, rowsPerStep, rowHeight);
            }
            catch (Exception ex)
            {
                Plugin.Logger.LogWarning($"Could not make the list taller: {ex.Message}");
            }
            _cleanup = () =>
            {
                tall?.Restore();
                scroll.scrollOffset = original;
                frameRate.Restore();
            };
            if (tall != null)
            {
                yield return 3;
                Plugin.Logger.LogInfo($"List made taller: {table.FindVisibleRows().Count} rows per step (setting RowsPerStep = {rowsPerStep}).");
            }

            var timing = new ExportTiming();
            var step = 0;
            var y = 0f;
            HashSet<string>? previousKeys = null;
            string? previousSignature = null;
            var previousPosition = new Vector2(float.NaN, float.NaN);
            var lastRowCount = 0;
            while (true)
            {
                var x = 0f;
                var stepKeys = new HashSet<string>();
                while (true)
                {
                    var position = new Vector2(x, y);
                    scroll.scrollOffset = position;
                    timing.Frames += settle;
                    yield return settle;

                    // Wait until the rows match the new position and two reads in a row agree.
                    // Position, key and last cell of each row are enough for that; all cells are read once after.
                    var moved = position != previousPosition;
                    var visible = Timed(timing, table.FindVisibleRows);
                    var signature = Timed(timing, () => Signature(visible, keyColumn));
                    for (var i = 0; i < MaxSettleFrames; i++)
                    {
                        timing.Frames++;
                        yield return 1;
                        var again = Timed(timing, table.FindVisibleRows);
                        var againSignature = Timed(timing, () => Signature(again, keyColumn));
                        var same = againSignature == signature;
                        visible = again;
                        signature = againSignature;
                        // Looks just like before scrolling: the game hasn't refilled the rows yet, keep waiting.
                        if (same && (!moved || signature != previousSignature))
                            break;
                    }
                    previousSignature = signature;
                    previousPosition = position;

                    lastRowCount = visible.Count;
                    var read = Timed(timing, () => visible.Select(r => (r.Top, r.ContentY, Cells: PlayerTable.ReadCells(r))).ToList());
                    foreach (var (top, contentY, cells) in read)
                    {
                        if (cells.Count != headers.Count && !mismatchReported)
                        {
                            mismatchReported = true;
                            Plugin.Logger.LogWarning($"A row has {cells.Count} cells, the header {headers.Count} columns. Matching them by order.");
                        }
                        if (keyColumn >= 0 && keyColumn < cells.Count && cells[keyColumn].Length > 0)
                            stepKeys.Add(cells[keyColumn]);
                        // Position in the list content = stable row identity (the same after scrolling and
                        // sideways scanning); so a Unique ID that is filled in later finds its row.
                        rows.Add(cells, step * 100000.0 + top, RowId(contentY));
                    }

                    step++;
                    var maxX = scroll.horizontalScroller.highValue;
                    if (!sweepColumns || x >= maxX || step >= MaxSteps)
                        break;
                    x = Math.Min(maxX, x + Math.Max(50f, scroll.contentViewport.layout.width * 0.9f));
                }

                var page = Math.Max(20f, scroll.contentViewport.layout.height * PageFraction);
                // Never scroll further than the game actually drew rows.
                if (lastRowCount > 1)
                    page = Math.Min(page, Math.Max(20f, (lastRowCount - 1) * rowHeight));

                // Safety net for the big steps: if this step shares no player with the previous one,
                // rows in between could be missing. Then go back half a step.
                if (previousKeys != null && previousKeys.Count > 0 && stepKeys.Count > 0 &&
                    !stepKeys.Overlaps(previousKeys) && y > 0 && step < MaxSteps)
                {
                    if (!gapReported)
                    {
                        gapReported = true;
                        Plugin.Logger.LogInfo("Scroll step without overlap, scrolling back a little.");
                    }
                    previousKeys = null;
                    y = Math.Max(0f, y - page / 2);
                    continue;
                }
                previousKeys = stepKeys;

                var maxY = scroll.verticalScroller.highValue;
                if (y >= maxY || step >= MaxSteps)
                    break;
                y = Math.Min(maxY, y + page);
            }

            RunCleanup();
            Deliver(table, headers, rows, watch);
            var other = watch.Elapsed - timing.Read;
            Plugin.Logger.LogInfo($"Timing: {step} scroll steps, waited {timing.Frames} frames; " +
                $"reading {timing.Read.TotalSeconds:0.0} s, waiting for the game and writing {Math.Max(0, other.TotalSeconds):0.0} s; " +
                $"average frame {(_frames > 0 ? _frameSeconds / _frames * 1000 : 0):0} ms, longest {_slowestFrame * 1000:0} ms.");
        }

        private sealed class ExportTiming
        {
            public int Frames;
            public TimeSpan Read;
        }

        private static T Timed<T>(ExportTiming timing, Func<T> action)
        {
            var start = Stopwatch.GetTimestamp();
            try
            {
                return action();
            }
            finally
            {
                timing.Read += TimeSpan.FromSeconds((Stopwatch.GetTimestamp() - start) / (double)Stopwatch.Frequency);
            }
        }

        /// <summary>
        /// Short fingerprint of the visible rows: position, key and last cell.
        /// Without a key column the whole row is used.
        /// </summary>
        private static string Signature(List<PlayerTable.VisibleRow> visible, int keyColumn)
        {
            var sb = new StringBuilder();
            foreach (var row in visible)
            {
                sb.Append(row.Top.ToString("R", CultureInfo.InvariantCulture)).Append('\u001e');
                if (keyColumn < 0)
                {
                    sb.Append(string.Join("\u001f", PlayerTable.ReadCells(row)));
                }
                else
                {
                    sb.Append(PlayerTable.ReadCell(row, keyColumn)).Append('\u001f');
                    sb.Append(PlayerTable.ReadCell(row, row.Cells.Count - 1));
                }
                sb.Append('\u001d');
            }
            return sb.ToString();
        }

        private void RunCleanup()
        {
            var cleanup = _cleanup;
            _cleanup = null;
            try
            {
                cleanup?.Invoke();
            }
            catch (Exception ex)
            {
                Plugin.Logger.LogWarning($"Could not restore the list as it was: {ex.Message}");
            }
        }

        /// <summary>Row identity from the position in the list content (rounded to whole pixels).</summary>
        private static string? RowId(float contentY) =>
            float.IsNaN(contentY) || float.IsInfinity(contentY) ? null : "y:" + Math.Round(contentY).ToString(CultureInfo.InvariantCulture);

        private void Deliver(PlayerTable table, List<string> headers, RowCollector rows, Stopwatch watch)
        {
            // Columns without a header (selection boxes) are dropped.
            var keep = Enumerable.Range(0, headers.Count).Where(i => headers[i].Length > 0).ToList();
            var title = $"{Application.productName} - {table.ViewName}";
            var export = new ExportTable(title, keep.Select(i => headers[i]).ToList(), DateTime.Now);
            foreach (var row in rows.RowsInOrder())
                export.AddRow(keep.Select(i => row[i]).ToList());

            Plugin.Logger.LogMessage($"Read {export.Rows.Count} rows and {export.Headers.Count} columns in {watch.Elapsed.TotalSeconds:0.0} s.");
            if (rows.PossibleDuplicates > 0)
                Plugin.Logger.LogWarning($"{rows.PossibleDuplicates} rows without a Unique ID match another row and might be duplicates. " +
                    "They were not merged; please add the \"Unique ID\" column to the view.");
            var empty = rows.EmptyColumns().Where(i => headers[i].Length > 0).Select(i => headers[i]).ToList();
            if (empty.Count > 0)
                Plugin.Logger.LogInfo($"{empty.Count} columns without values: {string.Join(", ", empty)}");

            TacticReport.Deliver(export, table.ViewName, _openPage, _buildMode);
        }
    }
}
