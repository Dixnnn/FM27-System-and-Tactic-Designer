// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter's tests (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder.

using FM27TacticBuilder.Core;
using Xunit;

namespace FM27TacticBuilder.Tests
{
    public class HotkeyTests
    {
        [Theory]
        [InlineData("F9", 0x78, false, false, false)]
        [InlineData("f10", 0x79, false, false, false)]
        [InlineData("Ctrl+Shift+E", 'E', true, true, false)]
        [InlineData("Control + P", 'P', true, false, false)]
        [InlineData("Alt+7", '7', false, false, true)]
        [InlineData("PageDown", 0x22, false, false, false)]
        public void Parses_valid_keys(string text, int vk, bool ctrl, bool shift, bool alt)
        {
            Assert.True(Hotkey.TryParse(text, out var hotkey));
            Assert.Equal(vk, hotkey.VirtualKey);
            Assert.Equal(ctrl, hotkey.Ctrl);
            Assert.Equal(shift, hotkey.Shift);
            Assert.Equal(alt, hotkey.Alt);
        }

        [Theory]
        [InlineData("")]
        [InlineData("Ctrl")]
        [InlineData("F25")]
        [InlineData("Ctrl+F9+F10")]
        [InlineData("Banana")]
        public void Rejects_invalid_keys(string text)
        {
            Assert.False(Hotkey.TryParse(text, out _));
        }
    }
}
