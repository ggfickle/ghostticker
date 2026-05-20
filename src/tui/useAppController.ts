import {useInput} from 'ink';
import {useState} from 'react';
import type {Watchlist} from '../domain/watchlist.js';
import {addSymbol, loadWatchlist, removeSymbol} from '../storage/watchlistStore.js';

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
      if (nextWatchlist.length > watchlist.length) {
        setSelectedIndex(Math.max(0, nextWatchlist.length - 1));
      }
      setInputBuffer('');
      return;
    }

    if (input === 'x') {
      const symbol = watchlist[selectedIndex];
      if (!symbol) {
        return;
      }

      const nextWatchlist = await removeSymbol(symbol);
      setWatchlist(nextWatchlist);
      setSelectedIndex((current) => Math.min(current, Math.max(nextWatchlist.length - 1, 0)));
      return;
    }

    if (input === 'j') {
      setSelectedIndex((current) => Math.min(current + 1, Math.max(watchlist.length - 1, 0)));
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
