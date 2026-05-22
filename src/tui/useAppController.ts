import {useApp, useInput} from 'ink';
import {useEffect, useRef, useState} from 'react';
import type {Watchlist} from '../domain/watchlist.js';
import type {QuoteEvent, NormalizedQuote, IntradayPoint} from '../domain/quote.js';
import {loadWatchlist, addSymbol, removeSymbol} from '../storage/watchlistStore.js';
import {fetchQuotes, fetchIntraday} from '../api/tencentAdapter.js';
import {processQuote} from '../engine/eventEngine.js';

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

  const watchlistRef = useRef(watchlist);
  const selectedIndexRef = useRef(selectedIndex);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    loadWatchlist().then(setWatchlist);
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
      return;
    }

    if (input === 'a') {
      setManagingWatchlist(prev => !prev);
      setInputBuffer('');
      return;
    }

    if (input === 'j') {
      setSelectedIndex(current => {
        const next = Math.min(current + 1, Math.max(watchlistRef.current.length - 1, 0));
        if (next !== current && detailOpen) {
          const symbol = watchlistRef.current[next];
          if (symbol) loadIntraday(symbol);
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
          if (symbol) loadIntraday(symbol);
        }
        return next;
      });
      return;
    }

    if (managingWatchlist) {
      if (key.backspace || key.delete || input === '\x7f' || input === '\b') {
        setInputBuffer(current => current.slice(0, -1));
        return;
      }

      if (key.return || input === '\r' || input === '\n') {
        const nextWatchlist = await addSymbol(inputBuffer);
        setWatchlist(nextWatchlist);
        if (nextWatchlist.length > watchlistRef.current.length) {
          setSelectedIndex(Math.max(0, nextWatchlist.length - 1));
        }
        setInputBuffer('');
        return;
      }

      if (input === 'x') {
        const symbol = watchlistRef.current[selectedIndexRef.current];
        if (!symbol) return;
        const nextWatchlist = await removeSymbol(symbol);
        setWatchlist(nextWatchlist);
        setSelectedIndex(current => Math.min(current, Math.max(nextWatchlist.length - 1, 0)));
        return;
      }

      if (/^\d$/.test(input)) {
        setInputBuffer(current => `${current}${input}`);
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
    focusedSymbol
  };
}
