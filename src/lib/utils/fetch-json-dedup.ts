const inflightGetRequests = new Map<string, Promise<{ res: Response; data: any }>>();

export async function fetchJsonDedup(url: string, key: string): Promise<{ res: Response; data: any }> {
  const cached = inflightGetRequests.get(key);
  if (cached) return cached;

  const request = (async () => {
    const res = await fetch(url);
    const data = await res.json();
    return { res, data };
  })().finally(() => {
    inflightGetRequests.delete(key);
  });

  inflightGetRequests.set(key, request);
  return request;
}
