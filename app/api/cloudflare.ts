type TestBindings = Record<string, unknown>;

declare global {
  var __XIYUAN_CLOUDFLARE_BINDINGS__: TestBindings | undefined;
}

export async function getCloudflareBinding<T>(name: string): Promise<T | undefined> {
  const testBinding = globalThis.__XIYUAN_CLOUDFLARE_BINDINGS__?.[name];
  if (testBinding) return testBinding as T;

  try {
    const { env } = await import("cloudflare:workers");
    return (env as unknown as Record<string, T | undefined>)[name];
  } catch {
    return undefined;
  }
}
