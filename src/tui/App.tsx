import React from 'react';
import {Box, Text} from 'ink';
import {EmptyWatchlist} from './components/EmptyWatchlist.js';
import {ManageWatchlist} from './components/ManageWatchlist.js';
import {LogStream} from './components/LogStream.js';
import {IntradayChart} from './components/IntradayChart.js';
import {useAppController} from './useAppController.js';

function Header({lastUpdate, safeMode}: {lastUpdate: Date | null; safeMode: boolean}) {
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
        <Text color="white">session.{safeMode ? 'safe' : 'quiet'}</Text>
      </Box>
      <Box>
        <Text color="white">
          {lastUpdate ? `last_sync ${formatTime(lastUpdate)}` : 'syncing...'}
        </Text>
      </Box>
    </Box>
  );
}

function StatusBar({focusedSymbol, detailOpen, safeMode}: {
  focusedSymbol: string | null;
  detailOpen: boolean;
  safeMode: boolean;
}) {
  return (
    <Box marginTop={1} justifyContent="space-between">
      <Box>
        {focusedSymbol && (
          <Text color="white">focus: task.{focusedSymbol}</Text>
        )}
      </Box>
      <Box>
        <Text color="white">
          {detailOpen ? '[v] collapse' : '[v] inspect'} {' '}
          {safeMode ? '[s] unsafe' : '[s] safe'} {' '}
          [a] watchlist {' '}
          [q] exit
        </Text>
      </Box>
    </Box>
  );
}

export function App() {
  const {
    watchlist,
    managingWatchlist,
    inputBuffer,
    selectedIndex,
    events,
    quotes,
    intradayData,
    safeMode,
    detailOpen,
    lastUpdate,
    focusedSymbol
  } = useAppController([]);

  if (managingWatchlist) {
    return (
      <Box flexDirection="column">
        <Header lastUpdate={lastUpdate} safeMode={safeMode} />
        <ManageWatchlist
          watchlist={watchlist}
          inputBuffer={inputBuffer}
          selectedIndex={selectedIndex}
        />
        <StatusBar focusedSymbol={focusedSymbol} detailOpen={detailOpen} safeMode={safeMode} />
      </Box>
    );
  }

  if (watchlist.length === 0) {
    return (
      <Box flexDirection="column">
        <Header lastUpdate={lastUpdate} safeMode={safeMode} />
        <EmptyWatchlist />
        <Box marginTop={1}>
          <Text color="white">[a] add symbols to start</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header lastUpdate={lastUpdate} safeMode={safeMode} />

      <LogStream events={events} quotes={quotes} safeMode={safeMode} />

      {detailOpen && focusedSymbol && (
        <Box marginTop={1}>
          <IntradayChart
            points={intradayData.get(focusedSymbol) || []}
            symbol={focusedSymbol}
            width={60}
            height={10}
            name={quotes.get(focusedSymbol)?.name}
            prevClose={quotes.get(focusedSymbol)?.prevClose}
            volume={quotes.get(focusedSymbol)?.volume}
          />
        </Box>
      )}

      <StatusBar focusedSymbol={focusedSymbol} detailOpen={detailOpen} safeMode={safeMode} />
    </Box>
  );
}
