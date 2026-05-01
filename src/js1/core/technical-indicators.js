/* TradeLite Technical Analysis Indicators */

// Exponential Moving Average
function computeEMA(values, period) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return [];
  
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  ema.push(sum / period);
  
  // Subsequent EMA values
  for (let i = period; i < values.length; i++) {
    const currentValue = values[i];
    const previousEMA = ema[ema.length - 1];
    ema.push(currentValue * multiplier + previousEMA * (1 - multiplier));
  }
  
  return ema;
}

// Moving Average(Simple Moving Average)
function computeMA(values, period) { // Ma_day = 5,10,20 etc. Values is an array of closing prices
  const MA = []; // Moving Average array,ma(1),ma(2),...,ma(ttlrecord)
    // First EMA value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) { // Calculate first MA value
    sum += values[i]; // Sum of first Ma_day values
  }
   MA.push(sum / period); // First MA value push is ad another condition after compute the first condition
    // first  ma is MA(Ma_day) for example MA(10) is the first 10 days average

  for (i = period +1; i <= period.length; i++) { 
     MA(i)==(MA(i-1)*period-values[i-period- 1] + values[i-1] )/period;
  }// Start from Ma_day+1 day to the end of the record, for example i = 11 to 1000
  return MA;
}

// Simple Moving Average
function computeSMA(values, period) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return [];
  
  const sma = [];
  
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - j];
    }
    sma.push(sum / period);
  }
  
  return sma;
}

// MACD (Moving Average Convergence Divergence)
function computeMACD(values, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = computeEMA(values, fastPeriod);
  const slowEMA = computeEMA(values, slowPeriod);
  
  // MACD line = Fast EMA - Slow EMA
  const macd = [];
  const startIdx = slowPeriod - fastPeriod;
  
  for (let i = 0; i < slowEMA.length; i++) {
    macd.push(fastEMA[startIdx + i] - slowEMA[i]);
  }
  
  // Signal line = EMA of MACD
  const signal = computeEMA(macd, signalPeriod);
  
  // Histogram = MACD - Signal
  const histogram = [];
  const histStartIdx = macd.length - signal.length;
  
  for (let i = 0; i < signal.length; i++) {
    histogram.push(macd[histStartIdx + i] - signal[i]);
  }
  
  // Align MACD array to match signal length
  const macdAligned = macd.slice(histStartIdx);
  
  return {
    macd: macdAligned,
    signal: signal,
    hist: histogram
  };
}

// RSI (Relative Strength Index) - Window-Sum Method
/**
 * Compute RSI series for one RSI period using the window-sum method.
 * This method uses a fixed window of gains and losses (sliding window approach).
 *
 * Input:
 *   values: Array of close prices (number). Index 0 is first record.
 *   period: RSI period (integer, e.g. 14)
 *
 * Output:
 *   Array of same length as values. Elements are:
 *     - null for indices where RSI cannot be computed (insufficient history)
 *     - RSI value (0..100) for indices where it can
 *
 * Notes:
 *   - We compute diffs as close[i] - close[i-1], for i >= 1.
 *   - For a diff > 0 => gain = diff, loss = 0
 *     For a diff < 0 => gain = 0, loss = -diff (positive)
 *   - Initial sums (U and D) are sums for the first `period` diffs
 *     (i.e. diffs from index 1 .. period)
 *   - RSI at position `period` (0-based index) corresponds to the first
 *     time we have `period` diffs: that's values index `period`
 *   - On each step we add current gain/loss and subtract the gain/loss
 *     that leaves the window.
 *   - If (U + D) === 0 we return 100 (per the handwritten note).
 */
function computeRSI(values, period = 14) {
  const n = values.length;
  if (!Array.isArray(values) || n === 0 || period < 1) {
    throw new Error('Invalid input');
  }

  // Prepare result array with nulls (no RSI until we have period diffs)
  const rsi = Array(n).fill(null);
  if (n <= 1) return rsi; // can't compute any diffs

  // compute diffs array of length n (we'll keep index 0 undefined)
  const diffs = Array(n).fill(0);
  for (let i = 1; i < n; i++) diffs[i] = values[i] - values[i - 1];

  // If period diffs are not available, return all nulls
  if (n - 1 < period) return rsi;

  // initial U and D: sum gains and losses for diffs index 1 .. period
  let U = 0; // sum of gains
  let D = 0; // sum of losses (positive number)
  for (let i = 1; i <= period; i++) {
    const d = diffs[i];
    if (d > 0) U += d;
    else D += -d;
  }

  // the first RSI is placed at index = period (0-based), matching the note
  rsi[period] = (U + D === 0) ? 100 : (U / (U + D)) * 100;

  // slide the window: for each next close index i (i = period+1 .. n-1)
  for (let i = period + 1; i < n; i++) {
    // add current diff's gain/loss (diffs[i])
    const dNew = diffs[i];
    if (dNew > 0) U += dNew;
    else D += -dNew;

    // subtract the diff that leaves the window: diffs[i - period]
    const dLeave = diffs[i - period];
    if (dLeave > 0) U -= dLeave;
    else D -= -dLeave;

    // guard against tiny floating negative zeros
    if (U < 0 && Math.abs(U) < 1e-12) U = 0;
    if (D < 0 && Math.abs(D) < 1e-12) D = 0;

    rsi[i] = (U + D === 0) ? 100 : (U / (U + D)) * 100;
  }

  return rsi;
}

// Stochastic Oscillator
function computeStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
  const n = closes.length;
  if (!Array.isArray(highs) || !Array.isArray(lows) || !Array.isArray(closes) || n === 0 || kPeriod < 1 || dPeriod < 1) {
    return { k: [], d: [] };
  }

  const kValues = Array.from({ length: n }, () => null);
  const dValues = Array.from({ length: n }, () => null);

  // Exponential smoothing factors (default dPeriod=3 => 2/3 previous + 1/3 new)
  const kAlpha = 1 / dPeriod;
  const kBeta = 1 - kAlpha;
  const dAlpha = 1 / dPeriod;
  const dBeta = 1 - dAlpha;

  let kPrev = 50;
  let dPrev = 50;

  for (let i = kPeriod - 1; i < n; i++) {
    let highestHigh = highs[i];
    let lowestLow = lows[i];

    for (let j = 1; j < kPeriod; j++) {
      const idx = i - j;
      if (highs[idx] > highestHigh) highestHigh = highs[idx];
      if (lows[idx] < lowestLow) lowestLow = lows[idx];
    }

    let rsv;
    if (highestHigh === lowestLow) {
      rsv = 100; // flat range, treat as overbought to avoid divide-by-zero
    } else {
      rsv = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
    }

    // First point is anchored at 50/50 to mirror classic KD initialization
    if (i !== kPeriod - 1) {
      kPrev = kBeta * kPrev + kAlpha * rsv;
      dPrev = dBeta * dPrev + dAlpha * kPrev;
    }

    kValues[i] = kPrev;
    dValues[i] = dPrev;
  }

  return { k: kValues, d: dValues };
}

// --------------------------------------------------------------------------
// Wang indicator adapters: bridge Wang-style globals to array-based inputs.
// --------------------------------------------------------------------------
function withWangData({ highs, lows, closes, opens, volumes }, fn) {
  const g = (typeof window !== 'undefined') ? window : globalThis;
  const prev = {
    STK_high: g.STK_high,
    STK_low: g.STK_low,
    STK_close: g.STK_close,
    STK_open: g.STK_open,
    STK_vol: g.STK_vol
  };

  g.STK_high = highs;
  g.STK_low = lows;
  g.STK_close = closes;
  if (opens) g.STK_open = opens;
  if (volumes) g.STK_vol = volumes;

  try {
    return fn(g);
  } finally {
    g.STK_high = prev.STK_high;
    g.STK_low = prev.STK_low;
    g.STK_close = prev.STK_close;
    g.STK_open = prev.STK_open;
    g.STK_vol = prev.STK_vol;
  }
}

function computeWangADI(data, period = 14) {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const opens = data.map(d => d.open);
  const closes = data.map(d => d.close);

  return withWangData({ highs, lows, closes, opens }, (g) => {
    if (typeof g.computeADI !== 'function') return { adi: [], adis: [] };
    const res = g.computeADI(period) || {};
    return {
      adi: res.ADI || res.adi || [],
      adis: res.ADIs || res.adis || res.smooth || []
    };
  });
}

function computeWangADO(data) {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const opens = data.map(d => d.open);
  const closes = data.map(d => d.close);

  return withWangData({ highs, lows, closes, opens }, (g) => {
    if (typeof g.computeADO !== 'function') return [];
    return g.computeADO() || [];
  });
}

function computeWangVAO(data) {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume ?? d.vol ?? 0);

  return withWangData({ highs, lows, closes, volumes }, (g) => {
    if (typeof g.computeVAO !== 'function') return [];
    return g.computeVAO() || [];
  });
}

// --------------------------------------------------------------------------
// Reference indicator implementations (no global STK_* dependency)
// --------------------------------------------------------------------------

// ADI (Accumulation Distribution Index) with smoothing
function computeADIRef(highs, lows, closes, period = 14) {
  const adi = new Array(closes.length).fill(null);
  const adis = new Array(closes.length).fill(null);
  if (!closes || closes.length < 2) return { adi, adis };

  adi[0] = 0;
  if (period > 0) adis[0] = adi[0];

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      adi[i] = adi[i - 1] + (closes[i] - Math.min(lows[i], closes[i - 1]));
    } else if (closes[i] < closes[i - 1]) {
      adi[i] = adi[i - 1] - (Math.max(highs[i], closes[i - 1]) - closes[i]);
    } else {
      adi[i] = adi[i - 1];
    }
    if (period > 0) {
      adis[i] = ((period - 1) / (period + 1)) * adi[i - 1] + (2 / (period + 1)) * adi[i];
    }
  }
  return { adi, adis };
}

// ADO (Accumulation/Distribution Oscillator)
function computeADORef(opens, highs, lows, closes) {
  const ado = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    const range = highs[i] - lows[i];
    ado[i] = range === 0 ? 100 : ((highs[i] - opens[i] + closes[i] - lows[i]) / (2 * range)) * 100;
  }
  return ado;
}

// VAO (Volume Accumulation Oscillator)
function computeVAORef(highs, lows, closes, volumes) {
  const vao = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    const range = highs[i] - lows[i];
    vao[i] = range !== 0 ? ((2 * closes[i] - lows[i] - highs[i]) / range) * volumes[i] : 0;
  }
  return vao;
}

// HLO (High/Low Oscillator) and smoothed HLOs
function computeHLORef(highs, lows, closes, period = 14) {
  const hlo = new Array(closes.length).fill(null);
  const hlos = new Array(closes.length).fill(null);
  if (!closes || closes.length < 2) return { hlo, hlos };

  hlo[0] = 50;
  if (period > 0) hlos[0] = hlo[0];

  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    hlo[i] = tr !== 0 ? ((highs[i] - closes[i - 1]) / tr) * 100 : 50;
    if (period > 0) {
      const alpha = 2 / (period + 1);
      const prev = hlos[i - 1] !== null ? hlos[i - 1] : hlo[i - 1];
      hlos[i] = prev * (1 - alpha) + hlo[i] * alpha;
    }
  }
  return { hlo, hlos };
}

// VHF (Vertical Horizontal Filter) with smoothing output
function computeVHFRef(closes, period = 14, smooth = 10) {
  const vhf = new Array(closes.length).fill(null);
  const vhfs = new Array(closes.length).fill(null);
  for (let i = period; i < closes.length; i++) {
    let maxC = -Infinity;
    let minC = Infinity;
    let sumDiff = 0;
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      maxC = Math.max(maxC, closes[idx]);
      minC = Math.min(minC, closes[idx]);
      if (idx > 0) sumDiff += Math.abs(closes[idx] - closes[idx - 1]);
    }
    vhf[i] = sumDiff !== 0 ? Math.abs(maxC - minC) / sumDiff : 0;
    if (i === period) {
      vhfs[i] = vhf[i];
    } else {
      const alpha = 2 / (smooth + 1);
      vhfs[i] = vhfs[i - 1] * (1 - alpha) + vhf[i] * alpha;
    }
  }
  return { vhf, vhfs };
}

// VR (Volume Ratio) — Prof Wang style: day=計算區間, esp=平滑天數 (exponential smoothing parameter)
// 上漲日成交量 UpVol, 下跌日 DnVol, 期間累積 TtlVol; VR = (UpVol+TtlVol/2)/(DnVol+TtlVol/2)*100; eVR = EMA(VR, esp)
function computeVolRatio(STK_close, STK_vol, day, esp = 10) {
  if (!Array.isArray(STK_close) || !Array.isArray(STK_vol) || STK_close.length !== STK_vol.length || STK_close.length < day + 2) {
    return { VolRatio: [], eVolRatio: [] };
  }
  const n = STK_close.length;
  const VolRatio = new Array(n).fill(null);
  const eVolRatio = new Array(n).fill(null);

  let UpVol = 0, DnVol = 0, TtlVol = 0;

  VolRatio[day] = 100;
  eVolRatio[day] = 100;

  // 第一輪: 累積 j=1..day (0-based) 對應 1-based 的 2..day+1
  for (let j = 1; j <= day; j++) {
    if (STK_close[j] >= STK_close[j - 1]) UpVol += STK_vol[j];
    if (STK_close[j] < STK_close[j - 1]) DnVol += STK_vol[j];
    TtlVol += STK_vol[j];
  }

  const den = DnVol + TtlVol / 2;
  VolRatio[day + 1] = den !== 0 ? (UpVol + TtlVol / 2) / den * 100 : 100;
  eVolRatio[day + 1] = (esp - 1) / (esp + 1) * eVolRatio[day] + 2 / (esp + 1) * VolRatio[day + 1];

  for (let i = day + 2; i < n; i++) {
    const oldIdx = i - day;
    if (STK_close[oldIdx] >= STK_close[oldIdx - 1]) UpVol -= STK_vol[oldIdx];
    if (STK_close[oldIdx] < STK_close[oldIdx - 1]) DnVol -= STK_vol[oldIdx];
    TtlVol -= STK_vol[oldIdx];

    if (STK_close[i] >= STK_close[i - 1]) UpVol += STK_vol[i];
    if (STK_close[i] < STK_close[i - 1]) DnVol += STK_vol[i];
    TtlVol += STK_vol[i];

    const denI = DnVol + TtlVol / 2;
    VolRatio[i] = denI !== 0 ? (UpVol + TtlVol / 2) / denI * 100 : 100;
    eVolRatio[i] = (esp - 1) / (esp + 1) * eVolRatio[i - 1] + 2 / (esp + 1) * VolRatio[i];
  }

  return { VolRatio, eVolRatio };
}

// VR (Volume Ratio) with smoothing (default smooth=10)
function computeVRRef(closes, volumes, period = 20, smooth = 10) {
  const vr = new Array(closes.length).fill(null);
  const vrs = new Array(closes.length).fill(null);
  if (!closes || closes.length < period + 1) return { vr, vrs };

  let upVol = 0;
  let dnVol = 0;
  let ttlVol = 0;

  for (let j = 1; j <= period; j++) {
    if (closes[j] >= closes[j - 1]) upVol += volumes[j];
    if (closes[j] <= closes[j - 1]) dnVol += volumes[j];
    ttlVol += volumes[j];
  }

  const alpha = 2 / (smooth + 1);
  const calcVR = () => (dnVol + ttlVol / 2 !== 0 ? ((upVol + ttlVol / 2) / (dnVol + ttlVol / 2)) * 100 : 100);

  vr[period] = calcVR();
  vrs[period] = vr[period];

  for (let i = period + 1; i < closes.length; i++) {
    const oldIdx = i - period;
    if (closes[oldIdx] >= closes[oldIdx - 1]) upVol -= volumes[oldIdx];
    if (closes[oldIdx] <= closes[oldIdx - 1]) dnVol -= volumes[oldIdx];
    ttlVol -= volumes[oldIdx];

    if (closes[i] >= closes[i - 1]) upVol += volumes[i];
    if (closes[i] <= closes[i - 1]) dnVol += volumes[i];
    ttlVol += volumes[i];

    vr[i] = calcVR();
    vrs[i] = vrs[i - 1] * (1 - alpha) + vr[i] * alpha;
  }
  return { vr, vrs };
}

// DEMA (Double Exponential Moving Average) returning dema and ema
function computeDEMARef(closes, period = 20) {
  const ema1 = computeEMA(closes, period);
  const ema2 = computeEMA(ema1.map(v => (v === null ? 0 : v)), period);
  const dema = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    if (ema1[i] !== undefined && ema2[i] !== undefined && ema1[i] !== null && ema2[i] !== null) {
      dema[i] = 2 * ema1[i] - ema2[i];
    }
  }
  return { dema, ema: ema1 };
}

// ADR (Advance Decline Ratio)
function computeADRRef(closes, period = 20) {
  const adr = new Array(closes.length).fill(null);
  let upDays = 0;
  let dnDays = 0;
  for (let i = 1; i < period; i++) {
    if (closes[i] > closes[i - 1]) upDays += 1;
    else if (closes[i] < closes[i - 1]) dnDays += 1;
  }
  adr[period - 1] = dnDays === 0 ? period : upDays / dnDays;
  for (let i = period; i < closes.length; i++) {
    const oldIdx = i - period + 1;
    if (closes[oldIdx] > closes[oldIdx - 1]) upDays -= 1;
    else if (closes[oldIdx] < closes[oldIdx - 1]) dnDays -= 1;

    if (closes[i] > closes[i - 1]) upDays += 1;
    else if (closes[i] < closes[i - 1]) dnDays += 1;

    adr[i] = dnDays === 0 ? period : upDays / dnDays;
  }
  return adr;
}

// VRMA (Variant Rate of Moving Average) – two lines
function computeVRMARef(closes, day1 = 5, day2 = 10) {
  const vrma1 = new Array(closes.length).fill(null);
  const vrma2 = new Array(closes.length).fill(null);
  const ma1 = computeSMA(closes, day1);
  const ma2 = computeSMA(closes, day2);

  for (let i = day1; i < closes.length; i++) {
    if (ma1[i] !== null && ma1[i - 1] !== null && ma1[i - 1] !== 0) {
      vrma1[i] = (ma1[i] - ma1[i - 1]) / ma1[i - 1];
    } else {
      vrma1[i] = 0;
    }
  }
  for (let i = day2; i < closes.length; i++) {
    if (ma2[i] !== null && ma2[i - 1] !== null && ma2[i - 1] !== 0) {
      vrma2[i] = (ma2[i] - ma2[i - 1]) / ma2[i - 1];
    } else {
      vrma2[i] = 0;
    }
  }
  return { vrma1, vrma2 };
}

function computeWangHLO(data, period = 14) {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);

  return withWangData({ highs, lows, closes }, (g) => {
    if (typeof g.computeHLO !== 'function') return { hlo: [], hlos: [] };
    const res = g.computeHLO(period) || {};
    return { hlo: res.HLO || res.hlo || [], hlos: res.HLOs || res.hlos || [] };
  });
}

function computeWangVHF(data, period = 14) {
  const closes = data.map(d => d.close);

  return withWangData({ highs: [], lows: [], closes }, (g) => {
    if (typeof g.computeVHF !== 'function') return { vhf: [], vhfs: [] };
    const res = g.computeVHF(period) || {};
    return { vhf: res.VHF || res.vhf || [], vhfs: res.VHFs || res.vhfs || [] };
  });
}

function computeWangVR(data, period = 20) {
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume ?? d.vol ?? 0);

  return withWangData({ highs: [], lows: [], closes, volumes }, (g) => {
    if (typeof g.computeVR !== 'function') return { vr: [], vrs: [] };
    const res = g.computeVR(period) || {};
    return { vr: res.VR || res.vr || [], vrs: res.VRs || res.vrs || [] };
  });
}

function computeWangDEMA(data, period = 20) {
  const closes = data.map(d => d.close);

  return withWangData({ highs: [], lows: [], closes }, (g) => {
    if (typeof g.computeDEMA !== 'function') return { dema: [], ema: [] };
    const res = g.computeDEMA(period) || {};
    return { dema: res.DEMA || res.dema || [], ema: res.EMA || res.ema || [] };
  });
}

function computeWangADR(data, period = 20) {
  const closes = data.map(d => d.close);

  return withWangData({ highs: [], lows: [], closes }, (g) => {
    if (typeof g.computeADR !== 'function') return [];
    return g.computeADR(period) || [];
  });
}

function computeWangVRMA(data, day1 = 5, day2 = 10) {
  const closes = data.map(d => d.close);

  return withWangData({ highs: [], lows: [], closes }, (g) => {
    if (typeof g.computeVRMA !== 'function') return { vrma1: [], vrma2: [] };
    const res = g.computeVRMA(day1, day2) || {};
    return { vrma1: res.VRMA1 || res.vrma1 || [], vrma2: res.VRMA2 || res.vrma2 || [] };
  });
}

// Williams %R
function computeWilliamsR(highs, lows, closes, period = 14) {
  const williamsR = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    const currentClose = closes[i];
    
    let highestHigh = highs[i];
    let lowestLow = lows[i];
    
    for (let j = 0; j < period; j++) {
      highestHigh = Math.max(highestHigh, highs[i - j]);
      lowestLow = Math.min(lowestLow, lows[i - j]);
    }
    
    const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
    williamsR.push(wr);
  }
  
  return williamsR;
}

// CCI (Commodity Channel Index)
function computeCCI(highs, lows, closes, period = 20) {
  const typicalPrices = [];
  const cci = [];
  
  // Calculate Typical Price (TP)
  for (let i = 0; i < closes.length; i++) {
    typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
  }
  
  // Calculate CCI
  for (let i = period - 1; i < typicalPrices.length; i++) {
    // Simple Moving Average of TP
    let smaTP = 0;
    for (let j = 0; j < period; j++) {
      smaTP += typicalPrices[i - j];
    }
    smaTP /= period;
    
    // Mean Deviation
    let meanDeviation = 0;
    for (let j = 0; j < period; j++) {
      meanDeviation += Math.abs(typicalPrices[i - j] - smaTP);
    }
    meanDeviation /= period;
    
    // CCI = (TP - SMA of TP) / (0.015 * Mean Deviation)
    const cciValue = (typicalPrices[i] - smaTP) / (0.015 * meanDeviation);
    cci.push(cciValue);
  }
  
  return cci;
}

// ADX (Average Directional Index)
function computeADX(highs, lows, closes, period = 14) {
  const trueRanges = [];
  const plusDMs = [];
  const minusDMs = [];
  
  // Calculate True Range, +DM, and -DM
  for (let i = 1; i < closes.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevHigh = highs[i - 1];
    const prevLow = lows[i - 1];
    const prevClose = closes[i - 1];
    
    // True Range
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    trueRanges.push(Math.max(tr1, tr2, tr3));
    
    // Directional Movement
    const highDiff = high - prevHigh;
    const lowDiff = prevLow - low;
    
    const plusDM = (highDiff > lowDiff && highDiff > 0) ? highDiff : 0;
    const minusDM = (lowDiff > highDiff && lowDiff > 0) ? lowDiff : 0;
    
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }
  
  // Calculate smoothed values
  const smoothedTRs = computeSmoothedAverage(trueRanges, period);
  const smoothedPlusDMs = computeSmoothedAverage(plusDMs, period);
  const smoothedMinusDMs = computeSmoothedAverage(minusDMs, period);
  
  // Calculate DI+ and DI-
  const plusDI = [];
  const minusDI = [];
  const dx = [];
  
  for (let i = 0; i < smoothedTRs.length; i++) {
    const plusDIValue = (smoothedPlusDMs[i] / smoothedTRs[i]) * 100;
    const minusDIValue = (smoothedMinusDMs[i] / smoothedTRs[i]) * 100;
    
    plusDI.push(plusDIValue);
    minusDI.push(minusDIValue);
    
    // DX
    const diSum = plusDIValue + minusDIValue;
    const diDiff = Math.abs(plusDIValue - minusDIValue);
    dx.push(diSum !== 0 ? (diDiff / diSum) * 100 : 0);
  }
  
  // ADX is smoothed average of DX
  const adx = computeSmoothedAverage(dx, period);
  
  return {
    adx: adx,
    plusDI: plusDI.slice(plusDI.length - adx.length),
    minusDI: minusDI.slice(minusDI.length - adx.length)
  };
}

// Helper function for smoothed average (Wilder's smoothing)
function computeSmoothedAverage(values, period) {
  const smoothed = [];
  
  // First value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  smoothed.push(sum / period);
  
  // Subsequent values use Wilder's smoothing
  for (let i = period; i < values.length; i++) {
    const prevSmoothed = smoothed[smoothed.length - 1];
    const newSmoothed = (prevSmoothed * (period - 1) + values[i]) / period;
    smoothed.push(newSmoothed);
  }
  
  return smoothed;
}

// Bollinger Bands
function computeBollingerBands(values, period = 20, stdDev = 2) {
  const sma = computeSMA(values, period);
  const upperBand = [];
  const lowerBand = [];
  
  for (let i = period - 1; i < values.length; i++) {
    const smaValue = sma[i - (period - 1)];
    
    // Calculate standard deviation
    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(values[i - j] - smaValue, 2);
    }
    const standardDeviation = Math.sqrt(variance / period);
    
    upperBand.push(smaValue + (stdDev * standardDeviation));
    lowerBand.push(smaValue - (stdDev * standardDeviation));
  }
  
  return {
    middle: sma,
    upper: upperBand,
    lower: lowerBand
  };
}

// Average True Range (ATR)
/**
 * Compute ATR using smoothed True Range calculation.
 * ATR measures market volatility by calculating the average of true ranges.
 * 
 * Input:
 *   highs: Array of high prices
 *   lows: Array of low prices
 *   closes: Array of close prices
 *   smoothedNum: Smoothing period (default 14)
 * 
 * Output:
 *   Object containing:
 *     - atr: Array of ATR values
 *     - tr: Array of True Range values
 * 
 * Formula:
 *   TR(i) = max(High(i) - Low(i), |High(i) - Close(i-1)|, |Low(i) - Close(i-1)|)
 *   ATR(i) = ((smoothedNum - 1) / (smoothedNum + 1)) * ATR(i-1) + (2 / (smoothedNum + 1)) * TR(i)
 */
function computeATR(highs, lows, closes, smoothedNum = 14) {
  const n = closes.length;
  if (!Array.isArray(highs) || !Array.isArray(lows) || !Array.isArray(closes) ||
      n < 2 || smoothedNum < 1) {
    return { atr: [], tr: [] };
  }
  
  const TR = [];
  const ATR = [];
  
  // First TR is undefined (need previous close)
  TR.push(null);
  ATR.push(null);
  
  // Calculate True Range for each bar
  for (let i = 1; i < n; i++) {
    const temp1 = highs[i] - lows[i];
    const temp2 = Math.abs(highs[i] - closes[i - 1]);
    const temp3 = Math.abs(lows[i] - closes[i - 1]);
    TR.push(Math.max(temp1, temp2, temp3));
    
    // First ATR value is the first TR
    if (i === 1) {
      ATR.push(TR[1]);
    } else {
      // Smoothed ATR calculation
      const smoothFactor1 = (smoothedNum - 1) / (smoothedNum + 1);
      const smoothFactor2 = 2 / (smoothedNum + 1);
      ATR.push(smoothFactor1 * ATR[i - 1] + smoothFactor2 * TR[i]);
    }
  }
  
  return { atr: ATR, tr: TR };
}

// ADO (Accumulation/Distribution Oscillator)
/**
 * Compute ADO - measures the strength of accumulation or distribution.
 * This indicator shows whether buyers or sellers are in control.
 * 
 * Input:
 *   highs: Array of high prices
 *   lows: Array of low prices
 *   opens: Array of open prices
 *   closes: Array of close prices
 * 
 * Output:
 *   Array of ADO values (0-100 scale)
 * 
 * Formula:
 *   If (High - Low) = 0: ADO = 100
 *   Else: ADO = ((High - Open + Close - Low) / (High - Low)) * 100
 * 
 * Interpretation:
 *   - ADO > 50: Accumulation (buying pressure)
 *   - ADO < 50: Distribution (selling pressure)
 *   - ADO = 100: Strong buying
 */
function computeADO(highs, lows, opens, closes) {
  const n = closes.length;
  if (!Array.isArray(highs) || !Array.isArray(lows) || 
      !Array.isArray(opens) || !Array.isArray(closes) || n === 0) {
    return [];
  }
  
  const ADO = [];
  
  for (let i = 0; i < n; i++) {
    const val = highs[i] - lows[i];
    
    if (val === 0) {
      ADO.push(100);
    } else {
      const adoValue = ((highs[i] - opens[i] + closes[i] - lows[i]) / val) * 100;
      ADO.push(adoValue);
    }
  }
  
  return ADO;
}

// HLO (High/Low Oscillator)
/**
 * Compute HLO and its smoothed version (HLOs).
 * This indicator measures the position of the close relative to the true range.
 * 
 * Input:
 *   highs: Array of high prices
 *   lows: Array of low prices
 *   closes: Array of close prices
 *   hloDay: Smoothing period for HLOs (default 14)
 * 
 * Output:
 *   Object containing:
 *     - hlo: Raw HLO values
 *     - hlos: Smoothed HLO values
 * 
 * Formula:
 *   TR = max(High(i) - Low(i), High(i) - Close(i-1), |Low(i) - Close(i-1)|)
 *   HLO(i) = ((High(i) - Close(i-1)) / TR) * 100
 *   HLOs(i) = ((hloDay - 1) / (hloDay + 1)) * HLOs(i-1) + (2 / (hloDay + 1)) * HLO(i)
 * 
 * Interpretation:
 *   - High HLO: Price closed near the low (bearish)
 *   - Low HLO: Price closed near the high (bullish)
 */
function computeHLO(highs, lows, closes, hloDay = 14) {
  const n = closes.length;
  if (!Array.isArray(highs) || !Array.isArray(lows) || 
      !Array.isArray(closes) || n < 2 || hloDay < 1) {
    return { hlo: [], hlos: [] };
  }
  
  const HLO = [];
  const HLOs = [];
  
  // First value initialized to 50 (neutral)
  HLO.push(50);
  HLOs.push(50);
  
  for (let i = 1; i < n; i++) {
    const TR = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    
    // Calculate HLO
    const hloValue = TR !== 0 ? ((highs[i] - closes[i - 1]) / TR) * 100 : 50;
    HLO.push(hloValue);
    
    // Calculate smoothed HLOs
    const smoothFactor1 = (hloDay - 1) / (hloDay + 1);
    const smoothFactor2 = 2 / (hloDay + 1);
    HLOs.push(smoothFactor1 * HLOs[i - 1] + smoothFactor2 * hloValue);
  }
  
  return { hlo: HLO, hlos: HLOs };
}

// Parabolic SAR
function computeParabolicSAR(highs, lows, acceleration = 0.02, maximum = 0.2) {
  const sar = [];
  const trends = []; // true for uptrend, false for downtrend
  
  if (highs.length < 2) return sar;
  
  // Initialize
  let trend = highs[1] > highs[0]; // Initial trend
  let af = acceleration;
  let ep = trend ? highs[1] : lows[1]; // Extreme point
  let sarValue = trend ? lows[0] : highs[0];
  
  sar.push(sarValue);
  trends.push(trend);
  
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    
    // Calculate SAR
    sarValue = sarValue + af * (ep - sarValue);
    
    // Check for trend reversal
    const reversal = trend ? low <= sarValue : high >= sarValue;
    
    if (reversal) {
      // Trend reversal
      trend = !trend;
      sarValue = ep;
      af = acceleration;
      ep = trend ? high : low;
    } else {
      // Continue current trend
      if (trend) {
        if (high > ep) {
          ep = high;
          af = Math.min(af + acceleration, maximum);
        }
        // SAR cannot be above previous or current low
        sarValue = Math.min(sarValue, low, i > 0 ? lows[i - 1] : low);
      } else {
        if (low < ep) {
          ep = low;
          af = Math.min(af + acceleration, maximum);
        }
        // SAR cannot be below previous or current high
        sarValue = Math.max(sarValue, high, i > 0 ? highs[i - 1] : high);
      }
    }
    
    sar.push(sarValue);
    trends.push(trend);
  }
  
  return { sar, trends };
}

// Ichimoku Cloud
function computeIchimoku(highs, lows, closes, tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52) {
  const tenkanSen = [];
  const kijunSen = [];
  const chikouSpan = [];
  const senkouA = [];
  const senkouB = [];
  
  // Helper function to calculate midpoint of high/low over period
  const calculateMidpoint = (startIdx, period) => {
    let high = highs[startIdx];
    let low = lows[startIdx];
    
    for (let j = 1; j < period && startIdx - j >= 0; j++) {
      high = Math.max(high, highs[startIdx - j]);
      low = Math.min(low, lows[startIdx - j]);
    }
    
    return (high + low) / 2;
  };
  
  for (let i = Math.max(tenkanPeriod, kijunPeriod) - 1; i < highs.length; i++) {
    // Tenkan-sen (Conversion Line)
    if (i >= tenkanPeriod - 1) {
      tenkanSen.push(calculateMidpoint(i, tenkanPeriod));
    }
    
    // Kijun-sen (Base Line)
    if (i >= kijunPeriod - 1) {
      kijunSen.push(calculateMidpoint(i, kijunPeriod));
    }
    
    // Chikou Span (Lagging Span) - current close displaced backwards
    chikouSpan.push(closes[i]);
  }
  
  // Senkou A (Leading Span A) - average of Tenkan and Kijun displaced forward
  for (let i = 0; i < Math.min(tenkanSen.length, kijunSen.length); i++) {
    senkouA.push((tenkanSen[i] + kijunSen[i]) / 2);
  }
  
  // Senkou B (Leading Span B) - midpoint of 52-period high/low displaced forward
  for (let i = senkouBPeriod - 1; i < highs.length; i++) {
    senkouB.push(calculateMidpoint(i, senkouBPeriod));
  }
  
  return {
    tenkanSen,
    kijunSen,
    chikouSpan,
    senkouA,
    senkouB
  };
}

// Weighted Moving Average (WMA)
function computeWMA(values, period) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return [];
  
  const wma = [];
  const weightSum = period * (period + 1) / 2; // Sum of weights: 1+2+...+period
  
  for (let i = period - 1; i < values.length; i++) {
    let weightedSum = 0;
    for (let j = 0; j < period; j++) {
      const weight = j + 1; // Weight increases from 1 to period
      weightedSum += values[i - period + 1 + j] * weight;
    }
    wma.push(weightedSum / weightSum);
  }
  
  return wma;
}

// Triangular Moving Average (TMA)
function computeTMA(values, period) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return [];
  
  // TMA is SMA of SMA
  const firstSMA = computeSMA(values, Math.ceil(period / 2));
  const tma = computeSMA(firstSMA, Math.floor(period / 2) + 1);
  
  return tma;
}

//=== Hull / HMA — implementation: Wang_design__HullMA_2026-01-18.js (window.computeHullMA). ===
function computeHMA(values, period) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return [];
  if (typeof window !== 'undefined' && typeof window.computeHullMA === 'function') {
    const { HMA } = window.computeHullMA(values, period);
    return HMA || [];
  }
  return [];
}

// Kaufman's Adaptive Moving Average (KAMA)
function computeKAMA(values, period = 10, fastSC = 2, slowSC = 30) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return [];
  
  const kama = [];
  const fastSCRatio = 2 / (fastSC + 1);
  const slowSCRatio = 2 / (slowSC + 1);
  
  for (let i = period; i < values.length; i++) {
    // Calculate direction (change)
    const change = Math.abs(values[i] - values[i - period]);
    
    // Calculate volatility (sum of absolute changes)
    let volatility = 0;
    for (let j = 1; j <= period; j++) {
      volatility += Math.abs(values[i - j + 1] - values[i - j]);
    }
    
    // Calculate Efficiency Ratio (ER)
    const er = volatility !== 0 ? change / volatility : 0;
    
    // Calculate Smoothing Constant (SC)
    const sc = Math.pow(er * (fastSCRatio - slowSCRatio) + slowSCRatio, 2);
    
    // Calculate KAMA
    if (kama.length === 0) {
      // First KAMA value is just the current price
      kama.push(values[i]);
    } else {
      const prevKAMA = kama[kama.length - 1];
      kama.push(prevKAMA + sc * (values[i] - prevKAMA));
    }
  }
  
  return kama;
}

// Volume Weighted Moving Average (VWMA)
function computeVWMA(values, volumes, period) {
  if (!Array.isArray(values) || !Array.isArray(volumes) || 
      values.length !== volumes.length || values.length < period || period <= 0) {
    return [];
  }
  
  const vwma = [];
  
  for (let i = period - 1; i < values.length; i++) {
    let weightedSum = 0;
    let volumeSum = 0;
    
    for (let j = 0; j < period; j++) {
      const price = values[i - j];
      const volume = volumes[i - j];
      weightedSum += price * volume;
      volumeSum += volume;
    }
    
    vwma.push(volumeSum > 0 ? weightedSum / volumeSum : values[i]);
  }
  
  return vwma;
}

// Generic Moving Average function
function computeMovingAverage(values, period, type = 'SMA', options = {}) {
  switch (type.toUpperCase()) {
    case 'SMA':
      return computeSMA(values, period);
    case 'EMA':
      return computeEMA(values, period);
    case 'WMA':
      return computeWMA(values, period);
    case 'TMA':
      return computeTMA(values, period);
    case 'HMA':
      return computeHMA(values, period);
    case 'KAMA':
      return computeKAMA(values, period, options.fastSC, options.slowSC);
    case 'VWMA':
      return options.volumes ? computeVWMA(values, options.volumes, period) : computeSMA(values, period);
    default:
      console.warn(`Unknown MA type: ${type}, defaulting to SMA`);
      return computeSMA(values, period);
  }
}

// AR (Popularity Indicator) / BR (Willingness Indicator)
/**
 * AR measures buying momentum strength
 * BR measures willingness to buy/sell
 * Common in Taiwan stock market technical analysis
 * 
 * AR = Sum(H - O) / Sum(O - L) * 100 for N days
 * BR = Sum(H - PC) / Sum(PC - L) * 100 for N days
 * where: H=High, O=Open, L=Low, PC=Previous Close
 */
function computeARBR(highs, lows, opens, closes, period = 26) {
  const n = closes.length;
  const ar = [];
  const br = [];
  
  for (let i = period; i < n; i++) {
    let arNumerator = 0;   // Sum(H - O)
    let arDenominator = 0; // Sum(O - L)
    let brNumerator = 0;   // Sum(H - PC)
    let brDenominator = 0; // Sum(PC - L)
    
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      const high = highs[idx];
      const low = lows[idx];
      const open = opens[idx];
      const prevClose = idx > 0 ? closes[idx - 1] : opens[idx];
      
      // AR calculation
      arNumerator += (high - open);
      arDenominator += (open - low);
      
      // BR calculation
      brNumerator += (high - prevClose);
      brDenominator += (prevClose - low);
    }
    
    // Calculate AR (avoid division by zero)
    const arValue = arDenominator !== 0 ? (arNumerator / arDenominator) * 100 : 100;
    ar.push(arValue);
    
    // Calculate BR (avoid division by zero)
    const brValue = brDenominator !== 0 ? (brNumerator / brDenominator) * 100 : 100;
    br.push(brValue);
  }
  
  return { ar, br };
}

function computeSYARBR(highs, lows, opens, closes, period = 23) {
  const n = closes.length;
  const ar = [];
  const br = [];
  
  for (let i = period; i < n; i++) {
    let arNumerator = 0;   // Sum(H - O)
    let arDenominator = 0; // Sum(O - L)
    let brNumerator = 0;   // Sum(H - PC)
    let brDenominator = 0; // Sum(PC - L)
    
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      const high = highs[idx];
      const low = lows[idx];
      const open = opens[idx];
      const prevClose = idx > 0 ? closes[idx - 1] : opens[idx];
      
      // AR calculation
      arNumerator += (high - open);
      arDenominator += (open - low);
      
      // BR calculation
      brNumerator += (high - prevClose);
      brDenominator += (prevClose - low);
    }
    
    // Calculate AR (avoid division by zero)
    const arValue = arDenominator !== 0 ? (arNumerator / arDenominator) * 100 : 100;
    ar.push(arValue);
    
    // Calculate BR (avoid division by zero)
    const brValue = brDenominator !== 0 ? (brNumerator / brDenominator) * 100 : 100;
    br.push(brValue);
  }
  
  return { ar, br };
}
// CR (Combined Rating / Energy Indicator)
/**
 * CR measures price momentum and energy
 * Uses mid-price concept: M = (H + L) / 2
 * 
 * CR = Sum(H - PM) / Sum(PM - L) * 100
 * where: PM = Previous day's M (mid-price)
 */
function computeCR(highs, lows, period = 26) {
  const n = highs.length;
  const cr = [];
  
  // Calculate mid prices first
  const midPrices = [];
  for (let i = 0; i < n; i++) {
    midPrices.push((highs[i] + lows[i]) / 2);
  }
  
  for (let i = period; i < n; i++) {
    let numerator = 0;   // Sum(H - PM)
    let denominator = 0; // Sum(PM - L)
    
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      const high = highs[idx];
      const low = lows[idx];
      const prevMid = idx > 0 ? midPrices[idx - 1] : midPrices[idx];
      
      numerator += (high - prevMid);
      denominator += (prevMid - low);
    }
    
    // Calculate CR (avoid division by zero)
    const crValue = denominator !== 0 ? (numerator / denominator) * 100 : 100;
    cr.push(crValue);
  }
  
  return cr;
}

// Combined AR/BR/CR with moving averages
function computeARBRCR(highs, lows, opens, closes, period = 26) {
  const arbrData = computeARBR(highs, lows, opens, closes, period);
  const crData = computeCR(highs, lows, period);
  
  // Calculate moving averages for smoothing
  const ar = arbrData.ar;
  const br = arbrData.br;
  const cr = crData;
  
  // 5-day MA of AR, BR, CR for smoother signals
  const arMA5 = computeSMA(ar, 5);
  const brMA5 = computeSMA(br, 5);
  const crMA5 = computeSMA(cr, 5);
  
  return {
    ar: ar,
    br: br,
    cr: cr,
    arMA: arMA5,
    brMA: brMA5,
    crMA: crMA5
  };
}

// Bull and Bear Index (BBI)
/**
 * BBI is a comprehensive multi-period moving average indicator popular in Chinese markets.
 * It averages short, medium, and long-term trends to identify bull/bear market conditions.
 * 
 * Formula: BBI = (MA3 + MA6 + MA12 + MA24) / 4
 * 
 * Interpretation:
 * - Price > BBI: Bullish (Bulls in control)
 * - Price < BBI: Bearish (Bears in control)
 * - Price crosses above BBI: Buy signal
 * - Price crosses below BBI: Sell signal
 * 
 * The indicator smooths out noise by combining multiple timeframes.
 */
function computeBBI(closes, periods = { short: 3, shortMed: 6, medLong: 12, long: 24 }) {
  const { short, shortMed, medLong, long } = periods;
  const maxPeriod = Math.max(short, shortMed, medLong, long);
  
  if (!Array.isArray(closes) || closes.length < maxPeriod) {
    return [];
  }
  
  // Compute all four moving averages
  const ma3 = computeSMA(closes, short);
  const ma6 = computeSMA(closes, shortMed);
  const ma12 = computeSMA(closes, medLong);
  const ma24 = computeSMA(closes, long);
  
  // Find the starting index (ma24 has the most lag)
  const startIdx = closes.length - ma24.length;
  
  // Calculate BBI by averaging the four MAs
  const bbi = [];
  for (let i = 0; i < ma24.length; i++) {
    const ma3Idx = i + (ma24.length - ma3.length);
    const ma6Idx = i + (ma24.length - ma6.length);
    const ma12Idx = i + (ma24.length - ma12.length);
    
    const bbiValue = (ma3[ma3Idx] + ma6[ma6Idx] + ma12[ma12Idx] + ma24[i]) / 4;
    bbi.push(bbiValue);
  }
  
  return {
    bbi: bbi,
    ma3: ma3.slice(ma3.length - bbi.length),
    ma6: ma6.slice(ma6.length - bbi.length),
    ma12: ma12.slice(ma12.length - bbi.length),
    ma24: ma24,
    startIndex: startIdx
  };
}

// Bull Bear Power (Elder's Bull/Bear Power)
/**
 * Measures the power of bulls (buyers) and bears (sellers) in the market.
 * Developed by Dr. Alexander Elder.
 * 
 * Bull Power = High - EMA(Close, 13)
 * Bear Power = Low - EMA(Close, 13)
 * 
 * Interpretation:
 * - Bull Power > 0: Bulls pushing price above average
 * - Bear Power < 0: Bears pulling price below average
 * - Both positive: Strong bullish trend
 * - Both negative: Strong bearish trend
 * - Divergences signal potential reversals
 */
function computeBullBearPower(highs, lows, closes, period = 13) {
  if (!Array.isArray(closes) || closes.length < period) {
    return { bullPower: [], bearPower: [], ema: [] };
  }
  
  // Calculate EMA of closes
  const ema = computeEMA(closes, period);
  const startIdx = closes.length - ema.length;
  
  // Calculate Bull Power and Bear Power
  const bullPower = [];
  const bearPower = [];
  
  for (let i = 0; i < ema.length; i++) {
    const idx = startIdx + i;
    bullPower.push(highs[idx] - ema[i]);
    bearPower.push(lows[idx] - ema[i]);
  }
  
  return {
    bullPower: bullPower,
    bearPower: bearPower,
    ema: ema,
    startIndex: startIdx
  };
}


// IMI (Intraday Momentum Index) - Returns 2 values: IMI1, IMI2
function computeIMI(opens, closes, day1 = 10, day2 = 20) {
  const IMI1 = new Array(closes.length).fill(null);
  const IMI2 = new Array(closes.length).fill(null);
  
  let Iup = 0, Idn = 0;
  for (let i = 1; i < day1; i++) {
    if (closes[i] > opens[i]) Iup += (closes[i] - opens[i]);
    else if (opens[i] > closes[i]) Idn += (opens[i] - closes[i]);
  }
  IMI1[day1] = (Iup + Idn === 0) ? 50 : (Iup / (Iup + Idn)) * 100;
  
  for (let i = day1 + 1; i < closes.length; i++) {
    const oldIdx = i - day1;
    if (closes[oldIdx] > opens[oldIdx]) Iup -= (closes[oldIdx] - opens[oldIdx]);
    else if (opens[oldIdx] > closes[oldIdx]) Idn -= (opens[oldIdx] - closes[oldIdx]);
    if (closes[i] > opens[i]) Iup += (closes[i] - opens[i]);
    else if (opens[i] > closes[i]) Idn += (opens[i] - closes[i]);
    IMI1[i] = (Iup + Idn === 0) ? 50 : (Iup / (Iup + Idn)) * 100;
  }
  
  Iup = 0; Idn = 0;
  for (let i = 1; i < day2; i++) {
    if (closes[i] > opens[i]) Iup += (closes[i] - opens[i]);
    else if (opens[i] > closes[i]) Idn += (opens[i] - closes[i]);
  }
  IMI2[day2] = (Iup + Idn === 0) ? 50 : (Iup / (Iup + Idn)) * 100;
  
  for (let i = day2 + 1; i < closes.length; i++) {
    const oldIdx = i - day2;
    if (closes[oldIdx] > opens[oldIdx]) Iup -= (closes[oldIdx] - opens[oldIdx]);
    else if (opens[oldIdx] > closes[oldIdx]) Idn -= (opens[oldIdx] - closes[oldIdx]);
    if (closes[i] > opens[i]) Iup += (closes[i] - opens[i]);
    else if (opens[i] > closes[i]) Idn += (opens[i] - closes[i]);
    IMI2[i] = (Iup + Idn === 0) ? 50 : (Iup / (Iup + Idn)) * 100;
  }
  
  return { IMI1, IMI2 };
}

// Qstick (Quantitative Candle Stick) - Returns 2 values: Qstick1, Qstick2
function computeQstick(opens, closes, day1 = 10, day2 = 20) {
  const Qstick1 = new Array(closes.length).fill(null);
  const Qstick2 = new Array(closes.length).fill(null);
  
  let sum = 0;
  for (let i = 1; i < day1; i++) {
    sum += (closes[i] - opens[i]);
  }
  Qstick1[day1] = sum / day1;
  
  for (let i = day1 + 1; i < closes.length; i++) {
    sum -= (closes[i - day1] - opens[i - day1]);
    sum += (closes[i] - opens[i]);
    Qstick1[i] = sum / day1;
  }
  
  sum = 0;
  for (let i = 1; i < day2; i++) {
    sum += (closes[i] - opens[i]);
  }
  Qstick2[day2] = sum / day2;
  
  for (let i = day2 + 1; i < closes.length; i++) {
    sum -= (closes[i - day2] - opens[i - day2]);
    sum += (closes[i] - opens[i]);
    Qstick2[i] = sum / day2;
  }
  
  return { Qstick1, Qstick2 };
}

// MTM (Momentum) - Returns 2 values: MTM1, MTM2
function computeMTM(closes, day1 = 10, day2 = 20) {
  const MTM1 = new Array(closes.length).fill(null);
  const MTM2 = new Array(closes.length).fill(null);
  
  for (let i = day1; i < closes.length; i++) {
    MTM1[i] = (closes[i] / closes[i - day1 + 1]) * 100;
  }
  
  for (let i = day2; i < closes.length; i++) {
    MTM2[i] = (closes[i] / closes[i - day2 + 1]) * 100;
  }
  
  return { MTM1, MTM2 };
}

// ROC (Rate of Change) - Returns 2 values: ROC1, ROC2
function computeROC(closes, day1 = 10, day2 = 20) {
  const ROC1 = new Array(closes.length).fill(null);
  const ROC2 = new Array(closes.length).fill(null);
  
  for (let i = day1; i < closes.length; i++) {
    ROC1[i] = ((closes[i] / closes[i - day1 + 1]) - 1) * 100;
  }
  
  for (let i = day2; i < closes.length; i++) {
    ROC2[i] = ((closes[i] / closes[i - day2 + 1]) - 1) * 100;
  }
  
  return { ROC1, ROC2 };
}

// KST (Know Sure Things) - Returns 2 values: KST, KSTma
function computeKST(closes, day1 = 10, day2 = 15, day3 = 20, day4 = 30) {
  const ROC1 = [], ROC2 = [], ROC3 = [], ROC4 = [];
  
  for (let i = day1; i < closes.length; i++) {
    ROC1[i] = ((closes[i] / closes[i - day1 + 1]) - 1) * 100;
  }
  for (let i = day2; i < closes.length; i++) {
    ROC2[i] = ((closes[i] / closes[i - day2 + 1]) - 1) * 100;
  }
  for (let i = day3; i < closes.length; i++) {
    ROC3[i] = ((closes[i] / closes[i - day3 + 1]) - 1) * 100;
  }
  for (let i = day4; i < closes.length; i++) {
    ROC4[i] = ((closes[i] / closes[i - day4 + 1]) - 1) * 100;
  }
  
  const ROCma1 = [], ROCma2 = [], ROCma3 = [], ROCma4 = [];
  const maday1 = 10, maday2 = 10, maday3 = 10, maday4 = 15;
  
  ROCma1[day1] = ROC1[day1];
  for (let i = day1 + 1; i < closes.length; i++) {
    ROCma1[i] = ((maday1 - 1) / maday1) * ROCma1[i - 1] + (1 / maday1) * ROC1[i];
  }
  
  ROCma2[day2] = ROC2[day2];
  for (let i = day2 + 1; i < closes.length; i++) {
    ROCma2[i] = ((maday2 - 1) / maday2) * ROCma2[i - 1] + (1 / maday2) * ROC2[i];
  }
  
  ROCma3[day3] = ROC3[day3];
  for (let i = day3 + 1; i < closes.length; i++) {
    ROCma3[i] = ((maday3 - 1) / maday3) * ROCma3[i - 1] + (1 / maday3) * ROC3[i];
  }
  
  ROCma4[day4] = ROC4[day4];
  for (let i = day4 + 1; i < closes.length; i++) {
    ROCma4[i] = ((maday4 - 1) / maday4) * ROCma4[i - 1] + (1 / maday4) * ROC4[i];
  }
  
  const KST = new Array(closes.length).fill(null);
  const KSTma = new Array(closes.length).fill(null);
  const maxDay = Math.max(day1, day2, day3, day4);
  
  for (let i = maxDay; i < closes.length; i++) {
    KST[i] = (ROCma1[i] * 1 + ROCma2[i] * 2 + ROCma3[i] * 3 + ROCma4[i] * 4) / 10;
  }
  
  const n = 9;
  KSTma[maxDay] = KST[maxDay];
  for (let i = maxDay + 1; i < closes.length; i++) {
    KSTma[i] = ((n - 1) / (n + 1)) * KSTma[i - 1] + (2 / (n + 1)) * KST[i];
  }
  
  return { KST, KSTma };
}

// OBV (On-Balance Volume) - Returns 2 values: OBV, eOBV
function computeOBV(highs, lows, closes, volumes) {
  const OBV = new Array(closes.length).fill(null);
  const eOBV = new Array(closes.length).fill(null);
  
  if (highs[0] !== lows[0]) {
    OBV[0] = ((2 * closes[0] - highs[0] - lows[0]) / (highs[0] - lows[0])) * volumes[0];
  } else {
    OBV[0] = volumes[0];
  }
  eOBV[0] = OBV[0];
  
  const emaN = 9;
  const alpha = 2 / (emaN + 1);
  
  for (let i = 1; i < closes.length; i++) {
    if (highs[i] !== lows[i]) {
      OBV[i] = OBV[i - 1] + ((2 * closes[i] - highs[i] - lows[i]) / (highs[i] - lows[i])) * volumes[i];
    } else {
      OBV[i] = OBV[i - 1] + volumes[i];
    }
    eOBV[i] = eOBV[i - 1] * (1 - alpha) + OBV[i] * alpha;
  }
  
  return { OBV, eOBV };
}

// ACC (Acceleration) - Returns 2 values: MTM, ACC
function computeACC(closes, MTM_n = 10, ACC_n = 5) {
  const MTM = new Array(closes.length).fill(null);
  const ACC = new Array(closes.length).fill(null);
  
  for (let i = MTM_n; i < closes.length; i++) {
    MTM[i] = (closes[i] / closes[i - MTM_n + 1]) * 100;
  }
  
  for (let i = MTM_n + ACC_n; i < closes.length; i++) {
    ACC[i] = (MTM[i] / MTM[i - ACC_n]) * 100;
  }
  
  return { MTM, ACC };
}

// WAD (William's Accumulation/Distribution) - Returns 2 values: WAD, eWAD
function computeWAD(highs, lows, closes) {
  const WAD = new Array(closes.length).fill(null);
  const eWAD = new Array(closes.length).fill(null);
  
  WAD[0] = closes[0];
  eWAD[0] = WAD[0];
  
  const eWAD_n = 9;
  const alpha = 2 / (eWAD_n + 1);
  
  for (let i = 1; i < closes.length; i++) {
    const TRH = Math.max(closes[i - 1], highs[i]);
    const TRL = Math.min(closes[i - 1], lows[i]);
    let AD = 0;
    
    if (closes[i] > closes[i - 1]) {
      AD = closes[i] - TRL;
    } else if (closes[i] < closes[i - 1]) {
      AD = closes[i] - TRH;
    } else {
      AD = 0;
    }
    
    WAD[i] = WAD[i - 1] + AD;
    eWAD[i] = eWAD[i - 1] * (1 - alpha) + WAD[i] * alpha;
  }
  
  return { WAD, eWAD };
}

// CostMA (Cost Moving Average) - Returns 1 value: CostMA
function computeCostMA(highs, lows, closes, volumes, day = 10) {
  const CostMA = new Array(closes.length).fill(null);
  let sumVolP = 0;
  let sumVol = 0;
  
  for (let i = 0; i < day; i++) {
    const P = (highs[i] + lows[i] + closes[i]) / 3;
    sumVolP += volumes[i] * P;
    sumVol += volumes[i];
  }
  CostMA[day - 1] = sumVolP / sumVol;
  
  for (let i = day; i < closes.length; i++) {
    const oldP = (highs[i - day] + lows[i - day] + closes[i - day]) / 3;
    sumVolP -= volumes[i - day] * oldP;
    sumVol -= volumes[i - day];
    
    const P = (highs[i] + lows[i] + closes[i]) / 3;
    sumVolP += volumes[i] * P;
    sumVol += volumes[i];
    
    CostMA[i] = sumVolP / sumVol;
  }
  
  return CostMA;
}

// VROC (Volume Rate of Change) - Returns 2 values: VROC1, VROC2
function computeVROC(volumes, day1 = 10, day2 = 20) {
  const VROC1 = new Array(volumes.length).fill(null);
  const VROC2 = new Array(volumes.length).fill(null);
  
  for (let i = day1; i < volumes.length; i++) {
    VROC1[i] = ((volumes[i] / volumes[i - day1 + 1]) - 1) * 100;
  }
  
  for (let i = day2; i < volumes.length; i++) {
    VROC2[i] = ((volumes[i] / volumes[i - day2 + 1]) - 1) * 100;
  }
  
  return { VROC1, VROC2 };
}

// BTI (Breadth Thrust Index) - Returns 1 value: BTI
function computeBTI(closes, day = 10) {
  const BTI = new Array(closes.length).fill(null);
  let sumUp = 0;
  let sumDown = 0;
  
  for (let i = 2; i < day; i++) {
    if (closes[i] > closes[i - 1]) sumUp += 1;
    else if (closes[i] < closes[i - 1]) sumDown += 1;
  }
  BTI[day - 1] = (sumUp + sumDown === 0) ? 0 : (sumUp / (sumUp + sumDown)) / day;
  
  for (let i = day; i < closes.length; i++) {
    const oldIdx = i - day + 1;
    if (closes[oldIdx] > closes[oldIdx - 1]) sumUp -= 1;
    else if (closes[oldIdx] < closes[oldIdx - 1]) sumDown -= 1;
    
    if (closes[i] > closes[i - 1]) sumUp += 1;
    else if (closes[i] < closes[i - 1]) sumDown += 1;
    
    BTI[i] = (sumUp + sumDown === 0) ? 0 : (sumUp / (sumUp + sumDown)) / day;
  }
  
  return BTI;
}

// DPO (Detrended Price Oscillator) - Returns 2 values: DPO, eDPO
function computeDPO(closes, MA_day = 10) {
  const MA = computeSMA(closes, MA_day);
  const DPO = new Array(closes.length).fill(null);
  const eDPO = new Array(closes.length).fill(null);
  
  const lagDay = Math.floor(MA_day / 2 + 1);
  const eDPO_n = 9;
  const alpha = 2 / (eDPO_n + 1);
  
  // MA starts at index (MA_day - 1), so we need to align properly
  const startIdx = MA_day + lagDay - 1;
  if (startIdx < closes.length && (startIdx - lagDay) >= 0) {
    const maIdx = startIdx - lagDay - (MA_day - 1);
    if (maIdx >= 0 && maIdx < MA.length) {
      DPO[startIdx] = closes[startIdx] - MA[maIdx];
      eDPO[startIdx] = DPO[startIdx];
      
      for (let i = startIdx + 1; i < closes.length; i++) {
        const maIdx2 = i - lagDay - (MA_day - 1);
        if (maIdx2 >= 0 && maIdx2 < MA.length) {
          DPO[i] = closes[i] - MA[maIdx2];
          eDPO[i] = eDPO[i - 1] * (1 - alpha) + DPO[i] * alpha;
        }
      }
    }
  }
  
  return { DPO, eDPO };
}

// EOM (Ease of Movement) - Returns 2 values: EOM, eEOM
function computeEOM(highs, lows, volumes) {
  const EOM = new Array(highs.length).fill(null);
  const eEOM = new Array(highs.length).fill(null);
  
  const eEOM_n = 9;
  const alpha = 2 / (eEOM_n + 1);
  
  if (highs.length > 1) {
    const MID = (highs[1] - lows[1]) / 2 - (highs[0] - lows[0]) / 2;
    const VPU = volumes[1] / (highs[1] - lows[1]);
    EOM[1] = (VPU !== 0) ? (MID / VPU) * 1000 : 0;
    eEOM[1] = EOM[1];
    
    for (let i = 2; i < highs.length; i++) {
      const MID_val = (highs[i] - lows[i]) / 2 - (highs[i - 1] - lows[i - 1]) / 2;
      const VPU_val = (highs[i] - lows[i] !== 0) ? volumes[i] / (highs[i] - lows[i]) : 0;
      EOM[i] = (VPU_val !== 0) ? (MID_val / VPU_val) * 1000 : 0;
      eEOM[i] = eEOM[i - 1] * (1 - alpha) + EOM[i] * alpha;
    }
  }
  
  return { EOM, eEOM };
}

// PVT (Price Volume Trend) - Returns 2 values: PVT, ePVT
function computePVT(closes, volumes) {
  const PVT = new Array(closes.length).fill(null);
  const ePVT = new Array(closes.length).fill(null);
  
  PVT[0] = volumes[0];
  ePVT[0] = PVT[0];
  
  const ePVT_n = 9;
  const alpha = 2 / (ePVT_n + 1);
  
  for (let i = 1; i < closes.length; i++) {
    PVT[i] = PVT[i - 1] + ((closes[i] - closes[i - 1]) / closes[i - 1]) * volumes[i];
    ePVT[i] = ePVT[i - 1] * (1 - alpha) + PVT[i] * alpha;
  }
  
  return { PVT, ePVT };
}

// Parabolic SAR - Returns 2 values: sar, trends
function computeParabolicSAR(highs, lows, acceleration = 0.02, maximum = 0.2) {
  const sar = [];
  const trends = [];
  
  if (highs.length < 2) return { sar, trends };
  
  let trend = highs[1] > highs[0];
  let af = acceleration;
  let ep = trend ? highs[1] : lows[1];
  let sarValue = trend ? lows[0] : highs[0];
  
  sar.push(sarValue);
  trends.push(trend);
  
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    
    sarValue = sarValue + af * (ep - sarValue);
    
    const reversal = trend ? low <= sarValue : high >= sarValue;
    
    if (reversal) {
      trend = !trend;
      sarValue = ep;
      af = acceleration;
      ep = trend ? high : low;
    } else {
      if (trend) {
        if (high > ep) {
          ep = high;
          af = Math.min(af + acceleration, maximum);
        }
        sarValue = Math.min(sarValue, low, i > 0 ? lows[i - 1] : low);
      } else {
        if (low < ep) {
          ep = low;
          af = Math.min(af + acceleration, maximum);
        }
        sarValue = Math.max(sarValue, high, i > 0 ? highs[i - 1] : high);
      }
    }
    
    sar.push(sarValue);
    trends.push(trend);
  }
  
  return { sar, trends };
}
function computeMAone() {

}

// Ichimoku Cloud - Returns 5 values: tenkanSen, kijunSen, chikouSpan, senkouA, senkouB
function computeIchimoku(highs, lows, closes, tenkanPeriod = 9, kijunPeriod = 26, senkouBPeriod = 52) {
  const tenkanSen = [];
  const kijunSen = [];
  const chikouSpan = [];
  const senkouA = [];
  const senkouB = [];
  
  const calculateMidpoint = (startIdx, period) => {
    let high = highs[startIdx];
    let low = lows[startIdx];
    for (let j = 1; j < period && startIdx - j >= 0; j++) {
      high = Math.max(high, highs[startIdx - j]);
      low = Math.min(low, lows[startIdx - j]);
    }
    return (high + low) / 2;
  };
  
  for (let i = Math.max(tenkanPeriod, kijunPeriod) - 1; i < highs.length; i++) {
    if (i >= tenkanPeriod - 1) {
      tenkanSen.push(calculateMidpoint(i, tenkanPeriod));
    }
    if (i >= kijunPeriod - 1) {
      kijunSen.push(calculateMidpoint(i, kijunPeriod));
    }
    chikouSpan.push(closes[i]);
  }
  
  for (let i = 0; i < Math.min(tenkanSen.length, kijunSen.length); i++) {
    senkouA.push((tenkanSen[i] + kijunSen[i]) / 2);
  }
  
  for (let i = senkouBPeriod - 1; i < highs.length; i++) {
    senkouB.push(calculateMidpoint(i, senkouBPeriod));
  }
  
  return { tenkanSen, kijunSen, chikouSpan, senkouA, senkouB };
}

// Export functions for global use
if (typeof window !== 'undefined') {
  window.computeEMA = computeEMA;
  window.computeSMA = computeSMA;
  window.computeWMA = computeWMA;
  window.computeTMA = computeTMA;
  window.computeHMA = computeHMA;
  window.computeKAMA = computeKAMA;
  window.computeVWMA = computeVWMA;
  window.computeMovingAverage = computeMovingAverage;
  window.computeMACD = computeMACD;
  window.computeRSI = computeRSI;
  window.computeStochastic = computeStochastic;
  window.computeWilliamsR = computeWilliamsR;
  window.computeCCI = computeCCI;
  window.computeADX = computeADX;
  window.computeSmoothedAverage = computeSmoothedAverage;
  window.computeBollingerBands = computeBollingerBands;
  window.computeATR = computeATR;
  window.computeADO = computeADO;
  window.computeHLO = computeHLO;
  window.computeParabolicSAR = computeParabolicSAR;
  window.computeIchimoku = computeIchimoku;
  window.computeARBR = computeARBR;
  window.computeCR = computeCR;
  window.computeARBRCR = computeARBRCR;
  window.computeBBI = computeBBI;
  window.computeBullBearPower = computeBullBearPower;
  window.computeSYARBR = computeSYARBR;
  window.computeIMI = computeIMI;
  window.computeQstick = computeQstick;
  window.computeMTM = computeMTM;
  window.computeROC = computeROC;
  window.computeKST = computeKST;
  window.computeOBV = computeOBV;
  window.computeACC = computeACC;
  window.computeWAD = computeWAD;
  window.computeCostMA = computeCostMA;
  window.computeVROC = computeVROC;
  window.computeVolRatio = computeVolRatio;
  window.computeBTI = computeBTI;
  window.computeDPO = computeDPO;
  window.computeEOM = computeEOM;
  window.computePVT = computePVT;
  window.computeParabolicSAR = computeParabolicSAR;
  window.computeIchimoku = computeIchimoku;
}


