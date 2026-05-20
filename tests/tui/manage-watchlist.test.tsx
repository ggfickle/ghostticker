import React from 'react';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {render} from 'ink-testing-library';
import {App} from '../../src/tui/App.js';
import {addSymbol} from '../../src/storage/watchlistStore.js';

async function nextTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 15));
}

describe('manage watchlist flow', () => {
  let tempHome: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    tempHome = await mkdtemp(path.join(os.tmpdir(), 'worklog-stock-cli-manage-'));
    process.env.HOME = tempHome;
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    await rm(tempHome, {recursive: true, force: true});
  });

  it('shows the watchlist manager after pressing a', async () => {
    const app = render(<App initialInput={[]} />);

    app.stdin.write('a');
    await nextTick();

    expect(app.lastFrame()).toContain('Manage Watchlist');
  });

  it('renders the manager when the static view is already in managing mode', () => {
    const app = render(
      <App
        view={{
          mode: 'quiet',
          watchlist: ['600519'],
          events: [],
          focusedSymbol: '600519',
          detailOpen: false,
          managingWatchlist: true,
          lastUpdatedAt: null
        }}
      />
    );

    expect(app.lastFrame()).toContain('Manage Watchlist');
    expect(app.lastFrame()).toContain('600519');
  });

  it('adds a symbol after typing digits and pressing enter', async () => {
    const app = render(<App initialInput={[]} />);

    app.stdin.write('a');
    await nextTick();

    for (const digit of '600519') {
      app.stdin.write(digit);
      await nextTick();
    }

    expect(app.lastFrame()).toContain('Input: 600519');

    app.stdin.write('\r');
    await nextTick();

    const watchlistPath = path.join(tempHome, '.worklog-stock-cli', 'watchlist.json');
    const raw = await readFile(watchlistPath, 'utf8');

    expect(app.lastFrame()).toContain('600519');
    expect(JSON.parse(raw)).toEqual(['600519']);
  });

  it('deletes the current symbol after pressing x', async () => {
    await addSymbol('600519');
    const app = render(<App initialInput={['600519']} />);

    app.stdin.write('a');
    await nextTick();
    app.stdin.write('x');
    await nextTick();
    await nextTick();

    const watchlistPath = path.join(tempHome, '.worklog-stock-cli', 'watchlist.json');
    const raw = await readFile(watchlistPath, 'utf8');

    expect(app.lastFrame()).not.toContain('600519');
    expect(JSON.parse(raw)).toEqual([]);
  });

  it('moves selection with j and deletes the selected symbol', async () => {
    await addSymbol('600519');
    await addSymbol('000001');
    const app = render(<App initialInput={['600519', '000001']} />);

    app.stdin.write('a');
    await nextTick();
    app.stdin.write('j');
    await nextTick();
    expect(app.lastFrame()).toContain('> 000001');
    app.stdin.write('x');
    await nextTick();
    await nextTick();

    const watchlistPath = path.join(tempHome, '.worklog-stock-cli', 'watchlist.json');
    const raw = await readFile(watchlistPath, 'utf8');

    expect(app.lastFrame()).toContain('600519');
    expect(app.lastFrame()).not.toContain('000001');
    expect(JSON.parse(raw)).toEqual(['600519']);
  });

  it('keeps the current selection when enter is pressed with an empty buffer', async () => {
    await addSymbol('600519');
    await addSymbol('000001');
    const app = render(<App initialInput={['600519', '000001']} />);

    app.stdin.write('a');
    await nextTick();
    app.stdin.write('\r');
    await nextTick();
    await nextTick();

    const watchlistPath = path.join(tempHome, '.worklog-stock-cli', 'watchlist.json');
    const raw = await readFile(watchlistPath, 'utf8');

    expect(app.lastFrame()).toContain('> 600519');
    expect(JSON.parse(raw)).toEqual(['600519', '000001']);
  });

  it('returns to the main page after pressing a again', async () => {
    const app = render(<App initialInput={[]} />);

    app.stdin.write('a');
    await nextTick();
    app.stdin.write('a');
    await nextTick();

    expect(app.lastFrame()).toContain('No symbols saved yet');
    expect(app.lastFrame()).not.toContain('Manage Watchlist');
  });
});
