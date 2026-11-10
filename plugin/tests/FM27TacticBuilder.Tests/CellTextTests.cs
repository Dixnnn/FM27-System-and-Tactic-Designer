// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter's tests (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder.

using FM27TacticBuilder.Core;
using Xunit;

namespace FM27TacticBuilder.Tests
{
    public class CellTextTests
    {
        [Fact]
        public void Strips_rich_text_tags_from_player_names()
        {
            Assert.Equal("Manuel Neuer", CellText.Clean("<color='#FFFFFF'><link='0'><style='Norml'>Manuel Neuer</style></link></color>"));
        }

        [Fact]
        public void Collapses_whitespace_and_handles_null()
        {
            Assert.Equal("Domestic Cup Goalkeeper", CellText.Clean("  Domestic \n Cup   Goalkeeper "));
            Assert.Equal(string.Empty, CellText.Clean(null));
        }

        [Fact]
        public void Join_skips_empty_parts()
        {
            Assert.Equal("GER Germany", CellText.Join(new[] { "<b>GER</b>", "", "Germany" }));
        }

        [Theory]
        [InlineData("0.75", "0,75")]
        [InlineData("12.5%", "12,5%")]
        [InlineData("10.2km", "10,2km")]
        [InlineData("€1.5M", "€1.5M")]
        [InlineData("15/5/2026", "15/5/2026")]
        [InlineData("13", "13")]
        public void German_style_uses_decimal_comma_only_for_plain_numbers(string input, string expected)
        {
            Assert.Equal(expected, CellText.ForCsv(input, CsvStyle.German));
            Assert.Equal(input, CellText.ForCsv(input, CsvStyle.English));
        }
    }
}
