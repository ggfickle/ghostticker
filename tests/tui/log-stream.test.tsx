import React from 'react';
import {describe, expect, it} from 'vitest';
import {render} from 'ink-testing-library';
import {LogStream} from '../../src/tui/components/LogStream.js';
import type {NormalizedQuote, QuoteEvent} from '../../src/domain/quote.js';

function sampleEvent(): QuoteEvent {
  return {
    level: 'WARN',
    symbol: '600519',
    message: 'state shift detected',
    timestamp: new Date('2026-05-21T10:32:15'),
    price: 1532.5,
    change: 12.4,
    changePercent: 0.81,
    volume: 220000,
    amount: 1230000,
    state: 'rising'
  };
}

function sampleEventAt(timestamp: string, changePercent = 0.81): QuoteEvent {
  return {
    ...sampleEvent(),
    timestamp: new Date(timestamp),
    price: 1532.5 + changePercent,
    changePercent
  };
}

function sampleQuote(): NormalizedQuote {
  return {
    symbol: '600519',
    name: 'Kweichow Moutai',
    lastPrice: 1532.5,
    changePercent: 0.81,
    prevClose: 1520.1,
    intradaySeries: [],
    volume: 220000,
    turnover: 1230000,
    updatedAt: new Date('2026-05-21T10:32:15'),
    rateBucket: 1,
    flowBucket: 2,
    state: 'rising',
    eventLevel: 'WARN',
    focusScore: 88
  };
}

describe('LogStream', () => {
  it('renders disguise log lines above and below market events', () => {
    const quotes = new Map([[sampleQuote().symbol, sampleQuote()]]);
    const app = render(
      <LogStream
        events={[sampleEvent()]}
        quotes={quotes}
      />
    );

    const frame = app.lastFrame();

    expect(frame).toContain('proc.supervisor');
    expect(frame).toContain('runtime.guard');
    expect(frame).toContain('task.600519');
    expect(frame).toContain('Kweichow Moutai');
  });

  it('fills the viewport with disguise logs when market activity is sparse', () => {
    const quotes = new Map([[sampleQuote().symbol, sampleQuote()]]);
    const app = render(
      <LogStream
        events={[sampleEvent()]}
        quotes={quotes}
        viewportRows={12}
      />
    );

    const frame = app.lastFrame() ?? '';
    const lines = frame.split('\n').filter(Boolean);
    const disguiseLines = lines.filter((line) =>
      /(proc\.supervisor|io\.scheduler|cache\.relay|runtime\.guard|sys\.watcher|mux\.worker|tty\.sink|log\.rotate)/.test(line)
    );

    expect(lines.length).toBeGreaterThanOrEqual(10);
    expect(disguiseLines.length).toBeGreaterThanOrEqual(6);
  });

  it('fully disguises market rows in safe mode', () => {
    const quotes = new Map([[sampleQuote().symbol, sampleQuote()]]);
    const app = render(
      <LogStream
        events={[sampleEvent()]}
        quotes={quotes}
        safeMode
      />
    );

    const frame = app.lastFrame();

    expect(frame).not.toContain('task.600519');
    expect(frame).not.toContain('Kweichow Moutai');
    expect(frame).not.toContain('delta=');
    expect(frame).toContain('proc.supervisor');
    expect(frame).toContain('runtime.guard');
  });

  it('renders only the latest event for each symbol in the visible log stream', () => {
    const quotes = new Map([[sampleQuote().symbol, sampleQuote()]]);
    const app = render(
      <LogStream
        events={[
          sampleEventAt('2026-05-21T10:31:15', 0.51),
          sampleEventAt('2026-05-21T10:32:15', 0.81)
        ]}
        quotes={quotes}
      />
    );

    const frame = app.lastFrame() ?? '';
    const matches = frame.match(/task\.600519/g) ?? [];

    expect(matches).toHaveLength(1);
    expect(frame).toContain('delta=+0.81%');
    expect(frame).not.toContain('delta=+0.51%');
  });

  it('uses the latest quote snapshot for visible market metrics', () => {
    const quote = {
      ...sampleQuote(),
      changePercent: 2.21,
      volume: 80000
    };
    const quotes = new Map([[quote.symbol, quote]]);
    const app = render(
      <LogStream
        events={[sampleEventAt('2026-05-21T10:32:15', 0.51)]}
        quotes={quotes}
      />
    );

    const frame = app.lastFrame();

    expect(frame).toContain('delta=+2.21%');
    expect(frame).toContain('rate=rising');
    expect(frame).toContain('flow=high');
    expect(frame).not.toContain('delta=+0.51%');
  });
});
