// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments.

using System;
using System.Collections.Generic;
using System.Linq;

namespace FM27TacticBuilder.Core
{
    /// <summary>
    /// Collects table rows while the list is scrolled. The game only draws the visible rows,
    /// so the same players show up several times.
    /// <para>
    /// A row that was read is matched to one already collected:
    /// 1. by the key column (e.g. "Unique ID") when it is filled;
    /// 2. otherwise by the row identity from the UI (<c>rowId</c>, e.g. the row's position in the
    ///    list), but only when the filled cells don't contradict each other;
    /// 3. without either, only when the content is exactly the same.
    /// A row whose ID appears later is merged with its earlier entry through the row identity.
    /// Empty cells are filled from later reads, filled cells are never overwritten.
    /// Names alone never merge rows.
    /// </para>
    /// </summary>
    public sealed class RowCollector
    {
        private readonly int _columnCount;
        private readonly int _keyColumn;
        private readonly List<Entry> _entries = new();
        private readonly Dictionary<string, Entry> _byKey = new();
        private readonly Dictionary<string, Entry> _byRowId = new();
        private readonly Dictionary<string, Entry> _byContent = new();

        /// <param name="columnCount">Number of columns.</param>
        /// <param name="keyColumn">Index of the key column, -1 = none.</param>
        public RowCollector(int columnCount, int keyColumn)
        {
            if (columnCount <= 0)
                throw new ArgumentOutOfRangeException(nameof(columnCount));
            _columnCount = columnCount;
            _keyColumn = keyColumn < columnCount ? keyColumn : -1;
        }

        public int Count => _entries.Count;

        /// <summary>
        /// Rows without a key that fit another collected row (no contradicting cells). They might be
        /// duplicates; they are deliberately not merged so players are never mixed up. For the log.
        /// </summary>
        public int PossibleDuplicates
        {
            get
            {
                var count = 0;
                foreach (var entry in _entries)
                {
                    if (entry.Key != null)
                        continue;
                    if (_entries.Any(other => !ReferenceEquals(other, entry) && Compatible(other.Cells, entry.Cells)))
                        count++;
                }
                return count;
            }
        }

        /// <summary>
        /// Takes a row that was read. <paramref name="position"/> sets the order in the export;
        /// the position at first sight counts. <paramref name="rowId"/> is a stable identity of the
        /// row from the UI (same value = same row of the list, also after scrolling), or null.
        /// </summary>
        /// <returns>true when the row was new.</returns>
        public bool Add(IReadOnlyList<string> cells, double position, string? rowId = null)
        {
            if (cells.All(string.IsNullOrEmpty))
                return false;

            var copy = new string[_columnCount];
            for (var i = 0; i < copy.Length; i++)
                copy[i] = i < cells.Count ? cells[i] ?? string.Empty : string.Empty;

            var key = _keyColumn >= 0 && copy[_keyColumn].Length > 0 ? copy[_keyColumn] : null;
            if (string.IsNullOrEmpty(rowId))
                rowId = null;

            Entry? match = null;
            if (key != null && _byKey.TryGetValue(key, out var byKey))
                match = byKey;
            else if (rowId != null && _byRowId.TryGetValue(rowId, out var byRow)
                     && (key == null || byRow.Key == null) && Compatible(byRow.Cells, copy))
                match = byRow;
            else if (key == null && rowId == null && _byContent.TryGetValue(ContentKey(copy), out var byContent))
                match = byContent;

            if (match != null)
            {
                Merge(match, copy);
                if (key != null && match.Key == null)
                {
                    match.Key = key;
                    _byKey[key] = match;
                }
                if (rowId != null && match.RowId == null && !_byRowId.ContainsKey(rowId))
                {
                    match.RowId = rowId;
                    _byRowId[rowId] = match;
                }
                return false;
            }

            var entry = new Entry(copy, position, _entries.Count) { Key = key };
            _entries.Add(entry);
            if (key != null)
                _byKey[key] = entry;
            if (rowId != null)
            {
                // A new row with the same identity (the list changed) takes it over.
                entry.RowId = rowId;
                if (_byRowId.TryGetValue(rowId, out var previous))
                    previous.RowId = null;
                _byRowId[rowId] = entry;
            }
            if (key == null && rowId == null)
                _byContent[ContentKey(copy)] = entry;
            return true;
        }

        public IEnumerable<string[]> RowsInOrder()
        {
            return _entries.OrderBy(e => e.Position).ThenBy(e => e.Sequence).Select(e => e.Cells);
        }

        /// <summary>Columns that have no value in any row.</summary>
        public IEnumerable<int> EmptyColumns()
        {
            for (var i = 0; i < _columnCount; i++)
            {
                if (_entries.All(e => e.Cells[i].Length == 0))
                    yield return i;
            }
        }

        private static void Merge(Entry entry, string[] cells)
        {
            for (var i = 0; i < entry.Cells.Length; i++)
            {
                if (entry.Cells[i].Length == 0 && cells[i].Length > 0)
                    entry.Cells[i] = cells[i];
            }
        }

        /// <summary>No contradiction: where both rows have a value, it is the same.</summary>
        private static bool Compatible(string[] a, string[] b)
        {
            for (var i = 0; i < a.Length && i < b.Length; i++)
            {
                if (a[i].Length > 0 && b[i].Length > 0 && !string.Equals(a[i], b[i], StringComparison.Ordinal))
                    return false;
            }
            return true;
        }

        private static string ContentKey(string[] cells) => string.Join("\u001f", cells);

        private sealed class Entry
        {
            public Entry(string[] cells, double position, int sequence)
            {
                Cells = cells;
                Position = position;
                Sequence = sequence;
            }

            public string[] Cells { get; }
            public double Position { get; }
            public int Sequence { get; }
            public string? Key { get; set; }
            public string? RowId { get; set; }
        }
    }
}
