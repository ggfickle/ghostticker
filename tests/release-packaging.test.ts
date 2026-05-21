import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

describe('release packaging', () => {
  it('uses a platform-neutral release artifact', async () => {
    const workflow = await readFile('.github/workflows/release.yml', 'utf8');

    expect(workflow).not.toContain('linux-x64');
    expect(workflow).toContain('ghostticker-${GITHUB_REF_NAME}.tar.gz');
  });

  it('ships a one-command installer', async () => {
    const installer = await readFile('scripts/install.sh', 'utf8');

    expect(installer).toContain('GHOSTTICKER_REPO');
    expect(installer).toContain('GHOSTTICKER_ASSET_URL');
    expect(installer).toContain('ghostticker-${tag}.tar.gz');
  });

  it('has a node executable CLI entrypoint', async () => {
    const cli = await readFile('src/cli.tsx', 'utf8');

    expect(cli.startsWith('#!/usr/bin/env node\n')).toBe(true);
  });
});
