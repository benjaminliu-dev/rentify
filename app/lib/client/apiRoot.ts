let apiRootPromise: Promise<string> | null = null;

/**
 * Discovers the API root using `fetch()` (no hardcoding).
 * We rely on the fact that `Response.url` contains the fully-qualified URL
 * after redirects, allowing us to derive the current origin.
 */
export async function fetchApiRoot(options?: { signal?: AbortSignal }): Promise<string> {
  if (!apiRootPromise) {
    apiRootPromise = (async () => {
      const res = await fetch("/", {
        // HEAD may not be supported by all Next handlers; GET is safest for a mockup.
        method: "GET",
        cache: "no-store",
        signal: options?.signal,
      });
      const origin = new URL(res.url).origin;
      return origin.endsWith("/") ? origin : `${origin}/`;
    })();
  }

  return apiRootPromise;
}


