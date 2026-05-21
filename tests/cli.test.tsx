import {afterEach, describe, expect, it, vi} from 'vitest';
import packageJson from '../package.json' with {type: 'json'};

describe('cli startup', () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
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

  it('prints help without rendering the TUI', async () => {
    const renderMock = vi.fn();
    const loadWatchlistMock = vi.fn();
    const logMock = vi.spyOn(console, 'log').mockImplementation(() => {});

    process.argv = ['node', 'ghostticker', '--help'];
    vi.doMock('ink', () => ({
      render: renderMock
    }));
    vi.doMock('../src/storage/watchlistStore.js', () => ({
      loadWatchlist: loadWatchlistMock
    }));

    await import('../src/cli.js');

    expect(logMock).toHaveBeenCalledWith(expect.stringContaining('Usage: ghostticker'));
    expect(loadWatchlistMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });

  it('prints version without rendering the TUI', async () => {
    const renderMock = vi.fn();
    const loadWatchlistMock = vi.fn();
    const logMock = vi.spyOn(console, 'log').mockImplementation(() => {});

    process.argv = ['node', 'ghostticker', '--version'];
    vi.doMock('ink', () => ({
      render: renderMock
    }));
    vi.doMock('../src/storage/watchlistStore.js', () => ({
      loadWatchlist: loadWatchlistMock
    }));

    await import('../src/cli.js');

    expect(logMock).toHaveBeenCalledWith(packageJson.version);
    expect(loadWatchlistMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });
});
