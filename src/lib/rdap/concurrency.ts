// Small worker-pool that runs `fn` over `items` with at most `limit` in flight
// at once. Uses allSettled semantics internally: a rejected `fn` call becomes
// whatever the caller's `fn` returns for a failure — callers should catch
// inside `fn` and return a typed "unknown"/error value rather than throwing,
// so one failure never aborts the batch.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
