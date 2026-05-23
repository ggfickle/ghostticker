export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  amount: number;
  time: string;
}

export interface IntradayPoint {
  time: string;
  price: number;
  volume: number;
}

export type EventLevel = 'TRACE' | 'INFO' | 'WARN';

export interface QuoteEvent {
  level: EventLevel;
  symbol: string;
  message: string;
  timestamp: Date;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  state?: string;
}

export interface NormalizedQuote {
  symbol: string;
  name: string;
  lastPrice: number;
  changePercent: number;
  prevClose: number;
  intradaySeries: IntradayPoint[];
  volume: number;
  turnover: number;
  updatedAt: Date;
  rateBucket: number;
  flowBucket: number;
  state: string;
  eventLevel: EventLevel;
  focusScore: number;
}

export interface KLinePoint {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}
