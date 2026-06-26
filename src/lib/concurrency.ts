export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let next = 0;
  const effectiveLimit = Math.max(1, Math.min(limit, items.length));

  async function worker() {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = {
          status: 'fulfilled',
          value: await fn(items[index]!, index),
        };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: effectiveLimit }, () => worker()));
  return results;
}
