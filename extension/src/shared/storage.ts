import { DEFAULT_SETTINGS, STORAGE_KEYS } from './config';
import { ExtensionSettings, ThreatLogItem } from './types';

function hasChromeStorage(): boolean {
  try {
    return (
      typeof chrome !== 'undefined' &&
      Boolean(chrome?.runtime?.id) &&
      Boolean(chrome?.storage?.local)
    );
  } catch {
    return false;
  }
}

// In-memory fallback for testing and non-extension environments
const memoryCache: Record<string, any> = {};

export async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  if (hasChromeStorage()) {
    try {
      return await new Promise((resolve) => {
        try {
          chrome.storage.local.get([key], (result: any) => {
            if (chrome.runtime?.lastError || !result || result[key] === undefined) {
              resolve(defaultValue);
            } else {
              resolve(result[key] as T);
            }
          });
        } catch {
          resolve(defaultValue);
        }
      });
    } catch {
      // Extension context invalidated or storage error; fallback gracefully
    }
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
    try {
      await new Promise<void>((resolve) => {
        try {
          chrome.storage.local.set({ [key]: value }, () => resolve());
        } catch {
          resolve();
        }
      });
    } catch {
      // fallback
    }
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
  try {
    const stored = await getStorageItem<Partial<ExtensionSettings>>(STORAGE_KEYS.SETTINGS, {});
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(updates: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const next = { ...current, ...updates };
  await setStorageItem(STORAGE_KEYS.SETTINGS, next);
  return next;
}

export async function isDomainWhitelisted(hostname: string): Promise<boolean> {
  try {
    const settings = await getSettings();
    const clean = hostname.trim().toLowerCase();
    return settings.whitelistedDomains.some(
      (w) => w.toLowerCase() === clean || clean.endsWith('.' + w.toLowerCase())
    );
  } catch {
    const clean = hostname.trim().toLowerCase();
    return DEFAULT_SETTINGS.whitelistedDomains.some(
      (w) => w.toLowerCase() === clean || clean.endsWith('.' + w.toLowerCase())
    );
  }
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
  try {
    return await getStorageItem<ThreatLogItem[]>(STORAGE_KEYS.THREAT_LOGS, []);
  } catch {
    return [];
  }
}

export async function logThreatItem(item: ThreatLogItem): Promise<void> {
  try {
    const logs = await getThreatLogs();
    // Keep last 100 items
    const next = [item, ...logs.filter((l) => l.id !== item.id)].slice(0, 100);
    await setStorageItem(STORAGE_KEYS.THREAT_LOGS, next);
  } catch {
    // Ignore storage errors on invalidated context
  }
}

export async function clearThreatLogs(): Promise<void> {
  await setStorageItem(STORAGE_KEYS.THREAT_LOGS, []);
}
