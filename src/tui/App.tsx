import React from 'react';
import {EmptyWatchlist} from './components/EmptyWatchlist.js';
import type {AppView} from './view.js';

export function App({view}: {view: AppView}) {
  if (view.watchlist.length === 0) {
    return <EmptyWatchlist />;
  }

  return null;
}
