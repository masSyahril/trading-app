## Bollinger 4SD – How to Wire It as a Three‑Line Indicator

This note explains **exactly how to turn** the existing Wang Bollinger 4SD script into a **three‑line indicator** in the multi‑indicator system, following the **“Three‑Line Example”** pattern from `HOW-TO-CREATE-NEW-INDICATORS.md` §5.2.

You already have the **math formula** in:

- **File**: `tryout-stock/js/core/Wang_design_new_indicators__Bollinger4SD_2026-02-28_.js`  
- **Lines**: `1–57` (the `computeBollinger4SD` function you pasted)

The goal is to:

1. Expose that function on `window` so the multi‑indicator system can call it.
2. Add a **three‑line indicator definition** in `multi-indicator-system.js`.
3. Implement a **compute wrapper** that calls Wang’s function and returns three arrays.
4. Implement a **render function** that draws three line series using `seriesWithLeadInPadding`.

---

### 1. Expose `computeBollinger4SD` on `window`

**File**: `tryout-stock/js/core/Wang_design_new_indicators__Bollinger4SD_2026-02-28_.js`  
**Existing lines**: `1–57` (your pasted code)

The file currently ends like this:

- **Lines `8–53`** – implementation of:
  - `MA[]` (middle band),
  - `SD[]`,
  - `upperBand[]`,
  - `lowerBand[]`,
  - `upperBand_lowerB
    and[]`,
  - `percentB[]`,
  - `Bandwith[]`.
- **Lines `52–53`** – the `return` statement:
  - `return {upperBand_lowerBand, percentB, Bandwith};`
- **Line `57`** – closing brace of `computeBollinger4SD`.

To make this available to the multi‑indicator system (same pattern used for Volume RSI and other Wang indicators), **append one line at the end of the file**:

- **File**: `tryout-stock/js/core/Wang_design_new_indicators__Bollinger4SD_2026-02-28_.js`  
- **After line `57` (after the closing `}` of the function)** add:

```javascript
window.computeBollinger4SD = computeBollinger4SD;
```

Now, when this script is loaded in the browser, `window.computeBollinger4SD` will exist and can be called from `multi-indicator-system.js`.

---

### 2. Add the indicator definition (three‑line style)

**File**: `tryout-stock/js/core/multi-indicator-system.js`  
**Function**: `createIndicatorDefinitions()`  
**Lines**: around `199–365` (where other indicators like `MACD`, `RSI`, `VOL_RSI`, `MA` are defined).

Inside `createIndicatorDefinitions()`, you already have entries like:

- `MACD` – lines `201–209`
- `RSI` – lines `210–219`
- `VOL_RSI` – lines `288–299`
- `MA` – lines `354–365`

Add a new **three‑line Bollinger 4SD definition** next to the other trend/volatility indicators.  
For example, **insert this block right after the `MA` definition (after line `365`)**:

```javascript
      BOLLINGER4SD_WANG: {
        name: 'Bollinger 4SD (Wang)',
        type: 'volatility',
        defaultParams: { maDay: 10, sdDay: 20 },
        paramLabels: { maDay: 'MA Period', sdDay: 'SD Period' },
        minPeriod: 20, // needs at least MA + SD bars before first value
        compute: (data, params) =>
          this.computeBollinger4SD_Wang(data, params.maDay, params.sdDay),
        render: (chart, data, colors, seriesMap) =>
          this.renderBollinger4SD_Wang(chart, data, colors, seriesMap)
      },
```

This follows the **same shape** as the three‑line example in `HOW-TO-CREATE-NEW-INDICATORS.md` (see §5.2, lines `300–309`).

Key points:

- `BOLLINGER4SD_WANG` is the **registry key** used by the UI.
- `compute` points to `this.computeBollinger4SD_Wang(...)` (you will add this in step 3).
- `render` points to `this.renderBollinger4SD_Wang(...)` (you will add this in step 4).

---

### 3. Implement the compute wrapper (three arrays)

Now implement a **class method** on `MultiIndicatorSystem` that wraps Wang’s function and returns **three aligned arrays**, just like the **Three‑Line Example** compute function.

**File**: `tryout-stock/js/core/multi-indicator-system.js`  
**Location**: Near other custom compute methods, e.g. **after** the existing Volume RSI methods:

- `computeVolumeRSI` – starts at **line `5451`**.
- `renderVolumeRSI` – starts at **line `5483`**.

You can place the new method **after `renderVolumeRSI` (after line `5525`)** to keep all Wang indicators together:

```javascript
  computeBollinger4SD_Wang(data, maDay = 10, sdDay = 20) {
    const close = data.map(d => d.close);
    const len = close.length;

    // Three output arrays, same length as data (three-line example style)
    const line1 = new Array(len).fill(null); // 4SD width (upper - lower)
    const line2 = new Array(len).fill(null); // %B
    const line3 = new Array(len).fill(null); // Bandwidth %

    if (len === 0) {
      return { line1, line2, line3 };
    }

    // Use the external Wang formula if available, just like Volume RSI does
    const fn = (typeof window !== 'undefined' && window.computeBollinger4SD)
      ? window.computeBollinger4SD
      : null;

    if (!fn) {
      // If the external script is not loaded, return empty arrays
      return { line1, line2, line3 };
    }

    // Call Wang’s function with raw close array and periods
    const out = fn(close, maDay, sdDay);
    const srcWidth   = out && out.upperBand_lowerBand ? out.upperBand_lowerBand : [];
    const srcPercent = out && out.percentB ? out.percentB : [];
    const srcBandw   = out && out.Bandwith ? out.Bandwith : [];

    // Map Wang’s arrays into our three output lines (index-aligned with data)
    for (let i = 0; i < len; i++) {
      const w1 = srcWidth[i];
      const w2 = srcPercent[i];
      const w3 = srcBandw[i];

      line1[i] = (w1 != null && Number.isFinite(w1)) ? w1 : null;
      line2[i] = (w2 != null && Number.isFinite(w2)) ? w2 : null;
      line3[i] = (w3 != null && Number.isFinite(w3)) ? w3 : null;
    }

    // Exactly like the THREE_LINE_EXAMPLE: return { line1, line2, line3 }
    return { line1, line2, line3 };
  }
```

This follows the **three‑line compute pattern** from `HOW-TO-CREATE-NEW-INDICATORS.md`:

- See §5.2, lines `317–338`:
  - Three arrays: `line1`, `line2`, `line3`, all length `data.length`.
  - Use `null` where there is no value yet.
  - Return `{ line1, line2, line3 }`.

Here:

- `line1` = **4SD width** (upperBand - lowerBand).
- `line2` = **%B** (布林極限％B).
- `line3` = **Bandwith** (bandwidth percentage).

You can rename `line1/line2/line3` later if you prefer more descriptive keys; just keep the compute and render functions consistent.

---

### 4. Implement the render function (three line series)

Now add the **render** method that draws three lines in the indicator panel, again following the three‑line example.

**File**: `tryout-stock/js/core/multi-indicator-system.js`  
**Location**: Immediately **after** `computeBollinger4SD_Wang` (added above).

```javascript
  renderBollinger4SD_Wang(chart, data, colors, seriesMap) {
    if (!data || !data.line1 || !data.line2 || !data.line3) return;

    // Create three line series once (like renderThreeLineExample)
    if (!seriesMap.has('boll4sd_width')) {
      seriesMap.set('boll4sd_width', chart.addLineSeries({
        color: colors.LINE1,
        lineWidth: 2,
        title: '4SD Width',
        crosshairMarkerVisible: false,
        priceLineVisible: false
      }));
    }
    if (!seriesMap.has('boll4sd_percentB')) {
      seriesMap.set('boll4sd_percentB', chart.addLineSeries({
        color: colors.LINE2,
        lineWidth: 2,
        title: '%B',
        crosshairMarkerVisible: false,
        priceLineVisible: false
      }));
    }
    if (!seriesMap.has('boll4sd_bandwidth')) {
      seriesMap.set('boll4sd_bandwidth', chart.addLineSeries({
        color: colors.LINE3,
        lineWidth: 2,
        title: 'Bandwidth %',
        crosshairMarkerVisible: false,
        priceLineVisible: false
      }));
    }

    const valueFn = (v) => (v != null && !isNaN(v) && Number.isFinite(v) ? v : null);

    const widthData = this.seriesWithLeadInPadding(data.line1, valueFn);
    const percentBData = this.seriesWithLeadInPadding(data.line2, valueFn);
    const bandwidthData = this.seriesWithLeadInPadding(data.line3, valueFn);

    seriesMap.get('boll4sd_width').setData(widthData);
    seriesMap.get('boll4sd_percentB').setData(percentBData);
    seriesMap.get('boll4sd_bandwidth').setData(bandwidthData);
  }
```

This mirrors the **three‑line render example** from `HOW-TO-CREATE-NEW-INDICATORS.md`:

- See §5.2, lines `345–381`:
  - Create three `addLineSeries` (`line1`, `line2`, `line3`).
  - Use `this.seriesWithLeadInPadding(array, valueFn)` for each array.
  - Call `setData` on each series with the padded data.

Here:

- `data.line1` → series key `'boll4sd_width'`, color `colors.LINE1`.
- `data.line2` → series key `'boll4sd_percentB'`, color `colors.LINE2`.
- `data.line3` → series key `'boll4sd_bandwidth'`, color `colors.LINE3`.

Because we use `seriesWithLeadInPadding`, the first **non‑null** value in each array will line up with the correct candle bar, even though Wang’s formula only starts outputting values after `MA_day + SD_day - 1` bars.

---

### 5. Checklist – what to edit where

1. **Expose Wang Bollinger function**
   - **File**: `tryout-stock/js/core/Wang_design_new_indicators__Bollinger4SD_2026-02-28_.js`
   - **After line `57`** (after the closing `}` of `computeBollinger4SD`), add:
     - `window.computeBollinger4SD = computeBollinger4SD;`

2. **Add registry entry (three‑line definition)**
   - **File**: `tryout-stock/js/core/multi-indicator-system.js`
   - **Function**: `createIndicatorDefinitions()` (starts at line `199`)
   - **Around lines `354–365`** (near the `MA` definition), insert the `BOLLINGER4SD_WANG` block shown in section **2**.

3. **Add compute wrapper**
   - **File**: `tryout-stock/js/core/multi-indicator-system.js`
   - **After line `5525`** (just after `renderVolumeRSI`), add the `computeBollinger4SD_Wang` method from section **3**.

4. **Add render function**
   - **File**: `tryout-stock/js/core/multi-indicator-system.js`
   - **Immediately after** `computeBollinger4SD_Wang`, add `renderBollinger4SD_Wang` from section **4**.

5. **(Optional) Expose in UI**
   - Wherever you configure which indicators appear in the indicator dropdown or panels (e.g. calls like `createFlexibleIndicatorSection(..., ['MACD', 'RSI', ...])`), add the key:
     - `'BOLLINGER4SD_WANG'`

Once these steps are done, you will have a **three‑line Bollinger 4SD indicator** wired exactly like the **Three‑Line Example** in `HOW-TO-CREATE-NEW-INDICATORS.md`, using Wang’s original code for the calculations.

