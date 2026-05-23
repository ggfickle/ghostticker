import {describe, expect, it} from 'vitest';
import {calcSMA, calcEMA, calcMACD, calcKDJ, calcRSI, scanTechnicalAlerts} from '../../src/engine/technicalIndicators.js';

describe('technical indicators module', () => {
  it('calculates SMA correctly', () => {
    const data = [1, 2, 3, 4, 5];
    expect(calcSMA(data, 3)).toEqual([2, 3, 4]);
  });

  it('calculates EMA correctly', () => {
    const data = [10, 11, 12];
    const ema = calcEMA(data, 3);
    expect(ema.length).toBe(3);
    expect(ema[0]).toBe(10);
    // multiplier = 2 / 4 = 0.5
    // ema[1] = (11 - 10) * 0.5 + 10 = 10.5
    expect(ema[1]).toBe(10.5);
    // ema[2] = (12 - 10.5) * 0.5 + 10.5 = 11.25
    expect(ema[2]).toBe(11.25);
  });

  it('calculates MACD correctly', () => {
    const closes = Array.from({length: 50}, (_, i) => 10 + i * 0.5);
    const {dif, dea, macd} = calcMACD(closes, 12, 26, 9);
    expect(dif.length).toBe(50);
    expect(dea.length).toBe(50);
    expect(macd.length).toBe(50);
    // For monotonic closes, MACD should align and have non-zero differences
    expect(dif[dif.length - 1]).not.toBe(0);
  });

  it('calculates KDJ correctly', () => {
    const highs = Array.from({length: 20}, () => 15.0);
    const lows = Array.from({length: 20}, () => 5.0);
    const closes = Array.from({length: 20}, () => 10.0);
    const {k, d, j} = calcKDJ(highs, lows, closes, 9);
    expect(k.length).toBe(20);
    expect(d.length).toBe(20);
    expect(j.length).toBe(20);
  });

  it('calculates RSI correctly', () => {
    const closes = Array.from({length: 30}, (_, i) => (i % 2 === 0 ? 10.0 : 12.0));
    const rsi = calcRSI(closes, 14);
    expect(rsi.length).toBe(30);
    expect(rsi[rsi.length - 1]).toBeGreaterThan(30);
    expect(rsi[rsi.length - 1]).toBeLessThan(70);
  });

  it('scans technical alerts correctly', () => {
    // Monotonically increasing should not trigger standard death crossovers immediately
    const highs = Array.from({length: 40}, (_, i) => 10.0 + i);
    const lows = Array.from({length: 40}, (_, i) => 8.0 + i);
    const closes = Array.from({length: 40}, (_, i) => 9.0 + i);
    const alert = scanTechnicalAlerts(highs, lows, closes);
    // Should be severe overbought because price kept rising
    expect(alert).not.toBeNull();
    expect(alert?.level).toBe('WARN');
    expect(alert?.message).toContain('RSI severely overbought');
  });
});
