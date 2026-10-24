import { DEFAULT_SETTINGS, STORAGE_KEYS } from './config';
import { ExtensionSettings, ThreatLogItem } from './types';

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.local);
}

// In-memory fallback for testing and non-extension environments
const memoryCache: Record<string, any> = {};

export async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result: any) => {
        if (chrome.runtime?.lastError || result[key] === undefined) {
          resolve(defaultValue);
        } else {
          resolve(result[key] as T);
        }
      });
    });
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  return memoryCache[key] !== undefined ? memoryCache[key] : defaultValue;
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  if (hasChromeStorage()) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => resolve());
    });
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage quota errors
    }
  }

  memoryCache[key] = value;
}

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await getStorageItem<Partial<ExtensionSettings>>(STORAGE_KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(updates: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const next = { ...current, ...updates };
  await setStorageItem(STORAGE_KEYS.SETTINGS, next);
  return next;
}

export async function isDomainWhitelisted(hostname: string): Promise<boolean> {
  const settings = await getSettings();
  const clean = hostname.trim().toLowerCase();
  return settings.whitelistedDomains.some(
    (w) => w.toLowerCase() === clean || clean.endsWith('.' + w.toLowerCase())
  );
}

export async function addWhitelistedDomain(domain: string): Promise<string[]> {
  const settings = await getSettings();
  const clean = domain.trim().toLowerCase();
  if (!settings.whitelistedDomains.includes(clean)) {
    const nextList = [...settings.whitelistedDomains, clean];
    await saveSettings({ whitelistedDomains: nextList });
    return nextList;
  }
  return settings.whitelistedDomains;
}

export async function removeWhitelistedDomain(domain: string): Promise<string[]> {
  const settings = await getSettings();
  const clean = domain.trim().toLowerCase();
  const nextList = settings.whitelistedDomains.filter((d) => d.toLowerCase() !== clean);
  await saveSettings({ whitelistedDomains: nextList });
  return nextList;
}

export async function getThreatLogs(): Promise<ThreatLogItem[]> {
  return getStorageItem<ThreatLogItem[]>(STORAGE_KEYS.THREAT_LOGS, []);
}

export async function logThreatItem(item: ThreatLogItem): Promise<void> {
  const logs = await getThreatLogs();
  // Keep last 100 items
  const next = [item, ...logs.filter((l) => l.id !== item.id)].slice(0, 100);
  await setStorageItem(STORAGE_KEYS.THREAT_LOGS, next);
}

export async function clearThreatLogs(): Promise<void> {
  await setStorageItem(STORAGE_KEYS.THREAT_LOGS, []);
}
