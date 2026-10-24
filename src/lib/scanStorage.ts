import { TargetScanResult, StoredScanPayload } from '../types/security';
import { DEFAULT_SCANS } from '../data/seedData';

export const SCAN_STORAGE_KEY = 'chainshield_scans_v1';
export const CURRENT_STORAGE_VERSION = 1;

const FORBIDDEN_SECRET_KEYS = [
  'privatekey',
  'private_key',
  'secret',
  'secretkey',
  'mnemonic',
  'seedphrase',
  'seed_phrase',
  'apikey',
  'api_key',
  'password',
  'authtoken',
  'auth_token',
];

/**
 * In-memory Storage polyfill implementing the W3C Storage interface.
 * Useful for unit tests, SSR, or environments without native window.localStorage.
 */
export class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

/**
 * Safely access browser localStorage without throwing SecurityError in restricted environments.
 */
export function getBrowserStorage(): Storage | undefined {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Restricted environment (e.g. cookies blocked, sandboxed iframe)
  }
  return undefined;
}

/**
 * Checks whether an object contains any forbidden credential keys.
 */
function containsSecretKeys(obj: Record<string, unknown>): boolean {
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_SECRET_KEYS.some((forbidden) => lowerKey.includes(forbidden))) {
      return true;
    }
  }
  return false;
}

/**
 * Validates whether an unknown item is a valid TargetScanResult.
 */
export function isValidScanRecord(item: unknown): item is TargetScanResult {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return false;
  }

  const scan = item as Record<string, unknown>;

  // Block any forbidden credential or private key properties
  if (containsSecretKeys(scan)) {
    return false;
  }

  // Mandatory string fields
  if (typeof scan.id !== 'string' || scan.id.trim().length === 0) return false;
  if (typeof scan.target !== 'string' || scan.target.trim().length === 0) return false;
  if (typeof scan.recommendationText !== 'string') return false;
  if (typeof scan.linkSource !== 'string') return false;

  // Target type validation
  if (
    typeof scan.targetType !== 'undefined' &&
    !['domain', 'url', 'contract'].includes(scan.targetType as string)
  ) {
    return false;
  }

  // Scores and numbers
  if (
    typeof scan.riskScore !== 'number' ||
    Number.isNaN(scan.riskScore) ||
    scan.riskScore < 0 ||
    scan.riskScore > 100
  ) {
    return false;
  }

  if (typeof scan.rulesScore !== 'number' || Number.isNaN(scan.rulesScore)) return false;
  if (typeof scan.mlScore !== 'number' || Number.isNaN(scan.mlScore)) return false;
  if (typeof scan.confidence !== 'number' || Number.isNaN(scan.confidence)) return false;
  if (typeof scan.createdAt !== 'number' || Number.isNaN(scan.createdAt) || scan.createdAt <= 0) return false;

  // Risk level
  if (
    typeof scan.riskLevel !== 'string' ||
    !['LOW', 'CAUTION', 'HIGH', 'CRITICAL'].includes(scan.riskLevel)
  ) {
    return false;
  }

  // Recommendation enum
  if (
    typeof scan.recommendation !== 'string' ||
    !['AVOID', 'PROCEED_WITH_CAUTION', 'SAFE_TO_PROCEED'].includes(scan.recommendation)
  ) {
    return false;
  }

  // Private check boolean
  if (typeof scan.isPrivateCheck !== 'boolean') return false;

  // Reasons array
  if (!Array.isArray(scan.reasons)) return false;

  // Optional evidence check
  if (scan.evidence) {
    if (typeof scan.evidence !== 'object' || scan.evidence === null) return false;
    const ev = scan.evidence as Record<string, unknown>;
    if (typeof ev.canonicalHash !== 'string' || typeof ev.reportId !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizes a scan record to ensure no forbidden keys are leaked into storage.
 */
export function sanitizeScanRecord(scan: TargetScanResult): TargetScanResult {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(scan)) {
    const lowerKey = key.toLowerCase();
    if (!FORBIDDEN_SECRET_KEYS.some((forbidden) => lowerKey.includes(forbidden))) {
      sanitized[key] = value;
    }
  }
  return sanitized as unknown as TargetScanResult;
}

/**
 * Deduplicates an array of scans by id, preserving the first occurrence.
 */
export function deduplicateScans(scans: TargetScanResult[]): TargetScanResult[] {
  const seenIds = new Set<string>();
  const uniqueScans: TargetScanResult[] = [];

  for (const scan of scans) {
    if (!seenIds.has(scan.id)) {
      seenIds.add(scan.id);
      uniqueScans.push(scan);
    }
  }

  return uniqueScans;
}

/**
 * Loads scans from localStorage with graceful fallback to seed data.
 */
export function loadStoredScans(
  fallback: TargetScanResult[] = DEFAULT_SCANS,
  storage: Storage | undefined = getBrowserStorage()
): TargetScanResult[] {
  if (!storage) {
    return fallback;
  }

  try {
    const raw = storage.getItem(SCAN_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed: unknown = JSON.parse(raw);
    let candidates: unknown[] = [];

    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      'version' in parsed &&
      (parsed as Record<string, unknown>).version === CURRENT_STORAGE_VERSION &&
      Array.isArray((parsed as Record<string, unknown>).scans)
    ) {
      candidates = (parsed as StoredScanPayload).scans;
    } else if (Array.isArray(parsed)) {
      // Backward compatibility for raw array payload
      candidates = parsed;
    } else {
      console.warn('[ChainShield Storage] Corrupted or unrecognized scan envelope. Using fallback.');
      return fallback;
    }

    const validScans = candidates.filter(isValidScanRecord).map(sanitizeScanRecord);
    if (validScans.length === 0) {
      console.warn('[ChainShield Storage] No valid scans found in storage. Using fallback.');
      return fallback;
    }

    return deduplicateScans(validScans);
  } catch (err) {
    console.warn('[ChainShield Storage] Error reading stored scans from localStorage:', err);
    return fallback;
  }
}

/**
 * Persists an array of scans to localStorage using the versioned envelope.
 */
export function saveStoredScans(
  scans: TargetScanResult[],
  storage: Storage | undefined = getBrowserStorage()
): boolean {
  if (!storage) {
    return false;
  }

  try {
    const validScans = deduplicateScans(scans.filter(isValidScanRecord)).map(sanitizeScanRecord);
    const envelope: StoredScanPayload = {
      version: CURRENT_STORAGE_VERSION,
      timestamp: Date.now(),
      scans: validScans,
    };
    storage.setItem(SCAN_STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch (err) {
    console.warn('[ChainShield Storage] Failed to persist scan history to storage:', err);
    return false;
  }
}

/**
 * Clears the stored scan history from localStorage.
 */
export function clearStoredScans(storage: Storage | undefined = getBrowserStorage()): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(SCAN_STORAGE_KEY);
  } catch (err) {
    console.warn('[ChainShield Storage] Failed to clear scan history from storage:', err);
  }
}
