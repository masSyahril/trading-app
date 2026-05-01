# Simple Plan: Add a New Indicator (3 Steps)

You only touch **one file**: `src/js/core/multi-indicator-system.js`.

---

## Step 1: Add the definition (in the list)

In `createIndicatorDefinitions()`, add one block. Copy an existing one (e.g. **MOMENTUM** or **RSI**) and change the key and names:

```javascript
MY_INDICATOR: {
  name: 'My Indicator',
  type: 'oscillator',                    // or 'trend', 'momentum', 'volume'
  defaultParams: { period: 14 },
  paramLabels: { period: 'Period' },
  minPeriod: 14,
  compute: (data, params) => this.computeMyIndicator(data, params.period),
  render: (chart, data, colors, seriesMap) => this.renderMyIndicator(chart, data, colors, seriesMap)
}
```

---

## Step 2: Add the compute method (the math)

Somewhere in the same class, add a method that takes candle **data** and returns **one object with arrays** (same length as data; use `null` where you have no value):

```javascript
computeMyIndicator(data, period = 14) {
  const close = data.map(d => d.close);
  const out = new Array(close.length).fill(null);
  for (let i = period; i < close.length; i++) {
    out[i] = close[i] - close[i - period];   // your formula
  }
  return { line1: out };
}
```

- Use `data.map(d => d.high)`, `d.low`, `d.close`, `d.volume` etc. as needed.
- Return something like `{ line1: [...] }` or `{ line1: [...], line2: [...] }`. The keys are what you use in **render**.

---

## Step 3: Add the render method (draw on chart)

Add a method that creates the series once, then fills them with data using **`this.seriesWithLeadInPadding`**:

```javascript
renderMyIndicator(chart, data, colors, seriesMap) {
  if (!data || !data.line1) return;

  if (!seriesMap.has('line1')) {
    seriesMap.set('line1', chart.addLineSeries({
      color: colors.LINE1,
      lineWidth: 2,
      title: '',
      crosshairMarkerVisible: false,
      priceLineVisible: false
    }));
  }

  const line1Data = this.seriesWithLeadInPadding(data.line1, (v) =>
    (v != null && !isNaN(v) ? v : null)
  );
  seriesMap.get('line1').setData(line1Data);
}
```

- **One line** → one `addLineSeries` and one `setData`.
- **Two lines** → two series (e.g. `line1`, `line2`), two `seriesWithLeadInPadding` calls, two `setData`.
- **Histogram** → use `chart.addHistogramSeries({ base: 0 })` and in the valueFn return `{ value: v, color: ... }` for colored bars.

---

## Done

Your indicator key (e.g. `MY_INDICATOR`) is already in the dropdown because the list is built from **all** entries in `createIndicatorDefinitions()`. No other files to change.

---

## Quick reference

| I want…              | In compute return…     | In render…                          |
|----------------------|------------------------|-------------------------------------|
| One line             | `{ line1: number[] }`  | One `addLineSeries`, one `setData`  |
| Two lines            | `{ a: number[], b: [] }` | Two series, two `setData`        |
| Histogram (e.g. MACD) | `{ hist: number[] }`  | `addHistogramSeries`, valueFn with `{ value, color }` |

For more detail (params UI, legend, external scripts), see **HOW-TO-CREATE-NEW-INDICATORS.md**.
