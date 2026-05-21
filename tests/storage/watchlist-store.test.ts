import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {addSymbol, loadWatchlist} from '../../src/storage/watchlistStore.js';

describe('watchlist store', () => {
  let tempHome: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    tempHome = await mkdtemp(path.join(os.tmpdir(), 'ghostticker-watchlist-'));
    process.env.HOME = tempHome;
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    await rm(tempHome, {recursive: true, force: true});
  });

  it('persists unique symbols and creates the watchlist file', async () => {
    await addSymbol('600519');
    await addSymbol('600519');

    const watchlist = await loadWatchlist();
    const watchlistPath = path.join(tempHome, '.ghostticker', 'watchlist.json');
    const raw = await readFile(watchlistPath, 'utf8');

    expect(watchlist).toEqual(['600519']);
    expect(JSON.parse(raw)).toEqual(['600519']);
  });

  it('ignores blank symbols without corrupting the watchlist', async () => {
    await addSymbol('600519');
    await addSymbol('   ');

    const watchlist = await loadWatchlist();

    expect(watchlist).toEqual(['600519']);
  });
});
