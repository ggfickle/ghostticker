import React from 'react';
import {render} from 'ink';
import {App} from './tui/App.js';
import type {AppView} from './tui/view.js';

const view: AppView = {
  mode: 'quiet',
  watchlist: [],
  events: [],
  focusedSymbol: null,
  detailOpen: false,
  managingWatchlist: false,
  lastUpdatedAt: null
};

render(
  <App view={view} />
);
