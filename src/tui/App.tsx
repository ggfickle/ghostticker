import React from 'react';
import {EmptyWatchlist} from './components/EmptyWatchlist.js';

type AppView = {
  watchlist: string[];
};

export function App({view}: {view: AppView}) {
  if (view.watchlist.length === 0) {
    return <EmptyWatchlist />;
  }

  return null;
}
