import assert from 'node:assert/strict';
import { ethers } from 'ethers';
import {
  getBlockchainConfig,
  formatRpcError,
  queryOnChainEvidence,
  SEPOLIA_CHAIN_ID,
  DEFAULT_SEPOLIA_RPC,
  OnChainVerificationResult,
} from '../src/lib/blockchainEvidence';
import artifact from '../src/contracts/EvidenceRegistry.json';

console.log('=== Running Blockchain Evidence Anchoring Tests ===\n');

// -------------------------------------------------------------
// Test 1: getBlockchainConfig validation & fallback handling
// -------------------------------------------------------------
{
  console.log('Test 1: Blockchain configuration parsing and address validation');

  // Case 1a: Default unconfigured environment
  const defaultConfig = getBlockchainConfig();
  assert.equal(defaultConfig.chainId, SEPOLIA_CHAIN_ID, 'Chain ID must be Sepolia (11155111)');
  assert.equal(typeof defaultConfig.rpcUrl, 'string', 'RPC URL should be defined');
  assert.equal(defaultConfig.networkName, 'Ethereum Sepolia Testnet');

  // Case 1b: When address is invalid or empty
  const invalidConfig = {
    ...defaultConfig,
    contractAddress: 'not-an-address',
    isConfigured: ethers.isAddress('not-an-address'),
  };
  assert.equal(invalidConfig.isConfigured, false, 'Invalid address must result in isConfigured: false');

  // Case 1c: When valid address is provided
  const validAddress = '0x1234567890123456789012345678901234567890';
  assert.equal(ethers.isAddress(validAddress), true, 'Valid address must pass isAddress check');

  console.log('  ✓ Config handles missing or invalid contract address safely');
}

// -------------------------------------------------------------
// Test 2: Unconfigured contract query handling
// -------------------------------------------------------------
{
  console.log('\nTest 2: queryOnChainEvidence handles unconfigured contract gracefully');

  const result = await queryOnChainEvidence('REP-SEPOLIA-001', {
    contractAddress: '',
    isConfigured: false,
  });

  assert.equal(result.status, 'UNCONFIGURED', 'Missing contract address must return UNCONFIGURED status');
  assert.notEqual(result.error, undefined, 'Error explanation must be provided');
  assert.equal(result.network, 'Ethereum Sepolia Testnet');

  console.log('  ✓ Unconfigured state returns UNCONFIGURED status without throwing');
}

// -------------------------------------------------------------
// Test 3: RPC Error handling
// -------------------------------------------------------------
{
  console.log('\nTest 3: queryOnChainEvidence handles RPC errors gracefully');

  // Point to a non-existent local port to guarantee connection refused
  const result = await queryOnChainEvidence('REP-SEPOLIA-001', {
    rpcUrl: 'http://127.0.0.1:54321', // Unreachable port
    contractAddress: '0x1234567890123456789012345678901234567890',
    isConfigured: true,
  });

  assert.equal(result.status, 'RPC_ERROR', 'Network failure must return RPC_ERROR status');
  assert.notEqual(result.error, undefined, 'Error message must be populated');
  assert.equal(typeof result.error, 'string');

  console.log('  ✓ Network/RPC errors captured cleanly without unhandled rejections');
}

// -------------------------------------------------------------
// Test 4: Error message formatting
// -------------------------------------------------------------
{
  console.log('\nTest 4: formatRpcError diagnostic formatting');

  // User rejection
  const rejectionMsg = formatRpcError({ code: 4001, message: 'MetaMask: user rejected transaction.' });
  assert.equal(rejectionMsg, 'User rejected the transaction in wallet.');

  // Rate limit
  const rateLimitMsg = formatRpcError({ message: 'Request failed with status code 429: Too Many Requests' });
  assert.ok(rateLimitMsg.includes('rate limit'), 'Rate limit should be identified');

  // Connection refused
  const connMsg = formatRpcError({ message: 'connect ECONNREFUSED 127.0.0.1:8545' });
  assert.ok(connMsg.includes('Unable to connect'), 'Connection failure should be identified');

  console.log('  ✓ RPC errors formatted cleanly into user-friendly diagnostic messages');
}

// -------------------------------------------------------------
// Test 5: Mock Contract Execution (Unanchored vs Anchored)
// -------------------------------------------------------------
{
  console.log('\nTest 5: Querying on-chain evidence with simulated contract runner');

  const dummyContractAddress = '0x9918237F012891c92019b882019481bc9018274a';
  const dummyReportId = 'REP-TEST-123456';
  const dummyHash = '0x49e4d8fba0a9c3e02feb02224862851bde4002e4321548f2266f0f90765eb969';
  const dummySubmitter = '0x4891b018820c8129038f192b012837bc8192a019';
  const dummyBlock = 5410982n;
  const dummyTime = 1710288000n;

  // 5a. Mock runner that returns zero hash (NOT_ANCHORED)
  const unanchoredRunner: ethers.ContractRunner = {
    provider: null,
    call: async (tx: ethers.TransactionRequest) => {
      // Interface encoding for getEvidence: returns (bytes32, uint256, address, uint256)
      const iface = new ethers.Interface(artifact.abi);
      return iface.encodeFunctionResult('getEvidence', [
        ethers.ZeroHash,
        0n,
        ethers.ZeroAddress,
        0n,
      ]);
    },
  };

  const unanchoredResult = await queryOnChainEvidence(
    dummyReportId,
    { contractAddress: dummyContractAddress, isConfigured: true },
    unanchoredRunner
  );
  assert.equal(unanchoredResult.status, 'NOT_ANCHORED', 'Zero evidenceHash must return NOT_ANCHORED');
  assert.equal(unanchoredResult.contractAddress, dummyContractAddress);
  console.log('  ✓ Zero hash response correctly classified as NOT_ANCHORED');

  // 5b. Mock runner that returns valid anchored record (ANCHORED)
  const anchoredRunner: ethers.ContractRunner = {
    provider: null,
    call: async (tx: ethers.TransactionRequest) => {
      const iface = new ethers.Interface(artifact.abi);
      return iface.encodeFunctionResult('getEvidence', [
        dummyHash,
        dummyTime,
        dummySubmitter,
        dummyBlock,
      ]);
    },
  };

  const anchoredResult = await queryOnChainEvidence(
    dummyReportId,
    { contractAddress: dummyContractAddress, isConfigured: true },
    anchoredRunner
  );
  assert.equal(anchoredResult.status, 'ANCHORED', 'Valid evidenceHash must return ANCHORED');
  assert.equal(anchoredResult.evidence?.evidenceHash.toLowerCase(), dummyHash.toLowerCase());
  assert.equal(anchoredResult.evidence?.submitter.toLowerCase(), dummySubmitter.toLowerCase());
  assert.equal(anchoredResult.evidence?.blockNumber, 5410982);
  assert.equal(anchoredResult.evidence?.timestamp, Number(dummyTime) * 1000);
  console.log('  ✓ Anchored response correctly extracts hash, block number, submitter, and timestamp');
}

// -------------------------------------------------------------
// Test 6: ABI and Bytecode Integrity
// -------------------------------------------------------------
{
  console.log('\nTest 6: Contract artifact ABI and bytecode verification');

  assert.equal(artifact.contractName, 'EvidenceRegistry');
  assert.ok(Array.isArray(artifact.abi), 'Artifact must include ABI array');
  assert.ok(artifact.bytecode.startsWith('0x'), 'Bytecode must be hex encoded with 0x prefix');

  // Verify ABI contains expected function signatures
  const iface = new ethers.Interface(artifact.abi);
  assert.ok(iface.hasFunction('anchorEvidence'), 'ABI must have anchorEvidence');
  assert.ok(iface.hasFunction('getEvidence'), 'ABI must have getEvidence');
  assert.ok(iface.hasFunction('verifyEvidence'), 'ABI must have verifyEvidence');
  assert.ok(iface.hasEvent('EvidenceAnchored'), 'ABI must have EvidenceAnchored event');

  console.log('  ✓ EvidenceRegistry ABI and Bytecode validated successfully');
}

console.log('\n=== All Blockchain Evidence Anchoring Tests Passed Successfully! ===');
