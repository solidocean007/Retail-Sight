export async function isInCache(url: string): Promise<boolean> {
  if (!("caches" in window)) return false;

  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const match = await cache.match(url);
    if (match) return true;
  }

  return false;
}
