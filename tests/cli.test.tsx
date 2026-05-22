import {afterEach, describe, expect, it, vi} from 'vitest';
import packageJson from '../package.json' with {type: 'json'};

describe('cli startup', () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('renders the App component', async () => {
    const waitUntilExit = vi.fn().mockResolvedValue(undefined);
    const unmount = vi.fn();
    const renderMock = vi.fn().mockReturnValue({unmount, waitUntilExit});

    vi.doMock('ink', () => ({
      render: renderMock
    }));

    await import('../src/cli.js');

    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it('prints help without rendering the TUI', async () => {
    const renderMock = vi.fn();
    const loadWatchlistMock = vi.fn();
    const logMock = vi.spyOn(console, 'log').mockImplementation(() => {});

    process.argv = ['node', 'gtr', '--help'];
    vi.doMock('ink', () => ({
      render: renderMock
    }));
    vi.doMock('../src/storage/watchlistStore.js', () => ({
      loadWatchlist: loadWatchlistMock
    }));

    await import('../src/cli.js');

    expect(logMock).toHaveBeenCalledWith(expect.stringContaining('Usage: gtr'));
    expect(loadWatchlistMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });

  it('prints version without rendering the TUI', async () => {
    const renderMock = vi.fn();
    const loadWatchlistMock = vi.fn();
    const logMock = vi.spyOn(console, 'log').mockImplementation(() => {});

    process.argv = ['node', 'gtr', '--version'];
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
