# How to Add a New Indicator to the Main Chart Overlay

This guide covers the **overlay system** — indicators that draw directly on top of the K-line candlestick chart (e.g. SMA, Bollinger Bands, KAMA). This is **separate** from the sub-panel indicator system (`multi-indicator-system.js`).

---

## Where the Code Lives

All overlay logic is inside one file:

```
stock-market/stock-app.prod.js
```

The four sections you must touch are listed in the order you edit them:

| # | What | Approx. line | Purpose |
|---|------|-------------|---------|
| 1 | `OVERLAY_DEFS` array | ~89 | Registers the indicator in the dropdown |
| 2 | `computeXxx()` function | ~100–185 | Calls the Wang function, returns `{time, value}[]` |
| 3 | `getOverlayData()` switch | ~198 | Routes an id to its compute function |
| 4 | `addOverlayToChart()` + `refreshOverlays()` | ~220 / ~253 | **Multi-line only** — creates / updates the series on the chart |

---

## Two Types of Overlays

### Type A — Single line (SMA, EMA, KAMA, Hull MA …)

Returns one line. Uses `type: 'single'` in `getOverlayData`.  
No changes needed to `addOverlayToChart` or `refreshOverlays`.

### Type B — Multiple lines (Bollinger Bands, Williams Volatility Channel …)

Returns 2 or 3 lines. Uses a custom type string (e.g. `'wvc'`) in `getOverlayData`.  
Requires a new `if` block in both `addOverlayToChart` and `refreshOverlays`.

---

## Step-by-Step: Single-Line Overlay

### Step 1 — Add to `OVERLAY_DEFS`

```js
// stock-market/stock-app.prod.js  ~line 89
const OVERLAY_DEFS = [
  // ... existing entries ...
  { id:'WMA14', group:'Moving Averages', label:'WMA', color:'#f59e0b', defaultParam:14 },
];
```

Field reference:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Unique key — used everywhere internally |
| `group` | yes | Dropdown group heading (`'Moving Averages'`, `'Bands'`, `'Other'`) |
| `label` | yes | Display prefix shown in legend (e.g. `'WMA'`) |
| `color` | yes | CSS hex colour for the line |
| `defaultParam` | no | If set, a period input box appears and the legend shows `label(period)` |
| `multi` | no | Set `true` for multi-line overlays (purely for documentation — logic uses the type string) |

---

### Step 2 — Write a compute function

The function must return an array of `{ time, value }` objects aligned to `chartData`.

```js
// stock-market/stock-app.prod.js  — add after computeVWAPData()
function computeWMAData(data, period) {
  return data.map((d, i) => {
    if (i < period - 1) return { time: d.time, value: null };
    let weightedSum = 0, weightSum = 0;
    for (let j = 0; j < period; j++) {
      const weight = period - j;          // newest bar gets highest weight
      weightedSum += data[i - j].close * weight;
      weightSum   += weight;
    }
    return { time: d.time, value: weightedSum / weightSum };
  });
}
```

**If you are wrapping a Wang function** (from `technical-indicators.prods__Wang__2026.js`):

```js
function computeMyWangData(data, day) {
  const fn = window.MyWangFunction;
  if (!fn) return null;
  const highs  = data.map(d => d.high);
  const lows   = data.map(d => d.low);
  const closes = data.map(d => d.close);
  try {
    const out = fn(highs, lows, closes, day);
    const src = out && out.MyOutput ? out.MyOutput : [];
    // Wang outputs use 1-based sparse arrays.
    // src[i+1] maps the Wang index to 0-based chart bar i.
    return data.map((d, i) => ({
      time:  d.time,
      value: (src[i + 1] != null && Number.isFinite(src[i + 1])) ? src[i + 1] : null
    }));
  } catch (e) { return null; }
}
```

> **Wang array convention**: Wang functions use 1-based indexing internally. Their output is a sparse JS array where the first value lives at index `firstBar + 1` (not 0). Reading `src[i + 1]` for 0-based chart bar `i` gives the correctly aligned value.

---

### Step 3 — Add a case to `getOverlayData()`

```js
function getOverlayData(id) {
  const d = chartData;
  const p = getOverlayParam(id);
  switch (id) {
    // ... existing cases ...
    case 'WMA14': return { type:'single', data: computeWMAData(d, p) };
    default: return null;
  }
}
```

That's it for a single-line overlay. The rest (checkbox UI, param input, localStorage persistence, auto-clear on CSV upload) is handled automatically.

---

## Step-by-Step: Multi-Line Overlay

Multi-line overlays need all the same steps above, **plus** you extend `addOverlayToChart()` and `refreshOverlays()` to handle the extra series.

---

## Complete Example: Williams Volatility Channel

`WilliamsVolatilityChannel` draws three lines on the K-line chart:  
**UpperLine**, **MiddleLine**, **LowerLine** (ATR-based channel).

Wang function signature:
```js
WilliamsVolatilityChannel(STK_high, STK_low, STK_close, day, esp)
// Returns: { MiddleLine, UpperLine, LowerLine }
// day  = SMA period for the middle line   (default 10)
// esp  = ATR smoothing factor             (default 9)
```

---

### Step 1 — `OVERLAY_DEFS`

```js
// stock-market/stock-app.prod.js  ~line 89
const OVERLAY_DEFS = [
  { id:'SMA20',  group:'Moving Averages', label:'SMA',       color:'#34d399', defaultParam:20  },
  // ... other entries ...
  { id:'WVC',    group:'Bands',           label:'WilliamsVC', color:'#38bdf8', multi:true, defaultParam:10 },
];
```

`defaultParam:10` wires up the period input. The `esp` value is fixed at 9 internally (you can add a second param if needed later).

---

### Step 2 — Compute function

```js
// stock-market/stock-app.prod.js  — add after computeDEMAData()
function computeWVCData(data, day) {
  const fn = window.WilliamsVolatilityChannel;
  if (!fn) return null;
  const highs  = data.map(d => d.high);
  const lows   = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const esp    = 9;           // ATR smoothing — fixed, or expose as a second param
  try {
    const out = fn(highs, lows, closes, day, esp);
    if (!out) return null;
    const srcMid   = out.MiddleLine || [];
    const srcUpper = out.UpperLine  || [];
    const srcLower = out.LowerLine  || [];
    // Wang 1-based → 0-based chart bar: read src[i+1] for bar i
    const toSeries = (src) =>
      data.map((d, i) => ({
        time:  d.time,
        value: (src[i + 1] != null && Number.isFinite(src[i + 1])) ? src[i + 1] : null
      }));
    return {
      middle: toSeries(srcMid),
      upper:  toSeries(srcUpper),
      lower:  toSeries(srcLower),
    };
  } catch (e) { return null; }
}
```

---

### Step 3 — `getOverlayData()` case

```js
function getOverlayData(id) {
  const d = chartData;
  const p = getOverlayParam(id);
  switch (id) {
    case 'SMA20':
    case 'SMA200': return { type:'single', data: computeSMAData(d, p)    };
    // ... existing cases ...
    case 'WVC':    return { type:'wvc',    ...computeWVCData(d, p)       };
    //  type:'wvc' and spread { middle, upper, lower } onto the result object
    default: return null;
  }
}
```

Note: `computeWVCData` returns `{ middle, upper, lower }`. Spreading it gives `result.middle`, `result.upper`, `result.lower`. The type string `'wvc'` is what the next two steps check.

---

### Step 4a — `addOverlayToChart()` — create the series

Find the `if (result.type === 'bb')` block and add an `else if` for `'wvc'` right after it:

```js
function addOverlayToChart(id) {
  if (!chart || overlaySeries[id]) return;
  const def = OVERLAY_DEFS.find(d => d.id === id);
  if (!def || !chartData.length) return;
  const result = getOverlayData(id);
  if (!result) return;

  if (result.type === 'bb') {
    // ... existing BB logic ...
  } else if (result.type === 'wvc') {
    const p   = getOverlayParam(id);
    const opts = {
      lineWidth: 1,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      lastValueVisible: true
    };
    const sUpper  = chart.addLineSeries({ ...opts, color: def.color, lineStyle: 2, title: `WVC+(${p})` });
    const sMiddle = chart.addLineSeries({ ...opts, color: def.color, lineStyle: 0, title: `WVC(${p})`  });
    const sLower  = chart.addLineSeries({ ...opts, color: def.color, lineStyle: 2, title: `WVC-(${p})` });
    sUpper .setData(nonNull(result.upper));
    sMiddle.setData(nonNull(result.middle));
    sLower .setData(nonNull(result.lower));
    overlaySeries[id] = [sUpper, sMiddle, sLower];
  } else {
    // single-line path (existing else block)
    if (!result.data) return;
    const pts = nonNull(result.data);
    if (!pts.length) return;
    const s = chart.addLineSeries({ color: def.color, lineWidth: 1, title: getOverlayTitle(id), priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: true });
    s.setData(pts);
    overlaySeries[id] = [s];
  }
}
```

---

### Step 4b — `refreshOverlays()` — update data on symbol/timeframe change

Find the `if (result.type === 'bb')` block inside `refreshOverlays` and add the same `else if`:

```js
function refreshOverlays() {
  activeOverlays.forEach(id => {
    if (!overlaySeries[id]) { addOverlayToChart(id); return; }
    const result = getOverlayData(id);
    if (!result) return;

    if (result.type === 'bb') {
      overlaySeries[id][0].setData(nonNull(result.upper));
      overlaySeries[id][1].setData(nonNull(result.middle));
      overlaySeries[id][2].setData(nonNull(result.lower));
    } else if (result.type === 'wvc') {
      overlaySeries[id][0].setData(nonNull(result.upper));
      overlaySeries[id][1].setData(nonNull(result.middle));
      overlaySeries[id][2].setData(nonNull(result.lower));
    } else if (result.data) {
      overlaySeries[id][0].setData(nonNull(result.data));
    }
  });
}
```

---

## Visual Summary

```
OVERLAY_DEFS
  id:'WVC', group:'Bands', label:'WilliamsVC',
  color:'#38bdf8', multi:true, defaultParam:10
        │
        ▼
computeWVCData(data, day)
  calls window.WilliamsVolatilityChannel(highs, lows, closes, day, esp)
  maps Wang 1-based sparse output → [{time, value}, ...]
  returns { middle:[], upper:[], lower:[] }
        │
        ▼
getOverlayData('WVC')
  returns { type:'wvc', middle, upper, lower }
        │
        ├──► addOverlayToChart()
        │      creates 3 LineSeries, stores in overlaySeries['WVC'] = [s0, s1, s2]
        │
        └──► refreshOverlays()
               calls setData() on each of the 3 stored series
```

---

## Quick Checklist

- [ ] Added entry to `OVERLAY_DEFS` (id, group, label, color, defaultParam)
- [ ] Wrote `computeXxx()` returning `{time, value}[]` (single) or named arrays (multi)
- [ ] Added `case 'MY_ID':` in `getOverlayData()` switch
- [ ] **(Multi only)** Added `else if (result.type === 'mytype')` in `addOverlayToChart()`
- [ ] **(Multi only)** Added same `else if` in `refreshOverlays()`
- [ ] Verified `window.MyWangFunction` exists in `technical-indicators.prods__Wang__2026.js`
- [ ] Reloaded the page, loaded CSV data, checked the dropdown
