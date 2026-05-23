import React from 'react';
import {Box, Text, useWindowSize} from 'ink';
import {EmptyWatchlist} from './components/EmptyWatchlist.js';
import {ManageWatchlist} from './components/ManageWatchlist.js';
import {LogStream} from './components/LogStream.js';
import {IntradayChart} from './components/IntradayChart.js';
import {KLineChart} from './components/KLineChart.js';
import {useAppController} from './useAppController.js';

function Header({lastUpdate, safeMode, preset}: {lastUpdate: Date | null; safeMode: boolean; preset: string}) {
  const formatTime = (d: Date) => {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <Box justifyContent="space-between" marginBottom={1}>
      <Box>
        <Text bold>ghostticker</Text>
        <Text color="gray"> | </Text>
        <Text color="white">session.{preset.toLowerCase()}.{safeMode ? 'safe' : 'quiet'}</Text>
      </Box>
      <Box>
        <Text color="white">
          {lastUpdate ? `last_sync ${formatTime(lastUpdate)}` : 'syncing...'}
        </Text>
      </Box>
    </Box>
  );
}

function StatusBar({focusedSymbol, detailOpen, safeMode, klinePeriod}: {
  focusedSymbol: string | null;
  detailOpen: boolean;
  safeMode: boolean;
  klinePeriod: string;
}) {
  return (
    <Box marginTop={1} justifyContent="space-between">
      <Box>
        {focusedSymbol && (
          <Text color="white">focus: task.{focusedSymbol} ({klinePeriod})</Text>
        )}
      </Box>
      <Box>
        <Text color="white">
          {detailOpen ? '[v/d/w] switch' : '[v] inspect'} {' '}
          {safeMode ? '[s] unsafe' : '[s] safe'} {' '}
          [c] preset {' '}
          [a] watchlist {' '}
          [q] exit
        </Text>
      </Box>
    </Box>
  );
}

export function App({initialWatchlist}: {initialWatchlist?: string[]}) {
  const {rows} = useWindowSize();
  const {
    watchlist,
    managingWatchlist,
    inputBuffer,
    selectedIndex,
    events,
    quotes,
    intradayData,
    intradayErrors,
    safeMode,
    detailOpen,
    lastUpdate,
    focusedSymbol,
    preset,
    klineData,
    klinePeriod,
    watchlistError
  } = useAppController(initialWatchlist || []);
  const reservedRows = 5 + (detailOpen && focusedSymbol ? 15 : 0);
  const logViewportRows = Math.max(8, rows - reservedRows);

  if (managingWatchlist) {
    return (
      <Box flexDirection="column">
        <Header lastUpdate={lastUpdate} safeMode={safeMode} preset={preset} />
        <ManageWatchlist
          watchlist={watchlist}
          inputBuffer={inputBuffer}
          selectedIndex={selectedIndex}
          quotes={quotes}
          errorMsg={watchlistError}
        />
      </Box>
    );
  }

  if (watchlist.length === 0) {
    return (
      <Box flexDirection="column">
        <Header lastUpdate={lastUpdate} safeMode={safeMode} preset={preset} />
        <EmptyWatchlist />
        <Box marginTop={1}>
          <Text color="white">[a] add symbols to start</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header lastUpdate={lastUpdate} safeMode={safeMode} preset={preset} />

      <LogStream events={events} quotes={quotes} preset={preset} safeMode={safeMode} viewportRows={logViewportRows} />

      {detailOpen && focusedSymbol && (
        <Box marginTop={1}>
          {klinePeriod === 'intraday' ? (
            <IntradayChart
              points={intradayData.get(focusedSymbol) || []}
              symbol={focusedSymbol}
              width={60}
              height={10}
              name={quotes.get(focusedSymbol)?.name}
              prevClose={quotes.get(focusedSymbol)?.prevClose}
              volume={quotes.get(focusedSymbol)?.volume}
              error={intradayErrors.get(focusedSymbol)}
            />
          ) : (
            <KLineChart
              points={klineData.get(`${focusedSymbol}-${klinePeriod}`) || []}
              period={klinePeriod as 'day' | 'week'}
              symbol={focusedSymbol}
              width={60}
              height={10}
              name={quotes.get(focusedSymbol)?.name}
              error={intradayErrors.get(focusedSymbol)}
            />
          )}
        </Box>
      )}

      <StatusBar focusedSymbol={focusedSymbol} detailOpen={detailOpen} safeMode={safeMode} klinePeriod={klinePeriod} />
    </Box>
  );
}
