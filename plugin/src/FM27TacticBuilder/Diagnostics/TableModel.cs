// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments and messages.

using System;
using System.IO;
using FM27TacticBuilder.Export;
using UnityEngine.UIElements;
using Il2CppObject = Il2CppSystem.Object;

namespace FM27TacticBuilder.Diagnostics
{
    /// <summary>
    /// Part of the UI dump: describes the objects behind the player table (table, ancestors,
    /// first row, first cell) with fields and properties. Read only.
    /// </summary>
    internal static class TableModel
    {
        private const int Budget = 2500;
        private const int AncestorLevels = 4;

        public static void Write(StreamWriter writer)
        {
            writer.WriteLine();
            writer.WriteLine("== Data model of the player table");
            try
            {
                var table = PlayerTable.Find();
                if (table == null)
                {
                    writer.WriteLine("No player table visible.");
                    return;
                }

                writer.WriteLine($"Screen: {table.ViewName}");
                Section(writer, "Table #" + table.Table.name, table.Table, 2);

                var level = 0;
                for (var e = table.Table.parent; e != null && level < AncestorLevels; e = e.parent, level++)
                    Section(writer, $"Ancestor {level + 1} #{e.name}", e, 1);

                Section(writer, "Row ScrollView", table.Rows, 1);

                var rows = table.FindVisibleRows();
                writer.WriteLine($"Visible rows: {rows.Count}");
                if (rows.Count == 0)
                    return;
                var first = rows[0];
                var rowElement = first.Cells[0].parent;
                while (rowElement != null && !rowElement.ClassListContains("streamed-table__row"))
                    rowElement = rowElement.parent;
                if (rowElement != null)
                {
                    Section(writer, "First row", rowElement, 2);
                    Data(writer, "First row", rowElement);
                }
                Section(writer, "First cell", first.Cells[0], 1);
                Data(writer, "First cell", first.Cells[0]);
                if (first.Cells.Count > 2)
                {
                    Section(writer, "Third cell", first.Cells[2], 1);
                    Data(writer, "Third cell", first.Cells[2]);
                }
            }
            catch (Exception ex)
            {
                writer.WriteLine("Error: " + ex.GetType().Name + ": " + ex.Message);
            }
        }

        private static void Data(StreamWriter writer, string label, VisualElement element)
        {
            if (element.dataSource != null)
                Section(writer, label + " dataSource", element.dataSource, 2);
            if (element.userData != null)
                Section(writer, label + " userData", element.userData, 2);
        }

        private static void Section(StreamWriter writer, string title, Il2CppObject obj, int depth)
        {
            writer.WriteLine();
            writer.WriteLine($"-- {title}: {Il2CppInspector.TypeName(obj)}");
            var budget = Budget;
            try
            {
                Il2CppInspector.Describe(obj, "  ", depth, writer.WriteLine, ref budget, skipUnity: obj.TryCast<VisualElement>() != null);
            }
            catch (Exception ex)
            {
                writer.WriteLine("  Error: " + ex.GetType().Name + ": " + ex.Message);
            }
        }
    }
}
