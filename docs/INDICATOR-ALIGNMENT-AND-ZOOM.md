# Indicator Alignment, Zoom, and Lead-in Padding

This document summarizes the changes made to the trading app’s chart and indicator system: zoom behavior, main/indicator alignment, and lead-in null padding so indicator lines align with candles (TradingView-style).

---

## 1. Zoom

### Removed
- All zoom-in/zoom-out from the main price chart (if it was present).
- Any zoom that had hard limits that prevented seeing the full dataset.

### Restored / Implemented
- **Zoom In / Zoom Out** for **indicator panels only** (not the main chart).
- **Zoom-out**: no maximum span limit. When zooming out, the visible range can extend to the full data (first to last candle). When the new span would exceed the full span, the range is set to `{ from: 0, to: dataMax }` and synced to the main chart and all panels.
- **Zoom-in**: minimum span of 10 bars; zoom factor 0.95 (Zoom In) and 1.1 (Zoom Out).
- **Fixes applied**:
  - Corrected `dataMax` / `fullSpan` (removed erroneous `-200`).
  - Zoom-out factor changed from 5 to 1.1.
  - `setupZoomSync` now computes `maxSpan` inside `clampRange` from current `this.chartData.length`.
  - Null-safe fallback when `getRange()` returns null.
  - `isUpdatingRange` set before `setRange` when applying the full range to avoid feedback loops.
- **Sync method**: using **logical range only** (`setVisibleLogicalRange`), not time-based `setVisibleRange`/`getVisibleRange`, to avoid zoom issues with LightweightCharts v3.8.

**Relevant file:** `src/js/core/multi-indicator-system.js` (zoom logic, `setupZoomSync`, `zoomIndicator`).

---

## 1.1 How to Change the Zoom Algorithm

This section explains how the zoom works and where to edit it.

### Where the code lives

| What | File | Approx. lines |
|------|------|----------------|
| Zoom button handlers (factor, min/max span) | `src/js/core/multi-indicator-system.js` | ~1250–1440 |
| `zoomIndicator(factor)` (per-panel zoom logic) | same | ~1324–1379 |
| `setupZoomSync(panelId, timeScale)` (sync + clamp) | same | ~1884–1950 |
| Pan logic `panIndicator(direction)` | same | ~1264–1321 |

Zoom is **per indicator panel**. Each panel has its own `getRange` / `setRange` (from that panel’s chart), and zoom syncs the **logical range** to the main chart and all other panels.

### Zoom algorithm (step-by-step)

**1. Get current range and bounds**

- `getRange()` → current logical range `{ from, to }` (bar indices).
- `dataMin = 0`, `dataMax = this.chartData.length - 1`, `fullSpan = dataMax - dataMin + 1`.
- If range is null, initialize to last 50 bars: `{ from: dataMax - 50, to: dataMax }` and call `setRange`.

**2. Compute new span from factor**

- `currentSpan = range.to - range.from`
- `center = (range.from + range.to) / 2`
- `newSpan = currentSpan * factor`
  - **Zoom In:** `factor < 1` (e.g. `0.95`) → smaller span.
  - **Zoom Out:** `factor > 1` (e.g. `1.1`) → larger span.

**3. Special case: zoom out to full data**

- If `factor > 1` and `newSpan >= fullSpan`:
  - Set range to **full data**: `{ from: dataMin, to: dataMax }`.
  - Sync to main chart and all panels via `setVisibleLogicalRange(fullRange)`.
  - Return (no further clamping).

**4. Clamp span and keep center**

- `minSpan = 10`, `maxSpan = fullSpan`.
- `clampedSpan = Math.max(minSpan, Math.min(maxSpan, newSpan))`.
- `halfSpan = clampedSpan / 2`.
- `newFrom = center - halfSpan`, `newTo = center + halfSpan`.

**5. Keep range inside data**

- If `newFrom < dataMin`: shift right (fix `newFrom`, recompute `newTo`).
- If `newTo > dataMax`: shift left (fix `newTo`, recompute `newFrom`).
- Final: `from`/`to` clamped to `[dataMin, dataMax]`, then `setRange(finalRange)` (and sync happens via `setupZoomSync` subscription).

### Key constants you can change

| Constant | Where | Effect |
|----------|--------|--------|
| **Zoom In factor** | `boundZoomIndicator(0.95)` in panel Zoom In click handler | Smaller value (e.g. `0.9`) = zoom in faster. |
| **Zoom Out factor** | `boundZoomIndicator(1.1)` in panel Zoom Out click handler | Larger value (e.g. `1.2`) = zoom out faster. |
| **Minimum span** | `minSpan = 10` in `zoomIndicator` and in `setupZoomSync` → `clampLogicalRange` | Fewer bars = can zoom in more (e.g. `5`). |
| **Default initial range** | `range = { from: dataMax - 50, to: dataMax }` when range is null | Change `50` to show more/fewer bars on first load. |
| **Pan amount** | `span * 0.3 * direction` in `panIndicator` | Change `0.3` to pan more or less per click. |

### Changing zoom speed (factors)

- **Faster zoom in:** e.g. `panelZoomIn.addEventListener('click', () => boundZoomIndicator(0.9));` (was `0.95`).
- **Faster zoom out:** e.g. `panelZoomOut.addEventListener('click', () => boundZoomIndicator(1.2));` (was `1.1`).
- **Slower zoom:** use values closer to `1` (e.g. `0.98` and `1.02`).

### Changing min/max visible bars

- In **`zoomIndicator`**: edit `minSpan = 10` (and, if you ever add a max zoom-in limit, a smaller `maxSpan` is not used for zoom-in; `maxSpan` there is `fullSpan`).
- In **`setupZoomSync`**: edit `const minSpan = 10` and use the same value in `clampLogicalRange` so sync and zoom use the same limits.

### Sync and clamping (`setupZoomSync`)

- **`clampLogicalRange(range)`** clamps the visible span to `[minSpan, maxSpan]` and keeps the range inside `[dataMin, dataMax]`. Any range change (from any chart) is clamped before being applied to others.
- **`onLogicalRangeChange`** runs when the user zooms/pans. It converts logical range to time range and calls **`applyTimeRangeToAll(timeRange)`** so main chart and all panels share the same visible range.
- **`isUpdatingRange`** is set while applying a range to avoid feedback loops (subscribers firing again and overwriting).

### Adding new zoom behavior

- **Mouse wheel zoom:** In the same panel setup block where Zoom In/Out buttons are wired, add a `wheel` listener on the chart or container; call `boundZoomIndicator(factor)` with `factor < 1` for wheel up and `factor > 1` for wheel down (and optionally `e.preventDefault()`).
- **Pinch zoom:** In a touch handler, compute scale from gesture and call `boundZoomIndicator(scale)` (e.g. scale &lt; 1 for pinch in, &gt; 1 for pinch out).
- **Different limits per panel:** Pass `minSpan`/`maxSpan` into `zoomIndicator` (e.g. from panel config) and use them instead of the fixed `minSpan`/`maxSpan` inside the function.

---

## 2. Console Logs

- **Removed** all `console.log` calls in:
  - `src/js/core/multi-indicator-system.js`
  - `stock-market/stock-app.prod.js`
- **Kept** one zoom-sync related log in `setupZoomSync` (if still present and desired for debugging).

---

## 3. Main Chart and Indicator Panel Alignment

### Goal
- Same time index on the same vertical line across the main chart and every indicator panel (TradingView-style).
- Stable vertical grid and no horizontal misalignment when scrolling or resizing.

### Constants (in `multi-indicator-system.js`)
- `PRICE_SCALE_ALIGN_WIDTH = 56`
- `TIME_SCALE_RIGHT_OFFSET`, `TIME_SCALE_BAR_SPACING` (used for consistent layout).

### Price scale
- Main chart and each indicator chart use **`minimumWidth: 56`** (and `applyOptions` where needed) so the right price scale has a fixed minimum width and layout stays consistent.

### Width sync
- **`syncIndicatorChartWidths(mainChartContainer)`**:
  - Sets each indicator panel and chart container width to the **main chart’s pixel width**.
  - Calls `panel.chart.resize(w, h)` for each panel.
- **When it runs**:
  - After creating panels.
  - After a short delay (e.g. 150 ms).
  - On main chart `ResizeObserver`.
  - When adding an indicator.

### CSS
- `scrollbar-gutter: stable` on `#indicators-container`.
- `#chart` and `#indicators-container` use the same width and `box-sizing` so widths match.

**Relevant files:**  
`src/js/core/multi-indicator-system.js`, `stock-market/stock-app.prod.js`, `stock-market/index.html`, `src/css/multi-indicator-styles.css`.

---

## 4. Lead-in Null Padding (Indicator Alignment with Candles)

### Goal
- Indicator lines should align with candles: the first N bars (where the indicator has no value yet) are left **empty** (null), and the indicator only draws from the bar where it has valid data—like TradingView.

### Helper: `seriesWithLeadInPadding`

Defined in `multi-indicator-system.js`:

- **Signature:** `seriesWithLeadInPadding(dataArray, valueFn)`
- **Behavior:**
  - Builds an array with length equal to `this.chartData.length`.
  - For indices before the indicator’s first value: pushes `{ time: this.chartData[i].time, value: null }`.
  - For the rest: uses `valueFn(dataArray[i], i)` and assigns `time: this.chartData[startIdx + i].time`.
  - `valueFn` can return a number or `{ value, color }` (e.g. for histograms).

So every indicator series is full-length with nulls at the start, then valid values aligned to the same time index as the candles.

### Indicators Updated to Use Lead-in Padding

All of the following now build their series with `seriesWithLeadInPadding` (or equivalent full-length + null lead-in) where they were previously using `startIdx` + `.map` or manual loops:

| Category | Indicators |
|----------|------------|
| **Oscillators / Momentum** | MACD, RSI, Dual RSI, KD (Stochastic), NewKD, Williams %R, CCI, MFI, Momentum, ROC, CoppockCurve |
| **Trend / Volatility** | ADX (+ plusDI, minusDI), ATR, ParabolicSAR (via multi-line) |
| **Volume** | Volume (+ VolMA, volume color), OBV |
| **Other** | ARBR, SYBR, CR, DualCR, BBI (bbi, ma3, ma24), BullBearPower (bull, bear, zero), MA, BBI3, BBI4, BBI5, OSC, BIAS, MBIAS, UOSC, ADO, VAO, HLO, VHF, RandomWalkingIndex, VR, DEMA, ADR, VRMA, ADI |
| **Multi-line (renderMultiLine)** | IMI, Qstick, MTM, ROC, KST, OBV, ACC, WAD, CostMA, VROC, BTI, DPO, EOM, PVT, Ichimoku, M3, DMA, HullMA, VolMA, etc. |
| **Wang variants** | renderWangRSI, renderWangBBI, renderWangCCI, renderWangBBI3/4/5, renderWangOSC, renderWangBIAS, renderWangMBIAS, renderWangUOSC |

### Pattern Used

Where the code previously had:

```js
const startIdx = this.chartData.length - data.length;
const seriesData = data.map((val, i) => ({
  time: this.chartData[startIdx + i].time,
  value: val
}));
```

it was replaced with:

```js
const seriesData = this.seriesWithLeadInPadding(data, (v) => (v != null && !isNaN(v) ? v : null));
```

For multiple series in one render (e.g. bear and zero line in BullBearPower), each series gets its own `seriesWithLeadInPadding(data.xxx, valueFn)`.

### What Was Not Changed

- **Main chart MA overlays** (lines ~5109 and ~5139 in `multi-indicator-system.js`): still use `startIdx` + `maData.map(...)` for overlays on the price chart. They can be switched to `seriesWithLeadInPadding` later if you want the same lead-in alignment on the main chart.
- The **implementation inside `seriesWithLeadInPadding`** still uses `startIdx` internally; that is the single place where the lead-in logic lives.

---

## 5. File Reference

| File | Purpose |
|------|--------|
| `src/js/core/multi-indicator-system.js` | Zoom, width sync, `seriesWithLeadInPadding`, all `render*` methods (MACD, RSI, KD, BBI, Wang, etc.) |
| `stock-market/stock-app.prod.js` | Main chart creation, `setupChartControls`, `setupIndicatorSystem`, calls to `syncIndicatorChartWidths` |
| `stock-market/index.html` | `#chart`, `#indicators-container`, scrollbar-gutter |
| `src/css/multi-indicator-styles.css` | `.indicator-chart` and alignment-related styles |

---

## 6. Summary

- **Zoom:** Indicator panels have zoom in/out; zoom-out can show full data; sync uses logical range only.
- **Logs:** All `console.log` removed except optional zoom-sync debug.
- **Alignment:** Same time index on the same vertical line; fixed price scale width; width sync so indicator charts match main chart width; CSS for stable layout.
- **Lead-in:** All indicator series use lead-in null padding so lines align with candles and the initial period is empty, applied consistently across every indicator and Wang variant listed above.

This document can be updated as you add new indicators or change zoom/alignment behavior.
