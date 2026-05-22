import React from 'react';
import {Box, Text} from 'ink';
import type {IntradayPoint} from '../../domain/quote.js';

interface IntradayChartProps {
  points: IntradayPoint[];
  width?: number;
  height?: number;
  symbol: string;
  name?: string;
  prevClose?: number;
  volume?: number;
}

const BRAILLE_EMPTY = 0x2800;
const BRAILLE_BASELINE_LEGEND = '⠄';
const DOT_MASKS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80]
];

function formatTime(value: string): string {
  if (value.length === 4) {
    return `${value.slice(0, 2)}:${value.slice(2)}`;
  }

  return value;
}

function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return value.toFixed(0);
}

function buildMonotoneSlopes(values: number[]): number[] {
  if (values.length === 1) {
    return [0];
  }

  const deltas = values.slice(0, -1).map((value, index) => values[index + 1]! - value);
  const slopes = Array(values.length).fill(0);
  slopes[0] = deltas[0]!;
  slopes[values.length - 1] = deltas[deltas.length - 1]!;

  for (let index = 1; index < values.length - 1; index++) {
    const left = deltas[index - 1]!;
    const right = deltas[index]!;

    if (left === 0 || right === 0 || Math.sign(left) !== Math.sign(right)) {
      slopes[index] = 0;
      continue;
    }

    slopes[index] = (left + right) / 2;
  }

  for (let index = 0; index < deltas.length; index++) {
    const delta = deltas[index]!;

    if (delta === 0) {
      slopes[index] = 0;
      slopes[index + 1] = 0;
      continue;
    }

    const alpha = slopes[index]! / delta;
    const beta = slopes[index + 1]! / delta;
    const scale = Math.hypot(alpha, beta);

    if (scale > 3) {
      const factor = 3 / scale;
      slopes[index] = factor * alpha * delta;
      slopes[index + 1] = factor * beta * delta;
    }
  }

  return slopes;
}

function interpolateSeries(values: number[], width: number): number[] {
  if (values.length === 0) {
    return [];
  }

  if (values.length === 1) {
    return Array(width).fill(values[0]!);
  }

  const slopes = buildMonotoneSlopes(values);

  return Array.from({length: width}, (_, column) => {
    const position = (column * (values.length - 1)) / Math.max(width - 1, 1);
    const index = Math.min(Math.floor(position), values.length - 2);
    const t = position - index;
    const y0 = values[index]!;
    const y1 = values[index + 1]!;
    const m0 = slopes[index]!;
    const m1 = slopes[index + 1]!;
    const t2 = t * t;
    const t3 = t2 * t;

    return (
      (2 * t3 - 3 * t2 + 1) * y0 +
      (t3 - 2 * t2 + t) * m0 +
      (-2 * t3 + 3 * t2) * y1 +
      (t3 - t2) * m1
    );
  });
}

function priceToDotRow(price: number, min: number, range: number, dotHeight: number): number {
  const normalized = (price - min) / range;
  return Math.round((1 - normalized) * (dotHeight - 1));
}

function setDot(canvas: number[][], x: number, y: number, mask: number): void {
  if (y < 0 || y >= canvas.length || x < 0 || x >= canvas[0]!.length) {
    return;
  }

  canvas[y]![x] = mask;
}

function drawLine(canvas: number[][], x0: number, y0: number, x1: number, y1: number, mask: number): void {
  let currentX = x0;
  let currentY = y0;
  const deltaX = Math.abs(x1 - x0);
  const stepX = x0 < x1 ? 1 : -1;
  const deltaY = -Math.abs(y1 - y0);
  const stepY = y0 < y1 ? 1 : -1;
  let error = deltaX + deltaY;

  while (true) {
    setDot(canvas, currentX, currentY, mask);
    if (currentX === x1 && currentY === y1) {
      break;
    }

    const doubled = 2 * error;
    if (doubled >= deltaY) {
      error += deltaY;
      currentX += stepX;
    }
    if (doubled <= deltaX) {
      error += deltaX;
      currentY += stepY;
    }
  }
}

function rasterizeBraille(curve: number[][], baseline: number[][], width: number, height: number): {rows: string[]; baselineRows: Set<number>} {
  const rows: string[] = [];
  const baselineRows = new Set<number>();

  for (let cellRow = 0; cellRow < height; cellRow++) {
    let line = '';

    for (let cellColumn = 0; cellColumn < width; cellColumn++) {
      let mask = 0;
      let baselineOnly = true;

      for (let dotY = 0; dotY < 4; dotY++) {
        for (let dotX = 0; dotX < 2; dotX++) {
          const sourceY = cellRow * 4 + dotY;
          const sourceX = cellColumn * 2 + dotX;
          const curveDot = curve[sourceY]?.[sourceX] ?? 0;
          const baselineDot = baseline[sourceY]?.[sourceX] ?? 0;

          if (curveDot || baselineDot) {
            mask |= DOT_MASKS[dotY]![dotX]!;
          }

          if (curveDot) {
            baselineOnly = false;
          }
        }
      }

      if (mask !== 0 && baselineOnly) {
        baselineRows.add(cellRow);
      }

      line += String.fromCharCode(BRAILLE_EMPTY + mask);
    }

    rows.push(line);
  }

  return {rows, baselineRows};
}

function buildChartRows(
  points: IntradayPoint[],
  width: number,
  height: number,
  prevClose?: number
): {rows: string[]; baselineRows: Set<number>} {
  const dotWidth = Math.max(width, 1) * 2;
  const dotHeight = Math.max(height, 1) * 4;
  const prices = points.map((point) => point.price);
  const smoothPrices = interpolateSeries(prices, dotWidth);
  const allPrices = prevClose === undefined ? smoothPrices : [...smoothPrices, prevClose];
  const min = Math.min(...allPrices);
  const max = Math.max(...allPrices);
  const range = max - min || 1;
  const curve = Array.from({length: dotHeight}, () => Array(dotWidth).fill(0));
  const baseline = Array.from({length: dotHeight}, () => Array(dotWidth).fill(0));
  const dotRows = smoothPrices.map((price) => priceToDotRow(price, min, range, dotHeight));

  if (prevClose !== undefined) {
    const baselineRow = priceToDotRow(prevClose, min, range, dotHeight);
    for (let column = 0; column < dotWidth; column++) {
      if (Math.floor(column / 2) % 2 === 0) {
        setDot(baseline, column, baselineRow, 1);
      }
    }
  }

  for (let column = 1; column < dotWidth; column++) {
    drawLine(curve, column - 1, dotRows[column - 1]!, column, dotRows[column]!, 1);
  }

  return rasterizeBraille(curve, baseline, width, height);
}

export function IntradayChart({points, width = 50, height = 8, symbol, name, prevClose, volume}: IntradayChartProps) {
  if (points.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="gray">task.{symbol} pending intraday sync...</Text>
      </Box>
    );
  }

  const prices = points.map((point) => point.price);
  const lastPrice = prices[prices.length - 1]!;
  const changeFromPrev = prevClose ? ((lastPrice - prevClose) / prevClose) * 100 : 0;
  const firstTime = points[0]?.time ?? '';
  const midTime = points[Math.floor(points.length / 2)]?.time ?? '';
  const lastTime = points[points.length - 1]?.time ?? '';
  const chart = buildChartRows(points, width, height, prevClose);

  return (
    <Box flexDirection="column">
      <Text color="gray">
        task.{symbol}
        {name ? ` | ${name}` : ''}
        {' | '}
        {formatTime(firstTime)} - {formatTime(lastTime)}
      </Text>

      <Text color="gray">
        inspect delta={changeFromPrev >= 0 ? '+' : ''}{changeFromPrev.toFixed(2)}%
        {' | '}
        last={lastPrice.toFixed(2)}
        {prevClose !== undefined ? ` | baseline=${prevClose.toFixed(2)}` : ''}
        {' | '}
        vol={volume === undefined ? 'N/A' : formatVolume(volume)}
      </Text>

      <Box marginTop={1} flexDirection="column">
        {chart.rows.map((row, rowIndex) => (
          <Text key={rowIndex}>
            {row.split('').map((char, columnIndex) => (
              <Text
                key={columnIndex}
                color={char === String.fromCharCode(BRAILLE_EMPTY) ? undefined : 'white'}
                dimColor={chart.baselineRows.has(rowIndex)}
              >
                {char}
              </Text>
            ))}
          </Text>
        ))}
      </Box>

      <Box justifyContent="space-between">
        <Text color="gray">{formatTime(firstTime)}</Text>
        <Text color="gray">{formatTime(midTime)}</Text>
        <Text color="gray">{formatTime(lastTime)}</Text>
      </Box>

      {prevClose !== undefined && (
        <Text color="gray" dimColor>
          {BRAILLE_BASELINE_LEGEND} prev_close {prevClose.toFixed(2)}
        </Text>
      )}
    </Box>
  );
}
