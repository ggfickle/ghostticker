import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {watchlistSchema, type Watchlist} from '../domain/watchlist.js';
import {getDataDirectory, getWatchlistPath} from './paths.js';

async function ensureDataDirectory(): Promise<void> {
  await mkdir(getDataDirectory(), {recursive: true});
}

async function writeWatchlist(watchlist: Watchlist): Promise<void> {
  await ensureDataDirectory();
  await writeFile(getWatchlistPath(), `${JSON.stringify(watchlist, null, 2)}\n`, 'utf8');
}

export async function loadWatchlist(): Promise<Watchlist> {
  try {
    const raw = await readFile(getWatchlistPath(), 'utf8');
    return watchlistSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

export async function addSymbol(symbol: string): Promise<Watchlist> {
  const normalizedSymbol = symbol.trim();
  if (normalizedSymbol.length === 0) {
    return loadWatchlist();
  }

  const watchlist = await loadWatchlist();

  if (watchlist.includes(normalizedSymbol)) {
    return watchlist;
  }

  const nextWatchlist = [...watchlist, normalizedSymbol];
  await writeWatchlist(nextWatchlist);
  return nextWatchlist;
}

export async function removeSymbol(symbol: string): Promise<Watchlist> {
  const normalizedSymbol = symbol.trim();
  if (normalizedSymbol.length === 0) {
    return loadWatchlist();
  }

  const watchlist = await loadWatchlist();
  const nextWatchlist = watchlist.filter((item) => item !== normalizedSymbol);

  if (nextWatchlist.length === watchlist.length) {
    return watchlist;
  }

  await writeWatchlist(nextWatchlist);
  return nextWatchlist;
}
