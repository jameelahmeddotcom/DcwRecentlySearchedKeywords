import { defineConfig } from '@adobe/aio-commerce-lib-app/config';
import { MENU_CUSTOMERS } from '@adobe/aio-commerce-sdk/admin-ui/menu';

export default defineConfig({
  metadata: {
    id: 'search-keyword-history',
    displayName: 'Search Keyword History',
    description: 'Persists authenticated customer search keyword history in App Builder Database Storage, exposes save/retrieve APIs for the Luma storefront module, and surfaces a Commerce Admin grid of search keyword history.',
    version: '1.0.0',
  },
  installation: {
    customInstallationSteps: [{
      script: './scripts/setup-database.ts',
      name: 'Set up search keywords collection',
      description: 'Creates search_keywords and indexes customerId',
    }],
  },
  adminUi: {
    menu: {
      id: 'search_keyword_history',
      label: 'Search Keyword History',
      description: 'Search history across customers',
      parentMenu: MENU_CUSTOMERS,
      aclProtected: true,
    },
  },
});
