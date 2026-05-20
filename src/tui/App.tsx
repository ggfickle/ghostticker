import React from 'react';
import {Box, Text} from 'ink';
import {EmptyWatchlist} from './components/EmptyWatchlist.js';
import {ManageWatchlist} from './components/ManageWatchlist.js';
import {useAppController} from './useAppController.js';
import type {AppView} from './view.js';

type AppProps =
  | {view: AppView; initialInput?: never}
  | {initialInput: string[]; view?: undefined};

export function App(props: AppProps) {
  if (props.view !== undefined) {
    const {view} = props;
    if (view.watchlist.length === 0) {
      return <EmptyWatchlist />;
    }

    return (
      <Box flexDirection="column">
        <Text>Watchlist loaded</Text>
      </Box>
    );
  }

  const {watchlist, managingWatchlist, inputBuffer, selectedIndex} = useAppController(
    props.initialInput
  );

  if (managingWatchlist) {
    return (
      <ManageWatchlist
        watchlist={watchlist}
        inputBuffer={inputBuffer}
        selectedIndex={selectedIndex}
      />
    );
  }

  if (watchlist.length === 0) {
    return <EmptyWatchlist />;
  }

  return (
    <Box flexDirection="column">
      <Text>Watchlist loaded</Text>
    </Box>
  );
}
