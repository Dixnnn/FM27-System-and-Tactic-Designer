// SPDX-License-Identifier: GPL-3.0-or-later
// Based on FM View Exporter (https://github.com/ElectroHugin/FM-View-Exporter), (C) 2026 ElectroHugin.
// Modified for FM27 Tactic Builder: namespace, English comments and messages.

using System;
using UnityEngine;
using UnityEngine.Rendering;

namespace FM27TacticBuilder.Export
{
    /// <summary>
    /// Lifts the game's frame-rate cap while reading (VSync, target frame rate, throttled drawing).
    /// The plugin waits in frames, so reading is quicker at a higher frame rate. The game's values are
    /// restored exactly afterwards. Nothing is saved; the game's settings stay as they were.
    /// </summary>
    internal sealed class FrameRateUnlock
    {
        // A cap instead of "unlimited", so the graphics card doesn't spin up for nothing.
        private const int ExportFrameRate = 240;

        private readonly int _vSync;
        private readonly int _targetFrameRate;
        private readonly int _renderInterval;
        private bool _restored;

        private FrameRateUnlock(int vSync, int targetFrameRate, int renderInterval)
        {
            _vSync = vSync;
            _targetFrameRate = targetFrameRate;
            _renderInterval = renderInterval;
        }

        public static FrameRateUnlock Apply()
        {
            var unlock = new FrameRateUnlock(QualitySettings.vSyncCount, Application.targetFrameRate,
                OnDemandRendering.renderFrameInterval);
            try
            {
                QualitySettings.vSyncCount = 0;
                Application.targetFrameRate = ExportFrameRate;
                OnDemandRendering.renderFrameInterval = 1;
                Plugin.Logger.LogInfo($"Frame rate while reading: up to {ExportFrameRate} (was VSync {unlock._vSync}, " +
                    $"target {unlock._targetFrameRate}, render interval {unlock._renderInterval}).");
            }
            catch (Exception ex)
            {
                Plugin.Logger.LogWarning($"Could not raise the frame rate: {ex.Message}");
            }
            return unlock;
        }

        public void Restore()
        {
            if (_restored)
                return;
            _restored = true;
            QualitySettings.vSyncCount = _vSync;
            Application.targetFrameRate = _targetFrameRate;
            OnDemandRendering.renderFrameInterval = _renderInterval;
        }
    }
}
