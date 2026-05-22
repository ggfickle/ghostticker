import type {StockQuote, QuoteEvent, EventLevel, NormalizedQuote} from '../domain/quote.js';

const STATE_IDLE = 'idle';
const STATE_RISING = 'rising';
const STATE_FALLING = 'falling';
const STATE_SURGING = 'surging';
const STATE_DROPPING = 'dropping';
const STATE_VOLATILE = 'volatile';

type QuoteState = typeof STATE_IDLE | typeof STATE_RISING | typeof STATE_FALLING | typeof STATE_SURGING | typeof STATE_DROPPING | typeof STATE_VOLATILE;

interface Snapshot {
  price: number;
  changePercent: number;
  volume: number;
  time: string;
  state: QuoteState;
}

const snapshots = new Map<string, Snapshot>();

function classifyState(quote: StockQuote, prev?: Snapshot): QuoteState {
  const delta = quote.changePercent;

  if (Math.abs(delta) > 5) {
    return delta > 0 ? STATE_SURGING : STATE_DROPPING;
  }

  if (prev) {
    const priceDelta = quote.price - prev.price;
    const pctChange = (priceDelta / prev.price) * 100;

    if (Math.abs(pctChange) > 1.5) {
      return pctChange > 0 ? STATE_SURGING : STATE_DROPPING;
    }

    if (Math.abs(pctChange) > 0.3) {
      return pctChange > 0 ? STATE_RISING : STATE_FALLING;
    }

    if (quote.volume > prev.volume * 2 && quote.volume > 10000) {
      return STATE_VOLATILE;
    }
  }

  if (Math.abs(delta) > 2) {
    return delta > 0 ? STATE_RISING : STATE_FALLING;
  }

  return STATE_IDLE;
}

function classifyEventLevel(state: QuoteState, prev?: QuoteState): EventLevel {
  if (state === STATE_SURGING || state === STATE_DROPPING || state === STATE_VOLATILE) {
    return 'WARN';
  }

  if (state === STATE_RISING || state === STATE_FALLING) {
    if (prev === STATE_IDLE || prev === undefined) {
      return 'INFO';
    }
    return 'TRACE';
  }

  return 'TRACE';
}

function rateLabel(quote: StockQuote, prev?: Snapshot): string {
  if (!prev) return 'stable';
  const pctChange = ((quote.price - prev.price) / prev.price) * 100;
  if (pctChange > 1.5) return 'accelerating';
  if (pctChange > 0.3) return 'rising';
  if (pctChange < -1.5) return 'dropping';
  if (pctChange < -0.3) return 'declining';
  return 'stable';
}

function flowLabel(quote: StockQuote): string {
  const vol = quote.volume;
  if (vol > 100000) return 'heavy';
  if (vol > 50000) return 'high';
  if (vol > 20000) return 'normal';
  if (vol > 5000) return 'low';
  return 'idle';
}

function trendArrow(state: QuoteState): string {
  switch (state) {
    case STATE_SURGING: return ' ↗↗';
    case STATE_RISING: return ' ↗';
    case STATE_DROPPING: return ' ↘↘';
    case STATE_FALLING: return ' ↘';
    case STATE_VOLATILE: return ' ↕';
    default: return '';
  }
}

function focusScore(state: QuoteState, level: EventLevel): number {
  let score = 0;
  if (level === 'WARN') score += 50;
  if (level === 'INFO') score += 20;
  if (state === STATE_SURGING || state === STATE_DROPPING) score += 30;
  if (state === STATE_VOLATILE) score += 20;
  return score;
}

export function processQuote(quote: StockQuote): {normalized: NormalizedQuote; event: QuoteEvent | null} {
  const prev = snapshots.get(quote.symbol);
  const state = classifyState(quote, prev);
  const level = classifyEventLevel(state, prev?.state);

  const normalized: NormalizedQuote = {
    symbol: quote.symbol,
    name: quote.name,
    lastPrice: quote.price,
    changePercent: quote.changePercent,
    prevClose: quote.prevClose,
    intradaySeries: [],
    volume: quote.volume,
    turnover: quote.amount,
    updatedAt: new Date(),
    rateBucket: 0,
    flowBucket: 0,
    state,
    eventLevel: level,
    focusScore: focusScore(state, level)
  };

  snapshots.set(quote.symbol, {
    price: quote.price,
    changePercent: quote.changePercent,
    volume: quote.volume,
    time: quote.time,
    state
  });

  let event: QuoteEvent | null = null;

  if (!prev || prev.state !== state) {
    const messages: Record<QuoteState, string> = {
      [STATE_IDLE]: 'tick received',
      [STATE_RISING]: 'state updated',
      [STATE_FALLING]: 'state updated',
      [STATE_SURGING]: 'buffer_overflow_risk',
      [STATE_DROPPING]: 'buffer_overflow_risk',
      [STATE_VOLATILE]: 'throughput_spike'
    };

    event = {
      level,
      symbol: quote.symbol,
      message: messages[state],
      timestamp: new Date(),
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume,
      amount: quote.amount,
      state
    };
  }

  return {normalized, event};
}

export function getStateMeta(quote: StockQuote, prev?: Snapshot): {rate: string; flow: string; arrow: string} {
  return {
    rate: rateLabel(quote, prev),
    flow: flowLabel(quote),
    arrow: trendArrow(snapshots.get(quote.symbol)?.state || STATE_IDLE)
  };
}
