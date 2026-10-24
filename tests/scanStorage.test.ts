import assert from 'node:assert/strict';
import {
  SCAN_STORAGE_KEY,
  CURRENT_STORAGE_VERSION,
  MemoryStorage,
  loadStoredScans,
  saveStoredScans,
  clearStoredScans,
  isValidScanRecord,
} from '../src/lib/scanStorage';
import { TargetScanResult } from '../src/types/security';
import { DEFAULT_SCANS, ROHIT_WORKED_EXAMPLE } from '../src/data/seedData';
import {
  buildCanonicalScanPayload,
  hashCanonicalScanPayloadSync,
  verifyScanEvidenceSync,
} from '../src/lib/canonicalJson';

console.log('=== Running Scan Storage Persistence Tests ===\n');

function createTestScan(idSuffix = '001', target = 'https://test-defi.xyz'): TargetScanResult {
  const timestamp = 1710288000000;
  const reasons = [
    {
      id: 'r-test-1',
      category: 'domain' as const,
      description: 'Domain registered recently',
      points: 20,
      severity: 'warning' as const,
    },
  ];

  const payload = buildCanonicalScanPayload({
    target,
    linkSource: 'telegram_dm',
    isPrivateCheck: false,
    rulesScore: 40,
    mlScore: 35,
    finalScore: 38,
    riskLevel: 'CAUTION',
    reasonsCount: reasons.length,
    timestamp,
  });

  const canonicalHash = hashCanonicalScanPayloadSync(payload);

  return {
    id: `scan-test-${idSuffix}`,
    target,
    targetType: 'url',
    riskScore: 38,
    riskLevel: 'CAUTION',
    confidence: 90,
    rulesScore: 40,
    mlScore: 35,
    recommendation: 'PROCEED_WITH_CAUTION',
    recommendationText: 'Caution recommended.',
    linkSource: 'telegram_dm',
    isPrivateCheck: false,
    reasons,
    unavailableChecks: [],
    evidence: {
      reportId: `REP-TEST-${idSuffix}`,
      canonicalHash,
      timestamp,
      submitter: '0xClientLocalVerifier',
      isAnchored: true,
      chainName: 'Ethereum Sepolia Testnet',
      contractAddress: '0x9918237F012891c92019b882019481bc9018274a',
      isDemo: false,
    },
    createdAt: timestamp,
    isDemo: false,
  };
}

// -------------------------------------------------------------
// Test 1: save/load flow with versioned storage key
// -------------------------------------------------------------
{
  console.log('Test 1: Save and load flow with versioned storage key');
  const storage = new MemoryStorage();
  const testScan = createTestScan('save-1');

  // Initially empty storage returns fallback
  const initial = loadStoredScans(DEFAULT_SCANS, storage);
  assert.equal(initial.length, DEFAULT_SCANS.length, 'Empty storage should return default fallback scans');

  // Save scan list
  const saved = saveStoredScans([testScan, ...DEFAULT_SCANS], storage);
  assert.equal(saved, true, 'saveStoredScans should return true');

  // Verify storage key and envelope structure
  const raw = storage.getItem(SCAN_STORAGE_KEY);
  assert.notEqual(raw, null, 'Storage should contain the versioned key');
  const envelope = JSON.parse(raw!);
  assert.equal(envelope.version, CURRENT_STORAGE_VERSION, 'Envelope must have current version (1)');
  assert.equal(typeof envelope.timestamp, 'number', 'Envelope must have timestamp');
  assert.equal(envelope.scans.length, DEFAULT_SCANS.length + 1, 'Envelope should contain all scans');

  // Load back
  const loaded = loadStoredScans(DEFAULT_SCANS, storage);
  assert.equal(loaded.length, DEFAULT_SCANS.length + 1, 'Loaded scans count should match saved count');
  assert.equal(loaded[0].id, testScan.id, 'First item should be the newly saved scan');
  assert.equal(loaded[0].target, testScan.target, 'Loaded target matches');

  console.log('  ✓ Versioned envelope successfully saved and loaded');
}

// -------------------------------------------------------------
// Test 2: JSON serialization round-trip & verification compatibility
// -------------------------------------------------------------
{
  console.log('\nTest 2: JSON serialization round-trip & evidence verification integrity');
  const storage = new MemoryStorage();
  const testScan = createTestScan('roundtrip-1');

  saveStoredScans([testScan], storage);
  const loaded = loadStoredScans(DEFAULT_SCANS, storage);

  assert.equal(loaded.length, 1);
  const reloadedScan = loaded[0];

  // Verify deep equality of all critical fields
  assert.equal(reloadedScan.id, testScan.id);
  assert.equal(reloadedScan.target, testScan.target);
  assert.equal(reloadedScan.riskScore, testScan.riskScore);
  assert.equal(reloadedScan.riskLevel, testScan.riskLevel);
  assert.equal(reloadedScan.rulesScore, testScan.rulesScore);
  assert.equal(reloadedScan.mlScore, testScan.mlScore);
  assert.equal(reloadedScan.linkSource, testScan.linkSource);
  assert.equal(reloadedScan.isPrivateCheck, testScan.isPrivateCheck);
  assert.equal(reloadedScan.reasons.length, testScan.reasons.length);
  assert.equal(reloadedScan.createdAt, testScan.createdAt);
  assert.equal(reloadedScan.evidence?.canonicalHash, testScan.evidence?.canonicalHash);

  // Cryptographic evidence verification of the reloaded scan
  const verification = verifyScanEvidenceSync(reloadedScan);
  assert.equal(verification.isValid, true, 'Evidence hash verification must pass after reload from storage');
  assert.equal(
    verification.computedHash.toLowerCase(),
    testScan.evidence!.canonicalHash.toLowerCase(),
    'Evidence hash must be exactly identical'
  );

  console.log('  ✓ Scan survives JSON serialization round-trip with full cryptographic proof integrity');
}

// -------------------------------------------------------------
// Test 3: Handling corrupted, malformed, or malicious stored JSON
// -------------------------------------------------------------
{
  console.log('\nTest 3: Graceful handling of invalid or corrupted localStorage data');

  // 3a. Completely malformed JSON syntax
  {
    const storage = new MemoryStorage();
    storage.setItem(SCAN_STORAGE_KEY, '{invalid json syntax: missing-closing-bracket');
    const result = loadStoredScans(DEFAULT_SCANS, storage);
    assert.deepEqual(result, DEFAULT_SCANS, 'Malformed JSON must fall back to DEFAULT_SCANS without throwing');
    console.log('  ✓ Malformed JSON string gracefully handled');
  }

  // 3b. Empty string or null
  {
    const storage = new MemoryStorage();
    storage.setItem(SCAN_STORAGE_KEY, '');
    const result = loadStoredScans(DEFAULT_SCANS, storage);
    assert.deepEqual(result, DEFAULT_SCANS, 'Empty string must fall back to DEFAULT_SCANS');
    console.log('  ✓ Empty string gracefully handled');
  }

  // 3c. Non-object primitive values
  {
    const storage = new MemoryStorage();
    storage.setItem(SCAN_STORAGE_KEY, JSON.stringify(12345));
    const result = loadStoredScans(DEFAULT_SCANS, storage);
    assert.deepEqual(result, DEFAULT_SCANS, 'Numeric JSON value must fall back to DEFAULT_SCANS');

    storage.setItem(SCAN_STORAGE_KEY, JSON.stringify('a plain string'));
    assert.deepEqual(loadStoredScans(DEFAULT_SCANS, storage), DEFAULT_SCANS);
    console.log('  ✓ Primitive JSON values gracefully handled');
  }

  // 3d. Wrong envelope version
  {
    const storage = new MemoryStorage();
    storage.setItem(SCAN_STORAGE_KEY, JSON.stringify({ version: 99, scans: [createTestScan('bad-ver')] }));
    const result = loadStoredScans(DEFAULT_SCANS, storage);
    assert.deepEqual(result, DEFAULT_SCANS, 'Incompatible envelope version must fall back to DEFAULT_SCANS');
    console.log('  ✓ Incompatible envelope version safely falls back');
  }

  // 3e. Individual corrupted items are rejected
  {
    const storage = new MemoryStorage();
    const validScan = createTestScan('valid-1');
    const corruptedItems = [
      validScan,
      { id: 'bad-1', target: '' }, // empty target
      { id: 'bad-2', target: 'http://a.com', riskScore: -5 }, // negative risk score
      { id: 'bad-3', target: 'http://a.com', riskScore: 105 }, // riskScore > 100
      { id: 'bad-4', target: 'http://a.com', riskScore: 50, riskLevel: 'EXTREME' }, // invalid riskLevel
      { id: 'bad-5', target: 'http://a.com', riskScore: 50, riskLevel: 'HIGH', reasons: 'not-array' }, // non-array reasons
      null,
      'just a string',
    ];
    storage.setItem(SCAN_STORAGE_KEY, JSON.stringify({ version: 1, timestamp: Date.now(), scans: corruptedItems }));
    const result = loadStoredScans(DEFAULT_SCANS, storage);
    assert.equal(result.length, 1, 'Only the valid scan should be loaded');
    assert.equal(result[0].id, validScan.id);
    console.log('  ✓ Corrupted items are safely filtered out leaving valid records');
  }

  // 3f. Security check: Items with forbidden secret keys are rejected
  {
    const storage = new MemoryStorage();
    const leakedScan = {
      ...createTestScan('leaked-key'),
      privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    };
    assert.equal(isValidScanRecord(leakedScan), false, 'Record with privateKey must be rejected by validator');

    const leakedMnemonic = {
      ...createTestScan('leaked-mnemonic'),
      seedPhrase: 'apple banana cherry dog elephant fox grape horse igloo',
    };
    assert.equal(isValidScanRecord(leakedMnemonic), false, 'Record with seedPhrase must be rejected by validator');

    storage.setItem(
      SCAN_STORAGE_KEY,
      JSON.stringify({ version: 1, timestamp: Date.now(), scans: [leakedScan, leakedMnemonic] })
    );
    const result = loadStoredScans(DEFAULT_SCANS, storage);
    assert.deepEqual(result, DEFAULT_SCANS, 'Storage containing secret keys must be rejected');
    console.log('  ✓ Records containing private keys or credentials are automatically rejected');
  }
}

// -------------------------------------------------------------
// Test 4: Preserving newly created scans after simulated reload
// -------------------------------------------------------------
{
  console.log('\nTest 4: Preserving newly created scans across browser reload simulation');
  const storage = new MemoryStorage();

  // 1. Initial startup loads DEFAULT_SCANS
  const session1Scans = loadStoredScans(DEFAULT_SCANS, storage);
  assert.equal(session1Scans.length, DEFAULT_SCANS.length);

  // 2. User creates a new scan in session 1
  const newScan1 = createTestScan('fresh-1', 'https://fresh-airdrop-mint.io');
  const updatedScansSession1 = [newScan1, ...session1Scans];

  // 3. React effect persists updated scans to storage
  saveStoredScans(updatedScansSession1, storage);

  // 4. User refreshes browser (session 2 starts)
  const session2Scans = loadStoredScans(DEFAULT_SCANS, storage);
  assert.equal(session2Scans.length, DEFAULT_SCANS.length + 1, 'Session 2 must have new scan + defaults');
  assert.equal(session2Scans[0].id, newScan1.id, 'Session 2 must have newly created scan at head');
  assert.equal(session2Scans[0].target, 'https://fresh-airdrop-mint.io');

  // 5. User creates a second scan in session 2
  const newScan2 = createTestScan('fresh-2', 'https://second-target.org');
  const updatedScansSession2 = [newScan2, ...session2Scans.filter((s) => s.id !== newScan2.id)];
  saveStoredScans(updatedScansSession2, storage);

  // 6. User refreshes browser again (session 3 starts)
  const session3Scans = loadStoredScans(DEFAULT_SCANS, storage);
  assert.equal(session3Scans.length, DEFAULT_SCANS.length + 2, 'Session 3 must have both new scans + defaults');
  assert.equal(session3Scans[0].id, newScan2.id);
  assert.equal(session3Scans[1].id, newScan1.id);

  // Verify no duplicate IDs exist
  const ids = session3Scans.map((s) => s.id);
  const uniqueIds = new Set(ids);
  assert.equal(ids.length, uniqueIds.size, 'No duplicate scan IDs should exist across reloads');

  // Verify evidence hashes of all loaded scans
  assert.equal(verifyScanEvidenceSync(session3Scans[0]).isValid, true);
  assert.equal(verifyScanEvidenceSync(session3Scans[1]).isValid, true);
  assert.equal(verifyScanEvidenceSync(ROHIT_WORKED_EXAMPLE).isValid, true);

  console.log('  ✓ Newly created scans persist seamlessly across repeated reloads without duplicates');
}

// -------------------------------------------------------------
// Test 5: Backward compatibility with un-enveloped raw arrays
// -------------------------------------------------------------
{
  console.log('\nTest 5: Backward compatibility with un-enveloped legacy arrays');
  const storage = new MemoryStorage();
  const legacyScan = createTestScan('legacy-01');

  // Save directly as raw array without envelope
  storage.setItem(SCAN_STORAGE_KEY, JSON.stringify([legacyScan]));

  const loaded = loadStoredScans(DEFAULT_SCANS, storage);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, legacyScan.id);

  console.log('  ✓ Legacy un-enveloped scan arrays load properly');
}

console.log('\n=== All Scan Storage Persistence Tests Passed Successfully! ===');
