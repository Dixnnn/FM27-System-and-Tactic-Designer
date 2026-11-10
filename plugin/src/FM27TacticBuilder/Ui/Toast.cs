// SPDX-License-Identifier: GPL-3.0-or-later
// FM27 Tactic Builder: a small message box in the top right corner of the game.

using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

namespace FM27TacticBuilder.Ui
{
    /// <summary>
    /// Shows short messages ("Reading your squad…", "Tactic ready") on top of the game, drawn with the
    /// game's own UI Toolkit. The box ignores the mouse, so it never blocks a click, and it is removed
    /// again after a few seconds. Display only: it changes nothing in the game. Every message also goes
    /// to BepInEx\LogOutput.log, so nothing is lost when the box can't be drawn.
    /// </summary>
    internal static class Toast
    {
        private const string BoxName = "fm27-tactic-builder-message";
        private const int MaxFailures = 3;

        private static VisualElement? _box;
        private static Label? _title;
        private static Label? _text;
        private static float _hideAt = float.MaxValue;
        private static int _failures;

        /// <param name="seconds">How long to show it; 0 = until the next message.</param>
        public static void Show(string title, string text, float seconds, bool warning = false)
        {
            if (warning)
                Plugin.Logger.LogWarning($"{title}: {text}");
            else
                Plugin.Logger.LogMessage($"{title}: {text}");

            if (!Plugin.Settings.InGameMessages.Value || _failures >= MaxFailures)
                return;
            try
            {
                if (!EnsureBox())
                    return;
                _title!.text = title;
                _text!.text = text;
                var accent = warning ? new Color(0.93f, 0.62f, 0.2f, 1f) : new Color(0.24f, 0.72f, 0.66f, 1f);
                _box!.style.borderLeftColor = new StyleColor(accent);
                _box.style.display = new StyleEnum<DisplayStyle>(DisplayStyle.Flex);
                _box.BringToFront();
                _hideAt = seconds > 0 ? Time.unscaledTime + seconds : float.MaxValue;
            }
            catch (Exception ex)
            {
                _failures++;
                Plugin.Logger.LogWarning($"Could not show the in-game message ({_failures}/{MaxFailures}): {ex.Message}");
                Remove();
            }
        }

        public static void Tick()
        {
            if (_box == null || Time.unscaledTime < _hideAt)
                return;
            _hideAt = float.MaxValue;
            Remove();
        }

        private static void Remove()
        {
            try
            {
                _box?.RemoveFromHierarchy();
            }
            catch (Exception)
            {
                // The game may have rebuilt its UI already; nothing to clean up then.
            }
            _box = null;
            _title = null;
            _text = null;
        }

        private static bool EnsureBox()
        {
            if (_box != null && _box.panel != null)
                return true;
            Remove();

            var root = TopRoot();
            if (root == null)
                return false;

            var box = new VisualElement { name = BoxName, pickingMode = PickingMode.Ignore };
            var s = box.style;
            s.position = new StyleEnum<Position>(Position.Absolute);
            s.top = new StyleLength(18f);
            s.right = new StyleLength(18f);
            s.width = new StyleLength(390f);
            s.paddingTop = new StyleLength(11f);
            s.paddingBottom = new StyleLength(12f);
            s.paddingLeft = new StyleLength(14f);
            s.paddingRight = new StyleLength(14f);
            s.backgroundColor = new StyleColor(new Color(0.07f, 0.09f, 0.11f, 0.95f));
            s.borderLeftWidth = new StyleFloat(4f);
            s.borderTopLeftRadius = new StyleLength(8f);
            s.borderTopRightRadius = new StyleLength(8f);
            s.borderBottomLeftRadius = new StyleLength(8f);
            s.borderBottomRightRadius = new StyleLength(8f);

            var font = FindFont(root);
            _title = MakeLabel(15f, new Color(0.95f, 0.96f, 0.97f, 1f), bold: true, font);
            _text = MakeLabel(13f, new Color(0.78f, 0.82f, 0.86f, 1f), bold: false, font);
            _text.style.marginTop = new StyleLength(4f);
            box.Add(_title);
            box.Add(_text);
            root.Add(box);
            _box = box;
            return true;
        }

        private static Label MakeLabel(float size, Color color, bool bold, FontDefinition? font)
        {
            var label = new Label { pickingMode = PickingMode.Ignore };
            var s = label.style;
            s.fontSize = new StyleLength(size);
            s.color = new StyleColor(color);
            s.whiteSpace = new StyleEnum<WhiteSpace>(WhiteSpace.Normal);
            s.unityFontStyleAndWeight = new StyleEnum<FontStyle>(bold ? FontStyle.Bold : FontStyle.Normal);
            s.marginLeft = new StyleLength(0f);
            s.marginRight = new StyleLength(0f);
            s.paddingLeft = new StyleLength(0f);
            s.paddingRight = new StyleLength(0f);
            if (font != null)
                s.unityFontDefinition = new StyleFontDefinition(font);
            return label;
        }

        /// <summary>The root of the panel drawn last (on top) that has a size.</summary>
        private static VisualElement? TopRoot()
        {
            var panels = RuntimePanels.Find();
            for (var i = panels.Count - 1; i >= 0; i--)
            {
                var bounds = panels[i].Root.worldBound;
                if (bounds.width > 100f && bounds.height > 100f)
                    return panels[i].Root;
            }
            return null;
        }

        /// <summary>The game's own font, taken from any text it shows, so the message looks at home.</summary>
        private static FontDefinition? FindFont(VisualElement root)
        {
            var stack = new Stack<VisualElement>();
            stack.Push(root);
            var visited = 0;
            while (stack.Count > 0 && visited++ < 3000)
            {
                var element = stack.Pop();
                if (element.TryCast<TextElement>() is { } text && !string.IsNullOrEmpty(text.text) && text.visible)
                {
                    try
                    {
                        return text.resolvedStyle.unityFontDefinition;
                    }
                    catch (Exception)
                    {
                        return null;
                    }
                }
                for (var i = element.childCount - 1; i >= 0; i--)
                    stack.Push(element[i]);
            }
            return null;
        }
    }
}
