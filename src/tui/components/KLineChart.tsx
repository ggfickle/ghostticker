import React from 'react';
import {Box, Text} from 'ink';

import type {KLinePoint} from '../../domain/quote.js';

interface KLineChartProps {
  points: KLinePoint[];
  period: 'day' | 'week';
  width?: number;
  height?: number;
  symbol: string;
  name?: string;
  error?: string;
}

const BRAILLE_EMPTY = 0x2800;
const DOT_MASKS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80]
];

function formatTime(value: string): string {
  if (value.length === 8) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
  }
  return value;
}

function priceToDotRow(price: number, min: number, range: number, dotHeight: number): number {
  const normalized = (price - min) / range;
  return Math.round((1 - normalized) * (dotHeight - 1));
}

function setDot(canvas: number[][], x: number, y: number): void {
  if (y < 0 || y >= canvas.length || x < 0 || x >= canvas[0]!.length) {
    return;
  }
  canvas[y]![x] = 1;
}

function drawLine(canvas: number[][], x0: number, y0: number, x1: number, y1: number): void {
  let currentX = x0;
  let currentY = y0;
  const deltaX = Math.abs(x1 - x0);
  const stepX = x0 < x1 ? 1 : -1;
  const deltaY = -Math.abs(y1 - y0);
  const stepY = y0 < y1 ? 1 : -1;
  let error = deltaX + deltaY;

  while (true) {
    setDot(canvas, currentX, currentY);
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

function rasterizeBraille(canvas: number[][], width: number, height: number): string[] {
  const rows: string[] = [];

  for (let cellRow = 0; cellRow < height; cellRow++) {
    let line = '';

    for (let cellColumn = 0; cellColumn < width; cellColumn++) {
      let mask = 0;

      for (let dotY = 0; dotY < 4; dotY++) {
        for (let dotX = 0; dotX < 2; dotX++) {
          const sourceY = cellRow * 4 + dotY;
          const sourceX = cellColumn * 2 + dotX;
          if (canvas[sourceY]?.[sourceX]) {
            mask |= DOT_MASKS[dotY]![dotX]!;
          }
        }
      }

      line += String.fromCharCode(BRAILLE_EMPTY + mask);
    }

    rows.push(line);
  }

  return rows;
}

function formatPriceScale(value: number): string {
  return value.toFixed(2).padStart(7);
}

function scaleLabel(rowIndex: number, height: number, min: number, max: number): string {
  if (height <= 1) {
    return formatPriceScale(max);
  }
  const ratio = rowIndex / (height - 1);
  return formatPriceScale(max - (max - min) * ratio);
}

export function KLineChart({points, period, width = 50, height = 8, symbol, name, error}: KLineChartProps) {
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">task.{symbol} {period} K-line sync failed</Text>
        <Text color="gray">{error}</Text>
      </Box>
    );
  }

  if (points.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="gray">task.{symbol} pending {period} K-line sync...</Text>
      </Box>
    );
  }

  // Slice points to fit the available width (each cell column is 2 dots wide)
  const chartPoints = points.slice(-width);
  const highs = chartPoints.map(p => p.high);
  const lows = chartPoints.map(p => p.low);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = max - min || 1;

  const dotWidth = width * 2;
  const dotHeight = height * 4;
  const canvas = Array.from({length: dotHeight}, () => Array(dotWidth).fill(0));

  // Determine K-line candlestick colors
  const columnColors = chartPoints.map(p => {
    if (p.close > p.open) return 'green';
    if (p.close < p.open) return 'red';
    return 'gray';
  });

  // Plot K-line candles
  for (let i = 0; i < chartPoints.length; i++) {
    const p = chartPoints[i]!;
    const yHigh = priceToDotRow(p.high, min, range, dotHeight);
    const yLow = priceToDotRow(p.low, min, range, dotHeight);
    const yOpen = priceToDotRow(p.open, min, range, dotHeight);
    const yClose = priceToDotRow(p.close, min, range, dotHeight);

    // X-coordinates for the K-line body
    const xLeft = i * 2;
    const xRight = i * 2 + 1;

    // Draw shadow wicks (center of K-line candle is xLeft)
    drawLine(canvas, xLeft, yHigh, xLeft, yLow);

    // Draw K-line body rectangle
    const bodyStart = Math.min(yOpen, yClose);
    const bodyEnd = Math.max(yOpen, yClose);
    drawLine(canvas, xLeft, bodyStart, xLeft, bodyEnd);
    drawLine(canvas, xRight, bodyStart, xRight, bodyEnd);
  }

  const rows = rasterizeBraille(canvas, chartPoints.length, height);
  const firstDate = chartPoints[0]?.date ?? '';
  const midDate = chartPoints[Math.floor(chartPoints.length / 2)]?.date ?? '';
  const lastDate = chartPoints[chartPoints.length - 1]?.date ?? '';

  return (
    <Box flexDirection="column">
      <Text color="gray">
        task.{symbol}
        {name ? ` | ${name}` : ''}
        {' | '}
        {period.toUpperCase()} K-LINE
      </Text>

      <Box marginTop={1} flexDirection="column">
        {rows.map((row, rowIndex) => (
          <Text key={rowIndex}>
            <Text color="gray">{scaleLabel(rowIndex, rows.length, min, max)} │ </Text>
            {row.split('').map((char, columnIndex) => (
              <Text
                key={columnIndex}
                color={char === String.fromCharCode(BRAILLE_EMPTY) ? undefined : columnColors[columnIndex]}
              >
                {char}
              </Text>
            ))}
          </Text>
        ))}
      </Box>

      <Box justifyContent="space-between">
        <Text color="gray">{formatTime(firstDate)}</Text>
        <Text color="gray">{formatTime(midDate)}</Text>
        <Text color="gray">{formatTime(lastDate)}</Text>
      </Box>
    </Box>
  );
}
