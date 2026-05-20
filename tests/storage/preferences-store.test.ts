import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {loadPreferences} from '../../src/storage/preferencesStore.js';

describe('preferences store', () => {
  let tempHome: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    tempHome = await mkdtemp(path.join(os.tmpdir(), 'worklog-stock-cli-preferences-'));
    process.env.HOME = tempHome;
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    await rm(tempHome, {recursive: true, force: true});
  });

  it('returns default preferences when file does not exist', async () => {
    const prefs = await loadPreferences();

    expect(prefs.refreshSeconds).toBe(5);
    expect(prefs.defaultMode).toBe('quiet');
  });

  it('returns independent default preference objects when file does not exist', async () => {
    const firstPrefs = await loadPreferences();
    firstPrefs.refreshSeconds = 10;

    const secondPrefs = await loadPreferences();

    expect(secondPrefs.refreshSeconds).toBe(5);
    expect(secondPrefs).not.toBe(firstPrefs);
  });
});
