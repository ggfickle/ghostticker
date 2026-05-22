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
});
