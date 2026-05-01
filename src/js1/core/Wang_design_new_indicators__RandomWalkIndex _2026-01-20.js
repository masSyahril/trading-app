//===designed by Prof Wang, 2026-Jan-20=================================
//RWI(Random Walk Index)隨機漫步指標
//RWI_High, RWI_Low
//
// WHY IT MUST TAKE (high, low, close): The app passes candle data as these
// arguments. If you use globals like STK_close, nobody sets them, so the
// indicator has no data. Always accept data as parameters.
function computeRandomWalkIndex(RWI_n, esp, high, low, close) {
  // RWI_n = RWI計算的天數, eg. RWI_n=10
  // esp = exponential smoothing for ATR, eg. esp=9
  const len = close.length;
  const RWI_high = new Array(len).fill(NaN);
  const RWI_low = new Array(len).fill(NaN);
  const TR = new Array(len).fill(0);
  const ATR = new Array(len).fill(NaN);

  // True Range: TR[i] for i>=1
  for (let i = 1; i < len; i++) {
    const tp1 = high[i] - low[i];
    const tp2 = Math.abs(high[i] - close[i - 1]);
    const tp3 = Math.abs(low[i] - close[i - 1]);
    TR[i] = Math.max(tp1, tp2, tp3);
  }

  if (len > 1) ATR[1] = TR[1];
  // ATR = EMA(TR): ATR今 = (esp-1)/(esp+1)*ATR昨 + 2/(esp+1)*TR今
  for (let i = 2; i < len; i++) {
    ATR[i] = (esp - 1) / (esp + 1) * ATR[i - 1] + (2 / (esp + 1)) * TR[i];
  }

  // RWI: rolling max/min over last RWI_n bars (including current)
  for (let i = RWI_n - 1; i < len; i++) {
    let max_high = -Infinity;
    let min_low = Infinity;
    const start = i - RWI_n + 1;
    for (let j = start; j <= i; j++) {
      if (high[j] > max_high) max_high = high[j];
      if (low[j] < min_low) min_low = low[j];
    }
    const denom = ATR[i] * Math.sqrt(RWI_n);
    if (denom && !isNaN(denom) && denom !== 0) {
      RWI_high[i] = (high[i] - min_low) / denom;
      RWI_low[i] = (max_high - low[i]) / denom;
    }
  }

  return { RWI_high, RWI_low };
}

if (typeof window !== 'undefined') {
  window.computeRandomWalkIndex = computeRandomWalkIndex;
}
