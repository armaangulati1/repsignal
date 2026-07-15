/**
 * Default API port. 8787 avoids colliding with a Next.js dev server (which
 * commonly holds port 3000 during local development).
 */
export const DEFAULT_PORT = 8787;

/** Resolve the port to listen on, honoring a `PORT` override from the environment. */
export function resolvePort(env: NodeJS.ProcessEnv = process.env): number {
  return Number(env.PORT ?? DEFAULT_PORT);
}
