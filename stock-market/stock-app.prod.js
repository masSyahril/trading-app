/* TradeLite Stock Market App - Design 3 (TradeFlow Style) */
(function () {
  // Stock-specific configuration
  const DEFAULT_STOCK_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN", "NVDA"];
  const DEFAULT_TIMEFRAME = "5d";
  
  // Separate localStorage keys for stock trading
  const STOCK_LS_KEYS = {
    watchlist: "stock_watchlist",
    positions: "stock_positions", 
    orders: "stock_orders",
    localCandles: "tl_local_candles"
  };

  // State
  let watchlist = loadLS(STOCK_LS_KEYS.watchlist, DEFAULT_STOCK_SYMBOLS);
  let positions = loadLS(STOCK_LS_KEYS.positions, {});
  let orders = loadLS(STOCK_LS_KEYS.orders, []);
  let localCandles = loadLS(STOCK_LS_KEYS.localCandles, {});

  let currentSymbol = watchlist[0] || "AAPL";
  let timeframe = DEFAULT_TIMEFRAME;

  // Live prices for symbols in watchlist
  const lastPrice = {};
  const changePct = {};

  // Stock market polling
  let priceUpdateTimer = null;

  // Chart components
  let chart = null;
  let candleSeries = null;
  let chartData = [];

  // Multi-Indicator System
  let indicatorSystem = null;
  let panelIds = [];

  // DOM Elements
  let el = {};

  // Handle URL parameters
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

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      waitForLibrariesAndInit();
    });
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
          console.error('❌ LightweightCharts library failed to load');
          clearInterval(checkLibrary);
        }
      }, 1000);
    }
  }

  function init() {
    setTimeout(() => {
      initializeDOMElements();

      if (!validateDOMElements()) {
        console.error('❌ Critical DOM elements not found!');
        return;
      }

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
    };
  }
  
  function validateDOMElements() {
    const requiredElements = ['watchlist', 'chart'];
    const missing = [];
    
    requiredElements.forEach(key => {
      if (!el[key]) {
        missing.push(key);
        console.warn(`⚠️ Missing element: ${key}`);
      }
    });
    
    if (missing.length > 0) {
      console.error('❌ Missing required DOM elements:', missing);
    }
    return true;
  }

  function setupEventHandlers() {
    if (el.addSymbol) {
      el.addSymbol.addEventListener("click", addSymbolToWatchlist);
    }
    if (el.symbolInput) {
      el.symbolInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") el.addSymbol?.click();
      });
    }
    if (el.resetData) {
      el.resetData.addEventListener("click", resetTradingData);
    }

    if (el.tfButtons && el.tfButtons.length > 0) {
      el.tfButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          el.tfButtons.forEach((b) => {
            b.classList.remove("active", "text-blue-400", "bg-slate-700/50", "font-bold");
            b.classList.add("text-slate-400");
          });
          btn.classList.add("active", "text-blue-400", "bg-slate-700/50", "font-bold");
          btn.classList.remove("text-slate-400");
          timeframe = btn.getAttribute("data-tf");
          loadCandlesAndDisplay(currentSymbol, timeframe);
        });
      });
    }

    // Update market status every minute
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
      statusEl.className = "market-status-compact bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded";
      if (statusDot) statusDot.style.background = "#10b981";
    } else if (isAfterHours) {
      if (statusText) statusText.textContent = "After Hours";
      statusEl.className = "market-status-compact bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded";
      if (statusDot) statusDot.style.background = "#f59e0b";
    } else {
      if (statusText) statusText.textContent = "Market Closed";
      statusEl.className = "market-status-compact bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded";
      if (statusDot) statusDot.style.background = "#ef4444";
    }
  }
  
  function updateMarketIndicators() {
    const updateIndicator = async (symbol, changeId) => {
      try {
        const response = await fetch(`../api/stocks.php?symbol=${encodeURIComponent(symbol)}&latest=1`);
        if (!response.ok) return;
        const data = await response.json();
        if (!data || data.error) return;
        
        const changeEl = document.getElementById(changeId);
        if (changeEl && data.prevClose) {
          const change = ((data.last - data.prevClose) / data.prevClose) * 100;
          changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
          changeEl.className = change >= 0 ? "text-green-500" : "text-red-500";
        }
      } catch (error) {
        // Silently fail
      }
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
    // Stock info bar removed - no longer updating header elements
    // Price information is still tracked in lastPrice and changePct for internal use
  }

  function renderWatchlist() {
    if (!el.watchlist) return;
    el.watchlist.innerHTML = "";
    
    if (watchlist.length === 0) {
      const emptyMsg = document.createElement("li");
      emptyMsg.className = "p-4 text-center text-slate-400 text-sm";
      emptyMsg.textContent = "No stocks in watchlist";
      el.watchlist.appendChild(emptyMsg);
      return;
    }
    
    watchlist.forEach((sym) => {
      const item = document.createElement("li");
      item.className = `p-3 border-b border-slate-800 hover:bg-slate-800 cursor-pointer group ${sym === currentSymbol ? 'bg-slate-800' : ''}`;
      item.dataset.sym = sym;

      const lp = lastPrice[sym];
      const ch = changePct[sym];
      
      const priceDisplay = lp ? formatStockPrice(lp) : "—";
      const changeDisplay = ch != null ? `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%` : "—";
      const changeColor = ch != null ? (ch >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400';

      item.innerHTML = `
        <div class="flex justify-between items-start mb-1">
          <span class="font-bold text-white text-sm">${sym}</span>
          <span class="font-mono text-white text-sm">${priceDisplay}</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-slate-400">${getCompanyName(sym)}</span>
          <span class="${changeColor}">${changeDisplay}</span>
        </div>
      `;

      item.addEventListener("click", () => focusSymbol(sym));
      el.watchlist.appendChild(item);
    });
  }
  
  function getCompanyName(symbol) {
    const names = {
      'AAPL': 'Apple',
      'GOOGL': 'Google',
      'MSFT': 'Microsoft',
      'TSLA': 'Tesla',
      'AMZN': 'Amazon',
      'NVDA': 'NVIDIA'
    };
    return names[symbol] || symbol;
  }

  function highlightActiveWatchlist() {
    if (!el.watchlist) return;
    Array.from(el.watchlist.children).forEach((item) => {
      const sym = item.dataset.sym;
      if (sym === currentSymbol) {
        item.classList.add('bg-slate-800');
        item.classList.remove('hover:bg-slate-800');
      } else {
        item.classList.remove('bg-slate-800');
        item.classList.add('hover:bg-slate-800');
      }
    });
  }

  function startPriceUpdates() {
    if (priceUpdateTimer) {
      clearInterval(priceUpdateTimer);
    }

    const now = new Date();
    const hour = now.getHours();
    const isMarketHours = hour >= 9 && hour < 16;
    const interval = isMarketHours ? 15000 : 30000;

    priceUpdateTimer = setInterval(() => {
      updateAllPrices();
    }, interval);

    updateAllPrices();
  }

  async function updateAllPrices() {
    if (!watchlist.length) return;
    for (const symbol of watchlist) {
      try {
        await updateSymbolPrice(symbol);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Silently fail
      }
    }

    renderWatchlist();
    syncSymbolHeader();
  }

  async function updateSymbolPrice(symbol) {
    try {
      const response = await fetch(`../api/stocks.php?symbol=${encodeURIComponent(symbol)}&latest=1`);
      if (!response.ok) return;

      const data = await response.json();
      if (!data || data.error) return;

      const currentPrice = data.last;
      const previousClose = data.prevClose || currentPrice;
      
      lastPrice[symbol] = currentPrice;
      changePct[symbol] = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
      
    } catch (error) {
      // Silently fail
    }
  }

  async function loadCandlesAndDisplay(symbol, tf) {
    chartData = [];
    if (candleSeries) {
      candleSeries.setData([]);
    }

    const local = localCandles[symbol];
    if (local && local.length) {
      chartData = local.slice().sort((a, b) => a.time - b.time);
      const chartCandles = chartData.map(c => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }));
      
      if (candleSeries) {
        candleSeries.setData(chartCandles);
        setTimeout(() => {
          if (chartData.length > 0) {
            const dataMax = chartData.length - 1;
            const visibleCandles = Math.min(40, chartData.length);
            const range = {
              from: Math.max(0, dataMax - visibleCandles + 1),
              to: dataMax
            };
            try {
              chart.timeScale().setVisibleLogicalRange(range);
            } catch (e) {}
          }
        }, 100);
      }
      updateIndicators();
      lastPrice[symbol] = chartData[chartData.length - 1].close;
      syncSymbolHeader();
      return;
    }

    try {
      const response = await fetch(`../api/stocks.php?symbol=${encodeURIComponent(symbol)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.candles && data.candles.length) {
          chartData = data.candles.map(c => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume ?? 0,
          }));
          
          if (candleSeries) {
            candleSeries.setData(chartData.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
            
            setTimeout(() => {
              if (chartData.length > 0) {
                const dataMax = chartData.length - 1;
                const visibleCandles = Math.min(40, chartData.length);
                const range = {
                  from: Math.max(0, dataMax - visibleCandles + 1),
                  to: dataMax
                };
                try {
                  chart.timeScale().setVisibleLogicalRange(range);
                } catch (e) {}
              }
            }, 100);
          }
          updateIndicators();

          if (chartData.length > 0) {
            lastPrice[symbol] = chartData[chartData.length - 1].close;
          }
        }
      } else {
        createMockStockData(symbol);
      }
    } catch (error) {
      console.error(`❌ Error loading ${symbol} data:`, error);
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
      
      chartData.push({
        time,
        open,
        high,
        low,
        close: price,
        volume: Math.floor(Math.random() * 10000000) + 1000000
      });
    }

    if (candleSeries) {
      candleSeries.setData(chartData);
      setTimeout(() => {
        if (chartData.length > 0) {
          const dataMax = chartData.length - 1;
          // Show last 40 candles by default (good balance for analysis)
          const visibleCandles = Math.min(40, chartData.length);
          const newRange = {
            from: Math.max(0, dataMax - visibleCandles + 1),
            to: dataMax
          };
          try {
            chart.timeScale().setVisibleLogicalRange(newRange);
          } catch (e) {}
        }
      }, 50);
    }
    updateIndicators();
    lastPrice[symbol] = price;
    changePct[symbol] = (Math.random() - 0.5) * 6;
  }

  function getBasePriceForSymbol(symbol) {
    const prices = {
      'AAPL': 150, 'GOOGL': 2800, 'MSFT': 300, 'TSLA': 200,
      'AMZN': 3000, 'NVDA': 450, 'META': 280, 'NFLX': 400
    };
    return prices[symbol] || 100;
  }

  function setupChart() {
    try {
      if (typeof LightweightCharts === 'undefined') {
        throw new Error('LightweightCharts library not loaded');
      }

      if (!el.chart) {
        throw new Error('Chart container element not found');
      }
      
      chart = LightweightCharts.createChart(el.chart, {
        layout: {
          background: { color: "#020617" },
          textColor: "#e2e8f0",
        },
        grid: {
          vertLines: { color: "#1e293b" },
          horzLines: { color: "#1e293b" },
        },
        rightPriceScale: {
          borderColor: "#334155",
          minimumWidth: (typeof MultiIndicatorSystem !== 'undefined' && MultiIndicatorSystem.PRICE_SCALE_ALIGN_WIDTH) || 56,
        },
        timeScale: {
          borderColor: "#334155",
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 8,
          barSpacing: 6,
          fixLeftEdge: true,
          fixRightEdge: true,
          lockVisibleTimeRangeOnResize: true,
        },
        crosshair: {
          mode: 0,
        },
        autoSize: true,
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      try {
        const alignW = (typeof MultiIndicatorSystem !== 'undefined' && MultiIndicatorSystem.PRICE_SCALE_ALIGN_WIDTH) || 56;
        chart.priceScale('right').applyOptions({ minimumWidth: alignW });
      } catch (e) {}

      candleSeries = chart.addCandlestickSeries({
        upColor: "#10b981",
        downColor: "#ef4444",
        borderUpColor: "#10b981",
        borderDownColor: "#ef4444",
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            clearTimeout(window.chartResizeTimeout);
            window.chartResizeTimeout = setTimeout(() => {
              try {
                chart.resize(width, height);
                if (indicatorSystem && typeof indicatorSystem.syncIndicatorChartWidths === 'function') {
                  indicatorSystem.syncIndicatorChartWidths(el.chart);
                }
              } catch (error) {}
            }, 100);
          }
        }
      });
      resizeObserver.observe(el.chart);
    } catch (error) {
      console.error('❌ Failed to setup stock chart:', error);
      if (el.chart) {
        el.chart.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444; font-family: monospace;">Chart Error: ${error.message}</div>`;
      }
    }
  }

  function setupIndicatorSystem() {
    try {
      if (typeof MultiIndicatorSystem === 'undefined') {
        console.error('Stock app: MultiIndicatorSystem class not loaded');
        return;
      }
      indicatorSystem = new MultiIndicatorSystem();
      if (chart) {
        indicatorSystem.setMainTimeScale(chart.timeScale(), chart);
      }
      
      // Create exactly 3 default indicators (always show 3)
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
      
      // Override removePanel to update button state
      const MAX_INDICATORS = 5;
      const originalRemovePanel = indicatorSystem.removePanel.bind(indicatorSystem);
      indicatorSystem.removePanel = function(panelId) {
        originalRemovePanel(panelId);
        // Remove from panelIds array
        const index = panelIds.indexOf(panelId);
        if (index > -1) {
          panelIds.splice(index, 1);
        }
        updateIndicatorCount();
        
        // Re-enable add button if we're below max
        const addBtn = document.getElementById('add-indicator-btn');
        if (addBtn && panelIds.length < MAX_INDICATORS) {
          addBtn.disabled = false;
          addBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          addBtn.title = 'Add New Indicator';
        }
      };
    } catch (error) {
      console.error('❌ Stock app: Failed to setup indicator system:', error);
    }
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
      
      // Maximum of 5 indicators allowed
      const MAX_INDICATORS = 5;
      
      if (panelIds.length >= MAX_INDICATORS) {
        alert(`Maximum ${MAX_INDICATORS} indicators allowed. Please remove one before adding another.`);
        return;
      }
      
      const newIndex = panelIds.length;
      const indicatorName = 'RSI';
      const panelId = `indicator-panel-${newIndex}`;
      
      panelIds.push(panelId);
      
      if (indicatorSystem) {
        const panel = indicatorSystem.createIndicatorPanel(panelId, 'indicators-container', indicatorName);
        if (panel && chartData.length) {
          indicatorSystem.updateSinglePanel(panelId);
        }
        updateIndicatorCount();
        if (el.chart && typeof indicatorSystem.syncIndicatorChartWidths === 'function') {
          indicatorSystem.syncIndicatorChartWidths(el.chart);
        }
        // Disable add button if we've reached the maximum
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

    if (!btnLeft || !btnRight) {
      return;
    }

    const getRange = () => chart?.timeScale().getVisibleLogicalRange();
    const setRangeBoth = (range) => {
      if (!range || !chart) return;
      try { 
        chart.timeScale().setVisibleLogicalRange(range); 
      } catch (e) { 
        console.error('Error setting range:', e);
      }
    };

    btnLeft.addEventListener('click', () => {
      adjustPan(-0.15);
    });
    btnRight.addEventListener('click', () => {
      adjustPan(0.15);
    });
    btnReset?.addEventListener('click', () => {
      resetToDefaultView();
    });
    
    if (btnJumpFirst) {
      btnJumpFirst.addEventListener('click', function() {
        jumpToFirst();
      });
    }

    if (btnJumpLast) {
      btnJumpLast.addEventListener('click', function() {
        jumpToLast();
      });
    }

    function resetToDefaultView() {
      if (!chartData.length) return;
      
      const dataMax = chartData.length - 1;
      // Show last 40 candles by default (good balance for analysis)
      const defaultVisibleCandles = Math.min(40, chartData.length);
      const newR = {
        from: Math.max(0, dataMax - defaultVisibleCandles + 1),
        to: dataMax
      };
      setRangeBoth(newR);
    }
    
    function jumpToFirst() {
      if (!chartData || chartData.length === 0) return;
      if (!chart) return;
      
      // Use time-based coordinates instead of logical indices
      const firstTime = chartData[0].time;
      const lastTime = chartData[chartData.length - 1].time;
      
      // Calculate a range that shows about 40 candles from the start
      let endTime = firstTime;
      if (chartData.length > 1) {
        const candleDuration = chartData[1].time - chartData[0].time;
        endTime = firstTime + (candleDuration * 40);
      }
      
      // Make sure we don't exceed the last candle
      if (endTime > lastTime) {
        endTime = lastTime;
      }

      try {
        chart.timeScale().setVisibleRange({
          from: firstTime,
          to: endTime
        });
      } catch (e) {
        console.error('Error jumping to first:', e);
      }
    }
    
    function jumpToLast() {
      if (!chartData || chartData.length === 0) return;
      if (!chart) return;
      
      // Use time-based coordinates instead of logical indices
      const firstTime = chartData[0].time;
      const lastTime = chartData[chartData.length - 1].time;
      
      // Calculate a range that shows about 40 candles before the end
      let startTime = lastTime;
      if (chartData.length > 1) {
        const candleDuration = chartData[1].time - chartData[0].time;
        startTime = lastTime - (candleDuration * 40);
      }
      
      // Make sure we don't go before the first candle
      if (startTime < firstTime) {
        startTime = firstTime;
      }

      try {
        chart.timeScale().setVisibleRange({
          from: startTime,
          to: lastTime
        });
      } catch (e) {
        console.error('Error jumping to last:', e);
      }
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
      if (newFrom < dataMin) {
        newFrom = dataMin;
        newTo = dataMin + span;
      }
      if (newTo > dataMax) {
        newTo = dataMax;
        newFrom = dataMax - span;
        if (newFrom < dataMin) {
          newFrom = dataMin;
          newTo = Math.min(dataMin + span, dataMax);
        }
      }
      const newR = { from: Math.max(dataMin, newFrom), to: Math.min(dataMax, newTo) };
      setRangeBoth(newR);
    }
  }

  function updateIndicators() {
    if (!indicatorSystem || !chartData.length) {
      return;
    }
    
    try {
      indicatorSystem.updateAllPanels(chartData);
    } catch (error) {
      console.error('❌ Error updating indicators:', error);
    }
  }

  // Utility Functions
  function isStockSymbol(sym) {
    return sym && typeof sym === 'string' && 
           sym.length >= 1 && sym.length <= 5 && 
           /^[A-Z]+$/.test(sym) && 
           !sym.endsWith('USDT') && 
           !sym.endsWith('BUSD');
  }

  function formatStockPrice(price) {
    if (!isFinite(price)) return "—";
    return `$${price.toFixed(2)}`;
  }

  function saveLS(key, val) {
    try { 
      localStorage.setItem(key, JSON.stringify(val)); 
    } catch (error) {
      console.error("localStorage save error:", error);
    }
  }

  function loadLS(key, fallback) {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : fallback;
    } catch {
      return fallback;
    }
  }

  // Expose for debugging
  window.stockApp = {
    watchlist,
    positions,
    orders,
    localCandles,
    lastPrice,
    changePct,
    loadLS,
    saveLS,
    STOCK_LS_KEYS
  };

})();
