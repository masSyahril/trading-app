/* TradeLite Recording System - Chat, Activity, Analytics & Screen Recording */

class TradingRecorder {
  constructor() {
    this.chatHistory = [];
    this.activityLog = [];
    this.analytics = {
      sessions: [],
      currentSession: null,
      features: {},
      trades: { total: 0, profitable: 0, losing: 0 },
      symbols: {},
      timeframes: {}
    };
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    
    this.init();
  }

  init() {
    this.loadStoredData();
    this.startSession();
    this.setupEventListeners();
    this.createRecordingUI();
  }

  // 1. CHAT HISTORY SYSTEM
  saveConversation(userMessage, assistantResponse) {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: userMessage,
      assistant: assistantResponse,
      session: this.analytics.currentSession?.id
    };
    
    this.chatHistory.push(entry);
    this.saveToStorage('chatHistory', this.chatHistory);
    
    console.log('💬 Chat saved:', entry);
  }

  exportChatHistory(format = 'json') {
    const data = {
      exportDate: new Date().toISOString(),
      totalEntries: this.chatHistory.length,
      conversations: this.chatHistory
    };

    if (format === 'json') {
      this.downloadFile(
        JSON.stringify(data, null, 2),
        `chat-history-${new Date().toISOString().split('T')[0]}.json`,
        'application/json'
      );
    } else if (format === 'txt') {
      let text = `TradeLite Chat History - ${data.exportDate}\n\n`;
      this.chatHistory.forEach(entry => {
        text += `[${entry.timestamp}]\n`;
        text += `User: ${entry.user}\n`;
        text += `Assistant: ${entry.assistant}\n\n`;
      });
      this.downloadFile(text, `chat-history-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    }
  }

  // 2. ACTIVITY LOG SYSTEM
  logActivity(action, details = {}) {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      details,
      url: window.location.href,
      session: this.analytics.currentSession?.id
    };
    
    this.activityLog.push(entry);
    this.saveToStorage('activityLog', this.activityLog);
    
    // Update analytics
    this.updateAnalytics(action, details);
    
    console.log('📋 Activity logged:', entry);
  }

  // 3. USAGE ANALYTICS SYSTEM
  startSession() {
    const session = {
      id: Date.now(),
      start: new Date().toISOString(),
      end: null,
      platform: this.detectPlatform(),
      userAgent: navigator.userAgent,
      activities: 0,
      trades: 0,
      symbols: new Set(),
      timeframes: new Set()
    };
    
    this.analytics.currentSession = session;
    this.analytics.sessions.push(session);
    
    this.logActivity('session_start', { platform: session.platform });
  }

  endSession() {
    if (this.analytics.currentSession) {
      this.analytics.currentSession.end = new Date().toISOString();
      this.analytics.currentSession.duration = 
        new Date(this.analytics.currentSession.end) - new Date(this.analytics.currentSession.start);
      
      this.logActivity('session_end', { 
        duration: this.analytics.currentSession.duration,
        activities: this.analytics.currentSession.activities
      });
      
      this.saveToStorage('analytics', this.analytics);
    }
  }

  updateAnalytics(action, details) {
    if (!this.analytics.currentSession) return;
    
    this.analytics.currentSession.activities++;
    
    // Track feature usage
    if (!this.analytics.features[action]) {
      this.analytics.features[action] = 0;
    }
    this.analytics.features[action]++;
    
    // Track trading specific analytics
    if (action === 'place_order') {
      this.analytics.trades.total++;
      this.analytics.currentSession.trades++;
      
      if (details.symbol) {
        this.analytics.currentSession.symbols.add(details.symbol);
        this.analytics.symbols[details.symbol] = (this.analytics.symbols[details.symbol] || 0) + 1;
      }
    }
    
    if (action === 'change_timeframe' && details.timeframe) {
      this.analytics.currentSession.timeframes.add(details.timeframe);
      this.analytics.timeframes[details.timeframe] = (this.analytics.timeframes[details.timeframe] || 0) + 1;
    }
    
    if (action === 'close_position') {
      if (details.pnl > 0) {
        this.analytics.trades.profitable++;
      } else {
        this.analytics.trades.losing++;
      }
    }
  }

  exportAnalytics() {
    const report = {
      exportDate: new Date().toISOString(),
      summary: {
        totalSessions: this.analytics.sessions.length,
        totalActivities: this.activityLog.length,
        totalTrades: this.analytics.trades.total,
        winRate: this.analytics.trades.total > 0 ? 
          (this.analytics.trades.profitable / this.analytics.trades.total * 100).toFixed(2) + '%' : '0%',
        topSymbols: Object.entries(this.analytics.symbols)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5),
        topFeatures: Object.entries(this.analytics.features)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
      },
      sessions: this.analytics.sessions.map(s => ({
        ...s,
        symbols: Array.from(s.symbols || []),
        timeframes: Array.from(s.timeframes || [])
      })),
      activities: this.activityLog.slice(-1000) // Last 1000 activities
    };

    this.downloadFile(
      JSON.stringify(report, null, 2),
      `trading-analytics-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
  }

  // 4. SCREEN RECORDING SYSTEM
  async startScreenRecording() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.downloadFile(blob, `trading-session-${timestamp}.webm`, 'video/webm');
        this.recordedChunks = [];
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      
      this.logActivity('screen_recording_start');
      this.updateRecordingUI();

    } catch (error) {
      console.error('Screen recording error:', error);
      alert('Screen recording failed. Please check permissions.');
    }
  }

  stopScreenRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Stop all tracks to end screen capture
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      this.logActivity('screen_recording_stop');
      this.updateRecordingUI();
    }
  }

  // UI SYSTEM
  createRecordingUI() {
    const container = document.createElement('div');
    container.id = 'recording-controls';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1000;
      background: rgba(15, 19, 24, 0.95);
      border: 1px solid #1f2a36;
      border-radius: 8px;
      padding: 8px;
      display: flex;
      gap: 6px;
      font-size: 12px;
    `;

    container.innerHTML = `
      <button id="btn-record-screen" title="Start/Stop Screen Recording">🎥</button>
      <button id="btn-export-chat" title="Export Chat History">💬</button>
      <button id="btn-export-activity" title="Export Activity Log">📋</button>
      <button id="btn-export-analytics" title="Export Analytics">📊</button>
      <div id="recording-status"></div>
    `;

    document.body.appendChild(container);

    // Add button styles
    const buttons = container.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.style.cssText = `
        background: #0b0f14;
        border: 1px solid #1f2a36;
        color: #e6edf3;
        padding: 6px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      `;
    });

    // Event listeners
    document.getElementById('btn-record-screen').addEventListener('click', () => {
      if (this.isRecording) {
        this.stopScreenRecording();
      } else {
        this.startScreenRecording();
      }
    });

    document.getElementById('btn-export-chat').addEventListener('click', () => {
      this.exportChatHistory('json');
      this.logActivity('export_chat');
    });

    document.getElementById('btn-export-activity').addEventListener('click', () => {
      this.downloadFile(
        JSON.stringify({ activities: this.activityLog }, null, 2),
        `activity-log-${new Date().toISOString().split('T')[0]}.json`,
        'application/json'
      );
      this.logActivity('export_activity');
    });

    document.getElementById('btn-export-analytics').addEventListener('click', () => {
      this.exportAnalytics();
      this.logActivity('export_analytics');
    });

    this.updateRecordingUI();
  }

  updateRecordingUI() {
    const status = document.getElementById('recording-status');
    const btn = document.getElementById('btn-record-screen');
    
    if (this.isRecording) {
      status.textContent = '🔴 REC';
      status.style.color = '#ef4444';
      btn.style.background = '#ef4444';
    } else {
      status.textContent = '';
      btn.style.background = '#0b0f14';
    }
  }

  setupEventListeners() {
    // Track page navigation
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      this.logActivity(document.hidden ? 'page_hidden' : 'page_visible');
    });
  }

  // UTILITY METHODS
  detectPlatform() {
    const path = window.location.pathname;
    if (path.includes('stock-market')) return 'stocks';
    if (path.includes('crypto')) return 'crypto';
    return 'main';
  }

  loadStoredData() {
    this.chatHistory = JSON.parse(localStorage.getItem('tl_chat_history') || '[]');
    this.activityLog = JSON.parse(localStorage.getItem('tl_activity_log') || '[]');
    this.analytics = JSON.parse(localStorage.getItem('tl_analytics') || JSON.stringify({
      sessions: [], currentSession: null, features: {}, trades: { total: 0, profitable: 0, losing: 0 }, symbols: {}, timeframes: {}
    }));
  }

  saveToStorage(key, data) {
    try {
      localStorage.setItem(`tl_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  downloadFile(content, filename, mimeType) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // PUBLIC API for integrating with trading apps
  logTrade(symbol, side, quantity, price, status) {
    this.logActivity('place_order', { symbol, side, quantity, price, status });
  }

  logPositionClose(symbol, pnl) {
    this.logActivity('close_position', { symbol, pnl });
  }

  logTimeframeChange(timeframe) {
    this.logActivity('change_timeframe', { timeframe });
  }

  logSymbolSwitch(symbol) {
    this.logActivity('symbol_switch', { symbol });
  }

  logChartAction(action, details = {}) {
    this.logActivity(`chart_${action}`, details);
  }
}

// Initialize global recorder
window.tradingRecorder = new TradingRecorder();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TradingRecorder;
}