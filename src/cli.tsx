import React from 'react';
import {render} from 'ink';
import {App} from './tui/App.js';
import {loadWatchlist} from './storage/watchlistStore.js';

const watchlist = await loadWatchlist();

render(<App initialInput={watchlist} />);
