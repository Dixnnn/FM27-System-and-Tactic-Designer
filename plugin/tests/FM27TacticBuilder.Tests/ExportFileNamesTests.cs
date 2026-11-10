// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter's tests (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder.

using System;
using FM27TacticBuilder.Core;
using Xunit;

namespace FM27TacticBuilder.Tests
{
    public class ExportFileNamesTests
    {
        [Fact]
        public void Builds_name_with_timestamp()
        {
            Assert.Equal("squad_20261029_201500", ExportFileNames.Build("Squad", new DateTime(2026, 10, 29, 20, 15, 0)));
        }

        [Fact]
        public void Builds_fixed_name_without_timestamp()
        {
            Assert.Equal("player-database", ExportFileNames.Build("Player Database", null));
        }

        [Fact]
        public void Removes_characters_windows_does_not_allow()
        {
            Assert.Equal("player-search-ab", ExportFileNames.Sanitize("Player Search: A/B"));
            Assert.Equal("export", ExportFileNames.Sanitize("  ?*  ".Trim()));
        }
    }
}
