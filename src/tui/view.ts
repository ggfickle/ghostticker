import type {Watchlist} from '../domain/watchlist.js';

export type AppView = {
  mode: 'quiet';
  watchlist: Watchlist;
  events: string[];
  focusedSymbol: string | null;
  detailOpen: boolean;
  managingWatchlist: boolean;
  lastUpdatedAt: string | null;
  inputBuffer?: string;
  selectedIndex?: number;
};
