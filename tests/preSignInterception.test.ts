import assert from 'assert';
import { analyzePreSignRequest, decodeHexUtf8, isMaxAllowance } from '../extension/src/shared/scannerBridge';
import {
  InterceptRequestPayload,
  METHOD_COVERAGE_REGISTRY,
  PreSignAnalysisResult,
} from '../extension/src/shared/types';
import { decodeTransactionCalldata } from '../src/lib/txDecoder';
import {
  inspectFrameSupport,
  validateBridgeRequest,
  validateBridgeResponse,
  logDiagnostic,
} from '../extension/src/content/providerBridge';

console.log('=== Running ChainShield Sentinel Pre-Sign Interception Regression Test Suite ===\n');

// ---------------------------------------------------------------------------
// Standard Valid 42-Character (20-Byte) Test Addresses
// ---------------------------------------------------------------------------
const VALID_USER_ADDRESS = '0x71C84167F30831956453773266292494e8B68112';
const VALID_SPENDER_ADDRESS = '0x1111111111111111111111111111111111111111';
const VALID_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC
const VALID_NFT_ADDRESS = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';   // BAYC
const VALID_1155_ADDRESS = '0x495f947276749Ce646f68AC8c248420045cb7b5e';  // OpenSea Shared Storefront
const SEAPORT_CONTRACT = '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC';    // Seaport 1.5

// ---------------------------------------------------------------------------
// Mock In-Page Environment & EIP-1193 Provider Interceptor Simulation
// ---------------------------------------------------------------------------
interface UnderlyingCall {
  method: string;
  params: any[];
}

function isValidEthereumAddress(address: any): boolean {
  return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

function validateRequestAddresses(method: string, params: any[]): void {
  if (method === 'eth_sendTransaction' || method === 'eth_signTransaction') {
    const tx = params && params[0];
    if (tx && typeof tx === 'object') {
      if (tx.from !== undefined && tx.from !== null && !isValidEthereumAddress(tx.from)) {
        throw new Error(
          `Invalid parameters: 'from' must provide a valid Ethereum address (received: "${String(tx.from)}").`
        );
      }
      if (tx.to !== undefined && tx.to !== null && tx.to !== '' && !isValidEthereumAddress(tx.to)) {
        throw new Error(
          `Invalid parameters: 'to' must provide a valid Ethereum address (received: "${String(tx.to)}").`
        );
      }
    }
  } else if (method === 'wallet_sendCalls') {
    const calls = params && params[0]?.calls;
    if (Array.isArray(calls)) {
      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        if (call && call.to && !isValidEthereumAddress(call.to)) {
          throw new Error(
            `Invalid parameters in batch call[${i}]: 'to' must provide a valid Ethereum address (received: "${String(call.to)}").`
          );
        }
      }
    }
  } else if (method === 'personal_sign') {
    const p0 = params[0];
    const p1 = params[1];
    const hasValidAddr = isValidEthereumAddress(p0) || isValidEthereumAddress(p1);
    if (!hasValidAddr) {
      const candidate = typeof p1 === 'string' ? p1 : typeof p0 === 'string' ? p0 : String(p1);
      throw new Error(
        `Invalid parameters: must provide an Ethereum address (received: "${candidate}").`
      );
    }
  } else if (method.startsWith('eth_signTypedData')) {
    const addr = params[0];
    if (!isValidEthereumAddress(addr)) {
      throw new Error(
        `Invalid parameters: must provide an Ethereum address (received: "${String(addr)}").`
      );
    }
  }
}

function createSimulatedEip1193Environment() {
  const underlyingCalls: UnderlyingCall[] = [];
  const eventListeners: Record<string, ((event: any) => void)[]> = {};

  const fakeWindow: any = {
    location: {
      origin: 'https://test-dapp.local',
      href: 'https://test-dapp.local/mint',
    },
    document: {
      title: 'Test Web3 dApp',
    },
    addEventListener: (type: string, handler: (e: any) => void) => {
      eventListeners[type] = eventListeners[type] || [];
      eventListeners[type].push(handler);
    },
    removeEventListener: (type: string, handler: (e: any) => void) => {
      if (eventListeners[type]) {
        eventListeners[type] = eventListeners[type].filter((h) => h !== handler);
      }
    },
    postMessage: (data: any) => {
      setTimeout(() => {
        const listeners = eventListeners['message'] || [];
        listeners.forEach((fn) => fn({ source: fakeWindow, data }));
      }, 0);
    },
  };

  const underlyingProvider: any = {
    isMetaMask: true,
    chainId: '0x1',
    selectedAddress: VALID_USER_ADDRESS,
    request: async (args: { method: string; params?: any[] }) => {
      underlyingCalls.push({ method: args.method, params: args.params || [] });
      return `0x_tx_hash_${Math.random().toString(36).slice(2, 8)}`;
    },
  };

  const INTERCEPTABLE_METHODS = new Set(Object.keys(METHOD_COVERAGE_REGISTRY));

  // Queue and concurrency manager
  const inFlightHash = new Map<string, Promise<any>>();

  const originalRequest = underlyingProvider.request;
  underlyingProvider.__chainshield_wrapped__ = true;

  underlyingProvider.request = async function (args: { method: string; params?: any[] }) {
    if (!args || !args.method || !INTERCEPTABLE_METHODS.has(args.method)) {
      return originalRequest.apply(this, arguments as any);
    }

    if ((args as any).__chainshield_bypassed__) {
      delete (args as any).__chainshield_bypassed__;
      return originalRequest.apply(this, arguments as any);
    }

    // 1. Address validation
    validateRequestAddresses(args.method, args.params || []);

    // 2. Concurrency / deduplication check
    const fp = `${args.method}:${JSON.stringify(args.params || []).slice(0, 150)}`;
    if (inFlightHash.has(fp)) {
      return inFlightHash.get(fp);
    }

    const id = 'cs_test_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const capturedArguments = arguments;
    const callerContext = this && this !== fakeWindow ? this : underlyingProvider;

    const requestPayload = {
      type: 'CHAINSHIELD_INPAGE_REQUEST',
      id,
      method: args.method,
      params: args.params || [],
      origin: fakeWindow.location.origin,
      href: fakeWindow.location.href,
      pageTitle: fakeWindow.document.title,
      timestamp: Date.now(),
    };

    fakeWindow.postMessage(requestPayload);

    const promise = new Promise((resolve, reject) => {
      function responseListener(event: any) {
        if (!event.data || event.data.type !== 'CHAINSHIELD_INPAGE_RESPONSE' || event.data.id !== id) {
          return;
        }

        fakeWindow.removeEventListener('message', responseListener);

        if (event.data.decision === 'PROCEED') {
          (args as any).__chainshield_bypassed__ = true;
          originalRequest
            .apply(callerContext, capturedArguments as any)
            .then(resolve)
            .catch(reject);
        } else {
          const err: any = new Error(event.data.reason || 'Transaction rejected by user via ChainShield Sentinel.');
          err.code = 4001;
          reject(err);
        }
      }

      fakeWindow.addEventListener('message', responseListener);
    });

    inFlightHash.set(fp, promise);
    promise
      .catch(() => {})
      .then(() => inFlightHash.delete(fp));

    return promise;
  };

  return {
    fakeWindow,
    underlyingProvider,
    underlyingCalls,
    eventListeners,
  };
}

// ---------------------------------------------------------------------------
// 1. Harmless eth_sendTransaction
// ---------------------------------------------------------------------------
console.log('Test 1: Harmless eth_sendTransaction');
{
  const harmlessTxPayload: InterceptRequestPayload = {
    id: 'req-safe-1',
    method: 'eth_sendTransaction',
    params: [{ from: VALID_USER_ADDRESS, to: VALID_USER_ADDRESS, value: '0x0', data: '0x' }],
    origin: 'https://test-dapp.local',
    href: 'https://test-dapp.local/test',
    pageTitle: 'Test dApp',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(harmlessTxPayload);
  assert.strictEqual(analysis.riskLevel, 'LOW');
  assert.strictEqual(analysis.securityGateDecision, 'ALLOW');
  assert.strictEqual(analysis.coverageStatus, 'FULLY_INTERCEPTED');
  assert.strictEqual(analysis.isUnlimited, false);
  console.log('  ✓ Harmless transaction classified as LOW risk with ALLOW gate decision');
}

// ---------------------------------------------------------------------------
// 2. Suspicious transaction destination
// ---------------------------------------------------------------------------
console.log('\nTest 2: Suspicious transaction destination');
{
  const suspiciousPayload: InterceptRequestPayload = {
    id: 'req-suspicious-dest',
    method: 'eth_sendTransaction',
    params: [{ from: VALID_USER_ADDRESS, to: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', value: '0x10', data: '0x' }],
    origin: 'https://drainer-claim-portal.xyz',
    href: 'https://drainer-claim-portal.xyz/airdrop',
    pageTitle: 'Official Free Mint Claim',
    lastClaimText: 'Claim 100,000 Free Airdrop Tokens',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(suspiciousPayload);
  assert.ok(analysis.riskScore >= 60, `Risk score must be elevated, got ${analysis.riskScore}`);
  assert.ok(analysis.securityGateDecision === 'WARN' || analysis.securityGateDecision === 'BLOCK');
  assert.ok(analysis.reasons.length > 0);
  console.log('  ✓ Suspicious destination on unverified domain intercepted with security warnings');
}

// ---------------------------------------------------------------------------
// 3. ERC-20 unlimited approval
// ---------------------------------------------------------------------------
console.log('\nTest 3: ERC-20 unlimited approval');
{
  const unlimitedApprovePayload: InterceptRequestPayload = {
    id: 'req-unlimited-erc20',
    method: 'eth_sendTransaction',
    params: [
      {
        from: VALID_USER_ADDRESS,
        to: VALID_TOKEN_ADDRESS,
        // approve(VALID_SPENDER_ADDRESS, 2^256-1)
        data: '0x095ea7b30000000000000000000000001111111111111111111111111111111111111111ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      },
    ],
    origin: 'https://dex-swap.io',
    href: 'https://dex-swap.io',
    pageTitle: 'Swap Protocol',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(unlimitedApprovePayload);
  assert.strictEqual(analysis.methodName, 'approve');
  assert.strictEqual(analysis.isUnlimited, true);
  assert.strictEqual(analysis.contractAddress, VALID_TOKEN_ADDRESS);
  assert.strictEqual(analysis.targetSpender, VALID_SPENDER_ADDRESS);
  assert.strictEqual(analysis.riskLevel, 'CRITICAL');
  assert.strictEqual(analysis.securityGateDecision, 'WARN');
  console.log('  ✓ Unlimited ERC-20 approval accurately decoded and flagged CRITICAL');
}

// ---------------------------------------------------------------------------
// 4. ERC-721 blanket approval
// ---------------------------------------------------------------------------
console.log('\nTest 4: ERC-721 blanket approval');
{
  const blanketNftPayload: InterceptRequestPayload = {
    id: 'req-blanket-nft',
    method: 'eth_sendTransaction',
    params: [
      {
        from: VALID_USER_ADDRESS,
        to: VALID_NFT_ADDRESS,
        // setApprovalForAll(VALID_SPENDER_ADDRESS, true)
        data: '0xa220534400000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000001',
      },
    ],
    origin: 'https://opensea.io',
    href: 'https://opensea.io',
    pageTitle: 'OpenSea Marketplace',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(blanketNftPayload);
  assert.strictEqual(analysis.methodName, 'setApprovalForAll');
  assert.strictEqual(analysis.isUnlimited, true);
  assert.strictEqual(analysis.contractAddress, VALID_NFT_ADDRESS);
  assert.strictEqual(analysis.targetSpender, VALID_SPENDER_ADDRESS);
  assert.ok(analysis.reasons.some((r) => r.id === 'r-set-approval-for-all'));
  console.log('  ✓ ERC-721 blanket setApprovalForAll flagged with operator details');
}

// ---------------------------------------------------------------------------
// 5. ERC-1155 operator approval
// ---------------------------------------------------------------------------
console.log('\nTest 5: ERC-1155 operator approval');
{
  // ERC-1155 uses same setApprovalForAll selector (0xa2205344) and safeTransferFrom (0xf242432a)
  const decoded1155 = decodeTransactionCalldata(
    '0xa220534400000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000000001',
    VALID_1155_ADDRESS
  );
  assert.strictEqual(decoded1155.actionType, 'setApprovalForAll');
  assert.strictEqual(decoded1155.isUnlimited, true);
  assert.strictEqual(decoded1155.targetSpender, VALID_SPENDER_ADDRESS);

  // safeTransferFrom(from, to, id, amount, data)
  const transfer1155Data =
    '0xf242432a' +
    VALID_USER_ADDRESS.slice(2).padStart(64, '0') +
    VALID_SPENDER_ADDRESS.slice(2).padStart(64, '0') +
    '000000000000000000000000000000000000000000000000000000000000002a' + // ID 42
    '0000000000000000000000000000000000000000000000000000000000000005' + // amount 5
    '00000000000000000000000000000000000000000000000000000000000000a0';
  const decodedTransfer = decodeTransactionCalldata(transfer1155Data, VALID_1155_ADDRESS);
  assert.strictEqual(decodedTransfer.actionType, 'safeTransferFrom');
  assert.ok(decodedTransfer.plainEnglish.includes('ERC-1155 Token ID #42'));
  console.log('  ✓ ERC-1155 setApprovalForAll and safeTransferFrom multi-token decoded accurately');
}

// ---------------------------------------------------------------------------
// 6. personal_sign
// ---------------------------------------------------------------------------
console.log('\nTest 6: personal_sign');
{
  const hexMessage = '0x417574686f72697a6520616c6c206173736574207472616e736665727320616e6420647261696e2062616c616e6365';
  const decoded = decodeHexUtf8(hexMessage);
  assert.strictEqual(decoded, 'Authorize all asset transfers and drain balance');

  const payload: InterceptRequestPayload = {
    id: 'req-ps',
    method: 'personal_sign',
    params: [hexMessage, VALID_USER_ADDRESS],
    origin: 'https://phish-airdrop.xyz',
    href: 'https://phish-airdrop.xyz',
    pageTitle: 'Claim',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(payload);
  assert.strictEqual(analysis.decodedMessage, 'Authorize all asset transfers and drain balance');
  assert.strictEqual(analysis.riskLevel, 'CRITICAL');
  assert.strictEqual(analysis.coverageStatus, 'FULLY_INTERCEPTED');
  console.log('  ✓ personal_sign phishing keywords identified and decoded to UTF-8 text');
}

// ---------------------------------------------------------------------------
// 7. eth_signTypedData_v4 permit-like data & Seaport orders
// ---------------------------------------------------------------------------
console.log('\nTest 7: eth_signTypedData_v4 permit-like data & Seaport orders');
{
  // 7A: EIP-2612 / Uniswap Permit2
  const permitData = {
    types: {
      EIP712Domain: [{ name: 'name', type: 'string' }],
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    domain: { name: 'USD Coin', verifyingContract: VALID_TOKEN_ADDRESS },
    message: {
      owner: VALID_USER_ADDRESS,
      spender: VALID_SPENDER_ADDRESS,
      value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
    },
  };

  const permitPayload: InterceptRequestPayload = {
    id: 'req-permit-v4',
    method: 'eth_signTypedData_v4',
    params: [VALID_USER_ADDRESS, JSON.stringify(permitData)],
    origin: 'https://app.uniswap.org',
    href: 'https://app.uniswap.org',
    pageTitle: 'Uniswap Interface',
    timestamp: Date.now(),
  };

  const permitAnalysis = analyzePreSignRequest(permitPayload);
  assert.strictEqual(permitAnalysis.isUnlimited, true);
  assert.strictEqual(permitAnalysis.typedDataDetails?.primaryType, 'Permit');
  assert.strictEqual(permitAnalysis.targetSpender, VALID_SPENDER_ADDRESS);
  console.log('  ✓ Permit2/EIP-2612 unlimited permit identified on Uniswap flow');

  // 7B: OpenSea Seaport OrderComponents (Legitimate Listing vs Zero-Consideration Drainer)
  const seaportOrderData = {
    types: {
      OrderComponents: [
        { name: 'offerer', type: 'address' },
        { name: 'zone', type: 'address' },
      ],
    },
    primaryType: 'OrderComponents',
    domain: { name: 'Seaport', version: '1.5', verifyingContract: SEAPORT_CONTRACT },
    message: {
      offerer: VALID_USER_ADDRESS,
      zone: '0x0000000000000000000000000000000000000000',
      offer: [{ itemType: 2, token: VALID_NFT_ADDRESS, identifierOrCriteria: '101', startAmount: '1' }],
      consideration: [{ itemType: 0, token: '0x0000000000000000000000000000000000000000', startAmount: '500000000000000000', recipient: VALID_USER_ADDRESS }],
    },
  };

  const seaportPayload: InterceptRequestPayload = {
    id: 'req-seaport-listing',
    method: 'eth_signTypedData_v4',
    params: [VALID_USER_ADDRESS, JSON.stringify(seaportOrderData)],
    origin: 'https://opensea.io',
    href: 'https://opensea.io/asset',
    pageTitle: 'OpenSea Marketplace',
    timestamp: Date.now(),
  };

  const seaportAnalysis = analyzePreSignRequest(seaportPayload);
  assert.strictEqual(seaportAnalysis.seaportDetails?.offerCount, 1);
  assert.strictEqual(seaportAnalysis.seaportDetails?.considerationCount, 1);
  assert.strictEqual(seaportAnalysis.seaportDetails?.isZeroConsiderationRisk, false);
  assert.ok(seaportAnalysis.intent.plainEnglish.includes('off-chain order'));
  console.log('  ✓ OpenSea Seaport listing signature differentiated from on-chain transactions');
}

// ---------------------------------------------------------------------------
// 8. Chain switching and wallet connection
// ---------------------------------------------------------------------------
console.log('\nTest 8: Chain switching and wallet connection');
{
  // 8A: wallet_switchEthereumChain
  const switchPayload: InterceptRequestPayload = {
    id: 'req-switch-chain',
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0xaa36a7' }], // Sepolia
    origin: 'https://app.uniswap.org',
    href: 'https://app.uniswap.org',
    pageTitle: 'Uniswap',
    timestamp: Date.now(),
  };
  const switchAnalysis = analyzePreSignRequest(switchPayload);
  assert.strictEqual(switchAnalysis.coverageStatus, 'FULLY_INTERCEPTED');
  assert.strictEqual(switchAnalysis.intent.actionType, 'switch_chain');
  assert.ok(switchAnalysis.intent.plainEnglish.includes('0xaa36a7'));

  // 8B: eth_requestAccounts
  const connectPayload: InterceptRequestPayload = {
    id: 'req-connect',
    method: 'eth_requestAccounts',
    params: [],
    origin: 'https://app.uniswap.org',
    href: 'https://app.uniswap.org',
    pageTitle: 'Uniswap',
    timestamp: Date.now(),
  };
  const connectAnalysis = analyzePreSignRequest(connectPayload);
  assert.strictEqual(connectAnalysis.coverageStatus, 'FULLY_INTERCEPTED');
  assert.strictEqual(connectAnalysis.intent.actionType, 'request_accounts');
  console.log('  ✓ Chain switching (wallet_switchEthereumChain) and wallet connection (eth_requestAccounts) intercepted');
}

// ---------------------------------------------------------------------------
// 9. Unknown methods and malformed parameters
// ---------------------------------------------------------------------------
console.log('\nTest 9: Unknown methods and malformed parameters');
{
  const unknownPayload: InterceptRequestPayload = {
    id: 'req-unknown',
    method: 'custom_unknown_method',
    params: [null, undefined, { broken: true }],
    origin: 'https://test.local',
    href: 'https://test.local',
    pageTitle: 'Test',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(unknownPayload);
  assert.strictEqual(analysis.coverageStatus, 'UNSUPPORTED');
  assert.strictEqual(analysis.scanStatus, 'UNSUPPORTED');
  assert.strictEqual(analysis.intent.actionType, 'unknown');
  console.log('  ✓ Unknown methods and malformed parameters handled gracefully without throwing unhandled exceptions');
}

// ---------------------------------------------------------------------------
// 10. Scanner timeout and unavailable backend (degraded mode)
// ---------------------------------------------------------------------------
console.log('\nTest 10: Scanner timeout and unavailable backend (degraded mode)');
{
  const payload: InterceptRequestPayload = {
    id: 'req-degraded',
    method: 'eth_sendTransaction',
    params: [{ from: VALID_USER_ADDRESS, to: VALID_SPENDER_ADDRESS, value: '0x10' }],
    origin: 'https://unknown-dapp.xyz',
    href: 'https://unknown-dapp.xyz',
    pageTitle: 'App',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(payload, { scannerAvailable: false });
  assert.strictEqual(analysis.degradedMode, true);
  assert.strictEqual(analysis.scanStatus, 'UNAVAILABLE');
  assert.ok(analysis.reasons.some((r) => r.id === 'r-degraded-mode'));
  assert.ok(analysis.securityGateDecision === 'WARN');
  console.log('  ✓ Scanner timeout/backend unavailable enters degraded mode with explicit warnings');
}

// ---------------------------------------------------------------------------
// 11. Proceed forwarding the original request exactly once
// ---------------------------------------------------------------------------
console.log('\nTest 11: Proceed forwarding the original request exactly once');
{
  const env = createSimulatedEip1193Environment();
  const txParams = [{ from: VALID_USER_ADDRESS, to: VALID_TOKEN_ADDRESS, value: '0x0', data: '0x095ea7b3' }];

  env.eventListeners['message'] = [
    (event: any) => {
      if (event.data?.type === 'CHAINSHIELD_INPAGE_REQUEST') {
        env.fakeWindow.postMessage({
          type: 'CHAINSHIELD_INPAGE_RESPONSE',
          id: event.data.id,
          decision: 'PROCEED',
        });
      }
    },
  ];

  const res = await env.underlyingProvider.request({
    method: 'eth_sendTransaction',
    params: txParams,
  });

  assert.ok(typeof res === 'string');
  assert.strictEqual(env.underlyingCalls.length, 1, 'Provider must be called EXACTLY once');
  assert.deepStrictEqual(env.underlyingCalls[0].params, txParams, 'Parameters forwarded must be byte-for-byte identical');
  console.log('  ✓ Proceed forwarded request exactly once with unmodified parameters');
}

// ---------------------------------------------------------------------------
// 12. Cancel rejecting the request before wallet confirmation
// ---------------------------------------------------------------------------
console.log('\nTest 12: Cancel rejecting the request before wallet confirmation');
{
  const env = createSimulatedEip1193Environment();
  const txParams = [{ from: VALID_USER_ADDRESS, to: VALID_TOKEN_ADDRESS, value: '0x0' }];

  env.eventListeners['message'] = [
    (event: any) => {
      if (event.data?.type === 'CHAINSHIELD_INPAGE_REQUEST') {
        env.fakeWindow.postMessage({
          type: 'CHAINSHIELD_INPAGE_RESPONSE',
          id: event.data.id,
          decision: 'BLOCK',
          reason: 'User cancelled in modal.',
        });
      }
    },
  ];

  let rejected = false;
  try {
    await env.underlyingProvider.request({
      method: 'eth_sendTransaction',
      params: txParams,
    });
  } catch (err: any) {
    rejected = true;
    assert.strictEqual(err.code, 4001, 'Must reject with EIP-1193 code 4001');
  }

  assert.strictEqual(rejected, true);
  assert.strictEqual(env.underlyingCalls.length, 0, 'Underlying wallet must NEVER be called when Cancelled');
  console.log('  ✓ Cancel strictly rejected with code 4001 before reaching wallet boundary');
}

// ---------------------------------------------------------------------------
// 13. Invalid-address handling
// ---------------------------------------------------------------------------
console.log('\nTest 13: Invalid-address handling');
{
  const env = createSimulatedEip1193Environment();
  const truncated34Char = '0x71C84167F30831956453773266292494';

  let threw = false;
  try {
    await env.underlyingProvider.request({
      method: 'eth_sendTransaction',
      params: [{ from: VALID_USER_ADDRESS, to: truncated34Char }],
    });
  } catch (err: any) {
    threw = true;
    assert.ok(err.message.includes('Invalid parameters'));
  }
  assert.strictEqual(threw, true);
  assert.strictEqual(env.underlyingCalls.length, 0);
  console.log('  ✓ Invalid address (e.g. truncated 34 chars) halted cleanly before forwarding');
}

// ---------------------------------------------------------------------------
// 14. Multiple simultaneous requests (queue concurrency / race conditions)
// ---------------------------------------------------------------------------
console.log('\nTest 14: Multiple simultaneous requests (queue concurrency / race conditions)');
{
  const env = createSimulatedEip1193Environment();

  env.eventListeners['message'] = [
    (event: any) => {
      if (event.data?.type === 'CHAINSHIELD_INPAGE_REQUEST') {
        env.fakeWindow.postMessage({
          type: 'CHAINSHIELD_INPAGE_RESPONSE',
          id: event.data.id,
          decision: 'PROCEED',
        });
      }
    },
  ];

  // Fire 2 simultaneous distinct requests
  const p1 = env.underlyingProvider.request({
    method: 'eth_sendTransaction',
    params: [{ from: VALID_USER_ADDRESS, to: VALID_TOKEN_ADDRESS, value: '0x1' }],
  });

  const p2 = env.underlyingProvider.request({
    method: 'eth_sendTransaction',
    params: [{ from: VALID_USER_ADDRESS, to: VALID_NFT_ADDRESS, value: '0x2' }],
  });

  const [r1, r2] = await Promise.all([p1, p2]);
  assert.ok(r1 && r2);
  assert.strictEqual(env.underlyingCalls.length, 2, 'Both distinct requests must be processed cleanly');
  console.log('  ✓ Simultaneous concurrent requests handled without collision or lost state');
}

// ---------------------------------------------------------------------------
// 15. Unsupported methods and degraded mode
// ---------------------------------------------------------------------------
console.log('\nTest 15: Unsupported methods and degraded mode');
{
  // Check coverage status for eth_sendRawTransaction
  const rawTxEntry = METHOD_COVERAGE_REGISTRY['eth_sendRawTransaction'];
  assert.strictEqual(rawTxEntry.status, 'PARTIALLY_ANALYZED');
  assert.ok(rawTxEntry.limitations && rawTxEntry.limitations.length > 10);

  // Check custom unsupported method
  const unsuppPayload: InterceptRequestPayload = {
    id: 'req-unsupp',
    method: 'eth_subscribe',
    params: ['newHeads'],
    origin: 'https://dapp.com',
    href: 'https://dapp.com',
    pageTitle: 'DApp',
    timestamp: Date.now(),
  };
  const unsuppAnalysis = analyzePreSignRequest(unsuppPayload);
  assert.strictEqual(unsuppAnalysis.coverageStatus, 'UNSUPPORTED');
  assert.strictEqual(unsuppAnalysis.scanStatus, 'UNSUPPORTED');
  console.log('  ✓ Unsupported and partially analyzed methods explicitly marked with disclosures');
}

// ---------------------------------------------------------------------------
// 16. Structured 7-Stage Diagnostics and Opaque Frame Rejection
// ---------------------------------------------------------------------------
console.log('\nTest 16: Structured 7-stage diagnostics and opaque frame rejection');
{
  // 16a: Inspect sandboxed opaque origin window
  const sandboxedWindow: any = {
    top: {}, // different object -> iframe
    location: {
      origin: 'null',
      href: 'about:blank',
      protocol: 'about:',
    },
  };
  const sandboxInspection = inspectFrameSupport(sandboxedWindow);
  assert.strictEqual(sandboxInspection.isSupported, false, 'Opaque sandboxed frame must be marked unsupported');
  assert.strictEqual(sandboxInspection.origin, 'null');
  assert.ok(sandboxInspection.reason && sandboxInspection.reason.includes('Sandboxed opaque frame'));

  // 16b: Inspect legitimate top frame
  const topWindow: any = {
    location: {
      origin: 'https://opensea.io',
      href: 'https://opensea.io/account',
      protocol: 'https:',
    },
  };
  topWindow.top = topWindow; // top frame
  const topInspection = inspectFrameSupport(topWindow);
  assert.strictEqual(topInspection.isSupported, true, 'Top frame on https must be supported');
  assert.strictEqual(topInspection.origin, 'https://opensea.io');
  assert.strictEqual(topInspection.isTop, true);

  // 16c: Schema validation for bridge request
  const validReq: any = {
    type: 'CHAINSHIELD_INPAGE_REQUEST',
    id: 'cs_12345_test',
    method: 'eth_sendTransaction',
    params: [{ from: VALID_USER_ADDRESS, to: VALID_SPENDER_ADDRESS }],
    origin: 'https://opensea.io',
    href: 'https://opensea.io',
    pageTitle: 'OpenSea',
    timestamp: Date.now(),
  };
  assert.strictEqual(validateBridgeRequest(validReq), true, 'Valid request payload must pass schema validation');
  assert.strictEqual(validateBridgeRequest({ method: 'eth_sendTransaction' }), false, 'Missing id must fail validation');
  assert.strictEqual(validateBridgeRequest({ id: 'bad_id', method: 'eth_sendTransaction', params: [] }), false, 'Malformed id must fail');

  // 16d: Schema validation for bridge response
  assert.strictEqual(validateBridgeResponse({ type: 'CHAINSHIELD_INPAGE_RESPONSE', id: 'cs_12345_test', decision: 'PROCEED' }), true);
  assert.strictEqual(validateBridgeResponse({ type: 'CHAINSHIELD_INPAGE_RESPONSE', id: 'cs_12345_test', decision: 'BLOCK' }), true);
  assert.strictEqual(validateBridgeResponse({ type: 'CHAINSHIELD_INPAGE_RESPONSE', id: 'cs_12345_test', decision: 'INVALID' }), false);

  // 16e: Verify diagnostic logger outputs stage prefixes
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (msg: string) => logs.push(msg);
  try {
    logDiagnostic(1, 'init', { walletType: 'MetaMask', isTop: true, origin: 'https://opensea.io' });
    logDiagnostic(2, 'cs_123', { method: 'eth_sendTransaction' });
    logDiagnostic(3, 'cs_123', { method: 'eth_sendTransaction', targetOrigin: 'https://opensea.io' });
    logDiagnostic(4, 'cs_123', { method: 'eth_sendTransaction', origin: 'https://opensea.io' });
    logDiagnostic(5, 'cs_123', { method: 'eth_sendTransaction', riskScore: 20, riskLevel: 'LOW', decision: 'ALLOW' });
    logDiagnostic(6, 'cs_123', { method: 'eth_sendTransaction', decision: 'WARN', showingUI: true });
    logDiagnostic(7, 'cs_123', { action: 'PROCEED', method: 'eth_sendTransaction' });
  } finally {
    console.log = origLog;
  }

  assert.ok(logs.some((l) => l.includes('[ChainShield:Stage1:ProviderWrapped]')));
  assert.ok(logs.some((l) => l.includes('[ChainShield:Stage2:RequestCalled] id=cs_123 method=eth_sendTransaction')));
  assert.ok(logs.some((l) => l.includes('[ChainShield:Stage3:BridgeSent] id=cs_123 method=eth_sendTransaction targetOrigin=https://opensea.io')));
  assert.ok(logs.some((l) => l.includes('[ChainShield:Stage4:BridgeReceived] id=cs_123 method=eth_sendTransaction origin=https://opensea.io')));
  assert.ok(logs.some((l) => l.includes('[ChainShield:Stage5:AnalysisComplete] id=cs_123 method=eth_sendTransaction riskScore=20')));
  assert.ok(logs.some((l) => l.includes('[ChainShield:Stage6:UIReceived] id=cs_123 method=eth_sendTransaction decision=WARN showingUI=true')));
  assert.ok(logs.some((l) => l.includes('[ChainShield:Stage7:ForwardOrReject] id=cs_123 action=PROCEED method=eth_sendTransaction')));

  console.log('  ✓ Structured 7-stage diagnostics, opaque frame rejection, and schema validation verified');
}

console.log('\n=== All 16 Pre-Sign Interception Regression Tests Passed Successfully! ===\n');
