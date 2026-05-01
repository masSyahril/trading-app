# How to Create a New Technical Indicator - Complete Tutorial

This guide will teach you step by step how to create a new technical indicator for this trading system. Based on my analysis of your codebase, I'll show you the complete process.

---

## 📚 Table of Contents
1. [Understanding the Architecture](#1-understanding-the-architecture)
2. [Step 1: Add Computation Function](#2-step-1--add-computation-function)
3. [Step 2: Register in Multi-Indicator System](#3-step-2--register-in-multi-indicator-system)
4. [Example: Creating "Random Walk Index"](#4-example-creating-random-walk-index)
5. [Testing Your Indicator](#5-testing-your-indicator)

---

## 1. Understanding the Architecture

Your system has **3 layers**:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Multi-Indicator System (multi-indicator-      │
│           system.js)                                     │
│  - Manages panels & charts                              │
│  - Handles user interactions                            │
│  - Calls compute methods & render methods             │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Wang Indicators (technical-indicators-wang.js│
│  - Contains optimized sliding-window algorithms         │
│  - Stored in WangIndicators object                    │
│  - Exposed globally for use                            │
└─────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Core Functions (technical-indicators.js)     │
│  - Basic indicator calculations                         │
│  - Pure functions, no dependencies                    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Step 1: Add Computation Function

You have **two options** for where to add your computation:

### Option A: Add to `technical-indicators-wang.js` (Recommended for sliding window algorithms)

Add your function to the `WangIndicators` object:

```
javascript
// Inside WangIndicators object
computeMyIndicator: function(closes, period) {
  // Your algorithm here
  return { result: [], smoothed: [] };
}
```

### Option B: Add to `technical-indicators.js`

Add a standalone function:

```
javascript
function computeMyIndicator(highs, lows, closes, period) {
  // Your algorithm here
  return { value1: [], value2: [] };
}
```

### Option C: Add directly to `multi-indicator-system.js`

If your indicator is unique and doesn't need reuse:

```
javascript
// Inside the MultiIndicatorSystem class
computeMyIndicator: function(data, period) {
  // Your algorithm here
  return { line1: [], line2: [] };
}
```

---

## 3. Step 2: Register in Multi-Indicator System

Open `multi-indicator-system.js` and follow these steps:

### Step 2.1: Add to `indicatorDefinitions` object

```
javascript
MY_INDICATOR: {
  name: 'My Indicator',
  type: 'oscillator',  // 'oscillator' | 'trend' | 'volume' | 'momentum' | 'volatility'
  defaultParams: { period: 14 },
  paramLabels: { period: 'Period' },
  minPeriod: 14,  // Minimum data points needed
  overbought: 70,  // Optional: for oscillators
  oversold: 30,   // Optional: for oscillators
  compute: (data, params) => this.computeMyIndicator(data, params.period),
  render: (chart, data, colors, seriesMap) => this.renderMyIndicator(chart, data, colors, seriesMap)
}
```

### Step 2.2: Add Compute Method

```javascript
// Inside MultiIndicatorSystem class
computeMyIndicator: function(data, period) {
  const closes = data.map(d => d.close);
  
  // Your computation logic
  const result = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    // Calculate indicator value
    const value = /* your formula */;
    result.push(value);
  }
  
  return { values: result };
}
```

### Step 2.3: Add Render Method

```
javascript
// Inside MultiIndicatorSystem class
renderMyIndicator: function(chart, data, colors, seriesMap) {
  if (!data || !data.values) return;

  // Create series if not exists
  if (!seriesMap.has('line1')) {
    seriesMap.set('line1', chart.addLineSeries({ 
      color: colors.LINE1, 
      lineWidth: 2, 
      title: 'My Line',
      crosshairMarkerVisible: false,
      priceLineVisible: false
    }));
  }

  // Prepare data
  const startIdx = this.chartData.length - data.values.length;
  const chartData = data.values.map((value, i) => ({
    time: this.chartData[startIdx + i].time,
    value: value
  }));

  // Update series
  seriesMap.get('line1').setData(chartData);
}
```

---

## 4. Example: Creating "Random Walk Index"

Let me walk you through creating a complete indicator: **Random Walk Index (RWI)**

### What is RWI?
The Random Walk Index compares price movements to a random walk to determine if a trend is significant.

### Step 4.1: Add Computation Function

Add this to `technical-indicators-wang.js`:

```
javascript
/**
 * RWI (Random Walk Index)
 * Measures trend strength by comparing price movements to random walk
 * 
 * @param {Array} highs - Array of high prices
 * @param {Array} lows - Array of low prices
 * @param {Array} closes - Array of closing prices
 * @param {number} period - Period for calculation (default: 14)
 * @returns {Object} Object with rwi and erwi arrays
 */
computeRWI: function(highs, lows, closes, period) {
  period = period || 14;
  
  const rwi = new Array(closes.length).fill(null);
  const erwi = new Array(closes.length).fill(null);
  
  if (closes.length < period + 1) return { rwi, erwi };
  
  for (let i = period; i < closes.length; i++) {
    let sumRWI = 0;
    
    // Calculate RWI for each day in the period
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      const range = highs[idx] - lows[idx];
      
      if (range > 0) {
        // RWI = (Close - Low) / Range  for long
        // RWI = (High - Close) / Range  for short
        const rwiLong = (closes[idx] - lows[idx]) / range;
        const rwiShort = (highs[idx] - closes[idx]) / range;
        sumRWI += Math.max(rwiLong, rwiShort);
      }
    }
    
    rwi[i] = sumRWI / period;
  }
  
  // Smoothed version (eRWI)
  if (rwi[period] !== null) {
    erwi[period] = rwi[period];
    const alpha = 2 / (period + 1);
    
    for (let i = period + 1; i < closes.length; i++) {
      if (rwi[i] !== null) {
        erwi[i] = erwi[i - 1] * (1 - alpha) + rwi[i] * alpha;
      }
    }
  }
  
  return { rwi, erwi };
}
```

### Step 4.2: Register in Multi-Indicator System

Add to `indicatorDefinitions`:

```
javascript
RWI: {
  name: 'Random Walk Index',
  type: 'oscillator',
  defaultParams: { period: 14 },
  paramLabels: { period: 'Period' },
  minPeriod: 14,
  overbought: 3,  // RWI > 3 indicates strong trend
  oversold: 1,
  compute: (data, params) => this.computeRWIIndicator(data, params.period),
  render: (chart, data, colors, seriesMap) => this.renderRWI(chart, data, colors, seriesMap)
}
```

### Step 4.3: Add Compute Method

```
javascript
computeRWIIndicator: function(data, period = 14) {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  
  if (typeof window !== 'undefined' && window.WangIndicators && window.WangIndicators.computeRWI) {
    return window.WangIndicators.computeRWI(highs, lows, closes, period);
  }
  
  // Fallback implementation
  const rwi = new Array(closes.length).fill(null);
  const erwi = new Array(closes.length).fill(null);
  
  for (let i = period; i < closes.length; i++) {
    let sumRWI = 0;
    
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      const range = highs[idx] - lows[idx];
      
      if (range > 0) {
        const rwiLong = (closes[idx] - lows[idx]) / range;
        const rwiShort = (highs[idx] - closes[idx]) / range;
        sumRWI += Math.max(rwiLong, rwiShort);
      }
    }
    
    rwi[i] = sumRWI / period;
  }
  
  // Smoothed version
  const firstValid = rwi.findIndex(v => v !== null);
  if (firstValid !== -1) {
    erwi[firstValid] = rwi[firstValid];
    const alpha = 2 / (period + 1);
    
    for (let i = firstValid + 1; i < closes.length; i++) {
      if (rwi[i] !== null) {
        erwi[i] = erwi[i - 1] * (1 - alpha) + rwi[i] * alpha;
      }
    }
  }
  
  return { rwi, erwi };
}
```

### Step 4.4: Add Render Method

```
javascript
renderRWI: function(chart, data, colors, seriesMap) {
  if (!data || !data.rwi) return;

  // Create series if not exists
  if (!seriesMap.has('rwi')) {
    seriesMap.set('rwi', chart.addLineSeries({ 
      color: colors.LINE1, 
      lineWidth: 2, 
      title: 'RWI',
      crosshairMarkerVisible: false,
      priceLineVisible: false
    }));
  }
  
  if (!seriesMap.has('erwi')) {
    seriesMap.set('erwi', chart.addLineSeries({ 
      color: colors.LINE2, 
      lineWidth: 2, 
      title: 'eRWI',
      crosshairMarkerVisible: false,
      priceLineVisible: false
    }));
  }

  // Add reference lines
  if (!seriesMap.has('highLine')) {
    seriesMap.set('highLine', chart.addLineSeries({ 
      color: '#666666', 
      lineWidth: 1, 
      lineStyle: 2,
      title: '',
      crosshairMarkerVisible: false,
      priceLineVisible: false
    }));
  }
  
  if (!seriesMap.has('lowLine')) {
    seriesMap.set('lowLine', chart.addLineSeries({ 
      color: '#666666', 
      lineWidth: 1, 
      lineStyle: 2,
      title: '',
      crosshairMarkerVisible: false,
      priceLineVisible: false
    }));
  }

  // Prepare data
  const startIdx = this.chartData.length - data.rwi.length;
  const rwiData = data.rwi.map((value, i) => ({
    time: this.chartData[startIdx + i].time,
    value: value
  }));
  
  const erwiData = data.erwi.map((value, i) => ({
    time: this.chartData[startIdx + i].time,
    value: value
  }));
  
  // Reference lines
  const highLineData = data.rwi.map((_, i) => ({
    time: this.chartData[startIdx + i].time,
    value: 3  // Overbought level
  }));
  
  const lowLineData = data.rwi.map((_, i) => ({
    time: this.chartData[startIdx + i].time,
    value: 1  // Oversold level
  }));

  // Update series
  seriesMap.get('rwi').setData(rwiData);
  seriesMap.get('erwi').setData(erwiData);
  seriesMap.get('highLine').setData(highLineData);
  seriesMap.get('lowLine').setData(lowLineData);
}
```

---

## 5. Testing Your Indicator

### 5.1 Test the Computation Function

```
javascript
// In browser console
const testData = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
const result = WangIndicators.computeMyIndicator(testData, 5);
console.log('Result:', result);
```

### 5.2 Test Integration

```
javascript
// Create instance
const mis = new MultiIndicatorSystem();

// Set chart data
mis.chartData = yourCandleDataArray;

// Test compute
const indicatorData = mis.computeMyIndicator(mis.chartData, 14);
console.log('Indicator data:', indicatorData);
```

### 5.3 Add to UI

The indicator will automatically appear in the indicator dropdown menu.

---

## 📝 Quick Reference: Indicator Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Display name in UI |
| `type` | string | 'oscillator', 'trend', 'volume', 'momentum', 'volatility' |
| `defaultParams` | object | Default parameter values |
| `paramLabels` | object | Labels for each parameter |
| `minPeriod` | number | Minimum data points needed |
| `overbought` | number | Overbought level (for oscillators) |
| `oversold` | number | Oversold level (for oscillators) |
| `compute` | function | Computation method |
| `render` | function | Rendering method |

---

## 🎯 Best Practices

1. **Always handle edge cases**: Check for insufficient data
2. **Use null for invalid values**: Return arrays with nulls, not NaN
3. **Follow naming conventions**: `computeXxx`, `renderXxx`
4. **Add fallback implementations**: If using external library functions
5. **Test with real data**: Use various market conditions

---

## 📚 See Also

For more examples, look at:
- `src/js/core/technical-indicators.js` - Contains 40+ indicator implementations
- `src/js/core/technical-indicators-wang.js` - Wang's optimized implementations
- `src/js/core/multi-indicator-system.js` - System integration examples
