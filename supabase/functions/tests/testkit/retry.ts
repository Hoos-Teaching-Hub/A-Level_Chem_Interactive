export type RetryOptions = {
  attempts: number;
  delayMs: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  let lastErr: unknown;

  for (let i = 0; i < opts.attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < opts.attempts - 1) await sleep(opts.delayMs);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
