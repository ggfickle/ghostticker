import React from 'react';
import {Box, Text} from 'ink';

export function EmptyWatchlist() {
  return (
    <Box flexDirection="column">
      <Text>No symbols saved yet</Text>
      <Text>Press a to add symbols</Text>
    </Box>
  );
}
