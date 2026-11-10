// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments and messages.

using System;
using UnityEngine.UIElements;

namespace FM27TacticBuilder.Export
{
    /// <summary>
    /// Makes the row list taller while reading, so the game draws many more rows per scroll step.
    /// The window clips the extra part, but the rows still get filled. The original style values are
    /// put back afterwards. It only changes the display for a moment, nothing in the game.
    /// </summary>
    internal sealed class TallList
    {
        private const float MaxHeight = 30000f;

        private readonly Saved[] _saved;

        private TallList(Saved[] saved)
        {
            _saved = saved;
        }

        public static TallList? Apply(ScrollView rows, int rowCount, float rowHeight)
        {
            if (rowCount <= 0)
                return null;
            var height = Math.Min(MaxHeight, rowCount * Math.Max(10f, rowHeight));
            if (height <= rows.contentViewport.layout.height)
                return null;

            // The ScrollView itself and the list around it (SI.UI.VirtualisedList).
            var targets = rows.parent != null ? new VisualElement[] { rows.parent, rows } : new VisualElement[] { rows };
            var saved = new Saved[targets.Length];
            for (var i = 0; i < targets.Length; i++)
            {
                var style = targets[i].style;
                saved[i] = new Saved(targets[i], style.height, style.minHeight, style.maxHeight, style.flexShrink);
                style.height = new StyleLength(height);
                style.minHeight = new StyleLength(height);
                style.maxHeight = new StyleLength(height);
                style.flexShrink = new StyleFloat(0f);
            }
            return new TallList(saved);
        }

        public void Restore()
        {
            foreach (var s in _saved)
            {
                try
                {
                    var style = s.Element.style;
                    style.height = s.Height;
                    style.minHeight = s.MinHeight;
                    style.maxHeight = s.MaxHeight;
                    style.flexShrink = s.FlexShrink;
                }
                catch (Exception ex)
                {
                    Plugin.Logger.LogWarning($"Could not reset the list height: {ex.Message}");
                }
            }
        }

        private sealed class Saved
        {
            public Saved(VisualElement element, StyleLength height, StyleLength minHeight, StyleLength maxHeight, StyleFloat flexShrink)
            {
                Element = element;
                Height = height;
                MinHeight = minHeight;
                MaxHeight = maxHeight;
                FlexShrink = flexShrink;
            }

            public VisualElement Element { get; }
            public StyleLength Height { get; }
            public StyleLength MinHeight { get; }
            public StyleLength MaxHeight { get; }
            public StyleFloat FlexShrink { get; }
        }
    }
}
