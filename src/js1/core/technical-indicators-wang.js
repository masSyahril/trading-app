/* TradeLite Technical Indicators - Prof. Wang Implementation 
  Optimized using "Sliding Window" calculation method.
*/

const WangIndicators = {

  /**
   * MA (Moving Average) - Optimized
   * Formula: (PrevSum - Old + New) / N
   */
  computeMA: function(closes, period) {
    if (!closes || closes.length < period) return [];
    const ma = new Array(closes.length).fill(null);
    
    // 1. Calculate first MA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += closes[i];
    }
    ma[period - 1] = sum / period;

    // 2. Sliding window for the rest
    for (let i = period; i < closes.length; i++) {
      const oldVal = closes[i - period];
      const newVal = closes[i];
      // Derived from: NewAvg = (OldAvg * period - OldVal + NewVal) / period
      ma[i] = (ma[i - 1] * period - oldVal + newVal) / period;
    }
    return ma;
  },

  /**
   * RSI (Relative Strength Index) - Window Sum Method
   * Note: This is different from Wilder's RSI. This uses SMA of Up/Downs.
   */
  computeRSI: function(closes, period) {
    if (!closes || closes.length < period) return [];
    const rsi = new Array(closes.length).fill(null);
    const diffs = new Array(closes.length).fill(0);

    // Calculate all differences first
    for (let i = 1; i < closes.length; i++) {
      diffs[i] = closes[i] - closes[i - 1];
    }

    // Initial Up/Down Sums
    let Ut = 0; // Sum of Up moves
    let Dt = 0; // Sum of Down moves (absolute)

    for (let i = 1; i <= period; i++) {
      if (diffs[i] > 0) Ut += diffs[i];
      else Dt += Math.abs(diffs[i]);
    }

    // First RSI Point
    let UD = Ut + Dt;
    rsi[period] = UD === 0 ? 100 : (Ut / UD) * 100;

    // Sliding Window Loop
    for (let i = period + 1; i < closes.length; i++) {
      // Add new difference
      if (diffs[i] > 0) Ut += diffs[i];
      else Dt += Math.abs(diffs[i]);

      // Subtract old difference
      const oldDiff = diffs[i - period];
      if (oldDiff > 0) Ut -= oldDiff;
      else Dt -= Math.abs(oldDiff);

      UD = Ut + Dt;
      rsi[i] = UD === 0 ? 100 : (Ut / UD) * 100;
    }

    return rsi;
  },

  /**
   * AR / BR Indicators
   * AR = Sum(High - Open) / Sum(Open - Low)
   * BR = Sum(High - Close) / Sum(Close - Low)
   */
  computeARBR: function(opens, highs, lows, closes, period) {
    const ar = new Array(closes.length).fill(null);
    const br = new Array(closes.length).fill(null);
    
    // Arrays for components
    const ho = [], ol = [], hc = [], cl = [];
    
    for(let i=0; i<closes.length; i++){
      ho.push(highs[i] - opens[i]);
      ol.push(opens[i] - lows[i]);
      // Note: Standard BR usually uses Previous Close, but Wang's code uses Current Close
      hc.push(highs[i] - closes[i]); 
      cl.push(closes[i] - lows[i]);
    }

    let sumHO=0, sumOL=0, sumHC=0, sumCL=0;

    // Init first period
    for(let i=0; i<period; i++){
      sumHO+=ho[i]; sumOL+=ol[i]; sumHC+=hc[i]; sumCL+=cl[i];
    }
    
    ar[period-1] = sumOL===0 ? 0 : (sumHO/sumOL)*100;
    br[period-1] = sumCL===0 ? 0 : (sumHC/sumCL)*100;

    // Sliding window
    for(let i=period; i<closes.length; i++){
      sumHO += ho[i] - ho[i-period];
      sumOL += ol[i] - ol[i-period];
      sumHC += hc[i] - hc[i-period];
      sumCL += cl[i] - cl[i-period];

      ar[i] = sumOL===0 ? 0 : (sumHO/sumOL)*100;
      br[i] = sumCL===0 ? 0 : (sumHC/sumCL)*100;
    }

    return { ar, br };
  },

  /**
   * KD (Stochastic Oscillator)
   * K = 2/3 * PrevK + 1/3 * RSV
   */
  computeKD: function(highs, lows, closes, period) {
    const k = new Array(closes.length).fill(null);
    const d = new Array(closes.length).fill(null);
    
    let prevK = 50;
    let prevD = 50;

    for (let i = period - 1; i < closes.length; i++) {
      // Find Max High and Min Low in window
      let maxH = -Infinity;
      let minL = Infinity;
      
      for(let j=0; j<period; j++){
        if(highs[i-j] > maxH) maxH = highs[i-j];
        if(lows[i-j] < minL) minL = lows[i-j];
      }

      let rsv = 50;
      if (maxH !== minL) {
        rsv = ((closes[i] - minL) / (maxH - minL)) * 100;
      }

      const currK = (2/3) * prevK + (1/3) * rsv;
      const currD = (2/3) * prevD + (1/3) * currK;

      k[i] = currK;
      d[i] = currD;

      prevK = currK;
      prevD = currD;
    }
    return { k, d };
  },

  /**
   * CCI (Commodity Channel Index)
   * Formula: (TP - SMA_TP) / (0.015 * MeanDeviation)
   */
  computeCCI: function(highs, lows, closes, period) {
    const cci = new Array(closes.length).fill(null);
    const tp = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
    
    // Simple sum of TP for SMA calculation
    let sumTP = 0;
    
    for(let i=0; i<period; i++) sumTP += tp[i];

    for(let i=period-1; i<closes.length; i++) {
      if(i >= period) sumTP += tp[i] - tp[i-period];
      
      const smaTP = sumTP / period;
      
      // Calculate Mean Deviation
      let sumMD = 0;
      for(let j=0; j<period; j++) {
        sumMD += Math.abs(tp[i-j] - smaTP);
      }
      const md = sumMD / period;

      cci[i] = md === 0 ? 0 : (tp[i] - smaTP) / (0.015 * md);
    }
    return cci;
  },
  
  /**
   * BBI (Bull Bear Index) - Average of 3, 6, 12, 24 MAs
   * Note: This calls the computeMA function defined above
   */
  computeBBI: function(closes, d1, d2, d3, d4) {
    const ma1 = this.computeMA(closes, d1);
    const ma2 = this.computeMA(closes, d2);
    const ma3 = this.computeMA(closes, d3);
    const ma4 = this.computeMA(closes, d4);
    
    const bbi = new Array(closes.length).fill(null);
    const startIdx = Math.max(d1, d2, d3, d4) - 1;

    for(let i = startIdx; i < closes.length; i++) {
      bbi[i] = (ma1[i] + ma2[i] + ma3[i] + ma4[i]) / 4;
    }
    return bbi;
  },

  /**
   * BBI3 - Triple MA Average
   */
  computeBBI3: function(closes, d1, d2, d3) {
    const ma1 = this.computeMA(closes, d1);
    const ma2 = this.computeMA(closes, d2);
    const ma3 = this.computeMA(closes, d3);
    
    const bbi3 = new Array(closes.length).fill(null);
    const startIdx = Math.max(d1, d2, d3) - 1;

    for(let i = startIdx; i < closes.length; i++) {
      bbi3[i] = (ma1[i] + ma2[i] + ma3[i]) / 3;
    }
    return bbi3;
  },

  /**
   * BBI4 - Quad MA Average
   */
  computeBBI4: function(closes, d1, d2, d3, d4) {
    const ma1 = this.computeMA(closes, d1);
    const ma2 = this.computeMA(closes, d2);
    const ma3 = this.computeMA(closes, d3);
    const ma4 = this.computeMA(closes, d4);
    
    const bbi4 = new Array(closes.length).fill(null);
    const startIdx = Math.max(d1, d2, d3, d4) - 1;

    for(let i = startIdx; i < closes.length; i++) {
      bbi4[i] = (ma1[i] + ma2[i] + ma3[i] + ma4[i]) / 4;
    }
    return bbi4;
  },

  /**
   * BBI5 - Penta MA Average
   */
  computeBBI5: function(closes, d1, d2, d3, d4, d5) {
    const ma1 = this.computeMA(closes, d1);
    const ma2 = this.computeMA(closes, d2);
    const ma3 = this.computeMA(closes, d3);
    const ma4 = this.computeMA(closes, d4);
    const ma5 = this.computeMA(closes, d5);
    
    const bbi5 = new Array(closes.length).fill(null);
    const startIdx = Math.max(d1, d2, d3, d4, d5) - 1;

    for(let i = startIdx; i < closes.length; i++) {
      bbi5[i] = (ma1[i] + ma2[i] + ma3[i] + ma4[i] + ma5[i]) / 5;
    }
    return bbi5;
  },

  /**
   * OSC (Oscillator)
   * OSC1 = C - MA
   * OSC2 = C / MA
   */
  computeOSC: function(closes, period) {
    const osc1 = new Array(closes.length).fill(null);
    const osc2 = new Array(closes.length).fill(null);
    const ma = this.computeMA(closes, period);

    for(let i = period - 1; i < closes.length; i++) {
      if (ma[i] !== null && ma[i] !== 0) {
        osc1[i] = closes[i] - ma[i];
        osc2[i] = closes[i] / ma[i];
      }
    }
    return { osc1, osc2 };
  },

  /**
   * BIAS (Bias Ratio)
   * BIAS = (C / MA - 1) * 100
   */
  computeBIAS: function(closes, d1, d2) {
    const bias1 = new Array(closes.length).fill(null);
    const bias2 = new Array(closes.length).fill(null);
    const ma1 = this.computeMA(closes, d1);
    const ma2 = this.computeMA(closes, d2);

    for(let i = d1 - 1; i < closes.length; i++) {
      if (ma1[i]) bias1[i] = (closes[i] / ma1[i] - 1) * 100;
    }
    for(let i = d2 - 1; i < closes.length; i++) {
      if (ma2[i]) bias2[i] = (closes[i] / ma2[i] - 1) * 100;
    }
    return { bias1, bias2 };
  },

  /**
   * MBIAS (Moving Average Bias Difference)
   * MBIAS = MA_Short - MA_Long
   */
  computeMBIAS: function(closes, d1, d2) {
    const mbias = new Array(closes.length).fill(null);
    const ma1 = this.computeMA(closes, d1);
    const ma2 = this.computeMA(closes, d2);
    const startIdx = Math.max(d1, d2) - 1;

    // Determine which is shorter/longer based on logic, but usually it's Short - Long
    // If user passes d1=10, d2=20, we want MA(10) - MA(20)
    // If user passes d1=20, d2=10, we might want MA(10) - MA(20) too?
    // The prods logic says: if day1 > day2, MA2 - MA1. else MA1 - MA2.
    // Basically (Shorter Period MA) - (Longer Period MA)
    
    const shortMA = d1 < d2 ? ma1 : ma2;
    const longMA = d1 < d2 ? ma2 : ma1;

    for(let i = startIdx; i < closes.length; i++) {
      mbias[i] = shortMA[i] - longMA[i];
    }
    return mbias;
  },

  /**
   * UOSC (Ultimate Oscillator - Wang Variation)
   * Based on OSC1 and OSC2 moving averages
   */
  computeUOSC: function(closes, maPeriod, uoscNum) {
    const uosc1 = new Array(closes.length).fill(null);
    const uosc2 = new Array(closes.length).fill(null);
    const ma = this.computeMA(closes, maPeriod);
    
    // First compute OSC values
    const osc1 = new Array(closes.length).fill(0);
    const osc2 = new Array(closes.length).fill(0);
    
    for(let i = maPeriod - 1; i < closes.length; i++) {
      if (ma[i]) {
        osc1[i] = closes[i] - ma[i];
        osc2[i] = closes[i] / ma[i];
      }
    }

    // Calculate SMA of OSCs
    // Using sliding window sum for efficiency
    let sum1 = 0;
    let sum2 = 0;
    
    const startIdx = maPeriod + uoscNum - 2; // Adjusting for 0-based index logic from source
    
    // Initial Sum
    for(let i = maPeriod - 1; i < maPeriod - 1 + uoscNum; i++) {
      if (i < closes.length) {
        sum1 += osc1[i];
        sum2 += osc2[i];
      }
    }
    
    if (startIdx < closes.length) {
      uosc1[startIdx] = sum1 / uoscNum;
      uosc2[startIdx] = sum2 / uoscNum;
    }

    for(let i = startIdx + 1; i < closes.length; i++) {
      sum1 += osc1[i] - osc1[i - uoscNum];
      sum2 += osc2[i] - osc2[i - uoscNum];
      uosc1[i] = sum1 / uoscNum;
      uosc2[i] = sum2 / uoscNum;
    }

    return { uosc1, uosc2 };
  },

  /**
   * ADI (Accumulation Distribution Index - Wang)
   * Note: This is different from standard ADL
   * 
   * @param {Array} highs - Array of high prices
   * @param {Array} lows - Array of low prices
   * @param {Array} closes - Array of closing prices
   * @param {number} adiPeriod - Smoothing period for ADI (default: 0, no smoothing)
   * @param {number} adisPeriod - Smoothing period for ADIs (default: 14)
   * @returns {Object} Object with ADI and ADIs arrays
   */
  computeADI: function(highs, lows, closes, adiPeriod, adisPeriod) {
    const ADI_raw = new Array(closes.length).fill(null);
    const ADI = new Array(closes.length).fill(null);
    const ADIs = new Array(closes.length).fill(null);
    
    if (closes.length < 2) return { ADI, ADIs };

    // Default parameters
    adiPeriod = adiPeriod || 0;  // 0 means no smoothing for ADI
    adisPeriod = adisPeriod || 14;

    // Calculate raw ADI (accumulation index)
    ADI_raw[0] = 0; // ADI(1)初值=0 (index 0 = first element)
    
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i-1]) {
        ADI_raw[i] = ADI_raw[i-1] + (closes[i] - Math.min(lows[i], closes[i-1]));
      } else if (closes[i] < closes[i-1]) {
        ADI_raw[i] = ADI_raw[i-1] - (Math.max(highs[i], closes[i-1]) - closes[i]);
      } else {
        ADI_raw[i] = ADI_raw[i-1] + 0;
      }
    }

    // Apply smoothing to ADI if period > 0
    if (adiPeriod > 0) {
      ADI[0] = ADI_raw[0];
      for (let i = 1; i < closes.length; i++) {
        // Exponential smoothing: (n-1)/(n+1)*昨 + 2/(n+1)*今
        ADI[i] = ((adiPeriod - 1) / (adiPeriod + 1)) * ADI[i - 1] + (2 / (adiPeriod + 1)) * ADI_raw[i];
      }
    } else {
      // No smoothing, use raw ADI
      for (let i = 0; i < closes.length; i++) {
        ADI[i] = ADI_raw[i];
      }
    }

    // Calculate ADIs (smoothed version of ADI)
    if (adisPeriod > 0) {
      ADIs[0] = ADI[0]; // Initialize ADIs[0] = ADI[0]
      for (let i = 1; i < closes.length; i++) {
        // ADIs() is smoothing of ADI(): (n-1)/(n+1)*昨 + 2/(n+1)*今
        ADIs[i] = ((adisPeriod - 1) / (adisPeriod + 1)) * ADIs[i - 1] + (2 / (adisPeriod + 1)) * ADI[i];
      }
    } else {
      // No smoothing for ADIs, use ADI values
      for (let i = 0; i < closes.length; i++) {
        ADIs[i] = ADI[i];
      }
    }

    return { ADI, ADIs };
  },

  /**
   * ADO (Accumulation/Distribution Oscillator)
   */
  computeADO: function(opens, highs, lows, closes) {
    const ado = new Array(closes.length).fill(null);
    
    for(let i = 0; i < closes.length; i++) {
      const range = highs[i] - lows[i];
      if (range === 0) {
        ado[i] = 100;
      } else {
        // (H - O + C - L) / (2 * (H - L)) * 100
        ado[i] = (highs[i] - opens[i] + closes[i] - lows[i]) / (2 * range) * 100;
      }
    }
    return ado;
  },

  /**
   * VAO (Volume Accumulation Oscillator)
   */
  computeVAO: function(highs, lows, closes, volumes) {
    const vao = new Array(closes.length).fill(null);
    
    for(let i = 0; i < closes.length; i++) {
      const range = highs[i] - lows[i];
      if (range !== 0) {
        // ((C - L) - (H - C)) / (H - L) * Vol
        // = (2C - L - H) / (H - L) * Vol
        vao[i] = (2 * closes[i] - lows[i] - highs[i]) / range * volumes[i];
      } else {
        vao[i] = 0; // Handle zero range case
      }
    }
    return vao;
  },

  /**
   * HLO (High Low Oscillator)
   */
  computeHLO: function(highs, lows, closes, period) {
    const hlo = new Array(closes.length).fill(null);
    const hlos = new Array(closes.length).fill(null);
    
    if (closes.length < 2) return { hlo, hlos };

    hlo[0] = 50; // Initial value
    
    for(let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i-1]),
        Math.abs(lows[i] - closes[i-1])
      );
      
      if (tr !== 0) {
        hlo[i] = (highs[i] - closes[i-1]) / tr * 100;
      } else {
        hlo[i] = 50;
      }
    }

    // HLOs Smoothing
    if (period > 0) {
        hlos[0] = hlo[0];
        const alpha = 2 / (period + 1);
        for(let i = 1; i < closes.length; i++) {
            // Skip nulls if any
            if (hlo[i] !== null) {
                const prev = hlos[i-1] !== null ? hlos[i-1] : 50;
                hlos[i] = prev * (1 - alpha) + hlo[i] * alpha;
            }
        }
    }

    return { hlo, hlos };
  },

  /**
   * VHF (Vertical Horizontal Filter)
   */
  computeVHF: function(closes, period) {
    const vhf = new Array(closes.length).fill(null);
    
    for(let i = period; i < closes.length; i++) {
      let maxC = -Infinity;
      let minC = Infinity;
      let sumDiff = 0;
      
      // Look back period days (inclusive of today)
      for(let j = 0; j < period; j++) {
        const idx = i - j;
        if (closes[idx] > maxC) maxC = closes[idx];
        if (closes[idx] < minC) minC = closes[idx];
        
        if (j < period - 1) { // Need previous day for diff
             // This matches the loop logic: sum of abs(close[k] - close[k-1])
             // In the loop j goes from 0 (today) back.
             // We need sum of diffs over the period.
        }
      }
      
      // Re-implementing sum diff loop clearly
      for(let j = 0; j < period; j++) {
          const idx = i - j;
          if(idx > 0) {
              sumDiff += Math.abs(closes[idx] - closes[idx-1]);
          }
      }

      if (sumDiff !== 0) {
        vhf[i] = Math.abs(maxC - minC) / sumDiff;
      } else {
        vhf[i] = 0;
      }
    }
    return vhf;
  },

  /**
   * DEMA (Double Exponential Moving Average)
   */
  computeDEMA: function(closes, period) {
    // First compute EMA1
    const ema1 = this.computeMA(closes, period); // Actually need proper EMA
    
    // We need a proper EMA function here, WangIndicators.computeMA is a specific optimization
    // but let's implement standard EMA for DEMA usage
    const calcEMA = (values, n) => {
        const res = new Array(values.length).fill(null);
        let sum = 0;
        for(let i=0; i<n; i++) sum += values[i];
        res[n-1] = sum/n;
        const k = 2/(n+1);
        for(let i=n; i<values.length; i++) {
            res[i] = values[i]*k + res[i-1]*(1-k);
        }
        return res;
    };

    const emaArr = calcEMA(closes, period);
    
    // Now compute EMA2 (EMA of EMA)
    // We need to handle the nulls at start
    const validEmaArr = emaArr.slice(period-1); // Slice off nulls to compute EMA of it
    // Actually easier to just loop
    
    const dema = new Array(closes.length).fill(null);
    
    // Compute EMA of EMA (ema2)
    // To simplify, let's just do the DEMA loop directly if we have emaArr
    // DEMA = 2*EMA - EMA(EMA)
    
    const ema2Arr = calcEMA(emaArr.map(v => v === null ? 0 : v), period); // Hacky for nulls
    // Better to start loop later
    
    // Let's use the recursive definition:
    // DEMA = 2*EMA - EMA(EMA)
    
    // Re-calculate EMA properly with handling
    const ema1Vals = new Array(closes.length).fill(null);
    let sum = 0;
    for(let i=0; i<period; i++) sum += closes[i];
    ema1Vals[period-1] = sum/period;
    const k = 2/(period+1);
    for(let i=period; i<closes.length; i++) {
        ema1Vals[i] = (closes[i] - ema1Vals[i-1]) * k + ema1Vals[i-1];
    }
    
    // EMA2
    const ema2Vals = new Array(closes.length).fill(null);
    // Need 'period' valid values of EMA1 to start EMA2? 
    // Usually EMA2 starts 'period' after EMA1 starts
    
    // Simple approach:
    // EMA2 starts at index (period-1) + (period-1) = 2*period - 2 roughly
    sum = 0;
    const start2 = period - 1;
    for(let i=0; i<period; i++) {
        if(start2 + i < closes.length) sum += ema1Vals[start2 + i];
    }
    const start2End = start2 + period - 1;
    if (start2End < closes.length) {
        ema2Vals[start2End] = sum/period;
        for(let i=start2End+1; i<closes.length; i++) {
            ema2Vals[i] = (ema1Vals[i] - ema2Vals[i-1]) * k + ema2Vals[i-1];
        }
    }

    // DEMA
    for(let i=0; i<closes.length; i++) {
        if(ema1Vals[i] !== null && ema2Vals[i] !== null) {
            dema[i] = 2 * ema1Vals[i] - ema2Vals[i];
        }
    }
    
    return dema;
  },

  /**
   * VR (Volume Ratio) — Prof Wang / computeVolRatio logic
   * day=計算區間(一般26), esp=平滑天數; VR = (UpVol+TtlVol/2)/(DnVol+TtlVol/2)*100, eVR = EMA(VR, esp)
   */
  computeVR: function(closes, volumes, period, esp = 10) {
    if (typeof window !== 'undefined' && window.computeVolRatio) {
      const { VolRatio, eVolRatio } = window.computeVolRatio(closes, volumes, period, esp);
      return { vr: VolRatio, vrs: eVolRatio };
    }
    const vr = new Array(closes.length).fill(null);
    const vrs = new Array(closes.length).fill(null);
    if (closes.length < period + 2) return { vr, vrs };

    let UpVol = 0, DnVol = 0, TtlVol = 0;
    vr[period] = 100;
    vrs[period] = 100;

    for (let j = 1; j <= period; j++) {
      if (closes[j] >= closes[j - 1]) UpVol += volumes[j];
      if (closes[j] < closes[j - 1]) DnVol += volumes[j];
      TtlVol += volumes[j];
    }

    const den = DnVol + TtlVol / 2;
    vr[period + 1] = den !== 0 ? (UpVol + TtlVol / 2) / den * 100 : 100;
    vrs[period + 1] = (esp - 1) / (esp + 1) * vrs[period] + 2 / (esp + 1) * vr[period + 1];

    for (let i = period + 2; i < closes.length; i++) {
      const oldIdx = i - period;
      if (closes[oldIdx] >= closes[oldIdx - 1]) UpVol -= volumes[oldIdx];
      if (closes[oldIdx] < closes[oldIdx - 1]) DnVol -= volumes[oldIdx];
      TtlVol -= volumes[oldIdx];

      if (closes[i] >= closes[i - 1]) UpVol += volumes[i];
      if (closes[i] < closes[i - 1]) DnVol += volumes[i];
      TtlVol += volumes[i];

      const denI = DnVol + TtlVol / 2;
      vr[i] = denI !== 0 ? (UpVol + TtlVol / 2) / denI * 100 : 100;
      vrs[i] = (esp - 1) / (esp + 1) * vrs[i - 1] + 2 / (esp + 1) * vr[i];
    }

    return { vr, vrs };
  },

  /**
   * Williams %R (Wang Version)
   * (MaxH - C) / (MaxH - MinL) * 100
   * Note: This is 0-100 scale, unlike standard -100 to 0
   */
  computeWilliamsR: function(highs, lows, closes, period) {
    const wr = new Array(closes.length).fill(null);
    
    for (let i = period - 1; i < closes.length; i++) {
      let maxH = -Infinity;
      let minL = Infinity;
      
      for (let j = 0; j < period; j++) {
        if (highs[i-j] > maxH) maxH = highs[i-j];
        if (lows[i-j] < minL) minL = lows[i-j];
      }
      
      if (maxH === minL) {
        wr[i] = 100;
      } else {
        wr[i] = (maxH - closes[i]) / (maxH - minL) * 100;
      }
    }
    return wr;
  },

  /**
   * ATR (Wang Smoothed Version)
   */
  computeATR: function(highs, lows, closes, period) {
    const atr = new Array(closes.length).fill(null);
    const tr = new Array(closes.length).fill(null);
    
    // First TR
    // Loop starts from 1
    tr[0] = 0; 
    
    for(let i=1; i<closes.length; i++) {
        const t1 = highs[i] - lows[i];
        const t2 = Math.abs(highs[i] - closes[i-1]);
        const t3 = Math.abs(lows[i] - closes[i-1]);
        tr[i] = Math.max(t1, t2, t3);
    }
    
    // Initial ATR
    if(closes.length > 1) atr[1] = tr[1]; // As per source logic
    
    const alpha = 2 / (period + 1);
    
    for(let i=2; i<closes.length; i++) {
        // Smoothing
        if(atr[i-1] !== null) {
            atr[i] = (period-1)/(period+1)*atr[i-1] + 2/(period+1)*tr[i];
        } else {
            atr[i] = tr[i];
        }
    }
    
    return { atr, tr };
  },

  /**
   * Coppock Curve (估波指標)
   * Designed by Prof. Wang - 2026-Jan-13
   * 
   * Formula:
   * 1. Calculate short_ROC and long_ROC (Rate of Change)
   * 2. composite_ROC = short_ROC + long_ROC
   * 3. Coppock = Moving Average of composite_ROC
   * 4. eCoppock = Exponential Moving Average of composite_ROC
   * 
   * @param {Array} closes - Array of closing prices
   * @param {number} short_day - Short ROC period (default: 10)
   * @param {number} long_day - Long ROC period (default: 20)
   * @param {number} weight_day - Moving average period for Coppock (default: 10)
   * @returns {Object} Object with coppock and ecoppock arrays
   */
  computeCoppockCurve: function(closes, short_day, long_day, weight_day) {
    // Designed by Prof. Wang === 2026-Jan-13
    // Coppock Curve 估波指標 <2026-Jan-13>
    // Rate of Change(ROC), short_ROC, and long_ROC, composite_ROC
    
    // Input parameters: short_day=10, long_day=20, weight_day=10
    if (!closes || closes.length === 0) return { coppock: [], ecoppock: [] };
    
    // Default parameters
    short_day = short_day || 10;
    long_day = long_day || 20;
    weight_day = weight_day || 10;
    
    // Ensure long_day is maximum, e.g., short_day=10, long_day=20
    if (short_day > long_day) {
      let temp = long_day;
      long_day = short_day;
      short_day = temp;
    }
    
    const short_ROC = new Array(closes.length).fill(null);
    const long_ROC = new Array(closes.length).fill(null);
    const composite_ROC = new Array(closes.length).fill(null);
    const Coppock = new Array(closes.length).fill(null);
    const eCoppock = new Array(closes.length).fill(null);
    
    // Calculate short_day=10 ROC
    for (let i = short_day; i < closes.length; i++) {  // i=10 to length-1 (0-indexed)
      if (closes[i - short_day] !== 0) {
        short_ROC[i] = ((closes[i] - closes[i - short_day]) / closes[i - short_day]);
      } else {
        short_ROC[i] = 0;
      }
    }
    
    // Calculate long_day=20 ROC
    for (let i = long_day; i < closes.length; i++) {  // i=20 to length-1 (0-indexed)
      if (closes[i - long_day] !== 0) {
        long_ROC[i] = ((closes[i] - closes[i - long_day]) / closes[i - long_day]);
      } else {
        long_ROC[i] = 0;
      }
    }
    
    // Calculate composite_ROC = short_ROC + long_ROC
    for (let i = long_day; i < closes.length; i++) {  // i=20 to length-1 (0-indexed)
      const shortVal = short_ROC[i] !== null ? short_ROC[i] : 0;
      const longVal = long_ROC[i] !== null ? long_ROC[i] : 0;
      composite_ROC[i] = shortVal + longVal;
    }
    
    // Calculate Coppock Curve value, i.e., MA of composite_ROC, weight_day=10
    // Original code logic: for(let i=long_day+1; i<long_day+weight_day; i++) in 1-based
    // In 0-based: i=long_day to i<long_day+weight_day-1, but we need weight_day values
    // Actually, original: i=21 to 30 (1-based) = 10 values, so in 0-based: i=20 to 29
    let sum = 0;  // Sum
    
    // First Coppock value at index (long_day + weight_day - 1) in 0-based
    // Original: Coppock(long_day+weight_day) in 1-based = Coppock[long_day+weight_day-1] in 0-based
    const firstCoppockIdx = long_day + weight_day - 1;
    if (firstCoppockIdx < closes.length) {
      // Calculate first MA (SMA) for Coppock
      // Original: for(let i=long_day+1; i<long_day+weight_day; i++) in 1-based
      // This means i=21 to i<30, but we need 10 values, so it should be i=21 to i<=30
      // Actually, let's match the exact original logic: sum from long_day+1 to long_day+weight_day-1
      // But that's only weight_day-1 values. Let me check original again...
      // Original comment says "i=21 tO 30" which suggests inclusive, so maybe it's i<=30?
      // For now, using the standard approach: sum weight_day values starting from long_day
      for (let i = long_day; i < long_day + weight_day; i++) { // i=20 to 29 (0-indexed) = 10 values
        if (composite_ROC[i] !== null) {
          sum += composite_ROC[i];
        }
      }
      Coppock[firstCoppockIdx] = sum / weight_day;  // First Coppock(30 in 1-based, 29 in 0-based)
      
      // Calculate first EMA for eCoppock (using same initial value as SMA)
      eCoppock[firstCoppockIdx] = Coppock[firstCoppockIdx];
      const alpha = 2 / (weight_day + 1);  // EMA smoothing factor
      
      // Calculate remaining Coppock values
      // Original: for(let i=long_day+weight_day+1; i<STK_close.length; i++) in 1-based
      // In 0-based: i=long_day+weight_day to i<closes.length
      // Original: sum=sum-composite_ROC(i-weight_day+1) in 1-based
      // In 0-based: sum=sum-composite_ROC[i-weight_day]
      for (let i = firstCoppockIdx + 1; i < closes.length; i++) { // i=30 to length-1 (0-based)
        // Update MA (Coppock) - sliding window
        // Original: sum=sum-composite_ROC(i-weight_day+1) in 1-based
        // In 0-based: oldIdx = i - weight_day
        const oldIdx = i - weight_day;
        if (oldIdx >= long_day && composite_ROC[oldIdx] !== null) {
          sum -= composite_ROC[oldIdx];
        }
        // Original: sum=sum+composite_ROC(i) in 1-based
        if (composite_ROC[i] !== null) {
          sum += composite_ROC[i];
        }
        Coppock[i] = sum / weight_day;
        
        // Update EMA (eCoppock)
        if (composite_ROC[i] !== null && eCoppock[i - 1] !== null) {
          eCoppock[i] = alpha * composite_ROC[i] + (1 - alpha) * eCoppock[i - 1];
        } else if (composite_ROC[i] !== null) {
          eCoppock[i] = composite_ROC[i];
        }
      }
    }
    
    return { coppock: Coppock, ecoppock: eCoppock };
    // Drawing the Coppock[] and eCoppock[] figures in the small windows.
    // short_ROC[] = 10, 11, ... length-1  // short_day=10, long_day=20, weight_day=10
    // long_ROC[] = 20 to length-1
    // composite_ROC[] = 20 to length-1
    // Coppock[] = 30, 31, ..., length-1
    // eCoppock[] = 30, 31, ..., length-1
  },

  /**
   * M3 Indicator
   * Formula:
   * 1. Calculate MA5, MA10, MA15, MA20
   * 2. M3 = Close - Average(MA5, MA10, MA15, MA20)
   * 3. eM3 = Exponential Smoothing of M3
   * 
   * @param {Array} closes - Array of closing prices
   * @param {number} num - Exponential smoothing period (default: 9)
   * @returns {Object} Object with m3 and em3 arrays
   */
  computeM3: function(closes, num) {
    if (!closes || closes.length === 0) return { m3: [], em3: [] };
    
    // Default parameter
    num = num || 9;  // 指數平滑的天數
    
    const M3 = new Array(closes.length).fill(null);
    const eM3 = new Array(closes.length).fill(null);
    
    // Calculate moving averages
    const MA5 = this.computeMA(closes, 5);
    const MA10 = this.computeMA(closes, 10);
    const MA15 = this.computeMA(closes, 15);
    const MA20 = this.computeMA(closes, 20);
    
    // Calculate M3 and eM3 starting from index 20
    for (let i = 20; i < closes.length; i++) {
      // M3 = Close - Average of (MA5, MA10, MA15, MA20)
      const avgMA = (MA5[i] + MA10[i] + MA15[i] + MA20[i]) / 4;
      M3[i] = closes[i] - avgMA;
      
      // eM3: Exponential smoothing
      if (i === 20) {
        // eM3初值=M3初值 (Initial value of eM3 = Initial value of M3)
        eM3[i] = M3[i];
      } else {
        // 指數平滑num=9 (Exponential smoothing with num=9)
        // eM3(i) = (num-1)/(num+1)*eM3(i-1) + 2/(num+1)*M3(i)
        eM3[i] = ((num - 1) / (num + 1)) * eM3[i - 1] + (2 / (num + 1)) * M3[i];
      }
    }
    
    return { m3: M3, em3: eM3 };
    // Drawing the M3[] and eM3[] figures in the small windows.
    // M3[] , eM3[] = 20, 21, ..., length-1
  },

  /**
   * DMA (Difference of Moving Average) - 平均線差指標
   * Designed by Prof. Wang - 2026-Jan-16
   * 
   * Formula:
   * 1. DMA = MA(short) - MA(long)
   * 2. AMA = EMA of DMA with period ema_n
   * 
   * @param {Array} closes - Array of closing prices
   * @param {number} short_day - Short MA period (default: 10)
   * @param {number} long_day - Long MA period (default: 20)
   * @param {number} ema_n - EMA smoothing period (default: 9)
   * @returns {Object} Object with dma and ama arrays
   */
  computeDMA: function(closes, short_day, long_day, ema_n) {
    // Designed by Prof. Wang, 2026-Jan-16
    // DMA平均線差指標(DMA, Difference of Moving Average)
    // DMA=MA(short)-MA(long), AMA=average(DMA)N
    // 本程式AMA採用EMA處理DMA
    
    if (!closes || closes.length === 0) return { dma: [], ama: [] };
    
    // Default parameters
    short_day = short_day || 10;
    long_day = long_day || 20;
    ema_n = ema_n || 9;  // 指數移動平均,係數=ema_n=9
    
    // Ensure long_day is maximum, e.g., short_day=10, long_day=20
    if (short_day > long_day) {
      let temp = long_day;
      long_day = short_day;
      short_day = temp;
    }
    
    const DMA = new Array(closes.length).fill(null);
    const AMA = new Array(closes.length).fill(null);
    
    // Calculate moving averages
    const MAshort = this.computeMA(closes, short_day);
    const MAlong = this.computeMA(closes, long_day);
    
    // Calculate DMA and AMA starting from index long_day
    for (let i = long_day; i < closes.length; i++) {  // e.g., i=20 to length-1
      // DMA = 短MA - 長MA (DMA = Short MA - Long MA)
      DMA[i] = MAshort[i] - MAlong[i];
      
      // AMA: Exponential Moving Average of DMA
      if (i === long_day) {
        // 初值令相等 (Initial value equals DMA)
        AMA[i] = DMA[i];
      } else {
        // 指數移動平均,係數=ema_n=9 (Exponential Moving Average, coefficient=ema_n=9)
        // AMA(i) = (ema_n-1)/(ema_n+1)*AMA(i-1) + 2/(ema_n+1)*DMA(i)
        AMA[i] = ((ema_n - 1) / (ema_n + 1)) * AMA[i - 1] + (2 / (ema_n + 1)) * DMA[i];
      }
    }
    
    return { dma: DMA, ama: AMA };
    // Drawing the DMA[] and AMA[] figures in the small windows.
    // For example: DMA[] , AMA[] = 20, 21, ..., length-1
  },

  /**
   * VolMA (Volume Moving Average) - Optimized
   * Formula: Moving average of volume using sliding window
   * 
   * @param {Array} volumes - Array of volume values
   * @param {number} period - Period for moving average (e.g., 10, 20)
   * @returns {Array} Array of volume moving average values
   */
  computeVolMA: function(volumes, period) {
    if (!volumes || volumes.length < period) return [];
    const volMA = new Array(volumes.length).fill(null);
    
    // 1. Calculate first VolMA - sum of first 'period' volumes
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += volumes[i];
    }
    volMA[period - 1] = sum / period;

    // 2. Sliding window for the rest
    for (let i = period; i < volumes.length; i++) {
      // Subtract the volume from (i-period) days ago, add current volume
      sum = sum - volumes[i - period] + volumes[i];
      volMA[i] = sum / period;
    }
    
    return volMA;
  },

  /**
   * My Custom Indicator (example stub)
   * Signature: computeMyCustomIndicator(highs, lows, closes, period)
   *
   * You should replace the body with your own logic and return
   * one or more series arrays of the same length as `closes`.
   * Example below returns two lines: line1 and line2.
   */
  computeMyCustomIndicator: function(highs, lows, closes, period) {
    if (!highs || !lows || !closes || closes.length < period) {
      return { line1: [], line2: [] };
    }

    // === SAMPLE IMPLEMENTATION (Replace with your formula) ===
    
    // Line 1: SMA of Closes (using the existing Wang computeMA)
    const line1 = this.computeMA(closes, period);

    // Line 2: SMA of Mid-Price (High + Low) / 2
    const midPrices = new Array(closes.length);
    for (let i = 0; i < closes.length; i++) {
      midPrices[i] = (highs[i] + lows[i]) / 2;
    }
    const line2 = this.computeMA(midPrices, period);

    return { line1, line2 };
  }
};

// Export to window
window.WangIndicators = WangIndicators;

// Create wrapper function for computeADI that uses global STK_* variables
// Supports both old signature: computeADI(period) and new: computeADI(adiPeriod, adisPeriod)
window.computeADI = function(adiPeriod, adisPeriod) {
  const g = (typeof window !== 'undefined') ? window : globalThis;
  
  if (!g.STK_close || !g.STK_high || !g.STK_low) {
    return { ADI: [], ADIs: [] };
  }
  
  // Backward compatibility: if only one parameter provided, use it as adisPeriod
  if (adisPeriod === undefined && adiPeriod !== undefined) {
    adisPeriod = adiPeriod;
    adiPeriod = 0; // Default ADI to no smoothing
  }
  
  return WangIndicators.computeADI(g.STK_high, g.STK_low, g.STK_close, adiPeriod, adisPeriod);
};

// Create wrapper function for computeVolMA that uses global STK_vol variable
// This matches the expected signature: computeVolMA(day)
window.computeVolMA = function(day) {
  const g = (typeof window !== 'undefined') ? window : globalThis;
  
  if (!g.STK_vol) {
    return [];
  }
  
  return WangIndicators.computeVolMA(g.STK_vol, day);
};
