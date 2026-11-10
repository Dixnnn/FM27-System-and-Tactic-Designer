// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments.

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;

namespace FM27TacticBuilder.Core
{
    /// <summary>
    /// Turns the stars of a cell (Ability, Potential) into a number.
    /// FM27 gives each star a class <c>ability-{a}-potential-level-{p}-youth-…</c>:
    /// <c>a</c> is the certain part (gold: max = whole, half = half, minimum = none),
    /// <c>p</c> the estimated part (grey: fullfilled/full = whole, half = half, none = none).
    /// A star counts with the larger of the two parts, the way it looks filled in the game:
    /// 1 gold + 1 grey star = 2.0.
    /// </summary>
    public static class StarRating
    {
        private static readonly Regex Pattern = new Regex(
            @"^ability-(max|half|minimum)-potential-level-(fullfilled|full|half|none)\b",
            RegexOptions.CultureInvariant);

        /// <summary>Value of one star from its CSS classes, 0 to 1.</summary>
        public static double StarValue(IEnumerable<string> classes)
        {
            var fallback = 0.0;
            foreach (var name in classes)
            {
                if (name == null)
                    continue;
                var match = Pattern.Match(name);
                if (match.Success)
                    return Math.Max(Part(match.Groups[1].Value), Part(match.Groups[2].Value));
                // Unknown scheme: recognise whole and half stars only.
                if (name.Contains("-max-"))
                    fallback = Math.Max(fallback, 1.0);
                else if (name.Contains("-half-"))
                    fallback = Math.Max(fallback, 0.5);
            }
            return fallback;
        }

        public static string Format(double total) => total.ToString("0.0", CultureInfo.InvariantCulture);

        private static double Part(string level)
        {
            switch (level)
            {
                case "max":
                case "fullfilled":
                case "full":
                    return 1.0;
                case "half":
                    return 0.5;
                default:
                    return 0.0;
            }
        }
    }
}
