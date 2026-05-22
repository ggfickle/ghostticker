import React from 'react';
import {Box, Text} from 'ink';
import type {QuoteEvent, EventLevel, NormalizedQuote} from '../../domain/quote.js';

interface LogStreamProps {
  events: QuoteEvent[];
  quotes: Map<string, NormalizedQuote>;
  maxLines?: number;
  safeMode?: boolean;
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

function rateLabel(event: QuoteEvent): string {
  const pct = Math.abs(event.changePercent);
  if (pct > 3) return 'accelerating';
  if (pct > 1) return event.changePercent > 0 ? 'rising' : 'declining';
  if (pct > 0.3) return 'stable';
  return 'stagnant';
}

function flowLabel(event: QuoteEvent): string {
  if (event.volume > 100000) return 'heavy';
  if (event.volume > 50000) return 'high';
  if (event.volume > 20000) return 'normal';
  if (event.volume > 5000) return 'low';
  return 'idle';
}

function trendArrow(event: QuoteEvent): string {
  if (event.state === 'surging') return ' ↗↗';
  if (event.state === 'rising') return ' ↗';
  if (event.state === 'dropping') return ' ↘↘';
  if (event.state === 'falling') return ' ↘';
  if (event.state === 'volatile') return ' ↕';
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

export function LogStream({events, quotes, maxLines = 20, safeMode = false}: LogStreamProps) {
  const displayEvents = events.slice(-maxLines);
  const anchor = displayEvents.at(-1)?.timestamp ?? new Date();
  const prelude = disguisePrelude(anchor);
  const epilogue = disguiseEpilogue(anchor);

  return (
    <Box flexDirection="column">
      {prelude.map((entry, index) => (
        <Box key={`prelude-${index}`}>
          <Text color="gray">[{entry.timestamp}] </Text>
          <Text color={LEVEL_COLORS[entry.level]}>{entry.level.padEnd(5)} </Text>
          <Text color="white">{entry.source}</Text>
          <Text color="gray"> - </Text>
          <Text color="white">{entry.message}</Text>
        </Box>
      ))}

      {displayEvents.map((event, index) => {
        const sign = event.changePercent >= 0 ? '+' : '';
        const quote = quotes.get(event.symbol);

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
                  <Text color="cyan">delta={sign}{event.changePercent.toFixed(2)}%</Text>
                  <Text color="gray">, </Text>
                  <Text color="white">rate={rateLabel(event)}</Text>
                  <Text color="gray">, </Text>
                  <Text color="white">flow={flowLabel(event)}</Text>
                  <Text color="cyan">{trendArrow(event)}</Text>
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
        <Box key={`epilogue-${index}`}>
          <Text color="gray">[{entry.timestamp}] </Text>
          <Text color={LEVEL_COLORS[entry.level]}>{entry.level.padEnd(5)} </Text>
          <Text color="white">{entry.source}</Text>
          <Text color="gray"> - </Text>
          <Text color="white">{entry.message}</Text>
        </Box>
      ))}
    </Box>
  );
}
