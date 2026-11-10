// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments and messages.

using System;
using System.Collections.Generic;
using FM27TacticBuilder.Core;
using FM27TacticBuilder.Ui;
using Il2CppInterop.Runtime;
using UnityEngine.UIElements;

namespace FM27TacticBuilder.Export
{
    /// <summary>
    /// The game's player table (SI.Bindable.StreamedTable #playertable) as seen in an FM27 UI dump:
    /// column headers in #column-headers (one pane per column), rows as .streamed-table__row in a
    /// virtualised list, the cells as children of #DragObject in the same order as the headers.
    /// Read only.
    /// </summary>
    internal sealed class PlayerTable
    {
        private const string TableName = "playertable";
        private const string HeaderContainerName = "column-headers";
        private const string HeaderTextClass = "table-header-xs";
        private const string RowClass = "streamed-table__row";
        private const string CellClass = "streamed-table__cell";
        private const string StarClass = "fm-star-rating-star";

        private PlayerTable(VisualElement table, VisualElement headerContainer, ScrollView rows, string viewName)
        {
            Table = table;
            HeaderContainer = headerContainer;
            Rows = rows;
            ViewName = viewName;
        }

        public VisualElement Table { get; }
        public VisualElement HeaderContainer { get; }
        public ScrollView Rows { get; }

        /// <summary>Name of the screen for the file name, e.g. "squad" from #SquadScreen.</summary>
        public string ViewName { get; }

        /// <summary>
        /// Finds the largest visible player table. First by the name #playertable (squad, player search)
        /// or #playertable… (e.g. #playertableshortlist); if there is none, by the table's structure
        /// (#column-headers plus a list of rows), because other screens may use the same table under another name.
        /// </summary>
        public static PlayerTable? Find()
        {
            var panels = RuntimePanels.Find();
            return FindByName(panels) ?? FindByStructure(panels);
        }

        private static PlayerTable? FindByName(IEnumerable<RuntimePanels.PanelInfo> panels)
        {
            PlayerTable? best = null;
            var bestArea = 0f;
            foreach (var panel in panels)
            {
                foreach (var candidate in Descendants(panel.Root, e => IsTableName(e.name) && !IsHidden(e)))
                {
                    var area = Area(candidate);
                    if (area <= bestArea)
                        continue;

                    var headers = FirstDescendant(candidate, e => e.name == HeaderContainerName);
                    var rows = FindRowScrollView(candidate);
                    if (headers == null || rows == null)
                        continue;

                    best = new PlayerTable(candidate, headers, rows, GuessViewName(candidate));
                    bestArea = area;
                }
            }
            return best;
        }

        private const int MaxStructureLevels = 8;

        private static PlayerTable? FindByStructure(IEnumerable<RuntimePanels.PanelInfo> panels)
        {
            PlayerTable? best = null;
            var bestArea = 0f;
            foreach (var panel in panels)
            {
                foreach (var headers in Descendants(panel.Root, e => e.name == HeaderContainerName && !IsHidden(e)))
                {
                    // Walk up from the header row until an ancestor also holds the rows.
                    var level = 0;
                    for (var candidate = headers.parent; candidate != null && level < MaxStructureLevels; candidate = candidate.parent, level++)
                    {
                        if (IsHidden(candidate))
                            break;
                        var rows = FindRowScrollView(candidate);
                        if (rows == null)
                            continue;

                        var area = Area(candidate);
                        if (area > bestArea)
                        {
                            best = new PlayerTable(candidate, headers, rows, GuessViewName(candidate));
                            bestArea = area;
                        }
                        break;
                    }
                }
            }
            return best;
        }

        /// <summary>
        /// Short description for the log when no table was found: where header rows and table rows are
        /// (chain of ancestor names), so the reader can be adapted.
        /// </summary>
        public static List<string> DescribeCandidates()
        {
            var result = new List<string>();
            foreach (var panel in RuntimePanels.Find())
            {
                var found = Descendants(panel.Root, e => !IsHidden(e) &&
                    (e.name == HeaderContainerName || IsTableName(e.name) || e.ClassListContains(RowClass)));
                var seen = new HashSet<string>();
                foreach (var element in found)
                {
                    var kind = element.ClassListContains(RowClass) ? "row" : "#" + element.name;
                    var line = kind + " in " + AncestorPath(element);
                    if (seen.Add(line) && result.Count < 10)
                        result.Add(line);
                }
            }
            return result;
        }

        private static string AncestorPath(VisualElement element)
        {
            var names = new List<string>();
            for (var e = element.parent; e != null && names.Count < 12; e = e.parent)
            {
                if (!string.IsNullOrEmpty(e.name))
                    names.Add("#" + e.name);
            }
            names.Reverse();
            return names.Count == 0 ? "(no names)" : string.Join(" > ", names);
        }

        private static bool IsTableName(string? name) =>
            name != null && name.StartsWith(TableName, StringComparison.OrdinalIgnoreCase);

        private static float Area(VisualElement element)
        {
            var bounds = element.worldBound;
            return bounds.width * bounds.height;
        }

        /// <summary>Column headers in display order; the selection column has an empty header.</summary>
        public List<string> ReadHeaders()
        {
            var result = new List<string>();
            for (var i = 0; i < HeaderContainer.childCount; i++)
            {
                var pane = HeaderContainer[i];
                var text = FirstDescendant(pane, e => e.ClassListContains(HeaderTextClass))?.TryCast<TextElement>()?.text;
                result.Add(CellText.Clean(text));
            }
            return result;
        }

        /// <summary>A row that is drawn right now, with its cells (not read yet).</summary>
        internal sealed class VisibleRow
        {
            public VisibleRow(float top, float contentY, List<VisualElement> cells)
            {
                Top = top;
                ContentY = contentY;
                Cells = cells;
            }

            /// <summary>Screen position of the row (for the order).</summary>
            public float Top { get; }

            /// <summary>Position of the row inside the ScrollView's content (independent of scrolling).</summary>
            public float ContentY { get; }

            public List<VisualElement> Cells { get; }
        }

        /// <summary>Finds all rows drawn right now without reading the cells.</summary>
        public List<VisibleRow> FindVisibleRows()
        {
            var result = new List<VisibleRow>();
            var contentTop = Rows.contentContainer.worldBound.y;
            foreach (var row in Descendants(Rows, e => e.ClassListContains(RowClass)))
            {
                if (IsHidden(row))
                    continue;
                var cells = Descendants(row, e => e.ClassListContains(CellClass));
                if (cells.Count == 0)
                    continue;
                var top = row.worldBound.y;
                result.Add(new VisibleRow(top, top - contentTop, cells));
            }
            return result;
        }

        /// <summary>Text of one cell; empty when the row has no such column.</summary>
        public static string ReadCell(VisibleRow row, int column) =>
            column >= 0 && column < row.Cells.Count ? ReadCell(row.Cells[column]) : string.Empty;

        /// <summary>All cells of a row as text.</summary>
        public static List<string> ReadCells(VisibleRow row)
        {
            var cells = new List<string>(row.Cells.Count);
            foreach (var cell in row.Cells)
                cells.Add(ReadCell(cell));
            return cells;
        }

        private static string ReadCell(VisualElement cell)
        {
            var texts = new List<string>();
            var stars = 0;
            var total = 0.0;
            Visit(cell, e =>
            {
                if (IsHidden(e))
                    return false;
                // Every access to a game object goes through IL2CPP and is expensive, so only the
                // necessary ones: elements with text are never stars.
                var text = AsTextElement(e)?.text;
                if (!string.IsNullOrEmpty(text))
                {
                    texts.Add(text!);
                    return true;
                }
                if (e.ClassListContains(StarClass) || e.ClassListContains(StarClass + "-no-margin"))
                {
                    stars++;
                    var names = new List<string>();
                    var classes = e.GetClassesForIteration();
                    for (var i = 0; classes != null && i < classes.Count; i++)
                        names.Add(classes[i]);
                    total += StarRating.StarValue(names);
                }
                return true;
            });

            var value = CellText.Join(texts);
            if (value.Length == 0 && stars > 0)
                value = StarRating.Format(total);
            return value;
        }

        // Result of the type check per IL2CPP class, so it doesn't run again for every element.
        private static readonly Dictionary<IntPtr, bool> TextClasses = new();

        private static TextElement? AsTextElement(VisualElement element)
        {
            var klass = IL2CPP.il2cpp_object_get_class(element.Pointer);
            if (!TextClasses.TryGetValue(klass, out var isText))
            {
                isText = element.TryCast<TextElement>() != null;
                TextClasses[klass] = isText;
            }
            return isText ? new TextElement(element.Pointer) : null;
        }

        private static ScrollView? FindRowScrollView(VisualElement table)
        {
            // The rows sit in the ScrollView of the virtualised list, not in the header ScrollView.
            foreach (var element in Descendants(table, e => e.TryCast<ScrollView>() != null))
            {
                var scrollView = element.TryCast<ScrollView>()!;
                if (FirstDescendant(scrollView, e => e.ClassListContains(RowClass)) != null)
                    return scrollView;
            }
            return null;
        }

        private static string GuessViewName(VisualElement table)
        {
            var tableNames = new List<string>();
            Visit(table, e =>
            {
                if (IsTableName(e.name))
                    tableNames.Add(e.name);
                return true;
            });
            var ancestors = new List<string>();
            for (var e = table.parent; e != null; e = e.parent)
                ancestors.Add(e.name);
            return ViewNames.Guess(tableNames, ancestors);
        }

        internal static bool IsHidden(VisualElement element)
        {
            try
            {
                // visible first: one call fewer than resolvedStyle.display.
                return !element.visible || element.resolvedStyle.display == DisplayStyle.None;
            }
            catch (Exception)
            {
                return false;
            }
        }

        /// <summary>Depth-first walk; <paramref name="enter"/> decides whether children are visited.</summary>
        private static void Visit(VisualElement element, Func<VisualElement, bool> enter)
        {
            if (!enter(element))
                return;
            for (var i = 0; i < element.childCount; i++)
                Visit(element[i], enter);
        }

        /// <summary>All descendants that match, without going into matches.</summary>
        private static List<VisualElement> Descendants(VisualElement root, Func<VisualElement, bool> match)
        {
            var result = new List<VisualElement>();
            var stack = new Stack<VisualElement>();
            for (var i = root.childCount - 1; i >= 0; i--)
                stack.Push(root[i]);
            while (stack.Count > 0)
            {
                var element = stack.Pop();
                if (match(element))
                {
                    result.Add(element);
                    continue;
                }
                for (var i = element.childCount - 1; i >= 0; i--)
                    stack.Push(element[i]);
            }
            return result;
        }

        private static VisualElement? FirstDescendant(VisualElement root, Func<VisualElement, bool> match)
        {
            var stack = new Stack<VisualElement>();
            for (var i = root.childCount - 1; i >= 0; i--)
                stack.Push(root[i]);
            while (stack.Count > 0)
            {
                var element = stack.Pop();
                if (match(element))
                    return element;
                for (var i = element.childCount - 1; i >= 0; i--)
                    stack.Push(element[i]);
            }
            return null;
        }
    }
}
