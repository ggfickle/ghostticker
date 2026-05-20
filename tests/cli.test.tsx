import {afterEach, describe, expect, it, vi} from 'vitest';

describe('cli startup', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('loads the persisted watchlist before rendering', async () => {
    const renderMock = vi.fn();
    const loadWatchlistMock = vi.fn().mockResolvedValue(['600519']);

    vi.doMock('ink', () => ({
      render: renderMock
    }));
    vi.doMock('../src/storage/watchlistStore.js', () => ({
      loadWatchlist: loadWatchlistMock
    }));

    await import('../src/cli.js');

    expect(loadWatchlistMock).toHaveBeenCalledTimes(1);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
