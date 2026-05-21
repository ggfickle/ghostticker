#!/usr/bin/env node
import {createRequire} from 'node:module';
import React from 'react';
import {render} from 'ink';
import {App} from './tui/App.js';
import {loadWatchlist} from './storage/watchlistStore.js';

const require = createRequire(import.meta.url);
const {version} = require('../package.json') as {version: string};
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: ghostticker

A local terminal TUI for quietly watching an A-share watchlist.

Options:
  -h, --help      Show this help
  -v, --version   Show version`);
} else if (args.includes('--version') || args.includes('-v')) {
  console.log(version);
} else {
  const watchlist = await loadWatchlist();

  render(<App initialInput={watchlist} />);
}
