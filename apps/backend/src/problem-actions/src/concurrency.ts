export const DEFAULT_CONCURRENCY = 100;

export function getConcurrency(
  env: { SANDBOX_CONCURRENCY?: string } | Env,
): number {
  const value = (env as { SANDBOX_CONCURRENCY?: string }).SANDBOX_CONCURRENCY;
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return DEFAULT_CONCURRENCY;
}

export function pLimit(concurrency: number) {
  const queue: (() => void)[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()!();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const run = async () => {
        activeCount++;
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        } finally {
          next();
        }
      };

      if (activeCount < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}
