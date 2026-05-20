import {useInput} from 'ink';
import {useEffect, useRef, useState} from 'react';
import type {Watchlist} from '../domain/watchlist.js';
import {addSymbol, removeSymbol} from '../storage/watchlistStore.js';

type AppControllerState = {
  watchlist: Watchlist;
  managingWatchlist: boolean;
  inputBuffer: string;
  selectedIndex: number;
};

export function useAppController(initialWatchlist: Watchlist) {
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [managingWatchlist, setManagingWatchlist] = useState(false);
  const [inputBuffer, setInputBuffer] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const watchlistRef = useRef(watchlist);
  const selectedIndexRef = useRef(selectedIndex);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useInput(async (input, key) => {
    if (key.escape) {
      setManagingWatchlist(false);
      setInputBuffer('');
      return;
    }

    if (input === 'a') {
      setManagingWatchlist((current) => !current);
      setInputBuffer('');
      return;
    }

    if (!managingWatchlist) {
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
      if (!symbol) {
        return;
      }

      const nextWatchlist = await removeSymbol(symbol);
      setWatchlist(nextWatchlist);
      setSelectedIndex((current) => Math.min(current, Math.max(nextWatchlist.length - 1, 0)));
      return;
    }

    if (input === 'j') {
      setSelectedIndex((current) =>
        Math.min(current + 1, Math.max(watchlistRef.current.length - 1, 0))
      );
      return;
    }

    if (input === 'k') {
      setSelectedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (/^\d$/.test(input)) {
      setInputBuffer((current) => `${current}${input}`);
    }
  });

  const state: AppControllerState = {
    watchlist,
    managingWatchlist,
    inputBuffer,
    selectedIndex
  };

  return state;
}
