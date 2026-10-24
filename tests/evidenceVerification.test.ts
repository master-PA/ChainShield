import assert from 'node:assert/strict';
import {
  buildCanonicalScanPayload,
  canonicalizeJson,
  computeSha256Sync,
  hashCanonicalScanPayloadSync,
  hashCanonicalScanPayload,
  verifyScanEvidence,
  verifyScanEvidenceSync,
} from '../src/lib/canonicalJson';
import { TargetScanResult, ReasonItem } from '../src/types/security';
import { ROHIT_WORKED_EXAMPLE } from '../src/data/seedData';

console.log('=== Running Evidence Hash Verification Tests ===\n');

const sampleReasons: ReasonItem[] = [
  {
    id: 'r-1',
    category: 'drainer',
    description: 'Matched drainer signatures',
    points: 30,
    severity: 'critical',
  },
  {
    id: 'r-2',
    category: 'domain',
    description: 'Domain registered 1 day ago',
    points: 25,
    severity: 'warning',
  },
  {
    id: 'r-3',
    category: 'source',
    description: 'Direct message origin',
    points: 10,
    severity: 'caution',
  },
];

function createSampleScan(): TargetScanResult {
  const timestamp = 1710288000000;
  const payload = buildCanonicalScanPayload({
    target: 'https://suspicious-airdrop.xyz',
    linkSource: 'telegram_dm',
    isPrivateCheck: false,
    rulesScore: 85,
    mlScore: 80,
    finalScore: 82,
    riskLevel: 'CRITICAL',
    reasonsCount: sampleReasons.length,
    timestamp,
  });

  const canonicalHash = hashCanonicalScanPayloadSync(payload);

  return {
    id: `scan-${timestamp}`,
    target: 'https://suspicious-airdrop.xyz',
    targetType: 'url',
    riskScore: 82,
    riskLevel: 'CRITICAL',
    confidence: 95,
    rulesScore: 85,
    mlScore: 80,
    recommendation: 'AVOID',
    recommendationText: 'High risk drainer clone detected.',
    linkSource: 'telegram_dm',
    isPrivateCheck: false,
    reasons: [...sampleReasons],
    unavailableChecks: [],
    evidence: {
      reportId: 'REP-SEPOLIA-882101',
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
// Test 1: A newly created scan verifies successfully
// -------------------------------------------------------------
{
  console.log('Test 1: Newly created scan verifies successfully');
  const scan = createSampleScan();
  const syncResult = verifyScanEvidenceSync(scan);
  assert.equal(syncResult.isValid, true, 'Sync verification should be valid');
  assert.equal(
    syncResult.computedHash.toLowerCase(),
    scan.evidence!.canonicalHash.toLowerCase(),
    'Computed hash must match evidence canonicalHash'
  );

  const asyncResult = await verifyScanEvidence(scan);
  assert.equal(asyncResult.isValid, true, 'Async verification should be valid');
  assert.equal(
    asyncResult.computedHash.toLowerCase(),
    scan.evidence!.canonicalHash.toLowerCase(),
    'Async computed hash must match evidence canonicalHash'
  );

  // Also check the default worked example in seedData
  const rohitResult = verifyScanEvidenceSync(ROHIT_WORKED_EXAMPLE);
  assert.equal(rohitResult.isValid, true, 'ROHIT_WORKED_EXAMPLE should verify successfully');
  assert.equal(
    rohitResult.computedHash.toLowerCase(),
    ROHIT_WORKED_EXAMPLE.evidence!.canonicalHash.toLowerCase(),
    'ROHIT_WORKED_EXAMPLE hash must match evidence'
  );

  console.log('  ✓ Newly created scan verified successfully');
  console.log('  ✓ ROHIT_WORKED_EXAMPLE verified successfully with hash:', rohitResult.computedHash);
}

// -------------------------------------------------------------
// Test 2: Scan verifies after serialization and deserialization
// -------------------------------------------------------------
{
  console.log('\nTest 2: Scan verifies after serialization and deserialization (JSON round-trip)');
  const scan = createSampleScan();
  const serialized = JSON.stringify(scan);
  const deserialized: TargetScanResult = JSON.parse(serialized);

  const result = verifyScanEvidenceSync(deserialized);
  assert.equal(result.isValid, true, 'Deserialized scan verification should be valid');
  assert.equal(
    result.computedHash.toLowerCase(),
    scan.evidence!.canonicalHash.toLowerCase(),
    'Hash after round-trip must match original canonicalHash'
  );

  const asyncResult = await verifyScanEvidence(deserialized);
  assert.equal(asyncResult.isValid, true, 'Async deserialized scan verification should be valid');

  console.log('  ✓ Serialized and deserialized scan verified successfully without data loss');
}

// -------------------------------------------------------------
// Test 3: Changing a hashed field causes verification to fail
// -------------------------------------------------------------
{
  console.log('\nTest 3: Changing any hashed field causes verification to fail');
  const originalScan = createSampleScan();
  const originalHash = originalScan.evidence!.canonicalHash;

  // 3a. Changing target
  {
    const tampered = { ...createSampleScan(), target: 'https://tampered-site.xyz' };
    const res = verifyScanEvidenceSync(tampered);
    assert.equal(res.isValid, false, 'Tampering target must invalidate verification');
    assert.notEqual(res.computedHash.toLowerCase(), originalHash.toLowerCase());
    console.log('  ✓ Changing target causes verification failure');
  }

  // 3b. Changing linkSource
  {
    const tampered = { ...createSampleScan(), linkSource: 'discord' as const };
    const res = verifyScanEvidenceSync(tampered);
    assert.equal(res.isValid, false, 'Tampering linkSource must invalidate verification');
    assert.notEqual(res.computedHash.toLowerCase(), originalHash.toLowerCase());
    console.log('  ✓ Changing linkSource causes verification failure');
  }

  // 3c. Changing isPrivateCheck
  {
    const tampered = { ...createSampleScan(), isPrivateCheck: true };
    const res = verifyScanEvidenceSync(tampered);
    assert.equal(res.isValid, false, 'Tampering isPrivateCheck must invalidate verification');
    assert.notEqual(res.computedHash.toLowerCase(), originalHash.toLowerCase());
    console.log('  ✓ Changing isPrivateCheck causes verification failure');
  }

  // 3d. Changing rulesScore
  {
    const tampered = { ...createSampleScan(), rulesScore: 20 };
    const res = verifyScanEvidenceSync(tampered);
    assert.equal(res.isValid, false, 'Tampering rulesScore must invalidate verification');
    assert.notEqual(res.computedHash.toLowerCase(), originalHash.toLowerCase());
    console.log('  ✓ Changing rulesScore causes verification failure');
  }

  // 3e. Changing mlScore
  {
    const tampered = { ...createSampleScan(), mlScore: 10 };
    const res = verifyScanEvidenceSync(tampered);
    assert.equal(res.isValid, false, 'Tampering mlScore must invalidate verification');
    assert.notEqual(res.computedHash.toLowerCase(), originalHash.toLowerCase());
    console.log('  ✓ Changing mlScore causes verification failure');
  }

  // 3f. Changing finalScore (stored as riskScore)
  {
    const tampered = { ...createSampleScan(), riskScore: 15 };
    const res = verifyScanEvidenceSync(tampered);
    assert.equal(res.isValid, false, 'Tampering riskScore (finalScore) must invalidate verification');
    assert.notEqual(res.computedHash.toLowerCase(), originalHash.toLowerCase());
    console.log('  ✓ Changing finalScore (riskScore) causes verification failure');
  }

  // 3g. Changing riskLevel
  {
    const tampered = { ...createSampleScan(), riskLevel: 'LOW' as const };
    const res = verifyScanEvidenceSync(tampered);
    assert.equal(res.isValid, false, 'Tampering riskLevel must invalidate verification');
    assert.notEqual(res.computedHash.toLowerCase(), originalHash.toLowerCase());
    console.log('  ✓ Changing riskLevel causes verification failure');
  }

  // 3h. Changing reasonsCount (via reasons array length)
  {
    const tampered = { ...createSampleScan(), reasons: sampleReasons.slice(0, 1) };
    const res = verifyScanEvidenceSync(tampered);
    assert.equal(res.isValid, false, 'Tampering reasonsCount must invalidate verification');
    assert.notEqual(res.computedHash.toLowerCase(), originalHash.toLowerCase());
    console.log('  ✓ Changing reasons count causes verification failure');
  }

  // 3i. Changing timestamp (createdAt)
  {
    const tampered = { ...createSampleScan(), createdAt: 1710289999999 };
    const res = verifyScanEvidenceSync(tampered);
    assert.equal(res.isValid, false, 'Tampering createdAt (timestamp) must invalidate verification');
    assert.notEqual(res.computedHash.toLowerCase(), originalHash.toLowerCase());
    console.log('  ✓ Changing timestamp causes verification failure');
  }

  // 3j. Verify tampering simulation override
  {
    const scan = createSampleScan();
    const tamperedRes = verifyScanEvidenceSync(scan, {
      rulesScore: 12,
      finalScore: 15,
      riskLevel: 'LOW',
    });
    assert.equal(tamperedRes.isValid, false, 'Tamper override must invalidate verification');
    console.log('  ✓ Simulated tamper overrides produce expected verification failure');
  }
}

// -------------------------------------------------------------
// Test 4: Changing an unhashed field does NOT alter verification
// -------------------------------------------------------------
{
  console.log('\nTest 4: Changing unhashed fields does not alter canonical payload or verification');
  const originalScan = createSampleScan();
  const originalHash = originalScan.evidence!.canonicalHash;
  const originalPayload = buildCanonicalScanPayload(originalScan);

  // Mutate non-canonical fields: id, confidence, recommendation, recommendationText, unavailableChecks, isDemo, simulation
  const modifiedScan: TargetScanResult = {
    ...originalScan,
    id: 'scan-totally-different-id',
    confidence: 12,
    recommendation: 'SAFE_TO_PROCEED',
    recommendationText: 'Completely different recommendation description that is not hashed',
    unavailableChecks: ['dns_sec', 'whois_registrar'],
    isDemo: true,
    simulation: {
      simulatedSuccess: true,
      simulationProvider: 'Offline Simulation Engine',
      gasEstimated: '21,000',
      assetsOut: [],
      assetsIn: [],
      approvalsGranted: [],
      plainSummary: 'Safe test simulation',
    },
  };

  const modifiedPayload = buildCanonicalScanPayload(modifiedScan);
  assert.deepEqual(
    modifiedPayload,
    originalPayload,
    'Canonical payload must remain completely identical when unhashed fields change'
  );

  const res = verifyScanEvidenceSync(modifiedScan);
  assert.equal(res.isValid, true, 'Verification must still pass when unhashed fields change');
  assert.equal(
    res.computedHash.toLowerCase(),
    originalHash.toLowerCase(),
    'Computed hash must remain completely unchanged'
  );

  console.log('  ✓ Changing id, confidence, recommendation, simulation, etc. leaves canonical payload identical');
  console.log('  ✓ Verification succeeds without altering the verification procedure');
}

console.log('\n=== All 4 Test Suites Passed Successfully! ===');
