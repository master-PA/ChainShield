/**
 * Canonical JSON serialization and SHA-256 evidence hashing.
 * Sorts object keys recursively, removes whitespace, and outputs deterministic UTF-8 string.
 * Meets ERC/EIP standards and matches backend Python json.dumps(sort_keys=True, separators=(',', ':')).
 */

import type { LinkSource, RiskLevel, TargetScanResult, CanonicalScanPayload } from '../types/security';

export type { CanonicalScanPayload };

export type ScanPayloadSource =
  | TargetScanResult
  | {
      target: string;
      linkSource?: LinkSource;
      isPrivateCheck?: boolean;
      rulesScore: number;
      mlScore: number;
      finalScore?: number;
      riskScore?: number;
      riskLevel: RiskLevel;
      reasonsCount?: number;
      reasons?: unknown[];
      timestamp?: number;
      createdAt?: number;
      evidence?: { timestamp?: number };
    };

export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalizeJson(item)).join(',') + ']';
  }

  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const parts: string[] = [];

  for (const key of sortedKeys) {
    const val = record[key];
    if (val !== undefined) {
      parts.push(JSON.stringify(key) + ':' + canonicalizeJson(val));
    }
  }

  return '{' + parts.join(',') + '}';
}

// Pure JS SHA-256 implementation to guarantee synchronous or asynchronous execution anywhere
function sha256Pure(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;

  const result: string[] = [];
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let compositeBitLength = asciiBitLength;

  for (i = 0; i < ascii.length; i++) {
    const code = ascii.charCodeAt(i);
    words[i >> 2] |= (code & 0xff) << (24 - (i % 4) * 8);
  }

  words[compositeBitLength >> 5] |= 0x80 << (24 - (compositeBitLength % 32));
  words[(((compositeBitLength + 64) >> 9) << 4) + 15] = compositeBitLength;

  const w = new Array(64);

  for (i = 0; i < words.length; i += 16) {
    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[j + i] | 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[j] + w[j]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result.push((b < 16 ? '0' : '') + b.toString(16));
    }
  }

  return '0x' + result.join('');
}

export async function computeSha256(canonicalStr: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(canonicalStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256Pure(canonicalStr);
}

export function computeSha256Sync(canonicalStr: string): string {
  return sha256Pure(canonicalStr);
}

/**
 * Builds a deterministic canonical scan payload adhering to the standard schema:
 * { target, linkSource, isPrivateCheck, rulesScore, mlScore, finalScore, riskLevel, reasonsCount, timestamp }
 */
export function buildCanonicalScanPayload(
  source: ScanPayloadSource,
  overrides?: Partial<CanonicalScanPayload>
): CanonicalScanPayload {
  const finalScore =
    overrides?.finalScore ??
    ('finalScore' in source && typeof source.finalScore === 'number'
      ? source.finalScore
      : 'riskScore' in source && typeof source.riskScore === 'number'
      ? source.riskScore
      : 0);

  const reasonsCount =
    overrides?.reasonsCount ??
    ('reasonsCount' in source && typeof source.reasonsCount === 'number'
      ? source.reasonsCount
      : Array.isArray(source.reasons)
      ? source.reasons.length
      : 0);

  const timestamp =
    overrides?.timestamp ??
    ('timestamp' in source && typeof source.timestamp === 'number'
      ? source.timestamp
      : 'createdAt' in source && typeof source.createdAt === 'number'
      ? source.createdAt
      : source.evidence && typeof source.evidence.timestamp === 'number'
      ? source.evidence.timestamp
      : 0);

  return {
    target: overrides?.target ?? source.target,
    linkSource: overrides?.linkSource ?? source.linkSource ?? 'direct',
    isPrivateCheck: overrides?.isPrivateCheck ?? Boolean(source.isPrivateCheck),
    rulesScore: overrides?.rulesScore ?? source.rulesScore,
    mlScore: overrides?.mlScore ?? source.mlScore,
    finalScore,
    riskLevel: overrides?.riskLevel ?? source.riskLevel,
    reasonsCount,
    timestamp,
  };
}

export async function hashCanonicalScanPayload(payload: CanonicalScanPayload): Promise<string> {
  const canonicalStr = canonicalizeJson(payload);
  return computeSha256(canonicalStr);
}

export function hashCanonicalScanPayloadSync(payload: CanonicalScanPayload): string {
  const canonicalStr = canonicalizeJson(payload);
  return computeSha256Sync(canonicalStr);
}

export async function verifyScanEvidence(
  scan: TargetScanResult,
  overrides?: Partial<CanonicalScanPayload>
): Promise<{
  isValid: boolean;
  computedHash: string;
  expectedHash: string;
  payload: CanonicalScanPayload;
}> {
  const payload = buildCanonicalScanPayload(scan, overrides);
  const computedHash = await hashCanonicalScanPayload(payload);
  const expectedHash = scan.evidence?.canonicalHash || '';
  const isValid = Boolean(
    expectedHash && computedHash.toLowerCase() === expectedHash.toLowerCase()
  );
  return {
    isValid,
    computedHash,
    expectedHash,
    payload,
  };
}

export function verifyScanEvidenceSync(
  scan: TargetScanResult,
  overrides?: Partial<CanonicalScanPayload>
): {
  isValid: boolean;
  computedHash: string;
  expectedHash: string;
  payload: CanonicalScanPayload;
} {
  const payload = buildCanonicalScanPayload(scan, overrides);
  const computedHash = hashCanonicalScanPayloadSync(payload);
  const expectedHash = scan.evidence?.canonicalHash || '';
  const isValid = Boolean(
    expectedHash && computedHash.toLowerCase() === expectedHash.toLowerCase()
  );
  return {
    isValid,
    computedHash,
    expectedHash,
    payload,
  };
}
