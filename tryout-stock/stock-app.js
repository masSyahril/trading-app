/* TradeLite Stock Market App - Stock only, no console */
(function () {
  const DEFAULT_STOCK_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA"];
  const DEFAULT_TIMEFRAME = "5d";
  const STOCK_LS_KEYS = {
    watchlist: "stock_watchlist",
    positions: "stock_positions",
    orders: "stock_orders",
    localCandles: "tl_local_candles"
  };

  let watchlist = loadLS(STOCK_LS_KEYS.watchlist, DEFAULT_STOCK_SYMBOLS);
  let positions = loadLS(STOCK_LS_KEYS.positions, {});
  let orders = loadLS(STOCK_LS_KEYS.orders, []);
  let localCandles = loadLS(STOCK_LS_KEYS.localCandles, {});

  let currentSymbol = watchlist[0] || "AAPL";
  let timeframe = DEFAULT_TIMEFRAME;
  const lastPrice = {};
  const changePct = {};
  let priceUpdateTimer = null;
  let chart = null;
  let candleSeries = null;
  let chartData = [];
  let indicatorSystem = null;
  let panelIds = [];
  let el = {};

  const API_BASE = '../api';
  try {
    const params = new URLSearchParams(window.location.search);
    const urlSym = (params.get('symbol') || '').toUpperCase().trim();
    if (urlSym && isStockSymbol(urlSym)) {
      currentSymbol = urlSym;
      if (!watchlist.includes(urlSym)) {
        watchlist.unshift(urlSym);
        saveLS(STOCK_LS_KEYS.watchlist, watchlist);
      }
    }
  } catch {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForLibrariesAndInit());
  } else {
    waitForLibrariesAndInit();
  }

  function waitForLibrariesAndInit() {
    if (typeof LightweightCharts !== 'undefined') {
      init();
    } else {
      let attempts = 0;
      const checkLibrary = setInterval(() => {
        attempts++;
        if (typeof LightweightCharts !== 'undefined') {
          clearInterval(checkLibrary);
          init();
        } else if (attempts >= 10) {
          clearInterval(checkLibrary);
        }
      }, 1000);
    }
  }

  function init() {
    setTimeout(() => {
      initializeDOMElements();
      if (!validateDOMElements()) return;
      setupEventHandlers();
      updateMarketStatus();
      updateMarketIndicators();
      setupChart();
      setupIndicatorSystem();
      setupChartControls();
      renderWatchlist();
      syncSymbolHeader();
      startPriceUpdates();
      loadCandlesAndDisplay(currentSymbol, timeframe);
      setInterval(updateMarketIndicators, 30000);
    }, 100);
  }

  function initializeDOMElements() {
    el = {
      watchlist: document.getElementById("watchlist"),
      symbolInput: document.getElementById("symbol-input"),
      addSymbol: document.getElementById("add-symbol"),
      resetData: document.getElementById("reset-data"),
      chart: document.getElementById("chart"),
      tfButtons: Array.from(document.querySelectorAll(".tab-btn")),
      indicatorCount: document.getElementById("indicator-count"),
      marketStatus: document.getElementById("market-status-tryout"),
    };
  }

  function validateDOMElements() {
    const requiredElements = ['watchlist', 'chart'];
    const missing = [];
    requiredElements.forEach(key => {
      if (!el[key]) missing.push(key);
    });
    if (missing.length > 0) return false;
    return true;
  }

  function setupEventHandlers() {
    if (el.addSymbol) el.addSymbol.addEventListener("click", addSymbolToWatchlist);
    if (el.symbolInput) {
      el.symbolInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") el.addSymbol?.click();
      });
    }
    if (el.resetData) el.resetData.addEventListener("click", resetTradingData);
    if (el.tfButtons && el.tfButtons.length > 0) {
      el.tfButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          el.tfButtons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          timeframe = btn.getAttribute("data-tf");
          loadCandlesAndDisplay(currentSymbol, timeframe);
        });
      });
    }
    setInterval(updateMarketStatus, 60000);
  }

  function updateMarketStatus() {
    const now = new Date();
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const est = new Date(utc.getTime() - (5 * 3600000));
    const hour = est.getHours();
    const day = est.getDay();
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 9.5 && hour < 16;
    const isAfterHours = isWeekday && ((hour >= 16 && hour < 20) || (hour >= 4 && hour < 9.5));
    const statusEl = el.marketStatus;
    if (!statusEl) return;
    const statusText = statusEl.querySelector('.status-text');
    const statusDot = statusEl.querySelector('.status-dot-compact');
    if (isWeekday && isMarketHours) {
      if (statusText) statusText.textContent = "Market Open";
      statusEl.className = "market-status-compact market-status-open";
      if (statusDot) statusDot.style.background = "#10b981";
    } else if (isAfterHours) {
      if (statusText) statusText.textContent = "After Hours";
      statusEl.className = "market-status-compact market-status-after";
      if (statusDot) statusDot.style.background = "#f59e0b";
    } else {
      if (statusText) statusText.textContent = "Market Closed";
      statusEl.className = "market-status-compact market-status-closed";
      if (statusDot) statusDot.style.background = "#ef4444";
    }
  }

  function updateMarketIndicators() {
    const updateIndicator = async (symbol, changeId) => {
      try {
        const response = await fetch(`${API_BASE}/stocks.php?symbol=${encodeURIComponent(symbol)}&latest=1`);
        if (!response.ok) return;
        const data = await response.json();
        if (!data || data.error) return;
        const changeEl = document.getElementById(changeId);
        if (changeEl && data.prevClose) {
          const change = ((data.last - data.prevClose) / data.prevClose) * 100;
          changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
          changeEl.className = change >= 0 ? "text-green-500" : "text-red-500";
        }
      } catch (error) {}
    };
    updateIndicator('^GSPC', 'sp-change');
    updateIndicator('^IXIC', 'nasdaq-change');
  }

  function addSymbolToWatchlist() {
    const raw = (el.symbolInput?.value || "").toUpperCase().trim();
    if (!raw) return;
    if (!isStockSymbol(raw)) {
      alert("Please enter a valid stock symbol (e.g., AAPL, GOOGL, TSLA)");
      return;
    }
    if (watchlist.includes(raw)) {
      focusSymbol(raw);
      el.symbolInput.value = "";
      return;
    }
    watchlist.push(raw);
    saveLS(STOCK_LS_KEYS.watchlist, watchlist);
    renderWatchlist();
    focusSymbol(raw);
    el.symbolInput.value = "";
  }

  function resetTradingData() {
    if (!confirm("Reset all stock trading data (positions, orders)? Watchlist will be kept.")) return;
    positions = {};
    orders = [];
    saveLS(STOCK_LS_KEYS.positions, positions);
    saveLS(STOCK_LS_KEYS.orders, orders);
  }

  function focusSymbol(sym) {
    if (!sym || !isStockSymbol(sym)) return;
    currentSymbol = sym;
    syncSymbolHeader();
    highlightActiveWatchlist();
    loadCandlesAndDisplay(currentSymbol, timeframe);
  }

  function syncSymbolHeader() {
    const title = document.getElementById("symbol-title");
    if (title) title.textContent = currentSymbol || "—";
  }

  function renderWatchlist() {
    if (!el.watchlist) return;
    el.watchlist.innerHTML = "";
    if (watchlist.length === 0) {
      const emptyMsg = document.createElement("li");
      emptyMsg.className = "wl-empty";
      emptyMsg.textContent = "No stocks in watchlist";
      el.watchlist.appendChild(emptyMsg);
      return;
    }
    watchlist.forEach((sym) => {
      const item = document.createElement("li");
      item.className = `wl-item${sym === currentSymbol ? " active" : ""}`;
      item.dataset.sym = sym;
      const lp = lastPrice[sym];
      const ch = changePct[sym];
      const priceDisplay = lp ? formatStockPrice(lp) : "—";
      const changeDisplay = ch != null ? `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%` : "—";
      const chgClass = ch == null ? "" : ch >= 0 ? " up" : " dn";
      item.innerHTML = `
        <div class="wl-row1">
          <span class="wl-sym">${sym}</span>
          <span class="wl-price">${priceDisplay}</span>
        </div>
        <div class="wl-row2">
          <span>${getCompanyName(sym)}</span>
          <span class="wl-chg${chgClass}">${changeDisplay}</span>
        </div>
      `;
      item.addEventListener("click", () => focusSymbol(sym));
      el.watchlist.appendChild(item);
    });
  }

  function getCompanyName(symbol) {
    const names = { 'AAPL': 'Apple', 'GOOGL': 'Google', 'MSFT': 'Microsoft', 'TSLA': 'Tesla', 'AMZN': 'Amazon', 'NVDA': 'NVIDIA' };
    return names[symbol] || symbol;
  }

  function highlightActiveWatchlist() {
    if (!el.watchlist) return;
    Array.from(el.watchlist.children).forEach((item) => {
      const sym = item.dataset.sym;
      if (!sym) return;
      if (sym === currentSymbol) item.classList.add("active");
      else item.classList.remove("active");
    });
  }

  function startPriceUpdates() {
    if (priceUpdateTimer) clearInterval(priceUpdateTimer);
    const now = new Date();
    const hour = now.getHours();
    const interval = (hour >= 9 && hour < 16) ? 15000 : 30000;
    priceUpdateTimer = setInterval(() => updateAllPrices(), interval);
    updateAllPrices();
  }

  async function updateAllPrices() {
    if (!watchlist.length) return;
    for (const symbol of watchlist) {
      try {
        await updateSymbolPrice(symbol);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {}
    }
    renderWatchlist();
    syncSymbolHeader();
  }

  async function updateSymbolPrice(symbol) {
    try {
      const response = await fetch(`${API_BASE}/stocks.php?symbol=${encodeURIComponent(symbol)}&latest=1`);
      if (!response.ok) return;
      const data = await response.json();
      if (!data || data.error) return;
      const currentPrice = data.last;
      const previousClose = data.prevClose || currentPrice;
      lastPrice[symbol] = currentPrice;
      changePct[symbol] = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
    } catch (error) {}
  }

  async function loadCandlesAndDisplay(symbol, tf) {
    chartData = [];
    if (candleSeries) candleSeries.setData([]);
    const local = localCandles[symbol];
    if (local && local.length) {
      chartData = local.slice().sort((a, b) => a.time - b.time);
      const chartCandles = chartData.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }));
      if (candleSeries) {
        candleSeries.setData(chartCandles);
        setTimeout(() => {
          if (chartData.length > 0) {
            const dataMax = chartData.length - 1;
            const visibleCandles = Math.min(40, chartData.length);
            try { chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, dataMax - visibleCandles + 1), to: dataMax }); } catch (e) {}
          }
        }, 100);
      }
      updateIndicators();
      lastPrice[symbol] = chartData[chartData.length - 1].close;
      syncSymbolHeader();
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/stocks.php?symbol=${encodeURIComponent(symbol)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.candles && data.candles.length) {
          chartData = data.candles.map(c => ({
            time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume ?? 0
          }));
          if (candleSeries) {
            candleSeries.setData(chartData.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
            setTimeout(() => {
              if (chartData.length > 0) {
                const dataMax = chartData.length - 1;
                const visibleCandles = Math.min(40, chartData.length);
                try { chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, dataMax - visibleCandles + 1), to: dataMax }); } catch (e) {}
              }
            }, 100);
          }
          updateIndicators();
          if (chartData.length > 0) lastPrice[symbol] = chartData[chartData.length - 1].close;
        } else {
          createMockStockData(symbol);
        }
      } else {
        createMockStockData(symbol);
      }
    } catch (error) {
      createMockStockData(symbol);
    }
    syncSymbolHeader();
  }

  function createMockStockData(symbol) {
    const basePrice = getBasePriceForSymbol(symbol);
    const now = Math.floor(Date.now() / 1000);
    const oneDaySeconds = 24 * 60 * 60;
    chartData = [];
    let price = basePrice;
    for (let i = 30; i >= 0; i--) {
      const time = now - (i * oneDaySeconds);
      const volatility = basePrice * 0.03;
      const change = (Math.random() - 0.5) * volatility;
      const open = price;
      const high = price + Math.random() * volatility * 0.5;
      const low = price - Math.random() * volatility * 0.5;
      price = Math.max(low, Math.min(high, price + change));
      chartData.push({ time, open, high, low, close: price, volume: Math.floor(Math.random() * 10000000) + 1000000 });
    }
    if (candleSeries) {
      candleSeries.setData(chartData);
      setTimeout(() => {
        if (chartData.length > 0) {
          const dataMax = chartData.length - 1;
          const visibleCandles = Math.min(40, chartData.length);
          try { chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, dataMax - visibleCandles + 1), to: dataMax }); } catch (e) {}
        }
      }, 50);
    }
    updateIndicators();
    lastPrice[symbol] = price;
    changePct[symbol] = (Math.random() - 0.5) * 6;
  }

  function getBasePriceForSymbol(symbol) {
    const prices = { 'AAPL': 150, 'GOOGL': 2800, 'MSFT': 300, 'TSLA': 200, 'AMZN': 3000, 'NVDA': 450, 'META': 280, 'NFLX': 400 };
    return prices[symbol] || 100;
  }

  function isTradingViewTryoutTheme() {
    try {
      return document.documentElement.dataset.tryoutChartTheme === 'tradingview';
    } catch (e) {
      return false;
    }
  }

  function setupChart() {
    try {
      if (typeof LightweightCharts === 'undefined') throw new Error('LightweightCharts library not loaded');
      if (!el.chart) throw new Error('Chart container element not found');
      const tv = isTradingViewTryoutTheme();
      const layoutBg = tv ? '#131722' : '#020617';
      const textColor = tv ? '#d1d4dc' : '#e2e8f0';
      const gridColor = tv ? '#363c4e' : '#1e293b';
      const scaleBorder = tv ? '#2a2e39' : '#334155';
      const up = tv ? '#089981' : '#10b981';
      const down = tv ? '#f23645' : '#ef4444';
      chart = LightweightCharts.createChart(el.chart, {
        layout: { background: { color: layoutBg }, textColor },
        grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
        rightPriceScale: { borderColor: scaleBorder, minimumWidth: (typeof MultiIndicatorSystem !== 'undefined' && MultiIndicatorSystem.PRICE_SCALE_ALIGN_WIDTH) || 56 },
        timeScale: { borderColor: scaleBorder, timeVisible: true, secondsVisible: false, rightOffset: 8, barSpacing: 6, fixLeftEdge: true, fixRightEdge: true, lockVisibleTimeRangeOnResize: true },
        crosshair: { mode: 0 },
        autoSize: true,
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      });
      try {
        const alignW = (typeof MultiIndicatorSystem !== 'undefined' && MultiIndicatorSystem.PRICE_SCALE_ALIGN_WIDTH) || 56;
        chart.priceScale('right').applyOptions({ minimumWidth: alignW });
      } catch (e) {}
      candleSeries = chart.addCandlestickSeries({
        upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down,
      });
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            clearTimeout(window.chartResizeTimeout);
            window.chartResizeTimeout = setTimeout(() => {
              try {
                chart.resize(width, height);
                if (indicatorSystem && typeof indicatorSystem.syncIndicatorChartWidths === 'function') indicatorSystem.syncIndicatorChartWidths(el.chart);
              } catch (error) {}
            }, 100);
          }
        }
      });
      resizeObserver.observe(el.chart);
    } catch (error) {
      if (el.chart) el.chart.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444; font-family: monospace;">Chart Error</div>`;
    }
  }

  function setupIndicatorSystem() {
    try {
      if (typeof MultiIndicatorSystem === 'undefined') return;
      indicatorSystem = new MultiIndicatorSystem();
      if (chart) indicatorSystem.setMainTimeScale(chart.timeScale(), chart);
      const defaultIndicators = ['MACD', 'STOCH', 'VOLUME'];
      const container = document.getElementById('indicators-container');
      if (container) {
        defaultIndicators.forEach((indicator, index) => {
          const panelId = `indicator-panel-${index}`;
          panelIds.push(panelId);
          indicatorSystem.createIndicatorPanel(panelId, 'indicators-container', indicator);
        });
        updateIndicatorCount();
        if (el.chart && typeof indicatorSystem.syncIndicatorChartWidths === 'function') {
          indicatorSystem.syncIndicatorChartWidths(el.chart);
          setTimeout(() => indicatorSystem.syncIndicatorChartWidths(el.chart), 150);
        }
      }
      setupAddIndicatorButton();
      const MAX_INDICATORS = 5;
      const originalRemovePanel = indicatorSystem.removePanel.bind(indicatorSystem);
      indicatorSystem.removePanel = function(panelId) {
        originalRemovePanel(panelId);
        const index = panelIds.indexOf(panelId);
        if (index > -1) panelIds.splice(index, 1);
        updateIndicatorCount();
        const addBtn = document.getElementById('add-indicator-btn');
        if (addBtn && panelIds.length < MAX_INDICATORS) {
          addBtn.disabled = false;
          addBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          addBtn.title = 'Add New Indicator';
        }
      };
    } catch (error) {}
  }

  function updateIndicatorCount() {
    if (el.indicatorCount) {
      const container = document.getElementById('indicators-container');
      if (container) {
        const totalPanels = container.querySelectorAll('.indicator-panel').length;
        const visiblePanels = container.querySelectorAll('.indicator-panel:not(.minimized)').length;
        el.indicatorCount.textContent = `Indicators (${visiblePanels}/${totalPanels})`;
      } else {
        el.indicatorCount.textContent = `Indicators (${panelIds.length})`;
      }
    }
  }

  function setupAddIndicatorButton() {
    const addBtn = document.getElementById('add-indicator-btn');
    if (!addBtn) return;
    addBtn.addEventListener('click', () => {
      const container = document.getElementById('indicators-container');
      if (!container) return;
      const MAX_INDICATORS = 5;
      if (panelIds.length >= MAX_INDICATORS) {
        alert(`Maximum ${MAX_INDICATORS} indicators allowed. Please remove one before adding another.`);
        return;
      }
      const newIndex = panelIds.length;
      const panelId = `indicator-panel-${newIndex}`;
      panelIds.push(panelId);
      if (indicatorSystem) {
        const panel = indicatorSystem.createIndicatorPanel(panelId, 'indicators-container', 'RSI');
        if (panel && chartData.length) indicatorSystem.updateSinglePanel(panelId);
        updateIndicatorCount();
        if (el.chart && typeof indicatorSystem.syncIndicatorChartWidths === 'function') indicatorSystem.syncIndicatorChartWidths(el.chart);
        if (panelIds.length >= MAX_INDICATORS) {
          addBtn.disabled = true;
          addBtn.classList.add('opacity-50', 'cursor-not-allowed');
          addBtn.title = `Maximum ${MAX_INDICATORS} indicators reached`;
        }
      }
    });
  }

  function setupChartControls() {
    const btnLeft = document.getElementById('btn-pan-left');
    const btnRight = document.getElementById('btn-pan-right');
    const btnReset = document.getElementById('btn-reset-view');
    const btnJumpFirst = document.getElementById('btn-jump-first');
    const btnJumpLast = document.getElementById('btn-jump-last');
    if (!btnLeft || !btnRight) return;
    const getRange = () => chart?.timeScale().getVisibleLogicalRange();
    const setRangeBoth = (range) => {
      if (!range || !chart) return;
      try { chart.timeScale().setVisibleLogicalRange(range); } catch (e) {}
    };
    btnLeft.addEventListener('click', () => adjustPan(-0.15));
    btnRight.addEventListener('click', () => adjustPan(0.15));
    btnReset?.addEventListener('click', () => resetToDefaultView());
    if (btnJumpFirst) btnJumpFirst.addEventListener('click', jumpToFirst);
    if (btnJumpLast) btnJumpLast.addEventListener('click', jumpToLast);

    function resetToDefaultView() {
      if (!chartData.length) return;
      const dataMax = chartData.length - 1;
      const defaultVisibleCandles = Math.min(40, chartData.length);
      setRangeBoth({ from: Math.max(0, dataMax - defaultVisibleCandles + 1), to: dataMax });
    }

    function jumpToFirst() {
      if (!chartData || chartData.length === 0 || !chart) return;
      const firstTime = chartData[0].time;
      const lastTime = chartData[chartData.length - 1].time;
      let endTime = firstTime;
      if (chartData.length > 1) {
        const candleDuration = chartData[1].time - chartData[0].time;
        endTime = firstTime + (candleDuration * 40);
      }
      if (endTime > lastTime) endTime = lastTime;
      try { chart.timeScale().setVisibleRange({ from: firstTime, to: endTime }); } catch (e) {}
    }

    function jumpToLast() {
      if (!chartData || chartData.length === 0 || !chart) return;
      const firstTime = chartData[0].time;
      const lastTime = chartData[chartData.length - 1].time;
      let startTime = lastTime;
      if (chartData.length > 1) {
        const candleDuration = chartData[1].time - chartData[0].time;
        startTime = lastTime - (candleDuration * 40);
      }
      if (startTime < firstTime) startTime = firstTime;
      try { chart.timeScale().setVisibleRange({ from: startTime, to: lastTime }); } catch (e) {}
    }

    function adjustPan(deltaFraction) {
      const r = getRange();
      if (!r || !chartData.length) return;
      const dataMin = 0;
      const dataMax = chartData.length - 1;
      const span = (r.to - r.from);
      const shift = span * deltaFraction;
      let newFrom = r.from + shift;
      let newTo = r.to + shift;
      if (newFrom < dataMin) { newFrom = dataMin; newTo = dataMin + span; }
      if (newTo > dataMax) { newTo = dataMax; newFrom = dataMax - span; if (newFrom < dataMin) { newFrom = dataMin; newTo = Math.min(dataMin + span, dataMax); } }
      setRangeBoth({ from: Math.max(dataMin, newFrom), to: Math.min(dataMax, newTo) });
    }
  }

  function updateIndicators() {
    if (!indicatorSystem || !chartData.length) return;
    try { indicatorSystem.updateAllPanels(chartData); } catch (error) {}
  }

  function isStockSymbol(sym) {
    return sym && typeof sym === 'string' && sym.length >= 1 && sym.length <= 5 && /^[A-Z]+$/.test(sym) && !sym.endsWith('USDT') && !sym.endsWith('BUSD');
  }

  function formatStockPrice(price) {
    if (!isFinite(price)) return "—";
    return `$${price.toFixed(2)}`;
  }

  function saveLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (error) {}
  }

  function loadLS(key, fallback) {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
  }

  window.stockApp = { watchlist, positions, orders, localCandles, lastPrice, changePct, loadLS, saveLS, STOCK_LS_KEYS };
})();
