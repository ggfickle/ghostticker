import {useApp, useInput} from 'ink';
import {useEffect, useRef, useState} from 'react';
import type {Watchlist} from '../domain/watchlist.js';
import type {QuoteEvent, NormalizedQuote, IntradayPoint, KLinePoint} from '../domain/quote.js';
import {loadWatchlist, addSymbol, removeSymbol} from '../storage/watchlistStore.js';
import {loadPreferences, savePreferences} from '../storage/preferencesStore.js';
import {fetchQuotes, fetchIntraday, fetchKLine} from '../api/tencentAdapter.js';
import {processQuote} from '../engine/eventEngine.js';
import {scanTechnicalAlerts} from '../engine/technicalIndicators.js';
import type {DisguisePreset} from './components/LogStream.js';

const REFRESH_INTERVAL = 5000;
const MAX_EVENTS = 100;

export interface AppState {
  watchlist: Watchlist;
  managingWatchlist: boolean;
  inputBuffer: string;
  selectedIndex: number;
  events: QuoteEvent[];
  quotes: Map<string, NormalizedQuote>;
  intradayData: Map<string, IntradayPoint[]>;
  intradayErrors: Map<string, string>;
  safeMode: boolean;
  detailOpen: boolean;
  lastUpdate: Date | null;
  preset: DisguisePreset;
  klineData: Map<string, KLinePoint[]>;
  klinePeriod: 'intraday' | 'day' | 'week';
}

export function useAppController(_initialWatchlist: Watchlist) {
  const {exit} = useApp();
  const [watchlist, setWatchlist] = useState<Watchlist>([]);
  const [managingWatchlist, setManagingWatchlist] = useState(false);
  const [inputBuffer, setInputBuffer] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [events, setEvents] = useState<QuoteEvent[]>([]);
  const [quotes, setQuotes] = useState<Map<string, NormalizedQuote>>(new Map());
  const [intradayData, setIntradayData] = useState<Map<string, IntradayPoint[]>>(new Map());
  const [intradayErrors, setIntradayErrors] = useState<Map<string, string>>(new Map());
  const [safeMode, setSafeMode] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [preset, setPreset] = useState<DisguisePreset>('Go');
  const [klineData, setKlineData] = useState<Map<string, KLinePoint[]>>(new Map());
  const [klinePeriod, setKlinePeriod] = useState<'intraday' | 'day' | 'week'>('intraday');
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const watchlistRef = useRef(watchlist);
  const selectedIndexRef = useRef(selectedIndex);

  const klineDataRef = useRef(klineData);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    klineDataRef.current = klineData;
  }, [klineData]);

  // Background daily K-line history loader
  useEffect(() => {
    if (watchlist.length === 0) return;
    watchlist.forEach(symbol => {
      loadKLine(symbol, 'day');
    });
  }, [watchlist.join(',')]);

  useEffect(() => {
    if (_initialWatchlist.length === 0) {
      loadWatchlist().then(setWatchlist);
    }
    loadPreferences().then(prefs => {
      if (prefs.defaultPreset) {
        setPreset(prefs.defaultPreset);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (watchlist.length === 0) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    async function fetchData() {
      try {
        const rawQuotes = await fetchQuotes(watchlist);
        if (cancelled) return;

        const newQuotes = new Map<string, NormalizedQuote>();
        const newEvents: QuoteEvent[] = [];

        for (const [symbol, quote] of rawQuotes) {
          const {normalized, event} = processQuote(quote);
          newQuotes.set(symbol, normalized);
          if (event) {
            newEvents.push(event);
          }

          // Run standard KDJ/MACD/RSI alerts on daily K-line histories
          const history = klineDataRef.current.get(`${symbol}-day`) || [];
          if (history.length >= 20) {
            const closes = [...history.map(h => h.close), quote.price];
            const highs = [...history.map(h => h.high), quote.high];
            const lows = [...history.map(h => h.low), quote.low];
            const alert = scanTechnicalAlerts(highs, lows, closes);
            if (alert) {
              newEvents.push({
                level: alert.level,
                symbol,
                message: `telemetry_alert: ${alert.message.toLowerCase().replace(/ /g, '_').replace(/\(|\)/g, '')}`,
                timestamp: new Date(),
                price: quote.price,
                change: quote.change,
                changePercent: quote.changePercent,
                volume: quote.volume,
                amount: quote.amount,
                state: normalized.state
              });
            }
          }
        }

        setQuotes(prev => {
          const merged = new Map(prev);
          for (const [k, v] of newQuotes) {
            merged.set(k, v);
          }
          return merged;
        });

        if (newEvents.length > 0) {
          setEvents(prev => [...prev, ...newEvents].slice(-MAX_EVENTS));
        }

        setLastUpdate(new Date());
      } catch {
        // silent fail
      }
    }

    fetchData();
    interval = setInterval(fetchData, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [watchlist.join(',')]);

  async function loadIntraday(symbol: string): Promise<void> {
    try {
      setIntradayErrors(prev => {
        const next = new Map(prev);
        next.delete(symbol);
        return next;
      });

      const data = await fetchIntraday(symbol);

      if (data.length > 0) {
        setIntradayData(prev => new Map(prev).set(symbol, data));
        return;
      }

      setIntradayData(prev => {
        const next = new Map(prev);
        next.delete(symbol);
        return next;
      });
      setIntradayErrors(prev => new Map(prev).set(symbol, 'Intraday request failed. Please confirm the stock code exists.'));
    } catch {
      setIntradayData(prev => {
        const next = new Map(prev);
        next.delete(symbol);
        return next;
      });
      setIntradayErrors(prev => new Map(prev).set(symbol, 'Intraday request failed. Please confirm the stock code exists.'));
    }
  }

  async function loadKLine(symbol: string, period: 'day' | 'week'): Promise<void> {
    try {
      const data = await fetchKLine(symbol, period);
      if (data.length > 0) {
        setKlineData(prev => new Map(prev).set(`${symbol}-${period}`, data));
      }
    } catch {
      // silent fail
    }
  }

  useInput(async (input, key) => {
    if (key.escape) {
      if (managingWatchlist) {
        setManagingWatchlist(false);
        setInputBuffer('');
      } else {
        exit();
      }
      return;
    }

    if (input === 'q' && !managingWatchlist) {
      exit();
      return;
    }

    if (input === 's' && !managingWatchlist) {
      setSafeMode(prev => !prev);
      setDetailOpen(false);
      return;
    }

    if (input === 'v' && !managingWatchlist) {
      setDetailOpen(prev => {
        if (!prev) {
          const symbol = watchlistRef.current[selectedIndexRef.current];
          if (symbol) {
            loadIntraday(symbol);
          }
        }
        return !prev;
      });
      setKlinePeriod('intraday');
      return;
    }

    if (input === 'd' && !managingWatchlist) {
      const symbol = watchlistRef.current[selectedIndexRef.current];
      if (symbol) {
        loadKLine(symbol, 'day');
        setKlinePeriod('day');
        setDetailOpen(true);
      }
      return;
    }

    if (input === 'w' && !managingWatchlist) {
      const symbol = watchlistRef.current[selectedIndexRef.current];
      if (symbol) {
        loadKLine(symbol, 'week');
        setKlinePeriod('week');
        setDetailOpen(true);
      }
      return;
    }

    if (input === 'a') {
      setManagingWatchlist(prev => !prev);
      setInputBuffer('');
      return;
    }

    if (input === 'c' && !managingWatchlist) {
      setPreset(current => {
        let next: DisguisePreset;
        if (current === 'Go') next = 'Java';
        else if (current === 'Java') next = 'Rust';
        else if (current === 'Rust') next = 'Claude';
        else if (current === 'Claude') next = 'Gemini';
        else if (current === 'Gemini') next = 'Codex';
        else next = 'Go';

        loadPreferences().then(prefs => {
          savePreferences({ ...prefs, defaultPreset: next });
        }).catch(() => {});

        return next;
      });
      return;
    }

    if (input === 'j') {
      setSelectedIndex(current => {
        const next = Math.min(current + 1, Math.max(watchlistRef.current.length - 1, 0));
        if (next !== current && detailOpen) {
          const symbol = watchlistRef.current[next];
          if (symbol) {
            if (klinePeriod === 'intraday') loadIntraday(symbol);
            else loadKLine(symbol, klinePeriod as 'day' | 'week');
          }
        }
        return next;
      });
      return;
    }

    if (input === 'k') {
      setSelectedIndex(current => {
        const next = Math.max(current - 1, 0);
        if (next !== current && detailOpen) {
          const symbol = watchlistRef.current[next];
          if (symbol) {
            if (klinePeriod === 'intraday') loadIntraday(symbol);
            else loadKLine(symbol, klinePeriod as 'day' | 'week');
          }
        }
        return next;
      });
      return;
    }

    if (managingWatchlist) {
      if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
        setInputBuffer(current => current.slice(0, -1));
        setWatchlistError(null);
        return;
      }

      if (key.return || input === '\r' || input === '\n') {
        const symbolToAdd = inputBuffer.trim();
        if (symbolToAdd.length === 0) return;

        setWatchlistError("正在验证股票代码...");
        try {
          const result = await fetchQuotes([symbolToAdd]);
          const quote = result.get(symbolToAdd);
          if (!quote || isNaN(quote.price) || quote.price === 0) {
            setWatchlistError(`⚠️ 找不到股票代码 "${symbolToAdd}"，请检查输入。`);
            return;
          }

          // Add to quotes map so the name is displayed immediately
          setQuotes(prev => {
            const merged = new Map(prev);
            const {normalized} = processQuote(quote);
            merged.set(symbolToAdd, normalized);
            return merged;
          });

          let nextWatchlist: string[];
          if (_initialWatchlist.length > 0) {
            nextWatchlist = [...watchlistRef.current, symbolToAdd];
          } else {
            nextWatchlist = await addSymbol(symbolToAdd);
          }
          setWatchlist(nextWatchlist);
          if (nextWatchlist.length > watchlistRef.current.length) {
            setSelectedIndex(Math.max(0, nextWatchlist.length - 1));
          }
          setInputBuffer('');
          setWatchlistError(null);
        } catch {
          setWatchlistError("⚠️ 验证请求失败，请稍后再试。");
        }
        return;
      }

      if (input === 'x') {
        const symbol = watchlistRef.current[selectedIndexRef.current];
        if (!symbol) return;
        let nextWatchlist: string[];
        if (_initialWatchlist.length > 0) {
          nextWatchlist = watchlistRef.current.filter(s => s !== symbol);
        } else {
          nextWatchlist = await removeSymbol(symbol);
        }
        setWatchlist(nextWatchlist);
        setSelectedIndex(current => Math.min(current, Math.max(nextWatchlist.length - 1, 0)));
        setWatchlistError(null);
        return;
      }

      if (/^\d$/.test(input)) {
        setInputBuffer(current => `${current}${input}`);
        setWatchlistError(null);
      }
    }
  });

  const focusedSymbol = watchlist[selectedIndex] || null;

  return {
    watchlist,
    managingWatchlist,
    inputBuffer,
    selectedIndex,
    events,
    quotes,
    intradayData,
    intradayErrors,
    safeMode,
    detailOpen,
    lastUpdate,
    focusedSymbol,
    preset,
    klineData,
    klinePeriod,
    watchlistError
  };
}
