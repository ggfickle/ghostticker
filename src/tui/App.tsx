import React from 'react';
import {Box, Text} from 'ink';
import {EmptyWatchlist} from './components/EmptyWatchlist.js';
import {ManageWatchlist} from './components/ManageWatchlist.js';
import {useAppController} from './useAppController.js';
import type {AppView} from './view.js';

type AppProps =
  | {view: AppView; initialInput?: never}
  | {initialInput: string[]; view?: undefined};

function renderView(view: AppView) {
  if (view.managingWatchlist) {
    return (
      <ManageWatchlist
        watchlist={view.watchlist}
        inputBuffer={view.inputBuffer ?? ''}
        selectedIndex={view.selectedIndex ?? 0}
      />
    );
  }

  if (view.watchlist.length === 0) {
    return <EmptyWatchlist />;
  }

  return (
    <Box flexDirection="column">
      <Text>Watchlist loaded</Text>
    </Box>
  );
}

export function App(props: AppProps) {
  if (props.view !== undefined) {
    return renderView(props.view);
  }

  const {watchlist, managingWatchlist, inputBuffer, selectedIndex} = useAppController(
    props.initialInput
  );

  return renderView({
    mode: 'quiet',
    watchlist,
    events: [],
    focusedSymbol: watchlist[selectedIndex] ?? null,
    detailOpen: false,
    managingWatchlist,
    lastUpdatedAt: null,
    inputBuffer,
    selectedIndex
  });
}
