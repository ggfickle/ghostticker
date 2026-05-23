#!/usr/bin/env node
import {createRequire} from 'node:module';
import React from 'react';
import {render} from 'ink';
import {App} from './tui/App.js';

const require = createRequire(import.meta.url);
const {version} = require('../package.json') as {version: string};
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: gtr

A local terminal TUI for quietly watching an A-share watchlist.

Options:
  -h, --help      Show this help
  -v, --version   Show version`);
} else if (args.includes('--version') || args.includes('-v')) {
  console.log(version);
} else {
  // Enter alternate screen buffer
  process.stdout.write('\x1b[?1049h');
  // Hide cursor
  process.stdout.write('\x1b[?25l');

  const cleanup = () => {
    // Show cursor
    process.stdout.write('\x1b[?25h');
    // Leave alternate screen buffer
    process.stdout.write('\x1b[?1049l');
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  const initialWatchlist = args.filter(arg => !arg.startsWith('-'));
  const {waitUntilExit} = render(<App initialWatchlist={initialWatchlist} />);

  await waitUntilExit();
  cleanup();
}
