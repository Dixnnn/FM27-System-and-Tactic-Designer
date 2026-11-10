// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments and messages.

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using FM27TacticBuilder.Ui;
using UnityEngine;
using UnityEngine.UIElements;

namespace FM27TacticBuilder.Diagnostics
{
    /// <summary>
    /// Writes a dump of the visible user interface to a text file: element tree with type, name,
    /// classes, position and text, plus details on lists and their data objects. It shows how to
    /// read the squad table again after a game patch. Read only.
    /// </summary>
    internal static class UiDumper
    {
        private const int MaxElements = 60000;
        private const int MaxDepth = 80;
        private const int ItemsToShow = 3;

        public static string DumpToFile()
        {
            var started = DateTime.Now;
            var folder = OutputPaths.EnsureFolder(OutputPaths.DiagnosticsFolder);
            var path = Path.Combine(folder, "ui-dump_" + started.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture) + ".txt");

            using var writer = new StreamWriter(path, false, new UTF8Encoding(false));
            var dumper = new Dumper(writer);

            writer.WriteLine($"# {PluginInfo.Name} {PluginInfo.Version} - UI dump");
            writer.WriteLine($"# Time: {started:yyyy-MM-dd HH:mm:ss}");
            writer.WriteLine($"# Game: {Application.productName} {Application.version}, Unity {Application.unityVersion}");
            writer.WriteLine("# Format: type #name .classes [x,y width x height] \"text\" ds=dataSource ud=userData");
            writer.WriteLine();

            var panels = RuntimePanels.Find();
            writer.WriteLine($"# {panels.Count} panel(s) found");
            for (var i = 0; i < panels.Count; i++)
            {
                var panel = panels[i];
                writer.WriteLine();
                writer.WriteLine($"== Panel {i}: {panel.Description}");
                dumper.Walk(panel.Root, 0);
            }

            TableModel.Write(writer);

            writer.WriteLine();
            writer.WriteLine($"# {dumper.ElementCount} elements, {dumper.ListCount} lists, {(DateTime.Now - started).TotalMilliseconds:0} ms");
            writer.Flush();

            Plugin.Logger.LogMessage($"UI dump written: {path} ({dumper.ElementCount} elements, {dumper.ListCount} lists)");
            return path;
        }

        private sealed class Dumper
        {
            private readonly StreamWriter _writer;

            public Dumper(StreamWriter writer)
            {
                _writer = writer;
            }

            public int ElementCount { get; private set; }
            public int ListCount { get; private set; }

            public void Walk(VisualElement element, int depth)
            {
                if (ElementCount >= MaxElements)
                    return;
                ElementCount++;

                var indent = new string(' ', depth * 2);
                var hidden = IsHidden(element);
                _writer.WriteLine(indent + Describe(element, hidden));

                if (LooksLikeList(element))
                    DescribeList(element, indent + "  | ");

                var childCount = element.childCount;
                if (hidden && childCount > 0)
                {
                    _writer.WriteLine($"{indent}  ({childCount} children hidden, skipped)");
                    return;
                }
                if (depth >= MaxDepth)
                {
                    _writer.WriteLine($"{indent}  (maximum depth reached)");
                    return;
                }

                for (var i = 0; i < childCount; i++)
                    Walk(element[i], depth + 1);
            }

            private static bool IsHidden(VisualElement element)
            {
                try
                {
                    return element.resolvedStyle.display == DisplayStyle.None || !element.visible;
                }
                catch (Exception)
                {
                    return false;
                }
            }

            private static string Describe(VisualElement element, bool hidden)
            {
                var line = new StringBuilder();
                line.Append(Il2CppInspector.TypeName(element));

                var name = element.name;
                if (!string.IsNullOrEmpty(name))
                    line.Append(" #").Append(name);

                var classes = element.GetClassesForIteration();
                if (classes != null)
                {
                    for (var i = 0; i < classes.Count; i++)
                        line.Append(" .").Append(classes[i]);
                }

                var bounds = element.worldBound;
                line.Append(CultureInfo.InvariantCulture, $" [{bounds.x:0},{bounds.y:0} {bounds.width:0}x{bounds.height:0}]");

                var text = element.TryCast<TextElement>()?.text;
                if (!string.IsNullOrEmpty(text))
                    line.Append(" \"").Append(Clean(text!)).Append('"');

                AppendObject(line, " ds=", element.dataSource);
                AppendObject(line, " ud=", element.userData);

                if (hidden)
                    line.Append(" HIDDEN");
                return line.ToString();
            }

            private static void AppendObject(StringBuilder line, string label, Il2CppSystem.Object? value)
            {
                if (value != null)
                    line.Append(label).Append(Il2CppInspector.TypeName(value));
            }

            private static string Clean(string text)
            {
                text = text.Replace("\r", "\\r").Replace("\n", "\\n").Replace("\"", "'");
                return text.Length > 200 ? text.Substring(0, 200) + "..." : text;
            }

            private static bool LooksLikeList(VisualElement element)
            {
                foreach (var typeName in Il2CppInspector.TypeChain(element))
                {
                    if (typeName.EndsWith("VirtualisedList", StringComparison.Ordinal)
                        || typeName.EndsWith("BaseVerticalCollectionView", StringComparison.Ordinal)
                        || typeName == "UnityEngine.UIElements.ScrollView")
                        return true;
                }
                return false;
            }

            private void DescribeList(VisualElement element, string prefix)
            {
                ListCount++;
                try
                {
                    var scrollView = element.TryCast<ScrollView>();
                    if (scrollView != null)
                        _writer.WriteLine(prefix + $"ScrollView scrollOffset={scrollView.scrollOffset}");

                    foreach (var member in new[] { "ActiveView", "VisibleView", "ScrollOffset", "ContentSize", "ViewportSize", "FixedElementSize", "EstimatedElementSize" })
                    {
                        var value = Il2CppInspector.GetMember(element, member);
                        if (value != null)
                            _writer.WriteLine(prefix + member + " = " + Il2CppInspector.Short(value));
                    }

                    var items = Il2CppInspector.GetMember(element, "Items") ?? Il2CppInspector.GetMember(element, "itemsSource");
                    if (items == null)
                        return;

                    var count = Il2CppInspector.GetInt(items, "Count") ?? Il2CppInspector.GetInt(items, "Length");
                    _writer.WriteLine(prefix + $"Items: {Il2CppInspector.TypeName(items)}, Count={count?.ToString(CultureInfo.InvariantCulture) ?? "?"}");
                    if (count is not > 0)
                        return;

                    for (var i = 0; i < Math.Min(ItemsToShow, count.Value); i++)
                    {
                        var item = Il2CppInspector.GetListItem(items, i);
                        _writer.WriteLine(prefix + $"Item[{i}]: {Il2CppInspector.TypeName(item)} = {Il2CppInspector.Short(item)}");
                        if (i == 0 && item != null)
                        {
                            var budget = 400;
                            Il2CppInspector.Describe(item, prefix + "  ", 2, _writer.WriteLine, ref budget);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _writer.WriteLine(prefix + "Error reading the list: " + ex.GetType().Name + ": " + ex.Message);
                }
            }
        }
    }
}
