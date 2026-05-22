import React from 'react';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render} from 'ink-testing-library';
import {App} from '../../src/tui/App.js';
import {addSymbol} from '../../src/storage/watchlistStore.js';

const {fetchIntradayMock} = vi.hoisted(() => ({
  fetchIntradayMock: vi.fn()
}));

vi.mock('../../src/api/tencentAdapter.js', () => ({
  fetchQuotes: vi.fn(async () => new Map([
    ['600519', {
      symbol: '600519',
      name: 'Kweichow Moutai',
      price: 1532.5,
      change: 12.4,
      changePercent: 0.81,
      open: 1520,
      high: 1535,
      low: 1510,
      prevClose: 1520.1,
      volume: 220000,
      amount: 1230000,
      time: '103215'
    }]
  ])),
  fetchIntraday: fetchIntradayMock
}));

async function nextTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function waitForFrame(assertion: () => void): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await nextTick();
    }
  }

  throw lastError;
}

describe('manage watchlist flow', () => {
  let tempHome: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    fetchIntradayMock.mockResolvedValue([
      {time: '0930', price: 10, volume: 100},
      {time: '1000', price: 10.3, volume: 120},
      {time: '1030', price: 10.3, volume: 140},
      {time: '1100', price: 9.9, volume: 160}
    ]);
    tempHome = await mkdtemp(path.join(os.tmpdir(), 'ghostticker-manage-'));
    process.env.HOME = tempHome;
  });

  afterEach(async () => {
    cleanup();
    process.env.HOME = originalHome;
    await rm(tempHome, {recursive: true, force: true});
  });

  it('shows the watchlist manager after pressing a', async () => {
    const app = render(<App />);
    await nextTick();

    app.stdin.write('a');
    await nextTick();

    expect(app.lastFrame()).toContain('Manage Watchlist');
  });

  it('adds a symbol after typing digits and pressing enter', async () => {
    const app = render(<App />);
    await nextTick();

    app.stdin.write('a');
    await nextTick();

    for (const digit of '600519') {
      app.stdin.write(digit);
      await nextTick();
    }

    expect(app.lastFrame()).toContain('Input: 600519');

    app.stdin.write('\r');
    await nextTick();

    const watchlistPath = path.join(tempHome, '.ghostticker', 'watchlist.json');
    const raw = await readFile(watchlistPath, 'utf8');

    expect(app.lastFrame()).toContain('600519');
    expect(JSON.parse(raw)).toEqual(['600519']);
  });

  it('removes the previous digit when pressing backspace while typing a symbol', async () => {
    const app = render(<App />);
    await nextTick();

    app.stdin.write('a');
    await nextTick();

    for (const digit of '1233') {
      app.stdin.write(digit);
      await nextTick();
    }

    app.stdin.write('\x7f');
    await nextTick();
    for (const digit of '456') {
      app.stdin.write(digit);
      await nextTick();
    }

    expect(app.lastFrame()).toContain('Input: 123456');
    expect(app.lastFrame()).not.toContain('Input: 1233456');
  });

  it('hides main page shortcuts while managing the watchlist', async () => {
    const app = render(<App />);
    await nextTick();

    app.stdin.write('a');
    await nextTick();

    expect(app.lastFrame()).toContain('Manage Watchlist');
    expect(app.lastFrame()).not.toContain('[q] exit');
    expect(app.lastFrame()).not.toContain('[v] inspect');
  });

  it('deletes the current symbol after pressing x', async () => {
    await addSymbol('600519');
    const app = render(<App />);
    await nextTick();

    app.stdin.write('a');
    await nextTick();
    await waitForFrame(() => {
      expect(app.lastFrame()).toContain('600519');
    });
    app.stdin.write('x');
    await waitForFrame(() => {
      expect(app.lastFrame()).not.toContain('600519');
    });

    const watchlistPath = path.join(tempHome, '.ghostticker', 'watchlist.json');
    const raw = await readFile(watchlistPath, 'utf8');

    expect(JSON.parse(raw)).toEqual([]);
  });

  it('returns to the main page after pressing a again', async () => {
    const app = render(<App />);
    await nextTick();

    app.stdin.write('a');
    await nextTick();
    app.stdin.write('a');
    await nextTick();

    expect(app.lastFrame()).toContain('No symbols saved yet');
    expect(app.lastFrame()).not.toContain('Manage Watchlist');
  });

  it('closes the intraday chart when safe mode is enabled', async () => {
    await addSymbol('600519');
    const app = render(<App />);
    await nextTick();
    await nextTick();

    app.stdin.write('v');
    await nextTick();
    await nextTick();

    expect(app.lastFrame()).toContain('prev_close');

    app.stdin.write('s');
    await nextTick();

    expect(app.lastFrame()).not.toContain('prev_close');
    expect(app.lastFrame()).not.toContain('Kweichow Moutai');
  });

  it('keeps running and shows an error when intraday data cannot load', async () => {
    fetchIntradayMock.mockRejectedValueOnce(new Error('not found'));
    await addSymbol('123456');
    const app = render(<App />);
    await nextTick();
    await nextTick();

    app.stdin.write('v');

    await waitForFrame(() => {
      expect(app.lastFrame()).toContain('task.123456 intraday sync failed');
    });
    expect(app.lastFrame()).toContain('Please confirm the stock code exists');
  });
});
