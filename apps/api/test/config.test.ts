import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PORT, resolvePort } from '../src/config.js';
import { findRepoRoot, repoRootEnvPath } from '../src/env.js';

describe('resolvePort (bug 2: default port must be 8787, not 3000)', () => {
  it('defaults to 8787 when PORT is unset', () => {
    expect(DEFAULT_PORT).toBe(8787);
    expect(resolvePort({})).toBe(8787);
  });

  it('never falls back to the colliding 3000 default', () => {
    expect(resolvePort({})).not.toBe(3000);
  });

  it('honors an explicit PORT override', () => {
    expect(resolvePort({ PORT: '9090' })).toBe(9090);
  });
});

describe('env bootstrap (bug 1: .env must resolve to the monorepo root, not cwd)', () => {
  it('resolves the repo-root .env path from this module location', () => {
    expect(basename(repoRootEnvPath)).toBe('.env');
    const root = dirname(repoRootEnvPath);
    // The repo root is the directory that owns turbo.json and the workspaces.
    expect(existsSync(join(root, 'turbo.json'))).toBe(true);
    expect(existsSync(join(root, 'apps'))).toBe(true);
    // It must NOT be the api workspace directory (the cwd-relative bug target).
    expect(basename(root)).not.toBe('api');
  });

  it('walks up from a nested workspace dir to the monorepo root', () => {
    const apiSrcDir = fileURLToPath(new URL('../src', import.meta.url));
    expect(findRepoRoot(apiSrcDir)).toBe(dirname(repoRootEnvPath));
  });

  it('finds the same root whether starting from apps/api or its src', () => {
    const apiSrcDir = fileURLToPath(new URL('../src', import.meta.url));
    const apiWorkspaceDir = dirname(apiSrcDir);
    expect(findRepoRoot(apiWorkspaceDir)).toBe(findRepoRoot(apiSrcDir));
  });
});
