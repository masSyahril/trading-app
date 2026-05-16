
computeMcClellanOscillator(data, day = 10, esp1 = 20, esp2 = 40) {
  const closes = data.map(d => d.close ?? 0);
  const len = closes.length;
  const mcclellanOsc = new Array(len).fill(null);
  const SI = new Array(len).fill(null);
  if (len === 0) return { mcclellanOsc: [], SI: [] };

  if (esp1 >= esp2) { const t = esp1; esp1 = esp2; esp2 = t; }
  const espSI = 9;
  const startIdx = day;
  if (len <= startIdx) return { mcclellanOsc, SI };

  // Build initial window: day comparisons (j vs j-1) for j = 1..day
  let sum_up = 0, sum_down = 0;
  for (let j = 1; j <= day; j++) {
    const diff = closes[j] - closes[j - 1];
    if (diff > 0) sum_up += diff;
    else if (diff < 0) sum_down -= diff;
  }

  const d0 = sum_up + sum_down;
  const ANA0 = d0 !== 0 ? (sum_up - sum_down) / d0 : 0;
  let ema_s = ANA0, ema_l = ANA0;
  mcclellanOsc[startIdx] = ema_s - ema_l; // = 0 initially
  SI[startIdx] = mcclellanOsc[startIdx];

  for (let j = startIdx + 1; j < len; j++) {
    // Slide window: remove oldest comparison, add newest
    const oldDiff = closes[j - day] - closes[j - day - 1];
    if (oldDiff > 0) sum_up -= oldDiff;
    else if (oldDiff < 0) sum_down += oldDiff; // oldDiff negative → subtract from sum_down

    const newDiff = closes[j] - closes[j - 1];
    if (newDiff > 0) sum_up += newDiff;
    else if (newDiff < 0) sum_down -= newDiff; // newDiff negative → add to sum_down

    const denom = sum_up + sum_down;
    const ANA = denom !== 0 ? (sum_up - sum_down) / denom : 0;

    ema_s = (esp1 - 1) / (esp1 + 1) * ema_s + 2 / (esp1 + 1) * ANA;
    ema_l = (esp2 - 1) / (esp2 + 1) * ema_l + 2 / (esp2 + 1) * ANA;
    mcclellanOsc[j] = ema_s - ema_l; // subtraction, not division
    SI[j] = (espSI - 1) / (espSI + 1) * SI[j - 1] + 2 / (espSI + 1) * mcclellanOsc[j];
  }

  return { mcclellanOsc, SI };
}