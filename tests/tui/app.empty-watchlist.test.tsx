import React from 'react';
import {describe, expect, it} from 'vitest';
import {render} from 'ink-testing-library';
import {App} from '../../src/tui/App.js';

describe('App empty watchlist', () => {
  it('prompts the user to add symbols when watchlist is empty', () => {
    const {lastFrame} = render(
      <App
        view={{
          mode: 'quiet',
          watchlist: [],
          events: [],
          focusedSymbol: null,
          detailOpen: false,
          managingWatchlist: false,
          lastUpdatedAt: null
        }}
      />
    );

    expect(lastFrame()).toContain('No symbols saved yet');
    expect(lastFrame()).toContain('Press a to add symbols');
  });
});
