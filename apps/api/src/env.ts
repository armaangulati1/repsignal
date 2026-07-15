import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

/**
 * Locate the monorepo root by walking up from a starting directory until we
 * reach the package.json that declares npm workspaces (the root marker).
 *
 * This is deliberately independent of process.cwd(): when a script is launched
 * via `npm --workspace @repsignal/api run <script>`, cwd becomes `apps/api`, so
 * a cwd-relative `.env` lookup would miss the repo-root `.env`. Resolving from a
 * directory instead makes env loading reliable no matter where the script runs.
 */
export function findRepoRoot(startDir: string): string {
  let dir = startDir;
  let parent = dirname(dir);
  while (parent !== dir) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { workspaces?: unknown };
        if (pkg.workspaces) {
          return dir;
        }
      } catch {
        // Malformed package.json: ignore and keep walking up.
      }
    }
    dir = parent;
    parent = dirname(dir);
  }
  return startDir;
}

/**
 * Directory of this module. Under `tsx` the API runs as ESM, so `__dirname` is
 * not defined; we derive it from `import.meta.url` instead.
 */
const moduleDir = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the monorepo-root `.env`, computed from this module's location. */
export const repoRootEnvPath = join(findRepoRoot(moduleDir), '.env');

/**
 * Load the repo-root `.env` regardless of the current working directory. dotenv
 * does not override variables that are already set, so the repo-root file takes
 * precedence over any workspace-local `.env` when this runs first.
 */
export function bootstrapEnv(): void {
  loadDotenv({ path: repoRootEnvPath });
}
