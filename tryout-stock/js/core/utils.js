/* TradeLite Trading App - Shared Utility Functions */

// LocalStorage utilities
function loadLS(key, fallback = null) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    return JSON.parse(stored);
  } catch (error) {
    console.warn(`Failed to load from localStorage (${key}):`, error);
    return fallback;
  }
}

function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save to localStorage (${key}):`, error);
  }
}

// Symbol validation and formatting
function isCryptoSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return false;
  const s = symbol.toUpperCase().trim();
  // Most crypto pairs end with USDT, BUSD, BTC, ETH, BNB
  return /^[A-Z0-9]+(?:USDT|BUSD|BTC|ETH|BNB|USD)$/.test(s);
}

function isStockSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return false;
  const s = symbol.toUpperCase().trim();
  // Stock symbols are typically 1-5 letters, no special suffixes
  return /^[A-Z]{1,5}$/.test(s) && !isCryptoSymbol(s);
}

function formatCryptoDisplay(symbol) {
  if (!symbol) return '';
  const s = symbol.toUpperCase();
  if (s.endsWith('USDT')) {
    return s.replace('USDT', '') + '/USDT';
  }
  if (s.endsWith('BUSD')) {
    return s.replace('BUSD', '') + '/BUSD';
  }
  if (s.endsWith('BTC')) {
    return s.replace('BTC', '') + '/BTC';
  }
  if (s.endsWith('ETH')) {
    return s.replace('ETH', '') + '/ETH';
  }
  return s;
}

function formatStockDisplay(symbol) {
  if (!symbol) return '';
  return symbol.toUpperCase();
}

// Price formatting
function formatCryptoPrice(price) {
  if (!isFinite(price) || price <= 0) return '—';
  if (price >= 1000) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  if (price >= 0.01) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
}

function formatStockPrice(price) {
  if (!isFinite(price) || price <= 0) return '—';
  return `$${price.toFixed(2)}`;
}

function formatMoney(value) {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  let formatted;
  
  if (abs >= 1000000) {
    formatted = (abs / 1000000).toFixed(2) + 'M';
  } else if (abs >= 1000) {
    formatted = (abs / 1000).toFixed(1) + 'K';
  } else if (abs >= 1) {
    formatted = abs.toFixed(2);
  } else {
    formatted = abs.toFixed(4);
  }
  
  return `${sign}$${formatted}`;
}

// Technical indicator calculations
function computeEMA(values, period) {
  if (!Array.isArray(values) || values.length < period) {
    return [];
  }
  
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

function computeMACD(values, fast = 12, slow = 26, signal = 9) {
  if (!Array.isArray(values) || values.length < slow + signal) {
    return { macd: [], signal: [], hist: [] };
  }
  
  const emaFast = computeEMA(values, fast);
  const emaSlow = computeEMA(values, slow);
  
  // Align arrays - MACD starts when both EMAs are available
  const startIndex = slow - 1; // 0-indexed
  const alignedLength = Math.min(emaFast.length, emaSlow.length);
  
  const macdLine = [];
  for (let i = 0; i < alignedLength; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }
  
  const signalLine = computeEMA(macdLine, signal);
  
  // Align MACD line with signal line
  const macdAligned = macdLine.slice(macdLine.length - signalLine.length);
  const histogram = macdAligned.map((macd, i) => macd - signalLine[i]);
  
  return {
    macd: macdAligned,
    signal: signalLine,
    hist: histogram
  };
}

// Time and date utilities
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// Market status utilities
function isMarketOpen() {
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const est = new Date(utc.getTime() - (5 * 3600000)); // EST offset
  
  const hour = est.getHours();
  const day = est.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Market hours: Monday-Friday 9:30 AM - 4:00 PM EST
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = hour >= 9.5 && hour < 16;
  
  return isWeekday && isMarketHours;
}

function getMarketStatus() {
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const est = new Date(utc.getTime() - (5 * 3600000)); // EST offset
  
  const hour = est.getHours();
  const day = est.getDay(); // 0 = Sunday, 6 = Saturday
  
  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = hour >= 9.5 && hour < 16;
  const isAfterHours = isWeekday && ((hour >= 16 && hour < 20) || (hour >= 4 && hour < 9.5));
  
  if (isWeekday && isMarketHours) {
    return { status: 'OPEN', color: '#15b37d' };
  } else if (isAfterHours) {
    return { status: 'AFTER HOURS', color: '#f59e0b' };
  } else {
    return { status: 'CLOSED', color: '#e5534b' };
  }
}

// Error handling utilities
function handleFetchError(error, context = 'API request') {
  console.error(`${context} failed:`, error);
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (error.name === 'AbortError') {
    return 'Request timed out. Please try again.';
  }
  return `${context} failed: ${error.message}`;
}

// DOM utilities
function createElement(tag, className = '', textContent = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (textContent) element.textContent = textContent;
  return element;
}

function addEventListenerSafe(element, event, handler) {
  if (element && typeof handler === 'function') {
    element.addEventListener(event, handler);
  }
}

// Validation utilities
function isValidNumber(value, min = 0, max = Infinity) {
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num) && num >= min && num <= max;
}

function sanitizeSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return '';
  return symbol.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
}

// Debug utilities
function logApiCall(method, url, status, data = null) {
  const emoji = status >= 200 && status < 300 ? '✅' : '❌';
  console.log(`${emoji} ${method} ${url} - Status: ${status}`);
  if (data && typeof data === 'object') {
    console.log('Response:', data);
  }
}

// Export for use in modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadLS, saveLS,
    isCryptoSymbol, isStockSymbol,
    formatCryptoDisplay, formatStockDisplay,
    formatCryptoPrice, formatStockPrice, formatMoney,
    computeEMA, computeMACD,
    formatTime, formatDate,
    isMarketOpen, getMarketStatus,
    handleFetchError,
    createElement, addEventListenerSafe,
    isValidNumber, sanitizeSymbol,
    logApiCall
  };
}