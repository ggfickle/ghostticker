import React from 'react';
import {Box, Text} from 'ink';

type ManageWatchlistProps = {
  watchlist: string[];
  inputBuffer: string;
  selectedIndex: number;
};

export function ManageWatchlist({
  watchlist,
  inputBuffer,
  selectedIndex
}: ManageWatchlistProps) {
  return (
    <Box flexDirection="column">
      <Text>Manage Watchlist</Text>
      <Text>Enter symbol and press Enter</Text>
      <Text>Input: {inputBuffer || '_'}</Text>
      <Text>Move: j/k  Delete: x  Exit: Esc or a</Text>
      <Box flexDirection="column" marginTop={1}>
        {watchlist.length === 0 ? (
          <Text>No saved symbols</Text>
        ) : (
          watchlist.map((symbol, index) => (
            <Text key={symbol}>
              {index === selectedIndex ? '> ' : '  '}
              {symbol}
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}
