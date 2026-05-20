export type AppView = {
  mode: 'quiet';
  watchlist: string[];
  events: string[];
  focusedSymbol: string | null;
  detailOpen: boolean;
  managingWatchlist: boolean;
  lastUpdatedAt: string | null;
};
