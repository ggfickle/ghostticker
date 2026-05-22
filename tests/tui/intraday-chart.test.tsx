import React from 'react';
import {describe, expect, it} from 'vitest';
import {render} from 'ink-testing-library';
import {IntradayChart} from '../../src/tui/components/IntradayChart.js';
import type {IntradayPoint} from '../../src/domain/quote.js';

function samplePoints(): IntradayPoint[] {
  return [
    {time: '0930', price: 10, volume: 100},
    {time: '1000', price: 10.3, volume: 120},
    {time: '1030', price: 10.3, volume: 140},
    {time: '1100', price: 9.9, volume: 160},
    {time: '1130', price: 10.1, volume: 180}
  ];
}

describe('IntradayChart', () => {
  it('renders a smooth braille curve with a dashed prev-close baseline', () => {
    const app = render(
      <IntradayChart
        points={samplePoints()}
        symbol="600519"
        name="Kweichow Moutai"
        prevClose={10}
        volume={320000}
        width={12}
        height={5}
      />
    );

    const frame = app.lastFrame();

    expect(frame).toContain('task.600519');
    expect(frame).toContain('prev_close 10.00');
    expect(frame).toMatch(/[\u2800-\u28ff]/u);
    expect(frame).not.toMatch(/[╱╲]/);
  });

  it('avoids framed block-chart rendering', () => {
    const app = render(
      <IntradayChart
        points={samplePoints()}
        symbol="600519"
        prevClose={10}
        width={12}
        height={5}
      />
    );

    const frame = app.lastFrame();

    expect(frame).not.toMatch(/[▁▂▃▄▅▆▇█]/);
    expect(frame).not.toMatch(/[╭╮╰╯]/);
  });

  it('renders a left-side price scale for the chart rows', () => {
    const app = render(
      <IntradayChart
        points={samplePoints()}
        symbol="600519"
        prevClose={10}
        width={12}
        height={5}
      />
    );

    const frame = app.lastFrame();

    expect(frame).toContain('10.30 │');
    expect(frame).toContain('10.10 │');
    expect(frame).toContain('9.90 │');
  });

  it('shows an actionable error when intraday data fails to load', () => {
    const app = render(
      <IntradayChart
        points={[]}
        symbol="123456"
        error="Intraday request failed. Please confirm the stock code exists."
      />
    );

    const frame = app.lastFrame();

    expect(frame).toContain('task.123456 intraday sync failed');
    expect(frame).toContain('Please confirm the stock code exists');
    expect(frame).not.toContain('pending intraday sync');
  });
});
