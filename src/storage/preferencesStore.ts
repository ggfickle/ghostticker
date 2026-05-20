import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {defaultPreferences} from '../config/defaultPreferences.js';
import {preferencesSchema, type Preferences} from '../config/preferencesSchema.js';
import {getDataDirectory, getPreferencesPath} from './paths.js';

async function ensureDataDirectory(): Promise<void> {
  await mkdir(getDataDirectory(), {recursive: true});
}

export async function loadPreferences(): Promise<Preferences> {
  try {
    const raw = await readFile(getPreferencesPath(), 'utf8');
    return preferencesSchema.parse(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {...defaultPreferences};
    }

    throw error;
  }
}

export async function savePreferences(preferences: Preferences): Promise<Preferences> {
  const normalizedPreferences = preferencesSchema.parse(preferences);
  await ensureDataDirectory();
  await writeFile(
    getPreferencesPath(),
    `${JSON.stringify(normalizedPreferences, null, 2)}\n`,
    'utf8'
  );
  return normalizedPreferences;
}
