import React from 'react';
import {Box, Text} from 'ink';
import type {Watchlist} from '../../domain/watchlist.js';
import type {NormalizedQuote} from '../../domain/quote.js';

type ManageWatchlistProps = {
  watchlist: Watchlist;
  inputBuffer: string;
  selectedIndex: number;
  quotes: Map<string, NormalizedQuote>;
  errorMsg?: string | null;
};

export function ManageWatchlist({
  watchlist,
  inputBuffer,
  selectedIndex,
  quotes,
  errorMsg
}: ManageWatchlistProps) {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="cyan" bold>Manage Watchlist</Text>
      <Text color="gray">Enter symbol and press Enter (A-share code, e.g. 000001)</Text>
      <Box marginY={1}>
        <Text color="white">Input: </Text>
        <Text color="green" bold>{inputBuffer || '_'}</Text>
      </Box>

      {errorMsg && (
        <Box marginBottom={1}>
          <Text color="yellow" bold>{errorMsg}</Text>
        </Box>
      )}

      <Text color="gray">Move: j/k  |  Delete: x  |  Exit: Esc or a</Text>
      <Box flexDirection="column" marginTop={1}>
        {watchlist.length === 0 ? (
          <Text color="gray">No saved symbols</Text>
        ) : (
          watchlist.map((symbol, index) => {
            const quote = quotes.get(symbol);
            const name = quote?.name;
            const displayName = name ? ` (${name})` : '';
            return (
              <Text key={symbol} color={index === selectedIndex ? 'cyan' : 'white'} bold={index === selectedIndex}>
                {index === selectedIndex ? '> ' : '  '}
                {symbol}{displayName}
              </Text>
            );
          })
        )}
      </Box>
    </Box>
  );
}
