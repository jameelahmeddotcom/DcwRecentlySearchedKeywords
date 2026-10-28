import { getImsAuthProvider, resolveImsAuthParams } from '@adobe/aio-commerce-lib-auth';
import { init as initDb } from '@adobe/aio-lib-db';

export type Client = Awaited<ReturnType<Awaited<ReturnType<typeof initDb>>['connect']>>;
export async function withDatabase<T>(params: Record<string, unknown>, trace: string, operation: (client: Client) => Promise<T>): Promise<T> {
  let client: Client | undefined;
  let phase = 'auth';
  try {
    const token = await getImsAuthProvider(resolveImsAuthParams(params)).getAccessToken();
    phase = 'init';
    const db = await initDb({ token, region: 'amer' });
    phase = 'connect';
    client = await db.connect();
    phase = 'query';
    return await operation(client);
  } catch (error) {
    console.error('search-history failure', { trace, phase, errorType: error instanceof Error ? error.name : 'UnknownError' });
    throw error;
  } finally {
    if (client) {
      try { await client.close(); } catch (error) {
        console.error('search-history failure', { trace, phase: 'close', errorType: error instanceof Error ? error.name : 'UnknownError' });
        throw error;
      }
    }
  }
}
export async function retry<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await work(); } catch (error) {
      const e = error as { status?: number; statusCode?: number; code?: string };
      if (attempt >= 2 || !([502, 503, 504].includes(e.status ?? e.statusCode ?? 0) || e.code === 'ETIMEDOUT')) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
    }
  }
}
export function failure(error: unknown) {
  return error instanceof Error && error.name === 'DbError' ? 502 : 500;
}
