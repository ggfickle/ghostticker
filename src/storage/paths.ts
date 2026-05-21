import os from 'node:os';
import path from 'node:path';

const DATA_DIR_NAME = '.ghostticker';

function getHomeDirectory(): string {
  return process.env.HOME ?? os.homedir();
}

export function getDataDirectory(): string {
  return path.join(getHomeDirectory(), DATA_DIR_NAME);
}

export function getWatchlistPath(): string {
  return path.join(getDataDirectory(), 'watchlist.json');
}

export function getPreferencesPath(): string {
  return path.join(getDataDirectory(), 'preferences.json');
}
