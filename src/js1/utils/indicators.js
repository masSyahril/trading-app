/* TradeLite Technical Indicators Library */

// Simple Moving Average
function computeSMA(values, period) {
  if (!Array.isArray(values) || values.length < period) return [];
  
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

// Exponential Moving Average (already in utils.js, but keeping for completeness)
function computeEMA(values, period) {
  if (!Array.isArray(values) || values.length < period) return [];
  
  const k = 2 / (period + 1);
  const ema = [];
  let sum = 0;
  
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (i < period) {
      sum += v;
      if (i === period - 1) {
        ema.push(sum / period);
      } else {
        ema.push(NaN);
      }
    } else {
      const prev = ema[i - 1];
      ema.push(v * k + prev * (1 - k));
    }
  }
  
  return ema.filter(x => !isNaN(x));
}

// Relative Strength Index (RSI)
function computeRSI(values, period = 14) {
  if (!Array.isArray(values) || values.length < period + 1) return [];
  
  const gains = [];
  const losses = [];
  
  // Calculate price changes
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  const avgGains = computeEMA(gains, period);
  const avgLosses = computeEMA(losses, period);
  
  const rsi = [];
  for (let i = 0; i < avgGains.length; i++) {
    if (avgLosses[i] === 0) {
      rsi.push(100);
    } else {
      const rs = avgGains[i] / avgLosses[i];
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

// Bollinger Bands
function computeBollingerBands(values, period = 20, stdDev = 2) {
  if (!Array.isArray(values) || values.length < period) return { upper: [], middle: [], lower: [] };
  
  const sma = computeSMA(values, period);
  const upper = [];
  const lower = [];
  
  for (let i = 0; i < sma.length; i++) {
    const dataIndex = i + period - 1;
    const subset = values.slice(dataIndex - period + 1, dataIndex + 1);
    
    // Calculate standard deviation
    const mean = sma[i];
    const squaredDiffs = subset.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
    const standardDeviation = Math.sqrt(avgSquaredDiff);
    
    upper.push(mean + (stdDev * standardDeviation));
    lower.push(mean - (stdDev * standardDeviation));
  }
  
  return { upper, middle: sma, lower };
}

// Stochastic Oscillator
function computeStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
  if (!Array.isArray(highs) || highs.length < kPeriod) return { k: [], d: [] };
  
  const k = [];
  
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    const currentClose = closes[i];
    
    if (highestHigh === lowestLow) {
      k.push(50); // Avoid division by zero
    } else {
      k.push(((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100);
    }
  }
  
  const d = computeSMA(k, dPeriod);
  
  return { k, d };
}

// Williams %R
function computeWilliamsR(highs, lows, closes, period = 14) {
  if (!Array.isArray(highs) || highs.length < period) return [];
  
  const williamsR = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
    const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
    const currentClose = closes[i];
    
    if (highestHigh === lowestLow) {
      williamsR.push(-50);
    } else {
      williamsR.push(((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100);
    }
  }
  
  return williamsR;
}

// Commodity Channel Index (CCI)
function computeCCI(highs, lows, closes, period = 20) {
  if (!Array.isArray(highs) || highs.length < period) return [];
  
  const typicalPrices = [];
  for (let i = 0; i < closes.length; i++) {
    typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
  }
  
  const sma = computeSMA(typicalPrices, period);
  const cci = [];
  
  for (let i = 0; i < sma.length; i++) {
    const dataIndex = i + period - 1;
    const subset = typicalPrices.slice(dataIndex - period + 1, dataIndex + 1);
    const mean = sma[i];
    
    // Calculate mean deviation
    const deviations = subset.map(val => Math.abs(val - mean));
    const meanDeviation = deviations.reduce((sum, val) => sum + val, 0) / period;
    
    if (meanDeviation === 0) {
      cci.push(0);
    } else {
      cci.push((typicalPrices[dataIndex] - mean) / (0.015 * meanDeviation));
    }
  }
  
  return cci;
}

// Average Directional Index (ADX)
function computeADX(highs, lows, closes, period = 14) {
  if (!Array.isArray(highs) || highs.length < period + 1) return { adx: [], plusDI: [], minusDI: [] };
  
  const trueRanges = [];
  const plusDMs = [];
  const minusDMs = [];
  
  // Calculate True Range and Directional Movements
  for (let i = 1; i < closes.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const close = closes[i];
    const prevHigh = highs[i - 1];
    const prevLow = lows[i - 1];
    const prevClose = closes[i - 1];
    
    // True Range
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
    
    // Directional Movements
    const plusDM = high - prevHigh > prevLow - low && high - prevHigh > 0 ? high - prevHigh : 0;
    const minusDM = prevLow - low > high - prevHigh && prevLow - low > 0 ? prevLow - low : 0;
    
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }
  
  // Smooth the values using EMA
  const atr = computeEMA(trueRanges, period);
  const smoothPlusDM = computeEMA(plusDMs, period);
  const smoothMinusDM = computeEMA(minusDMs, period);
  
  const plusDI = [];
  const minusDI = [];
  const dx = [];
  
  for (let i = 0; i < atr.length; i++) {
    const plusDIVal = (smoothPlusDM[i] / atr[i]) * 100;
    const minusDIVal = (smoothMinusDM[i] / atr[i]) * 100;
    
    plusDI.push(plusDIVal);
    minusDI.push(minusDIVal);
    
    const diSum = plusDIVal + minusDIVal;
    if (diSum === 0) {
      dx.push(0);
    } else {
      dx.push((Math.abs(plusDIVal - minusDIVal) / diSum) * 100);
    }
  }
  
  const adx = computeEMA(dx, period);
  
  return { adx, plusDI, minusDI };
}

// Volume-based indicators
function computeVolumeMA(volumes, period = 20) {
  return computeSMA(volumes, period);
}

function computeOBV(closes, volumes) {
  if (!Array.isArray(closes) || closes.length < 2) return [];
  
  const obv = [volumes[0] || 0];
  
  for (let i = 1; i < closes.length; i++) {
    const prevClose = closes[i - 1];
    const currentClose = closes[i];
    const volume = volumes[i] || 0;
    
    if (currentClose > prevClose) {
      obv.push(obv[obv.length - 1] + volume);
    } else if (currentClose < prevClose) {
      obv.push(obv[obv.length - 1] - volume);
    } else {
      obv.push(obv[obv.length - 1]);
    }
  }
  
  return obv;
}

// Momentum Oscillator
function computeMomentum(values, period = 10) {
  if (!Array.isArray(values) || values.length < period + 1) return [];
  
  const momentum = [];
  for (let i = period; i < values.length; i++) {
    momentum.push(values[i] - values[i - period]);
  }
  
  return momentum;
}

// Rate of Change (ROC)
function computeROC(values, period = 10) {
  if (!Array.isArray(values) || values.length < period + 1) return [];
  
  const roc = [];
  for (let i = period; i < values.length; i++) {
    const current = values[i];
    const past = values[i - period];
    if (past === 0) {
      roc.push(0);
    } else {
      roc.push(((current - past) / past) * 100);
    }
  }
  
  return roc;
}

// MACD (Enhanced version from utils.js)
function computeMACD(values, fast = 12, slow = 26, signal = 9) {
  if (!Array.isArray(values) || values.length < slow + signal) {
    return { macd: [], signal: [], histogram: [] };
  }
  
  const emaFast = computeEMA(values, fast);
  const emaSlow = computeEMA(values, slow);
  
  const alignedLength = Math.min(emaFast.length, emaSlow.length);
  const macdLine = [];
  
  for (let i = 0; i < alignedLength; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }
  
  const signalLine = computeEMA(macdLine, signal);
  const macdAligned = macdLine.slice(macdLine.length - signalLine.length);
  const histogram = macdAligned.map((macd, i) => macd - signalLine[i]);
  
  return {
    macd: macdAligned,
    signal: signalLine,
    histogram: histogram
  };
}

// Indicator definitions for UI
const INDICATOR_DEFINITIONS = {
  'MACD': {
    name: 'MACD',
    description: 'Moving Average Convergence Divergence',
    type: 'oscillator',
    parameters: {
      fast: { default: 12, min: 1, max: 50, step: 1 },
      slow: { default: 26, min: 1, max: 100, step: 1 },
      signal: { default: 9, min: 1, max: 50, step: 1 }
    },
    compute: (data, params = {}) => computeMACD(data.closes, params.fast || 12, params.slow || 26, params.signal || 9),
    yAxisRange: 'auto'
  },
  'RSI': {
    name: 'RSI',
    description: 'Relative Strength Index',
    type: 'oscillator',
    parameters: {
      period: { default: 14, min: 2, max: 100, step: 1 }
    },
    compute: (data, params = {}) => ({ rsi: computeRSI(data.closes, params.period || 14) }),
    yAxisRange: [0, 100]
  },
  'STOCH': {
    name: 'Stochastic',
    description: 'Stochastic Oscillator',
    type: 'oscillator',
    parameters: {
      kPeriod: { default: 14, min: 1, max: 50, step: 1 },
      dPeriod: { default: 3, min: 1, max: 10, step: 1 }
    },
    compute: (data, params = {}) => computeStochastic(data.highs, data.lows, data.closes, params.kPeriod || 14, params.dPeriod || 3),
    yAxisRange: [0, 100]
  },
  'WILLIAMS': {
    name: 'Williams %R',
    description: 'Williams Percent Range',
    type: 'oscillator',
    parameters: {
      period: { default: 14, min: 1, max: 50, step: 1 }
    },
    compute: (data, params = {}) => ({ williamsR: computeWilliamsR(data.highs, data.lows, data.closes, params.period || 14) }),
    yAxisRange: [-100, 0]
  },
  'CCI': {
    name: 'CCI',
    description: 'Commodity Channel Index',
    type: 'oscillator',
    parameters: {
      period: { default: 20, min: 1, max: 50, step: 1 }
    },
    compute: (data, params = {}) => ({ cci: computeCCI(data.highs, data.lows, data.closes, params.period || 20) }),
    yAxisRange: [-200, 200]
  },
  'ADX': {
    name: 'ADX',
    description: 'Average Directional Index',
    type: 'oscillator',
    parameters: {
      period: { default: 14, min: 1, max: 50, step: 1 }
    },
    compute: (data, params = {}) => computeADX(data.highs, data.lows, data.closes, params.period || 14),
    yAxisRange: [0, 100]
  },
  'MOMENTUM': {
    name: 'Momentum',
    description: 'Price Momentum',
    type: 'oscillator',
    parameters: {
      period: { default: 10, min: 1, max: 50, step: 1 }
    },
    compute: (data, params = {}) => ({ momentum: computeMomentum(data.closes, params.period || 10) }),
    yAxisRange: 'auto'
  },
  'ROC': {
    name: 'ROC',
    description: 'Rate of Change',
    type: 'oscillator',
    parameters: {
      period: { default: 10, min: 1, max: 50, step: 1 }
    },
    compute: (data, params = {}) => ({ roc: computeROC(data.closes, params.period || 10) }),
    yAxisRange: 'auto'
  },
  'VOLUME': {
    name: 'Volume',
    description: 'Volume with Moving Average',
    type: 'volume',
    parameters: {
      maPeriod: { default: 20, min: 1, max: 100, step: 1 }
    },
    compute: (data, params = {}) => ({ 
      volume: data.volumes || [], 
      volumeMA: computeVolumeMA(data.volumes || [], params.maPeriod || 20) 
    }),
    yAxisRange: 'auto'
  },
  'OBV': {
    name: 'OBV',
    description: 'On-Balance Volume',
    type: 'volume',
    parameters: {},
    compute: (data, params = {}) => ({ obv: computeOBV(data.closes, data.volumes || []) }),
    yAxisRange: 'auto'
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeSMA,
    computeEMA,
    computeRSI,
    computeBollingerBands,
    computeStochastic,
    computeWilliamsR,
    computeCCI,
    computeADX,
    computeVolumeMA,
    computeOBV,
    computeMomentum,
    computeROC,
    computeMACD,
    INDICATOR_DEFINITIONS
  };
}