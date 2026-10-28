import { useCallback } from 'react';
import actionUrls from '../config.json';
export function useConfig() {
  return { getActionUrl: useCallback((action: string) => (actionUrls as Record<string, string>)[action], []) };
}
