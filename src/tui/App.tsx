import React from 'react';
import {Box, Text} from 'ink';
import {EmptyWatchlist} from './components/EmptyWatchlist.js';
import {ManageWatchlist} from './components/ManageWatchlist.js';
import {useAppController} from './useAppController.js';
import type {AppView} from './view.js';

type AppProps =
  | {view: AppView; initialInput?: never}
  | {initialInput: string[]; view?: undefined};

type ControllerView = {
  watchlist: AppView['watchlist'];
  managingWatchlist: boolean;
  inputBuffer: string;
  selectedIndex: number;
};

function renderView(view: AppView, controller?: ControllerView) {
  if (view.managingWatchlist) {
    return (
      <ManageWatchlist
        watchlist={view.watchlist}
        inputBuffer=""
        selectedIndex={0}
      />
    );
  }

  if ((controller?.managingWatchlist ?? view.managingWatchlist) && controller) {
    return (
      <ManageWatchlist
        watchlist={controller.watchlist}
        inputBuffer={controller.inputBuffer}
        selectedIndex={controller.selectedIndex}
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

  return renderView(
    {
      mode: 'quiet',
      watchlist,
      events: [],
      focusedSymbol: watchlist[selectedIndex] ?? null,
      detailOpen: false,
      managingWatchlist,
      lastUpdatedAt: null
    },
    {
      watchlist,
      managingWatchlist,
      inputBuffer,
      selectedIndex
    }
  );
}
