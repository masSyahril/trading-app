-- Trading App Database Schema
-- Run this in phpMyAdmin or: mysql -u root -p < database/schema.sql
-- ---------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS trading_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trading_app;

-- ---------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    last_login    TIMESTAMP    NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- Sessions  (DB-backed — no PHP file sessions)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id         VARCHAR(128) PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- Paper-trading balance  (each user starts with $100,000)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS balances (
    user_id         INT UNSIGNED NOT NULL PRIMARY KEY,
    usd_balance     DECIMAL(20,8) NOT NULL DEFAULT 100000.00000000,
    total_deposited DECIMAL(20,8) NOT NULL DEFAULT 100000.00000000,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- Watchlist
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS watchlist (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    symbol      VARCHAR(20)  NOT NULL,
    market_type ENUM('crypto','stock','taiwan') NOT NULL DEFAULT 'crypto',
    added_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_symbol (user_id, symbol),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- Orders  (paper trades)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    symbol      VARCHAR(20)  NOT NULL,
    market_type ENUM('crypto','stock','taiwan') NOT NULL DEFAULT 'crypto',
    side        ENUM('buy','sell') NOT NULL,
    order_type  ENUM('market','limit') NOT NULL DEFAULT 'market',
    quantity    DECIMAL(20,8) NOT NULL,
    price       DECIMAL(20,8) NOT NULL,
    status      ENUM('pending','filled','cancelled') NOT NULL DEFAULT 'filled',
    filled_at   TIMESTAMP    NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_symbol  (user_id, symbol),
    INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- Positions  (open & closed paper trades)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS positions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    symbol          VARCHAR(20)  NOT NULL,
    market_type     ENUM('crypto','stock','taiwan') NOT NULL DEFAULT 'crypto',
    quantity        DECIMAL(20,8) NOT NULL,
    avg_entry_price DECIMAL(20,8) NOT NULL,
    current_price   DECIMAL(20,8) NOT NULL DEFAULT 0,
    realized_pnl    DECIMAL(20,8) NOT NULL DEFAULT 0,
    is_open         TINYINT(1)    NOT NULL DEFAULT 1,
    opened_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at       TIMESTAMP    NULL,
    close_price     DECIMAL(20,8) NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_open   (user_id, is_open),
    INDEX idx_user_symbol (user_id, symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- Candles cache  (OHLCV — designed to mirror TimescaleDB schema)
-- When you install TimescaleDB/PostgreSQL, this table migrates 1:1
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candles (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol      VARCHAR(20)  NOT NULL,
    market_type ENUM('crypto','stock','taiwan') NOT NULL DEFAULT 'crypto',
    timeframe   VARCHAR(5)   NOT NULL,   -- '1m','5m','15m','1h','4h','1d'
    open_time   BIGINT       NOT NULL,   -- Unix timestamp (ms)
    open_price  DECIMAL(20,8) NOT NULL,
    high_price  DECIMAL(20,8) NOT NULL,
    low_price   DECIMAL(20,8) NOT NULL,
    close_price DECIMAL(20,8) NOT NULL,
    volume      DECIMAL(30,8) NOT NULL DEFAULT 0,
    UNIQUE KEY uq_candle (symbol, timeframe, open_time),
    INDEX idx_symbol_tf_time (symbol, timeframe, open_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
