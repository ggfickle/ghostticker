import React from 'react';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {cleanup, render} from 'ink-testing-library';
import {App} from '../../src/tui/App.js';

async function nextTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

describe('App empty watchlist', () => {
  let tempHome: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    tempHome = await mkdtemp(path.join(os.tmpdir(), 'ghostticker-empty-'));
    process.env.HOME = tempHome;
  });

  afterEach(async () => {
    cleanup();
    process.env.HOME = originalHome;
    await rm(tempHome, {recursive: true, force: true});
  });

  it('prompts the user to add symbols when watchlist is empty', async () => {
    const {lastFrame} = render(<App />);
    await nextTick();

    expect(lastFrame()).toContain('No symbols saved yet');
    expect(lastFrame()).toContain('Press a to add symbols');
  });
});
