import { ExtensionSettings } from './types';

export const DEFAULT_API_BASE_URL = 'http://localhost:3000';
export const FALLBACK_API_BASE_URLS = ['http://localhost:3000', 'http://localhost:3001'];

export const DEFAULT_WHITELISTED_DOMAINS: string[] = [
  'app.uniswap.org',
  'opensea.io',
  'blur.io',
  'aave.com',
  'lido.fi',
  'curve.fi',
  'portfolio.metamask.io',
  'etherscan.io',
  'sepolia.etherscan.io',
];

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
  autoScanEnabled: true,
  preSignInterceptionEnabled: true,
  explainSimply: false,
  strictMode: false,
  whitelistedDomains: DEFAULT_WHITELISTED_DOMAINS,
};

export const STORAGE_KEYS = {
  SETTINGS: 'chainshield_ext_settings_v1',
  THREAT_LOGS: 'chainshield_ext_threat_logs_v1',
  WHITELIST: 'chainshield_ext_whitelist_v1',
  TAB_CACHE: 'chainshield_ext_tab_cache_v1',
};
