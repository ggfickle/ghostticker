import type {StockQuote, IntradayPoint} from '../domain/quote.js';

function formatSymbol(symbol: string): string {
  const code = symbol.replace(/\D/g, '');
  if (code.startsWith('6') || code.startsWith('5')) {
    return `sh${code}`;
  }
  return `sz${code}`;
}

export async function fetchQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  if (symbols.length === 0) return new Map();

  const formatted = symbols.map(formatSymbol);
  const url = `https://qt.gtimg.cn/q=${formatted.join(',')}`;

  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('gbk');
    const text = decoder.decode(buffer);

    const quotes = new Map<string, StockQuote>();
    const lines = text.split('\n');

    for (const line of lines) {
      const match = line.match(/v_(\w+)="([^"]+)"/);
      if (!match || !match[2]) continue;

      const parts = match[2].split('~');
      if (parts.length < 45) continue;

      const symbol = parts[2];
      quotes.set(symbol, {
        symbol,
        name: parts[1],
        price: parseFloat(parts[3]),
        change: parseFloat(parts[31]),
        changePercent: parseFloat(parts[32]),
        open: parseFloat(parts[5]),
        high: parseFloat(parts[33]),
        low: parseFloat(parts[34]),
        prevClose: parseFloat(parts[4]),
        volume: parseFloat(parts[6]) / 100,
        amount: parseFloat(parts[37]),
        time: parts[30]
      });
    }

    return quotes;
  } catch {
    return new Map();
  }
}

export async function fetchIntraday(symbol: string): Promise<IntradayPoint[]> {
  const code = symbol.replace(/\D/g, '');
  const prefix = code.startsWith('6') || code.startsWith('5') ? 'sh' : 'sz';
  const formatted = `${prefix}${code}`;
  const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${formatted}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const points = data?.data?.[formatted]?.data?.data;
    if (!points) return [];

    return points.map((item: string) => {
      const parts = item.split(' ');
      return {
        time: parts[0],
        price: parseFloat(parts[1]),
        volume: parseInt(parts[2]) || 0
      };
    });
  } catch {
    return [];
  }
}
