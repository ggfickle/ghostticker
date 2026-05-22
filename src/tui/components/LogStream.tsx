import React from 'react';
import {Box, Text} from 'ink';
import type {QuoteEvent, EventLevel, NormalizedQuote} from '../../domain/quote.js';

interface LogStreamProps {
  events: QuoteEvent[];
  quotes: Map<string, NormalizedQuote>;
  maxLines?: number;
  safeMode?: boolean;
  viewportRows?: number;
}

const LEVEL_COLORS: Record<EventLevel, string> = {
  TRACE: 'gray',
  INFO: 'cyan',
  WARN: 'yellow'
};

function formatTimestamp(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function offsetTimestamp(date: Date, seconds: number): string {
  return formatTimestamp(new Date(date.getTime() + seconds * 1000));
}

function formatVolume(vol: number): string {
  if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
  if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
  return vol.toFixed(0);
}

function rateLabel(changePercent: number): string {
  const pct = Math.abs(changePercent);
  if (pct > 3) return 'accelerating';
  if (pct > 1) return changePercent > 0 ? 'rising' : 'declining';
  if (pct > 0.3) return 'stable';
  return 'stagnant';
}

function flowLabel(volume: number): string {
  if (volume > 100000) return 'heavy';
  if (volume > 50000) return 'high';
  if (volume > 20000) return 'normal';
  if (volume > 5000) return 'low';
  return 'idle';
}

function trendArrow(state?: string): string {
  if (state === 'surging') return ' ↗↗';
  if (state === 'rising') return ' ↗';
  if (state === 'dropping') return ' ↘↘';
  if (state === 'falling') return ' ↘';
  if (state === 'volatile') return ' ↕';
  return '';
}

function disguisePrelude(anchor: Date): Array<{timestamp: string; level: EventLevel; source: string; message: string}> {
  return [
    {
      timestamp: offsetTimestamp(anchor, -7),
      level: 'TRACE',
      source: 'proc.supervisor',
      message: 'heartbeat ok latency=12ms lane=poller'
    },
    {
      timestamp: offsetTimestamp(anchor, -3),
      level: 'INFO',
      source: 'io.scheduler',
      message: 'flush window=quotes batch=4 mode=append'
    }
  ];
}

function disguiseEpilogue(anchor: Date): Array<{timestamp: string; level: EventLevel; source: string; message: string}> {
  return [
    {
      timestamp: offsetTimestamp(anchor, 4),
      level: 'TRACE',
      source: 'cache.relay',
      message: 'cursor advance shard=watchlist status=warm'
    },
    {
      timestamp: offsetTimestamp(anchor, 8),
      level: 'INFO',
      source: 'runtime.guard',
      message: 'tty frame commit=ok renderer=steady'
    }
  ];
}

const FILLER_SOURCES = [
  'sys.watcher',
  'mux.worker',
  'tty.sink',
  'log.rotate',
  'ipc.relay',
  'proc.guard',
  'cache.scan',
  'delta.merge'
] as const;

const FILLER_MESSAGES = [
  'poll window advanced cursor=tail status=ready',
  'frame sync stable backlog=0 route=local',
  'append checkpoint acknowledged sink=stdout',
  'flush gate open buffer=warm mode=stream',
  'cursor checkpoint persisted scope=session',
  'heartbeat ok latency=14ms lane=shadow',
  'batch coalesce complete shard=focus',
  'stream settle observed jitter=low'
] as const;

function buildDisguiseFill(anchor: Date, count: number): Array<{timestamp: string; level: EventLevel; source: string; message: string}> {
  return Array.from({length: count}, (_, index) => ({
    timestamp: offsetTimestamp(anchor, -18 + index * 2),
    level: index % 3 === 1 ? 'INFO' : 'TRACE',
    source: FILLER_SOURCES[index % FILLER_SOURCES.length]!,
    message: FILLER_MESSAGES[index % FILLER_MESSAGES.length]!
  }));
}

function disguiseMarketEvent(event: QuoteEvent): {timestamp: string; level: EventLevel; source: string; message: string} {
  const seconds = Math.abs(Math.round(event.changePercent * 10)) % 9;

  return {
    timestamp: formatTimestamp(event.timestamp),
    level: event.level,
    source: FILLER_SOURCES[Math.abs(event.symbol.length + seconds) % FILLER_SOURCES.length]!,
    message: FILLER_MESSAGES[Math.abs(event.message.length + seconds) % FILLER_MESSAGES.length]!
  };
}

function latestEventsBySymbol(events: QuoteEvent[]): QuoteEvent[] {
  const latestBySymbol = new Map<string, QuoteEvent>();

  for (const event of events) {
    latestBySymbol.set(event.symbol, event);
  }

  return Array.from(latestBySymbol.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function DisguiseLogLine({entry}: {entry: {timestamp: string; level: EventLevel; source: string; message: string}}) {
  return (
    <Box>
      <Text color="gray">[{entry.timestamp}] </Text>
      <Text color={LEVEL_COLORS[entry.level]}>{entry.level.padEnd(5)} </Text>
      <Text color="white">{entry.source}</Text>
      <Text color="gray"> - </Text>
      <Text color="white">{entry.message}</Text>
    </Box>
  );
}

export function LogStream({events, quotes, maxLines = 20, safeMode = false, viewportRows}: LogStreamProps) {
  const displayEvents = latestEventsBySymbol(events).slice(-maxLines);
  const anchor = displayEvents.at(-1)?.timestamp ?? new Date();
  const eventRows = displayEvents.reduce((count, event) => {
    const quote = quotes.get(event.symbol);
    if (safeMode || !quote) {
      return count + 1;
    }

    return count + 2;
  }, 0);
  const minimumShellRows = 4;
  const targetRows = Math.max(viewportRows ?? 0, eventRows + minimumShellRows);
  const shellRows = Math.max(minimumShellRows, targetRows - eventRows);
  const preludeCount = Math.ceil(shellRows / 2);
  const epilogueCount = Math.floor(shellRows / 2);
  const prelude = [...buildDisguiseFill(anchor, Math.max(0, preludeCount - 2)), ...disguisePrelude(anchor)];
  const epilogue = [...disguiseEpilogue(anchor), ...buildDisguiseFill(new Date(anchor.getTime() + 12000), Math.max(0, epilogueCount - 2))];

  return (
    <Box flexDirection="column">
      {prelude.map((entry, index) => (
        <DisguiseLogLine key={`prelude-${index}`} entry={entry} />
      ))}

      {displayEvents.map((event, index) => {
        const quote = quotes.get(event.symbol);
        const changePercent = quote?.changePercent ?? event.changePercent;
        const volume = quote?.volume ?? event.volume;
        const state = quote?.state ?? event.state;
        const sign = changePercent >= 0 ? '+' : '';

        if (safeMode) {
          return (
            <DisguiseLogLine
              key={`${event.symbol}-${event.timestamp.getTime()}-${index}`}
              entry={disguiseMarketEvent(event)}
            />
          );
        }

        return (
          <Box key={`${event.symbol}-${event.timestamp.getTime()}-${index}`} flexDirection="column">
            <Box>
              <Text color="gray">[{formatTimestamp(event.timestamp)}] </Text>
              <Text color={LEVEL_COLORS[event.level]} bold>{event.level.padEnd(5)} </Text>
              <Text color="white">task.{event.symbol}</Text>
              <Text color="gray"> - </Text>
              <Text color="white">{event.message}</Text>
              <Text color="gray">: </Text>
              {!safeMode && (
                <>
                  <Text color="cyan">delta={sign}{changePercent.toFixed(2)}%</Text>
                  <Text color="gray">, </Text>
                  <Text color="white">rate={rateLabel(changePercent)}</Text>
                  <Text color="gray">, </Text>
                  <Text color="white">flow={flowLabel(volume)}</Text>
                  <Text color="cyan">{trendArrow(state)}</Text>
                </>
              )}
            </Box>
            {quote && !safeMode && (
              <Box paddingLeft={4}>
                <Text color="white">┗ [{quote.name}</Text>
                <Text color="gray"> | </Text>
                <Text color="cyan">{quote.lastPrice.toFixed(2)}</Text>
                <Text color="gray"> | vol </Text>
                <Text color="white">{formatVolume(quote.volume)}]</Text>
              </Box>
            )}
          </Box>
        );
      })}

      {epilogue.map((entry, index) => (
        <DisguiseLogLine key={`epilogue-${index}`} entry={entry} />
      ))}
    </Box>
  );
}
