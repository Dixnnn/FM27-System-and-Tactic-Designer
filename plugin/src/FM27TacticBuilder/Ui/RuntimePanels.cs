// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English messages.

using System;
using System.Collections.Generic;
using FM27TacticBuilder.Diagnostics;
using UnityEngine.UIElements;

namespace FM27TacticBuilder.Ui
{
    /// <summary>Finds the UI Toolkit panels the game is drawing right now.</summary>
    internal static class RuntimePanels
    {
        internal sealed class PanelInfo
        {
            public PanelInfo(VisualElement root, string description)
            {
                Root = root;
                Description = description;
            }

            public VisualElement Root { get; }
            public string Description { get; }
        }

        public static List<PanelInfo> Find()
        {
            var result = new List<PanelInfo>();
            var seen = new HashSet<IntPtr>();

            try
            {
                var panels = UIElementsRuntimeUtility.GetSortedPlayerPanels();
                for (var i = 0; i < panels.Count; i++)
                {
                    var panel = panels[i];
                    var root = panel?.visualTree;
                    if (root != null && seen.Add(root.Pointer))
                        result.Add(new PanelInfo(root, $"{Il2CppInspector.TypeName(panel)} \"{panel!.name}\""));
                }
            }
            catch (Exception ex)
            {
                Plugin.Logger.LogWarning($"Could not read the panels through UIElementsRuntimeUtility: {ex.Message}");
            }

            if (result.Count == 0)
            {
                // Fallback: the UIDocument components in the scene.
                var documents = UnityEngine.Object.FindObjectsOfType(Il2CppInterop.Runtime.Il2CppType.Of<UIDocument>());
                foreach (var obj in documents)
                {
                    var document = obj.TryCast<UIDocument>();
                    var root = document?.rootVisualElement;
                    if (root != null && seen.Add(root.Pointer))
                        result.Add(new PanelInfo(root, $"UIDocument \"{document!.name}\""));
                }
            }

            return result;
        }
    }
}
