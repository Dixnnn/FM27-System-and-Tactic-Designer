// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter's tests (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder.

using System.Linq;
using FM27TacticBuilder.Core;
using Xunit;

namespace FM27TacticBuilder.Tests
{
    public class StarRatingTests
    {
        private static double Total(params string[] stars) =>
            stars.Sum(s => StarRating.StarValue(new[] { "fm-star-rating-star", "ability-" + s + "-youth-false" }));

        [Fact]
        public void Gold_stars_only()
        {
            // Squad: 3 gold stars
            Assert.Equal(3.0, Total("max-potential-level-fullfilled", "max-potential-level-fullfilled",
                "max-potential-level-fullfilled", "minimum-potential-level-none", "minimum-potential-level-none"));
        }

        [Fact]
        public void Grey_full_star_counts()
        {
            // Potential: 1 gold + 1 grey star = 2.0
            Assert.Equal(2.0, Total("max-potential-level-fullfilled", "minimum-potential-level-full",
                "minimum-potential-level-none", "minimum-potential-level-none", "minimum-potential-level-none"));
        }

        [Fact]
        public void Half_stars()
        {
            // Ability from a shortlist dump: 1 + 1 + half gold + half grey = 3.0
            Assert.Equal(3.0, Total("max-potential-level-fullfilled", "max-potential-level-fullfilled",
                "half-potential-level-half", "minimum-potential-level-half", "minimum-potential-level-none"));
        }

        [Fact]
        public void Youth_variant_and_unknown_scheme()
        {
            Assert.Equal(1.0, StarRating.StarValue(new[] { "ability-minimum-potential-level-full-youth-true" }));
            Assert.Equal(0.5, StarRating.StarValue(new[] { "something-half-star" }));
            Assert.Equal(0.0, StarRating.StarValue(new[] { "fm-star-rating-star" }));
            Assert.Equal("2.5", StarRating.Format(2.5));
        }
    }
}
