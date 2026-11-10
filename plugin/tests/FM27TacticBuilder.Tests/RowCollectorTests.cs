// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter's tests (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder.

using System.Linq;
using FM27TacticBuilder.Core;
using Xunit;

namespace FM27TacticBuilder.Tests
{
    public class RowCollectorTests
    {
        [Fact]
        public void Rows_seen_twice_are_kept_once()
        {
            var rows = new RowCollector(3, 0);
            Assert.True(rows.Add(new[] { "1", "A", "x" }, 0));
            Assert.True(rows.Add(new[] { "2", "B", "y" }, 1));
            Assert.False(rows.Add(new[] { "2", "B", "y" }, 5));
            Assert.Equal(2, rows.Count);
        }

        [Fact]
        public void Later_reads_fill_empty_cells()
        {
            var rows = new RowCollector(3, 0);
            rows.Add(new[] { "1", "A", "" }, 0);
            rows.Add(new[] { "1", "", "late" }, 1);
            Assert.Equal(new[] { "1", "A", "late" }, rows.RowsInOrder().Single());
        }

        [Fact]
        public void Order_follows_first_position()
        {
            var rows = new RowCollector(2, 0);
            rows.Add(new[] { "2", "B" }, 20);
            rows.Add(new[] { "1", "A" }, 10);
            rows.Add(new[] { "2", "B" }, 5);
            Assert.Equal(new[] { "1", "2" }, rows.RowsInOrder().Select(r => r[0]));
        }

        [Fact]
        public void Without_key_column_the_whole_row_is_the_key_and_empty_rows_are_ignored()
        {
            var rows = new RowCollector(2, -1);
            Assert.False(rows.Add(new[] { "", "" }, 0));
            Assert.True(rows.Add(new[] { "a", "b" }, 0));
            Assert.False(rows.Add(new[] { "a", "b" }, 1));
            Assert.True(rows.Add(new[] { "a", "c" }, 2));
            Assert.Equal(2, rows.Count);
        }

        [Fact]
        public void Reports_columns_without_any_value()
        {
            var rows = new RowCollector(3, 0);
            rows.Add(new[] { "1", "", "x" }, 0);
            rows.Add(new[] { "2", "", "" }, 1);
            Assert.Equal(new[] { 1 }, rows.EmptyColumns());
        }

        // Row identity and values that load late

        [Fact]
        public void Id_that_appears_later_is_merged_via_row_identity()
        {
            var rows = new RowCollector(3, 0);
            Assert.True(rows.Add(new[] { "", "Spieler A", "" }, 0, "row:0"));
            Assert.False(rows.Add(new[] { "123", "Spieler A", "15" }, 100000, "row:0"));
            Assert.Equal(new[] { "123", "Spieler A", "15" }, rows.RowsInOrder().Single());

            // After that the row is also found by its ID.
            Assert.False(rows.Add(new[] { "123", "Spieler A", "15" }, 200000, "row:0"));
            Assert.Equal(1, rows.Count);
        }

        [Fact]
        public void Without_row_identity_a_late_id_is_not_merged_silently_but_reported()
        {
            var rows = new RowCollector(3, 0);
            rows.Add(new[] { "", "Spieler A", "" }, 0);
            rows.Add(new[] { "123", "Spieler A", "15" }, 1);
            Assert.Equal(2, rows.Count);
            Assert.Equal(1, rows.PossibleDuplicates);
        }

        [Fact]
        public void Values_loaded_later_fill_the_same_row_without_key_column()
        {
            var rows = new RowCollector(3, -1);
            rows.Add(new[] { "Spieler A", "", "" }, 0, "row:0");
            rows.Add(new[] { "Spieler A", "24", "" }, 1, "row:0");
            rows.Add(new[] { "Spieler A", "24", "€1M" }, 2, "row:0");
            Assert.Equal(new[] { "Spieler A", "24", "€1M" }, rows.RowsInOrder().Single());
            Assert.Equal(0, rows.PossibleDuplicates);
        }

        [Fact]
        public void Players_with_the_same_name_stay_separate()
        {
            var rows = new RowCollector(3, 0);
            rows.Add(new[] { "1", "Max Müller", "20" }, 0, "row:0");
            rows.Add(new[] { "2", "Max Müller", "20" }, 1, "row:24");
            rows.Add(new[] { "", "Max Müller", "" }, 2, "row:48");
            Assert.Equal(3, rows.Count);

            var noKey = new RowCollector(2, -1);
            noKey.Add(new[] { "Max Müller", "20" }, 0, "row:0");
            noKey.Add(new[] { "Max Müller", "31" }, 1, "row:24");
            Assert.Equal(2, noKey.Count);
        }

        [Fact]
        public void Conflicting_values_at_the_same_row_identity_are_not_merged()
        {
            var rows = new RowCollector(3, -1);
            rows.Add(new[] { "Spieler A", "24", "" }, 0, "row:0");
            Assert.True(rows.Add(new[] { "Spieler B", "", "" }, 1, "row:0"));
            Assert.Equal(2, rows.Count);
        }

        [Fact]
        public void A_known_id_is_not_moved_to_another_player_with_same_row_identity()
        {
            var rows = new RowCollector(3, 0);
            rows.Add(new[] { "1", "Spieler A", "" }, 0, "row:0");
            Assert.True(rows.Add(new[] { "2", "Spieler A", "" }, 1, "row:0"));
            Assert.Equal(new[] { "1", "2" }, rows.RowsInOrder().Select(r => r[0]));
        }

        [Fact]
        public void Unmerged_row_without_id_is_reported()
        {
            var rows = new RowCollector(3, 0);
            rows.Add(new[] { "1", "Spieler A", "" }, 0, "y:0");
            rows.Add(new[] { "", "Spieler A", "15" }, 1, "y:500");
            Assert.Equal(2, rows.Count);
            Assert.Equal(1, rows.PossibleDuplicates);
        }

        [Fact]
        public void Horizontal_scan_parts_are_merged()
        {
            // Visible on the left: ID and name; after scrolling sideways only the right-hand columns.
            var rows = new RowCollector(4, 0);
            rows.Add(new[] { "1", "A", "", "" }, 0, "row:0");
            rows.Add(new[] { "2", "B", "", "" }, 24, "row:24");
            rows.Add(new[] { "", "", "x", "y" }, 100000, "row:0");
            rows.Add(new[] { "", "", "z", "w" }, 100024, "row:24");
            Assert.Equal(new[] { new[] { "1", "A", "x", "y" }, new[] { "2", "B", "z", "w" } }, rows.RowsInOrder());
        }

        [Fact]
        public void Merging_keeps_the_original_order()
        {
            var rows = new RowCollector(3, 0);
            rows.Add(new[] { "", "A", "" }, 10, "row:0");
            rows.Add(new[] { "", "B", "" }, 20, "row:24");
            rows.Add(new[] { "", "C", "" }, 30, "row:48");
            rows.Add(new[] { "3", "C", "x" }, 1, "row:48");
            rows.Add(new[] { "1", "A", "x" }, 2, "row:0");
            rows.Add(new[] { "2", "B", "x" }, 3, "row:24");
            Assert.Equal(new[] { "A", "B", "C" }, rows.RowsInOrder().Select(r => r[1]));
            Assert.Equal(new[] { "1", "2", "3" }, rows.RowsInOrder().Select(r => r[0]));
        }
    }
}
