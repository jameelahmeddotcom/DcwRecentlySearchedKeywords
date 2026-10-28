import { defineCustomInstallationStep } from '@adobe/aio-commerce-lib-app/management';
import { getImsAuthProvider, resolveImsAuthParams } from '@adobe/aio-commerce-lib-auth';
import { init as initDb } from '@adobe/aio-lib-db';

export default defineCustomInstallationStep({
  install: async (_config, context) => {
    let client;
    let phase = 'auth';
    try {
      const token = await getImsAuthProvider(resolveImsAuthParams(context.params)).getAccessToken();
      phase = 'init';
      const db = await initDb({ token, region: 'amer' });
      phase = 'connect';
      client = await db.connect();
      phase = 'query';
      const names = await client.listCollections();
      if (!names.some((entry) => entry.name === 'search_keywords')) {
        await client.createCollection('search_keywords');
      }
      await client.collection('search_keywords').createIndex({ customerId: 1 });
      return { status: 'success' };
    } catch (error) {
      context.logger.error('search-history installation failure', { phase, errorType: error instanceof Error ? error.name : 'UnknownError' });
      throw error;
    } finally {
      if (client) {
        try { await client.close(); } catch (error) {
          context.logger.error('search-history installation failure', { phase: 'close', errorType: error instanceof Error ? error.name : 'UnknownError' });
          throw error;
        }
      }
    }
  },
  uninstall: async () => {},
});
