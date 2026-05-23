export function calcSMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

export function calcEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const multiplier = 2 / (period + 1);
  const ema = [data[0]!];
  for (let i = 1; i < data.length; i++) {
    ema.push((data[i]! - ema[i - 1]!) * multiplier + ema[i - 1]!);
  }
  return ema;
}

export interface MACDResult {
  dif: number[];
  dea: number[];
  macd: number[];
}

export function calcMACD(closes: number[], fast = 12, slow = 26, signal = 9): MACDResult {
  if (closes.length < Math.max(fast, slow) + signal) {
    return { dif: [], dea: [], macd: [] };
  }

  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);

  const dif: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    dif.push(emaFast[i]! - emaSlow[i]!);
  }

  const dea = calcEMA(dif, signal);
  const macd: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macd.push((dif[i]! - dea[i]!) * 2);
  }

  return { dif, dea, macd };
}

export interface KDJResult {
  k: number[];
  d: number[];
  j: number[];
}

export function calcKDJ(highs: number[], lows: number[], closes: number[], period = 9): KDJResult {
  if (closes.length < period) {
    return { k: [], d: [], j: [] };
  }

  const k: number[] = [];
  const d: number[] = [];
  const j: number[] = [];

  let currentK = 50.0;
  let currentD = 50.0;

  // Fill empty values for the first period-1 elements to align arrays
  for (let i = 0; i < period - 1; i++) {
    k.push(50.0);
    d.push(50.0);
    j.push(50.0);
  }

  for (let i = period - 1; i < closes.length; i++) {
    const subHighs = highs.slice(i - period + 1, i + 1);
    const subLows = lows.slice(i - period + 1, i + 1);
    const highN = Math.max(...subHighs);
    const lowN = Math.min(...subLows);

    let rsv = 50.0;
    if (highN !== lowN) {
      rsv = ((closes[i]! - lowN) / (highN - lowN)) * 100;
    }

    currentK = (2 / 3) * currentK + (1 / 3) * rsv;
    currentD = (2 / 3) * currentD + (1 / 3) * currentK;
    const currentJ = 3 * currentK - 2 * currentD;

    k.push(currentK);
    d.push(currentD);
    j.push(currentJ);
  }

  return { k, d, j };
}

export function calcRSI(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return [];

  const rsi: number[] = [];
  // Align the array by filling with 50.0 for initial elements
  for (let i = 0; i < period; i++) {
    rsi.push(50.0);
  }

  const deltas: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    deltas.push(closes[i]! - closes[i - 1]!);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // First RSI calculation
  for (let i = 0; i < period; i++) {
    const change = deltas[i]!;
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) {
    rsi.push(100.0);
  } else {
    const rs = avgGain / avgLoss;
    rsi.push(100.0 - 100.0 / (1.0 + rs));
  }

  // Subsequent calculations using Wilder's smoothing
  for (let i = period; i < deltas.length; i++) {
    const change = deltas[i]!;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi.push(100.0);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100.0 - 100.0 / (1.0 + rs));
    }
  }

  return rsi;
}

export interface TechnicalAlert {
  level: 'INFO' | 'WARN';
  message: string;
}

export function scanTechnicalAlerts(
  highs: number[],
  lows: number[],
  closes: number[]
): TechnicalAlert | null {
  if (closes.length < 30) return null;

  // 1. MACD Golden/Death Cross
  const { dif, dea } = calcMACD(closes);
  if (dif.length >= 2 && dea.length >= 2) {
    const prevDif = dif[dif.length - 2]!;
    const prevDea = dea[dea.length - 2]!;
    const currDif = dif[dif.length - 1]!;
    const currDea = dea[dea.length - 1]!;

    if (prevDif <= prevDea && currDif > currDea) {
      return { level: 'INFO', message: 'MACD golden cross detected (bullish)' };
    }
    if (prevDif >= prevDea && currDif < currDea) {
      return { level: 'WARN', message: 'MACD death cross detected (bearish)' };
    }
  }

  // 2. KDJ Golden/Death Cross
  const { k, d } = calcKDJ(highs, lows, closes);
  if (k.length >= 2 && d.length >= 2) {
    const prevK = k[k.length - 2]!;
    const prevD = d[d.length - 2]!;
    const currK = k[k.length - 1]!;
    const currD = d[d.length - 1]!;

    if (prevK <= prevD && currK > currD && currK < 30) {
      return { level: 'INFO', message: 'KDJ golden cross in oversold area' };
    }
    if (prevK >= prevD && currK < currD && currK > 70) {
      return { level: 'WARN', message: 'KDJ death cross in overbought area' };
    }
  }

  // 3. RSI Overbought/Oversold
  const rsi = calcRSI(closes);
  if (rsi.length >= 1) {
    const currRsi = rsi[rsi.length - 1]!;
    if (currRsi > 80) {
      return { level: 'WARN', message: `RSI severely overbought (${currRsi.toFixed(1)})` };
    }
    if (currRsi < 20) {
      return { level: 'INFO', message: `RSI severely oversold (${currRsi.toFixed(1)})` };
    }
  }

  return null;
}
