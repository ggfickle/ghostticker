import React from 'react';
import {Box, Text} from 'ink';
import type {QuoteEvent, EventLevel, NormalizedQuote} from '../../domain/quote.js';

export type DisguisePreset = 'Go' | 'Java' | 'Rust' | 'Claude' | 'Gemini' | 'Codex';

interface LogStreamProps {
  events: QuoteEvent[];
  quotes: Map<string, NormalizedQuote>;
  preset?: DisguisePreset;
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

// Preset-specific lists of Sources and Messages
type StandardPreset = Exclude<DisguisePreset, 'Claude' | 'Gemini' | 'Codex'>;

const PRESETS: Record<StandardPreset, {
  sources: readonly string[];
  messages: readonly string[];
  prelude: (anchor: Date) => Array<{timestamp: string; level: EventLevel; source: string; message: string}>;
  epilogue: (anchor: Date) => Array<{timestamp: string; level: EventLevel; source: string; message: string}>;
}> = {
  Go: {
    sources: ['sys.watcher', 'mux.worker', 'tty.sink', 'log.rotate', 'ipc.relay', 'proc.guard', 'cache.scan', 'delta.merge'],
    messages: [
      'poll window advanced cursor=tail status=ready',
      'frame sync stable backlog=0 route=local',
      'append checkpoint acknowledged sink=stdout',
      'flush gate open buffer=warm mode=stream',
      'cursor checkpoint persisted scope=session',
      'heartbeat ok latency=14ms lane=shadow',
      'batch coalesce complete shard=focus',
      'stream settle observed jitter=low'
    ],
    prelude: (anchor) => [
      { timestamp: offsetTimestamp(anchor, -7), level: 'TRACE', source: 'proc.supervisor', message: 'heartbeat ok latency=12ms lane=poller' },
      { timestamp: offsetTimestamp(anchor, -3), level: 'INFO', source: 'io.scheduler', message: 'flush window=quotes batch=4 mode=append' }
    ],
    epilogue: (anchor) => [
      { timestamp: offsetTimestamp(anchor, 4), level: 'TRACE', source: 'cache.relay', message: 'cursor advance shard=watchlist status=warm' },
      { timestamp: offsetTimestamp(anchor, 8), level: 'INFO', source: 'runtime.guard', message: 'tty frame commit=ok renderer=steady' }
    ]
  },
  Java: {
    sources: [
      'o.s.web.servlet.DispatcherServlet',
      'o.h.engine.transaction.internal.TransactionImpl',
      'o.s.b.w.embedded.tomcat.TomcatWebServer',
      'com.zaxxer.hikari.pool.HikariPool',
      'o.s.c.a.AnnotationConfigApplicationContext',
      'o.s.security.web.DefaultSecurityFilterChain'
    ],
    messages: [
      'Initializing Spring DispatcherServlet \'dispatcherServlet\'',
      'HikariPool-1 - Starting...',
      'HikariPool-1 - Start completed.',
      'Tomcat initialized with port(s): 8080 (http)',
      'Root WebApplicationContext: initialization completed in 2415 ms',
      'Spring Security Filter Chain initialized successfully',
      'Completed initialization in 12ms',
      'Active Profiles: [production, cloud]'
    ],
    prelude: (anchor) => [
      { timestamp: offsetTimestamp(anchor, -7), level: 'INFO', source: 'o.s.b.w.e.t.TomcatWebServer', message: 'Tomcat started on port(s): 8080 (http) with context path \'\'' },
      { timestamp: offsetTimestamp(anchor, -3), level: 'INFO', source: 'o.s.c.a.AnnotationConfigApplicationContext', message: 'Refreshing AnnotationConfigApplicationContext' }
    ],
    epilogue: (anchor) => [
      { timestamp: offsetTimestamp(anchor, 4), level: 'INFO', source: 'com.zaxxer.hikari.pool.HikariPool', message: 'HikariPool-1 - Pool stats (total=10, active=0, idle=10, waiting=0)' },
      { timestamp: offsetTimestamp(anchor, 8), level: 'TRACE', source: 'o.h.e.t.i.TransactionImpl', message: 'transaction committed successfully duration=3ms' }
    ]
  },
  Rust: {
    sources: ['cargo::build', 'cargo::compile', 'tokio::runtime', 'actix_web::server', 'sqlx::postgres', 'serde_json::de'],
    messages: [
      'Compiling core-sys v0.4.1',
      'Compiling tokio v1.28.0',
      'Compiling serde v1.0.160',
      'Finished release [optimized] target(s) in 4.52s',
      'sqlx connection pool established successfully',
      'actix-web workers started: count=8',
      'tokio multi-thread scheduler initialized',
      'parsed config file successfully path=Cargo.toml'
    ],
    prelude: (anchor) => [
      { timestamp: offsetTimestamp(anchor, -7), level: 'INFO', source: 'cargo::build', message: 'Checking dependencies...' },
      { timestamp: offsetTimestamp(anchor, -3), level: 'INFO', source: 'cargo::compile', message: 'Compiling workspace crates...' }
    ],
    epilogue: (anchor) => [
      { timestamp: offsetTimestamp(anchor, 4), level: 'INFO', source: 'cargo::build', message: 'Finished release [optimized] target(s) in 1.2s' },
      { timestamp: offsetTimestamp(anchor, 8), level: 'TRACE', source: 'tokio::runtime', message: 'binary compiled successfully path=target/release/ghostticker' }
    ]
  }
};

function buildDisguiseFill(anchor: Date, count: number, preset: StandardPreset): Array<{timestamp: string; level: EventLevel; source: string; message: string}> {
  const {sources, messages} = PRESETS[preset];
  return Array.from({length: count}, (_, index) => ({
    timestamp: offsetTimestamp(anchor, -18 + index * 2),
    level: index % 3 === 1 ? 'INFO' : 'TRACE',
    source: sources[index % sources.length]!,
    message: messages[index % messages.length]!
  }));
}

function disguiseMarketEvent(event: QuoteEvent, preset: StandardPreset): {timestamp: string; level: EventLevel; source: string; message: string} {
  const {sources, messages} = PRESETS[preset];
  const seconds = Math.abs(Math.round(event.changePercent * 10)) % 9;

  return {
    timestamp: formatTimestamp(event.timestamp),
    level: event.level,
    source: sources[Math.abs(event.symbol.length + seconds) % sources.length]!,
    message: messages[Math.abs(event.message.length + seconds) % messages.length]!
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

export function LogStream({events, quotes, preset = 'Go', maxLines = 20, safeMode = false, viewportRows}: LogStreamProps) {
  const displayEvents = latestEventsBySymbol(events).slice(-maxLines);
  const anchor = displayEvents.at(-1)?.timestamp ?? new Date();

  // Handle Claude Chat Disguise Mode
  if (preset === 'Claude') {
    if (safeMode) {
      return (
        <Box flexDirection="column" padding={1} borderStyle="single" borderColor="gray">
          <Box>
            <Text color="green" bold>Claude &gt; </Text>
            <Text color="white">Write a high-performance binary search algorithm in TypeScript.</Text>
          </Box>
          <Box marginY={1}>
            <Text color="gray">Thinking Process:</Text>
            <Text color="gray">  1. Understand the request: binary search algorithm.</Text>
            <Text color="gray">  2. Implementation details: typed, generics, safe boundary checks.</Text>
          </Box>
          <Box flexDirection="column">
            <Text color="white">Here is a clean and robust implementation of a binary search algorithm in TypeScript:</Text>
            <Box marginY={1} flexDirection="column" paddingX={2}>
              <Text color="cyan">export function binarySearch&lt;T&gt;(arr: T[], target: T): number &#123;</Text>
              <Text color="cyan">  let left = 0;</Text>
              <Text color="cyan">  let right = arr.length - 1;</Text>
              <Text color="cyan">  while (left &lt;= right) &#123;</Text>
              <Text color="cyan">    const mid = left + Math.floor((right - left) / 2);</Text>
              <Text color="cyan">    if (arr[mid] === target) return mid;</Text>
              <Text color="cyan">    if (arr[mid]! &lt; target) left = mid + 1;</Text>
              <Text color="cyan">    else right = mid - 1;</Text>
              <Text color="cyan">  &#125;</Text>
              <Text color="cyan">  return -1;</Text>
              <Text color="cyan">&#125;</Text>
            </Box>
            <Text color="white">This implementation runs in O(log n) time and is fully type-safe.</Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" padding={1} borderStyle="single" borderColor="cyan">
        <Box>
          <Text color="green" bold>Claude &gt; </Text>
          <Text color="white">review tests and check workspace task execution stability</Text>
        </Box>
        <Box marginY={1} flexDirection="column">
          <Text color="gray">Thinking Process:</Text>
          <Text color="gray">  1. Inspecting workspace watchlist symbols...</Text>
          <Text color="gray">  2. Fetching real-time execution latencies and logs...</Text>
          <Text color="gray">  3. Running telemetry and checking bounds...</Text>
        </Box>
        <Box flexDirection="column">
          <Text color="white" bold>I have completed the telemetry review for your workspace tasks:</Text>
          <Box flexDirection="column" marginY={1} paddingX={1}>
            {displayEvents.map((event, index) => {
              const quote = quotes.get(event.symbol);
              const changePercent = quote?.changePercent ?? event.changePercent;
              const volume = quote?.volume ?? event.volume;
              const state = quote?.state ?? event.state;
              const sign = changePercent >= 0 ? '+' : '';

              return (
                <Box key={`claude-task-${event.symbol}-${index}`} flexDirection="column" marginBottom={1}>
                  <Box>
                    <Text color="white">* </Text>
                    <Text color="cyan" bold>task.{event.symbol}</Text>
                    <Text color="white">: Benchmark completed in </Text>
                    <Text color="yellow" bold>{quote ? quote.lastPrice.toFixed(2) : event.price.toFixed(2)}ms</Text>
                    <Text color="white"> (</Text>
                    <Text color={changePercent >= 0 ? 'green' : 'red'}>delta={sign}{changePercent.toFixed(2)}%</Text>
                    <Text color="white">), flow=</Text>
                    <Text color="gray">{flowLabel(volume)}</Text>
                    <Text color="white">, rate=</Text>
                    <Text color="white">{rateLabel(changePercent)}</Text>
                    <Text color="cyan">{trendArrow(state)}</Text>
                  </Box>
                  {quote && (
                    <Box paddingLeft={4}>
                      <Text color="gray">┗ </Text>
                      <Text color="gray">[{quote.name} build, last_sync: {formatTimestamp(quote.updatedAt)}]</Text>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
          <Text color="white">All system jobs are running within normal parameters.</Text>
        </Box>
      </Box>
    );
  }

  // Handle Gemini Disguise Mode
  if (preset === 'Gemini') {
    if (safeMode) {
      return (
        <Box flexDirection="column" padding={1} borderStyle="single" borderColor="blue">
          <Box>
            <Text color="blue" bold>Gemini &gt; </Text>
            <Text color="white">Explain the concept of QuickSort and write a TypeScript implementation.</Text>
          </Box>
          <Box marginY={1} flexDirection="column">
            <Text color="gray">[Google AI Platform] Initializing model: gemini-2.5-pro...</Text>
            <Text color="gray">  - Token count: 184 prompt, 420 response</Text>
            <Text color="gray">  - Latency: 421ms (token generation steady)</Text>
          </Box>
          <Box flexDirection="column">
            <Text color="white">QuickSort is a highly efficient divide-and-conquer sorting algorithm. It works by selecting a 'pivot' element and partitioning the array around it.</Text>
            <Box marginY={1} flexDirection="column" paddingX={2}>
              <Text color="cyan">export function quickSort(arr: number[]): number[] &#123;</Text>
              <Text color="cyan">  if (arr.length &lt;= 1) return arr;</Text>
              <Text color="cyan">  const pivot = arr[arr.length - 1]!;</Text>
              <Text color="cyan">  const left = arr.slice(0, -1).filter(el =&gt; el &lt;= pivot);</Text>
              <Text color="cyan">  const right = arr.slice(0, -1).filter(el =&gt; el &gt; pivot);</Text>
              <Text color="cyan">  return [...quickSort(left), pivot, ...quickSort(right)];</Text>
              <Text color="cyan">&#125;</Text>
            </Box>
            <Text color="white">This algorithm has an average time complexity of O(n log n).</Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" padding={1} borderStyle="single" borderColor="blue">
        <Box>
          <Text color="blue" bold>Gemini &gt; </Text>
          <Text color="white">analyze active workspace dependencies and compute telemetry metrics</Text>
        </Box>
        <Box marginY={1} flexDirection="column">
          <Text color="gray">[Google AI Platform] Running analysis model: gemini-2.5-pro...</Text>
          <Text color="gray">  &gt; Compiling 8 background target structures...</Text>
          <Text color="gray">  &gt; Evaluating thread bounds and latency averages...</Text>
        </Box>
        <Box flexDirection="column">
          <Text color="white" bold>Here is the computed telemetry data for your active background tasks:</Text>
          <Box flexDirection="column" marginY={1} paddingX={1}>
            {displayEvents.map((event, index) => {
              const quote = quotes.get(event.symbol);
              const changePercent = quote?.changePercent ?? event.changePercent;
              const volume = quote?.volume ?? event.volume;
              const state = quote?.state ?? event.state;
              const sign = changePercent >= 0 ? '+' : '';

              return (
                <Box key={`gemini-task-${event.symbol}-${index}`} flexDirection="column" marginBottom={1}>
                  <Box>
                    <Text color="white">- </Text>
                    <Text color="cyan" bold>task.{event.symbol}</Text>
                    <Text color="white"> status: verified. Output execution latency: </Text>
                    <Text color="yellow" bold>{quote ? quote.lastPrice.toFixed(2) : event.price.toFixed(2)}ms</Text>
                    <Text color="white"> (</Text>
                    <Text color={changePercent >= 0 ? 'green' : 'red'}>{sign}{changePercent.toFixed(2)}%</Text>
                    <Text color="white">), flow_rate: </Text>
                    <Text color="white">{flowLabel(volume)}</Text>
                    <Text color="gray"> ({rateLabel(changePercent)})</Text>
                    <Text color="blue">{trendArrow(state)}</Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Text color="white">No memory leaks or abnormal stack execution detected in the active lane.</Text>
        </Box>
      </Box>
    );
  }

  // Handle Codex Disguise Mode
  if (preset === 'Codex') {
    if (safeMode) {
      return (
        <Box flexDirection="column" padding={1} borderStyle="single" borderColor="magenta">
          <Box>
            <Text color="magenta" bold>Copilot &gt; </Text>
            <Text color="white">/explain how to use React Context API safely in TypeScript.</Text>
          </Box>
          <Box marginY={1} flexDirection="column">
            <Text color="gray">[Copilot Codex] Generating explanation based on current context...</Text>
          </Box>
          <Box flexDirection="column">
            <Text color="white">To use React Context safely in TypeScript, it is best practice to create a custom hook that checks if the context is undefined (to prevent silent failures if used outside its Provider):</Text>
            <Box marginY={1} flexDirection="column" paddingX={2}>
              <Text color="cyan">export const useMyContext = () =&gt; &#123;</Text>
              <Text color="cyan">  const context = useContext(MyContext);</Text>
              <Text color="cyan">  if (context === undefined) &#123;</Text>
              <Text color="cyan">    throw new Error('useMyContext must be used within a MyProvider');</Text>
              <Text color="cyan">  &#125;</Text>
              <Text color="cyan">  return context;</Text>
              <Text color="cyan">&#125;</Text>
            </Box>
            <Text color="white">This enforces compile-time and runtime safety across your TUI components.</Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" padding={1} borderStyle="single" borderColor="magenta">
        <Box>
          <Text color="magenta" bold>Copilot &gt; </Text>
          <Text color="white">/explain the active workspace task profiles and latency benchmarks</Text>
        </Box>
        <Box marginY={1} flexDirection="column">
          <Text color="gray">[Copilot Codex] Analyzing workspace buffer context...</Text>
          <Text color="gray">  &gt; Found 8 symbol descriptors. Generating analysis report...</Text>
        </Box>
        <Box flexDirection="column">
          <Text color="white" bold>The active symbols in your current workspace are performing tasks with the following metrics:</Text>
          <Box flexDirection="column" marginY={1} paddingX={1}>
            {displayEvents.map((event, index) => {
              const quote = quotes.get(event.symbol);
              const changePercent = quote?.changePercent ?? event.changePercent;
              const volume = quote?.volume ?? event.volume;
              const state = quote?.state ?? event.state;
              const sign = changePercent >= 0 ? '+' : '';

              return (
                <Box key={`codex-task-${event.symbol}-${index}`} flexDirection="column" marginBottom={1}>
                  <Box>
                    <Text color="white">* </Text>
                    <Text color="cyan" bold>task.{event.symbol}</Text>
                    <Text color="white"> benchmark profile: price=</Text>
                    <Text color="yellow" bold>{quote ? quote.lastPrice.toFixed(2) : event.price.toFixed(2)}</Text>
                    <Text color="white">, delta=</Text>
                    <Text color={changePercent >= 0 ? 'green' : 'red'}>{sign}{changePercent.toFixed(2)}%</Text>
                    <Text color="white">, load_profile=</Text>
                    <Text color="white">{flowLabel(volume)}</Text>
                    <Text color="gray"> ({rateLabel(changePercent)})</Text>
                    <Text color="magenta">{trendArrow(state)}</Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Text color="white">All system indicators verify that the runtime scheduler remains completely stable.</Text>
        </Box>
      </Box>
    );
  }

  // Handle standard log streams (Go, Java, Rust)
  const displayPreset = preset as Exclude<DisguisePreset, 'Claude' | 'Gemini' | 'Codex'>;
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
  const prelude = [...buildDisguiseFill(anchor, Math.max(0, preludeCount - 2), displayPreset), ...PRESETS[displayPreset].prelude(anchor)];
  const epilogue = [...PRESETS[displayPreset].epilogue(anchor), ...buildDisguiseFill(new Date(anchor.getTime() + 12000), Math.max(0, epilogueCount - 2), displayPreset)];

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
              entry={disguiseMarketEvent(event, displayPreset)}
            />
          );
        }

        const taskPrefix = displayPreset === 'Java' ? 'org.quartz.job.task.' : displayPreset === 'Rust' ? 'tokio::task::' : 'task.';

        return (
          <Box key={`${event.symbol}-${event.timestamp.getTime()}-${index}`} flexDirection="column">
            <Box>
              <Text color="gray">[{formatTimestamp(event.timestamp)}] </Text>
              <Text color={LEVEL_COLORS[event.level]} bold>{event.level.padEnd(5)} </Text>
              <Text color="white">{taskPrefix}{event.symbol}</Text>
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
