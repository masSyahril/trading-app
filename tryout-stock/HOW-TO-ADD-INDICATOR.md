# How to Add a New Indicator (New App Only)

This guide is for the **new** app only. You add indicators by editing the shared indicator system; the new app’s dropdown will show them automatically.

---

## Where to edit

**Single file:** `js/core/multi-indicator-system.js`  
(one level up from the `new` folder)

The new app loads this file via `new/index.html` → script loader → `multi-indicator-system.js`. It does **not** have its own indicator list; it uses the full list from that file.

---

## 3 steps

### 1. Add the definition

In `multi-indicator-system.js`, find **`createIndicatorDefinitions()`** and add a new entry (copy e.g. **MOMENTUM** or **RSI** and rename):

```javascript
MY_INDICATOR: {
  name: 'My Indicator',
  type: 'oscillator',                    // or 'trend', 'momentum', 'volume'
  defaultParams: { period: 14 },
  paramLabels: { period: 'Period' },
  minPeriod: 14,
  isNew: true,                           // optional: show a red "NEW" badge; remove or set false when no longer new
  compute: (data, params) => this.computeMyIndicator(data, params.period),
  render: (chart, data, colors, seriesMap) => this.renderMyIndicator(chart, data, colors, seriesMap)
}
```

### 2. Add the compute method

In the same file, on the **`MultiIndicatorSystem`** class, add:

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

- Use `d.high`, `d.low`, `d.close`, `d.volume` as needed.
- Return one object with array values, e.g. `{ line1: [...] }` or `{ line1: [...], line2: [...] }`. Keys = what you use in render.

### 3. Add the render method

In the same class, add:

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

- One line → one `addLineSeries` + one `setData`.
- Two lines → two series and two `setData`.
- Histogram → `addHistogramSeries({ base: 0 })` and in the valueFn return `{ value: v, color: ... }`.

---

## Done

Open the new app, click **Add** in the indicators section, and pick **My Indicator** from the dropdown. No changes needed in `new/index.html` or `new/stock-app.js`.

---

## Quick reference

| Goal        | Compute returns        | Render                          |
|------------|------------------------|----------------------------------|
| One line   | `{ line1: number[] }`  | One `addLineSeries`, one `setData` |
| Two lines  | `{ a: [], b: [] }`     | Two series, two `setData`       |
| Histogram  | `{ hist: number[] }`   | `addHistogramSeries`, valueFn `{ value, color }` |

For full details (params UI, legend, alignment), see **../docs/HOW-TO-CREATE-NEW-INDICATORS.md** or **../docs/SIMPLE-INDICATOR-PLAN.md**.
