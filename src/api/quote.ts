export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prevClose: number;
  volume: number;
  amount: number;
  time: string;
}

export interface KLineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

function formatSymbol(symbol: string): string {
  const code = symbol.replace(/\D/g, '');
  if (code.startsWith('6') || code.startsWith('5')) {
    return `sh${code}`;
  }
  return `sz${code}`;
}

export async function fetchQuote(symbol: string): Promise<StockQuote | null> {
  const formatted = formatSymbol(symbol);
  const url = `https://qt.gtimg.cn/q=${formatted}`;

  try {
    const response = await fetch(url);
    const text = await response.text();

    const match = text.match(/"([^"]+)"/);
    if (!match || !match[1]) return null;

    const parts = match[1].split('~');
    if (parts.length < 45) return null;

    return {
      symbol: parts[2],
      name: parts[1],
      price: parseFloat(parts[3]),
      change: parseFloat(parts[31]),
      changePercent: parseFloat(parts[32]),
      open: parseFloat(parts[5]),
      high: parseFloat(parts[33]),
      low: parseFloat(parts[34]),
      close: parseFloat(parts[3]),
      prevClose: parseFloat(parts[4]),
      volume: parseFloat(parts[6]) / 100,
      amount: parseFloat(parts[37]),
      time: parts[30]
    };
  } catch {
    return null;
  }
}

export async function fetchKLine(symbol: string, days = 30): Promise<KLineData[]> {
  const code = symbol.replace(/\D/g, '');
  const market = code.startsWith('6') || code.startsWith('5') ? '1' : '0';
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${market}${code},day,,,${days},qfq`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const klines = data?.data?.[`${market}${code}`]?.qfqday || data?.data?.[`${market}${code}`]?.day;
    if (!klines) return [];

    return klines.map((item: string[]) => ({
      date: item[0],
      open: parseFloat(item[1]),
      close: parseFloat(item[2]),
      high: parseFloat(item[3]),
      low: parseFloat(item[4]),
      volume: parseFloat(item[5])
    }));
  } catch {
    return [];
  }
}

export async function fetchAllQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const formatted = symbols.map(formatSymbol);
  const url = `https://qt.gtimg.cn/q=${formatted.join(',')}`;

  try {
    const response = await fetch(url);
    const text = await response.text();

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
        close: parseFloat(parts[3]),
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
