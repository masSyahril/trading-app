/**
 * Prints createIndicatorDefinitions() object entries. Run from tryout-stock:
 *   node scripts/gen-indicator-defs-snippet.js > /tmp/defs.txt
 */
const defs = [
  ['ADI', 'ADI', 'oscillator', { period: 14 }, { period: 'Period' }, 15, 'this.computeADIIndicator(data, params.period)', 'renderADI'],
  ['ADO', 'ADO', 'oscillator', {}, {}, 2, 'this.computeADOIndicator(data)', 'renderADO'],
  ['ADX', 'ADX', 'oscillator', { period: 14 }, { period: 'Period' }, 20, 'this.computeADX(data, params.period)', 'renderADX'],
  ['ALLIGATOR', 'Alligator', 'oscillator', { day: 10 }, { day: 'Day' }, 10, 'this.computeAlligatorIndicator(data, params.day)', 'renderAlligator'],
  ['ARBR', 'AR / BR', 'oscillator', { period: 26 }, { period: 'Period' }, 27, 'this.computeARBRIndicator(data, params.period)', 'renderARBR'],
  ['ATR', 'ATR', 'oscillator', { period: 14 }, { period: 'Period' }, 15, 'this.computeATRIndicator(data, params.period)', 'renderATR'],
  ['BBI', 'BBI (3/6/12/24)', 'oscillator', { short: 3, shortMed: 6, medLong: 12, long: 24 }, { short: 'MA3', shortMed: 'MA6', medLong: 'MA12', long: 'MA24' }, 24, 'this.computeBBIIndicator(data, { short: params.short, shortMed: params.shortMed, medLong: params.medLong, long: params.long })', 'renderBBI'],
  ['BBI3', 'BBI-3 (MA avg)', 'oscillator', { day1: 3, day2: 6, day3: 12 }, { day1: 'Day1', day2: 'Day2', day3: 'Day3' }, 12, 'this.computeBBI3(data, params.day1, params.day2, params.day3)', 'renderBBI3'],
  ['BBI3RR', 'BBI-3 RR', 'oscillator', { day1: 3, day2: 6, day3: 12 }, { day1: 'Day1', day2: 'Day2', day3: 'Day3' }, 12, 'this.computeBBI3RR(data, params.day1, params.day2, params.day3)', 'renderBBI3'],
  ['BBI4', 'BBI-4 (MA avg)', 'oscillator', { day1: 3, day2: 6, day3: 12, day4: 24 }, { day1: 'Day1', day2: 'Day2', day3: 'Day3', day4: 'Day4' }, 24, 'this.computeBBI4(data, params.day1, params.day2, params.day3, params.day4)', 'renderBBI4'],
  ['BBI4RR', 'BBI-4 RR', 'oscillator', { day1: 3, day2: 6, day3: 12, day4: 24 }, { day1: 'Day1', day2: 'Day2', day3: 'Day3', day4: 'Day4' }, 24, 'this.computeBBI4RR(data, params.day1, params.day2, params.day3, params.day4)', 'renderBBI4'],
  ['BBI5', 'BBI-5 (MA avg)', 'oscillator', { day1: 3, day2: 6, day3: 12, day4: 24, day5: 48 }, { day1: 'Day1', day2: 'Day2', day3: 'Day3', day4: 'Day4', day5: 'Day5' }, 48, 'this.computeBBI5(data, params.day1, params.day2, params.day3, params.day4, params.day5)', 'renderBBI5'],
  ['BBI5RR', 'BBI-5 RR', 'oscillator', { day1: 3, day2: 6, day3: 12, day4: 24, day5: 48 }, { day1: 'Day1', day2: 'Day2', day3: 'Day3', day4: 'Day4', day5: 'Day5' }, 48, 'this.computeBBI5RR(data, params.day1, params.day2, params.day3, params.day4, params.day5)', 'renderBBI5'],
  ['BIAS', 'BIAS', 'oscillator', { day1: 6, day2: 12 }, { day1: 'MA Short', day2: 'MA Long' }, 12, 'this.computeBIAS(data, params.day1, params.day2)', 'renderBIAS'],
  ['BOLLINGER4SD', 'Bollinger 4SD', 'oscillator', { MA_day: 10, SD_day: 20 }, { MA_day: 'MA Days', SD_day: 'SD Days' }, 30, 'this.computeBollingerBands4SDIndicator(data, params.MA_day, params.SD_day)', 'renderBollingerBands4SD'],
  ['BULL_BEAR', 'Bull/Bear Power', 'oscillator', { period: 13 }, { period: 'Period' }, 14, 'this.computeBullBearPowerIndicator(data, params.period)', 'renderBullBearPower'],
  ['CCI', 'CCI', 'oscillator', { period: 20 }, { period: 'Period' }, 21, 'this.computeCCI(data, params.period)', 'renderCCI'],
  ['COPPOCK', 'Coppock', 'oscillator', { short_day: 10, long_day: 20, weight_day: 10 }, { short_day: 'Short', long_day: 'Long', weight_day: 'Weight' }, 25, 'this.computeCoppockCurve(data, params.short_day, params.long_day, params.weight_day)', 'renderCoppockCurve'],
  ['CR', 'CR', 'oscillator', { period: 26 }, { period: 'Period' }, 27, 'this.computeCRIndicator(data, params.period)', 'renderCR'],
  ['DEMA', 'DEMA', 'oscillator', { period: 20 }, { period: 'Period' }, 21, 'this.computeDEMAIndicator(data, params.period)', 'renderDEMA'],
  ['DMA', 'DMA / AMA', 'oscillator', { short_day: 10, long_day: 20, ema_n: 9 }, { short_day: 'Short', long_day: 'Long', ema_n: 'EMA n' }, 25, 'this.computeDMAIndicator(data, params.short_day, params.long_day, params.ema_n)', 'renderDMA'],
  ['DPO', 'DPO / eDPO', 'oscillator', { MA_day: 20 }, { MA_day: 'MA Days' }, 22, 'this.computeDPOIndicator(data, params.MA_day)', 'renderDPO'],
  ['DUAL_CR', 'Dual CR', 'oscillator', { periodA: 10, periodB: 26 }, { periodA: 'CR A', periodB: 'CR B' }, 27, 'this.computeDualCR(data, params.periodA, params.periodB)', 'renderDualCR'],
  ['EOM', 'EOM / eEOM', 'oscillator', {}, {}, 2, 'this.computeEOMIndicator(data)', 'renderEOM'],
  ['HLO', 'HLO / HLOs', 'oscillator', { period: 14 }, { period: 'Period' }, 15, 'this.computeHLOIndicator(data, params.period)', 'renderHLO'],
  ['HULL_MA', 'Hull MA', 'oscillator', { day: 10, ema_n: 9 }, { day: 'Period', ema_n: 'EMA n' }, 15, 'this.computeHullMAIndicator(data, params.day, params.ema_n)', 'renderHullMA'],
  ['ICHIMOKU', 'Ichimoku', 'oscillator', { tenkan: 9, kijun: 26, senkouB: 52 }, { tenkan: 'Tenkan', kijun: 'Kijun', senkouB: 'Senkou B' }, 55, 'this.computeIchimokuIndicator(data, params.tenkan, params.kijun, params.senkouB)', 'renderIchimoku'],
  ['IMI', 'IMI', 'oscillator', { day1: 10, day2: 20 }, { day1: 'Day1', day2: 'Day2' }, 22, 'this.computeIMIIndicator(data, params.day1, params.day2)', 'renderIMI'],
  ['M3', 'M3 / eM3', 'oscillator', { num: 9 }, { num: 'Period' }, 10, 'this.computeM3Indicator(data, params.num)', 'renderM3'],
  ['MACD', 'MACD', 'oscillator', { fast: 12, slow: 26, signal: 9 }, { fast: 'Fast', slow: 'Slow', signal: 'Signal' }, 26, 'this.computeMACD(data, params.fast, params.slow, params.signal)', 'renderMACD'],
  ['MA_OSC', 'MA (subchart)', 'oscillator', { period: 20, maType: 'SMA' }, { period: 'Period', maType: 'Type' }, 21, 'this.computeMA(data, params.period, params.maType)', 'renderMA'],
  ['MBIAS', 'MBIAS', 'oscillator', { day1: 6, day2: 12 }, { day1: 'MA Short', day2: 'MA Long' }, 12, 'this.computeMBIAS(data, params.day1, params.day2)', 'renderMBIAS'],
  ['MFI', 'MFI', 'oscillator', { period: 14 }, { period: 'Period' }, 16, 'this.computeMFI(data, params.period)', 'renderMFI'],
  ['MOMENTUM', 'Momentum', 'oscillator', { period: 10 }, { period: 'Period' }, 11, 'this.computeMomentum(data, params.period)', 'renderMomentum'],
  ['MTM', 'MTM', 'oscillator', { day1: 10, day2: 20 }, { day1: 'Day1', day2: 'Day2' }, 22, 'this.computeMTMIndicator(data, params.day1, params.day2)', 'renderMTM'],
  ['NEW_KD', 'New KD (K/D/K2/D2)', 'oscillator', { kdDay: 9, kd2Day: 9 }, { kdDay: 'KD Period', kd2Day: 'K2/D2 Freq' }, 9, 'this.computeNewKD(data, params.kdDay, params.kd2Day)', 'renderNewKD'],
  ['OBV', 'OBV (simple)', 'oscillator', {}, {}, 2, 'this.computeOBV(data)', 'renderOBV'],
  ['OBV_ALT', 'OBV / eOBV', 'oscillator', {}, {}, 2, 'this.computeOBVIndicator(data)', 'renderOBV'],
  ['OSC', 'OSC', 'oscillator', { period: 20 }, { period: 'MA Period' }, 20, 'this.computeOSC(data, params.period)', 'renderOSC'],
  ['PARABOLIC_SAR', 'Parabolic SAR', 'oscillator', { acceleration: 0.02, maximum: 0.2 }, { acceleration: 'Accel', maximum: 'Max' }, 5, 'this.computeParabolicSARIndicator(data, params.acceleration, params.maximum)', 'renderParabolicSAR'],
  ['PVI_RISE_FALL', 'PVI % Rise/Fall', 'oscillator', { day: 10, esp: 10 }, { day: 'Day', esp: 'Smooth' }, 12, 'this.computePVIpercentRiseFallIndicator(data, params.day, params.esp)', 'renderPVIpercentRiseFall'],
  ['PVT', 'PVT / ePVT', 'oscillator', {}, {}, 2, 'this.computePVTIndicator(data)', 'renderPVT'],
  ['QSTICK', 'Qstick', 'oscillator', { day1: 10, day2: 20 }, { day1: 'Day1', day2: 'Day2' }, 22, 'this.computeQstickIndicator(data, params.day1, params.day2)', 'renderQstick'],
  ['ADR', 'ADR', 'oscillator', { period: 20 }, { period: 'Period' }, 21, 'this.computeADRIndicator(data, params.period)', 'renderADR'],
  ['REX', 'REX / TVB', 'oscillator', { esp: 9, parameters: 10 }, { esp: 'EMA', parameters: 'Param' }, 12, 'this.computeREXOscillatorIndicator(data, params.esp, params.parameters)', 'renderREXOscillator'],
  ['ROC_DUAL', 'ROC (dual)', 'oscillator', { day1: 10, day2: 20 }, { day1: 'ROC1 Days', day2: 'ROC2 Days' }, 21, 'this.computeROCIndicator(data, params.day1, params.day2)', 'renderROC'],
  ['ROC', 'ROC (single)', 'oscillator', { period: 10 }, { period: 'Period' }, 11, 'this.computeROC(data, params.period)', 'renderROCSingle'],
  ['RSI', 'RSI (Dual)', 'oscillator', { periodA: 5, periodB: 10 }, { periodA: 'RSI A', periodB: 'RSI B' }, 5, 'this.computeDualRSI(data, params.periodA, params.periodB)', 'renderDualRSI'],
  ['RWI', 'Random Walk Index', 'oscillator', { RWI_n: 10, esp: 9 }, { RWI_n: 'RWI n', esp: 'ATR EMA' }, 12, 'this.computeRandomWalkingIndex(data, params.RWI_n, params.esp)', 'renderRandomWalkingIndex'],
  ['STOCH', 'Stochastic', 'oscillator', { kPeriod: 14, dPeriod: 3 }, { kPeriod: '%K', dPeriod: '%D' }, 14, 'this.computeStochastic(data, params.kPeriod, params.dPeriod)', 'renderStochastic'],
  ['SYARBR', 'SY AR/BR', 'oscillator', { period: 26 }, { period: 'Period' }, 27, 'this.computeSYARBRIndicator(data, params.period)', 'renderSYBR'],
  ['UOSC', 'UOSC', 'oscillator', { maPeriod: 10, oscPeriod: 5 }, { maPeriod: 'MA Period', oscPeriod: 'OSC MA' }, 15, 'this.computeUOSC(data, params.maPeriod, params.oscPeriod)', 'renderUOSC'],
  ['VAO', 'VAO', 'oscillator', {}, {}, 2, 'this.computeVAOIndicator(data)', 'renderVAO'],
  ['VHF', 'VHF / VHFs', 'oscillator', { period: 14 }, { period: 'Period' }, 15, 'this.computeVHFIndicator(data, params.period)', 'renderVHF'],
  ['VOLMA_OSC', 'Vol MA', 'oscillator', { period: 20 }, { period: 'Period' }, 21, 'this.computeVolMAIndicator(data, params.period)', 'renderVolMA'],
  ['VOL_RSI', 'Volume RSI', 'oscillator', { period: 10, esp: 9 }, { period: 'RSI Period', esp: 'eVol EMA' }, 12, 'this.computeVolumeRSI(data, params.period, params.esp)', 'renderVolumeRSI'],
  ['VR', 'Vol Ratio / eVR', 'oscillator', { period: 26, esp: 10 }, { period: 'Period', esp: 'Smooth' }, 28, 'this.computeVRIndicator(data, params.period, params.esp)', 'renderVR'],
  ['VROC', 'VROC', 'oscillator', { day1: 10, day2: 20 }, { day1: 'Day1', day2: 'Day2' }, 22, 'this.computeVROCIndicator(data, params.day1, params.day2)', 'renderVROC'],
  ['VOLUME', 'Volume', 'volume', { maPeriod: 20 }, { maPeriod: 'MA Period' }, 1, 'this.computeVolume(data, params)', 'renderVolume'],
  ['WANG_BBI', 'Wang BBI (line)', 'oscillator', { short: 3, shortMed: 6, medLong: 12, long: 24 }, { short: 'MA3', shortMed: 'MA6', medLong: 'MA12', long: 'MA24' }, 24, '{ const r = this.computeBBIIndicator(data, { short: params.short, shortMed: params.shortMed, medLong: params.medLong, long: params.long }); return r && r.bbi ? r.bbi : []; }', 'renderWangBBI'],
  ['WANG_BBI3', 'Wang BBI-3', 'oscillator', { d1: 3, d2: 6, d3: 12 }, { d1: 'D1', d2: 'D2', d3: 'D3' }, 12, 'this.computeWangBBI3(data, params.d1, params.d2, params.d3)', 'renderWangBBI3'],
  ['WANG_BBI4', 'Wang BBI-4', 'oscillator', { d1: 3, d2: 6, d3: 12, d4: 24 }, { d1: 'D1', d2: 'D2', d3: 'D3', d4: 'D4' }, 24, 'this.computeWangBBI4(data, params.d1, params.d2, params.d3, params.d4)', 'renderWangBBI4'],
  ['WANG_BBI5', 'Wang BBI-5', 'oscillator', { d1: 3, d2: 6, d3: 12, d4: 24, d5: 48 }, { d1: 'D1', d2: 'D2', d3: 'D3', d4: 'D4', d5: 'D5' }, 48, 'this.computeWangBBI5(data, params.d1, params.d2, params.d3, params.d4, params.d5)', 'renderWangBBI5'],
  ['WANG_BIAS', 'Wang BIAS', 'oscillator', { d1: 6, d2: 12 }, { d1: 'D1', d2: 'D2' }, 12, 'this.computeWangBIAS(data, params.d1, params.d2)', 'renderWangBIAS'],
  ['WANG_CCI', 'Wang CCI', 'oscillator', { period: 14 }, { period: 'Period' }, 15, 'this.computeWangCCI(data, params.period)', 'renderWangCCI'],
  ['WANG_KD', 'Wang KD', 'oscillator', { period: 9 }, { period: 'Period' }, 9, 'this.computeWangKD(data, params.period)', 'renderStochastic'],
  ['WANG_MBIAS', 'Wang MBIAS', 'oscillator', { d1: 6, d2: 12 }, { d1: 'D1', d2: 'D2' }, 12, 'this.computeWangMBIAS(data, params.d1, params.d2)', 'renderWangMBIAS'],
  ['WANG_OSC', 'Wang OSC', 'oscillator', { period: 20 }, { period: 'Period' }, 20, 'this.computeWangOSC(data, params.period)', 'renderWangOSC'],
  ['WANG_RSI', 'Wang RSI', 'oscillator', { period: 14 }, { period: 'Period' }, 15, 'this.computeWangRSI(data, params.period)', 'renderWangRSI'],
  ['WANG_UOSC', 'Wang UOSC', 'oscillator', { maPeriod: 10, num: 5 }, { maPeriod: 'MA Period', num: 'OSC MA' }, 15, 'this.computeWangUOSC(data, params.maPeriod, params.num)', 'renderWangUOSC'],
  ['WANG_WR', 'Williams %R (Wang)', 'oscillator', { period: 14 }, { period: 'Period' }, 14, 'this.computeWangWilliamsR(data, params.period)', 'renderWilliamsR'],
  ['WILLIAMS', 'Williams %R', 'oscillator', { period: 14 }, { period: 'Period' }, 14, 'this.computeWilliamsR(data, params.period)', 'renderWilliamsR'],
  ['ACC', 'ACC / MTM', 'oscillator', { MTM_n: 10, ACC_n: 10 }, { MTM_n: 'MTM n', ACC_n: 'ACC n' }, 12, 'this.computeACCIndicator(data, params.MTM_n, params.ACC_n)', 'renderACC'],
  ['BTI', 'BTI', 'oscillator', { day: 10 }, { day: 'Period' }, 11, 'this.computeBTIIndicator(data, params.day)', 'renderBTI'],
  ['COST_MA', 'Cost MA', 'oscillator', { day: 10 }, { day: 'Period' }, 11, 'this.computeCostMAIndicator(data, params.day)', 'renderCostMA'],
  ['KST', 'KST', 'oscillator', { day1: 10, day2: 15, day3: 20, day4: 30 }, { day1: 'D1', day2: 'D2', day3: 'D3', day4: 'D4' }, 32, 'this.computeKSTIndicator(data, params.day1, params.day2, params.day3, params.day4)', 'renderKST'],
  ['WAD', 'WAD / eWAD', 'oscillator', {}, {}, 2, 'this.computeWADIndicator(data)', 'renderWAD'],
];

let out = '';
for (const row of defs) {
  const [key, name, type, dp, pl, mp, computeBody, renderM] = row;
  out += `      ${key}: {\n`;
  out += `        name: ${JSON.stringify(name)},\n`;
  out += `        type: ${JSON.stringify(type)},\n`;
  out += `        defaultParams: ${JSON.stringify(dp)},\n`;
  out += `        paramLabels: ${JSON.stringify(pl)},\n`;
  out += `        minPeriod: ${mp},\n`;
  out += `        compute: (data, params) => ${computeBody},\n`;
  out += `        render: (chart, data, colors, seriesMap) => this.${renderM}(chart, data, colors, seriesMap)\n`;
  out += `      },\n`;
}
process.stdout.write(out);
