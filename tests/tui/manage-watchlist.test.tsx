import React from 'react';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {render} from 'ink-testing-library';
import {App} from '../../src/tui/App.js';
import {addSymbol} from '../../src/storage/watchlistStore.js';

async function nextTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

describe('manage watchlist flow', () => {
  let tempHome: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    tempHome = await mkdtemp(path.join(os.tmpdir(), 'ghostticker-manage-'));
    process.env.HOME = tempHome;
  });

  afterEach(async () => {
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

  it('deletes the current symbol after pressing x', async () => {
    await addSymbol('600519');
    const app = render(<App />);
    await nextTick();

    app.stdin.write('a');
    await nextTick();
    app.stdin.write('x');
    await nextTick();
    await nextTick();
    await nextTick();

    const watchlistPath = path.join(tempHome, '.ghostticker', 'watchlist.json');
    const raw = await readFile(watchlistPath, 'utf8');

    expect(app.lastFrame()).not.toContain('600519');
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
});
