// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments.

using System;
using System.Collections.Generic;

namespace FM27TacticBuilder.Core
{
    /// <summary>
    /// An exported table: column headers as shown in the game and the rows as text.
    /// </summary>
    public sealed class ExportTable
    {
        private readonly List<string[]> _rows = new();

        public ExportTable(string title, IReadOnlyList<string> headers, DateTime createdAt)
        {
            if (headers.Count == 0)
                throw new ArgumentException("A table needs at least one column.", nameof(headers));

            Title = title;
            Headers = headers;
            CreatedAt = createdAt;
        }

        public string Title { get; }
        public IReadOnlyList<string> Headers { get; }
        public DateTime CreatedAt { get; }
        public IReadOnlyList<string[]> Rows => _rows;

        /// <summary>
        /// Adds a row. Missing cells are filled with empty text and extra cells are cut off,
        /// so every row is as wide as the header.
        /// </summary>
        public void AddRow(IReadOnlyList<string?> cells)
        {
            var row = new string[Headers.Count];
            for (var i = 0; i < row.Length; i++)
                row[i] = i < cells.Count ? cells[i] ?? string.Empty : string.Empty;
            _rows.Add(row);
        }
    }
}
