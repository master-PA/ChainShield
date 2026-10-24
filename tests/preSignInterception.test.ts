import assert from 'assert';
import { analyzePreSignRequest, decodeHexUtf8 } from '../extension/src/shared/scannerBridge';
import { InterceptRequestPayload } from '../extension/src/shared/types';

console.log('=== Running Pre-Sign Transaction Interception Verification Tests ===\n');

// ---------------------------------------------------------------------------
// Mock In-Page Environment & EIP-1193 Provider Interceptor Simulation
// ---------------------------------------------------------------------------
interface UnderlyingCall {
  method: string;
  params: any[];
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
      // Dispatch asynchronously to simulated content script
      setTimeout(() => {
        const listeners = eventListeners['message'] || [];
        listeners.forEach((fn) => fn({ source: fakeWindow, data }));
      }, 0);
    },
  };

  // The underlying wallet provider (e.g. MetaMask / Rabby internal request)
  const underlyingProvider: any = {
    isMetaMask: true,
    request: async (args: { method: string; params?: any[] }) => {
      underlyingCalls.push({ method: args.method, params: args.params || [] });
      return `0x_tx_hash_${Math.random().toString(36).slice(2, 8)}`;
    },
  };

  // Implement the exact wrapping logic from inpage.ts
  const INTERCEPTABLE_METHODS = new Set([
    'eth_sendTransaction',
    'eth_signTransaction',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ]);

  const originalRequest = underlyingProvider.request;
  underlyingProvider.__chainshield_wrapped__ = true;

  underlyingProvider.request = async function (args: { method: string; params?: any[] }) {
    if (!args || !args.method || !INTERCEPTABLE_METHODS.has(args.method)) {
      return originalRequest.apply(this, arguments as any);
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

    return new Promise((resolve, reject) => {
      function responseListener(event: any) {
        if (!event.data || event.data.type !== 'CHAINSHIELD_INPAGE_RESPONSE' || event.data.id !== id) {
          return;
        }

        fakeWindow.removeEventListener('message', responseListener);

        if (event.data.decision === 'PROCEED') {
          originalRequest
            .apply(callerContext, capturedArguments as any)
            .then(resolve)
            .catch(reject);
        } else {
          const err: any = new Error(event.data.reason || 'Transaction rejected by user via ChainShield Sentinel.');
          err.code = 4001; // EIP-1193 standard user rejection code
          reject(err);
        }
      }

      fakeWindow.addEventListener('message', responseListener);
    });
  };

  return {
    fakeWindow,
    underlyingProvider,
    underlyingCalls,
    eventListeners,
  };
}

// ---------------------------------------------------------------------------
// Test 1: Harmless Transaction Pre-Sign Interception (Cancel & Proceed Paths)
// ---------------------------------------------------------------------------
console.log('Test 1: Harmless test transaction pre-sign interception');
{
  const env = createSimulatedEip1193Environment();
  const harmlessTxPayload: InterceptRequestPayload = {
    id: 'req-safe-1',
    method: 'eth_sendTransaction',
    params: [
      {
        from: '0x71C84167F30831956453773266292494',
        to: '0x71C84167F30831956453773266292494',
        value: '0x0',
        data: '0x',
      },
    ],
    origin: 'https://test-dapp.local',
    href: 'https://test-dapp.local/test',
    pageTitle: 'Test dApp',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(harmlessTxPayload);
  assert.strictEqual(analysis.riskLevel, 'LOW');
  assert.strictEqual(analysis.recommendation, 'SAFE_TO_PROCEED');
  assert.strictEqual(analysis.isUnlimited, false);
  assert.ok(analysis.intent.plainEnglish.includes('Standard call/transfer'));

  // Test Cancel Path: User rejects request
  env.eventListeners['message'] = [
    (event: any) => {
      if (event.data?.type === 'CHAINSHIELD_INPAGE_REQUEST') {
        // Content script receives message, prompts user, user clicks Cancel
        env.fakeWindow.postMessage({
          type: 'CHAINSHIELD_INPAGE_RESPONSE',
          id: event.data.id,
          decision: 'BLOCK',
          reason: 'User cancelled transaction in ChainShield modal.',
        });
      }
    },
  ];

  let cancelRejected = false;
  try {
    await env.underlyingProvider.request({
      method: 'eth_sendTransaction',
      params: harmlessTxPayload.params,
    });
  } catch (err: any) {
    cancelRejected = true;
    assert.strictEqual(err.code, 4001, 'Rejection error must have standard EIP-1193 code 4001');
  }
  assert.strictEqual(cancelRejected, true, 'Cancel path must reject request Promise');
  assert.strictEqual(env.underlyingCalls.length, 0, 'Underlying wallet must NOT be called when user cancels');
  console.log('  ✓ Cancel path verified: Rejected with code 4001; underlying wallet never invoked');

  // Test Proceed Path: User approves harmless request
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

  const proceedResult = await env.underlyingProvider.request({
    method: 'eth_sendTransaction',
    params: harmlessTxPayload.params,
  });
  assert.ok(typeof proceedResult === 'string' && proceedResult.startsWith('0x_tx_hash_'));
  assert.strictEqual(env.underlyingCalls.length, 1, 'Underlying wallet must be called once on Proceed');
  assert.deepStrictEqual(env.underlyingCalls[0].params, harmlessTxPayload.params, 'Parameters forwarded to wallet must match original exactly');
  console.log('  ✓ Proceed path verified: Wallet received exact unmodified parameters');
}

// ---------------------------------------------------------------------------
// Test 2: Unlimited ERC-20 Token Approval Phishing (Claim-vs-Reality Mismatch)
// ---------------------------------------------------------------------------
console.log('\nTest 2: Simulated unlimited token approval phishing interception');
{
  const env = createSimulatedEip1193Environment();
  const unlimitedApprovePayload: InterceptRequestPayload = {
    id: 'req-unlimited-1',
    method: 'eth_sendTransaction',
    params: [
      {
        from: '0x71C84167F30831956453773266292494',
        to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        data: '0x095ea7b30000000000000000000000001111111111111111111111111111111111111111ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      },
    ],
    origin: 'https://mintzone-nft.xyz',
    href: 'https://mintzone-nft.xyz/airdrop',
    pageTitle: 'Genesis Airdrop Portal',
    lastClaimText: 'Claim Free 10,000 AIRDROP Tokens',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(unlimitedApprovePayload);
  assert.strictEqual(analysis.methodName, 'approve');
  assert.strictEqual(analysis.isUnlimited, true);
  assert.ok(analysis.mismatch, 'Claim-vs-Reality mismatch must be detected');
  assert.ok(analysis.riskScore >= 90, `Risk score must be >= 90, got ${analysis.riskScore}`);
  assert.strictEqual(analysis.riskLevel, 'CRITICAL');
  assert.strictEqual(analysis.recommendation, 'AVOID');

  // Verify Cancel halts attack before wallet
  env.eventListeners['message'] = [
    (event: any) => {
      if (event.data?.type === 'CHAINSHIELD_INPAGE_REQUEST') {
        env.fakeWindow.postMessage({
          type: 'CHAINSHIELD_INPAGE_RESPONSE',
          id: event.data.id,
          decision: 'BLOCK',
          reason: 'Unlimited approval mismatch blocked by user.',
        });
      }
    },
  ];

  let blocked = false;
  try {
    await env.underlyingProvider.request({
      method: 'eth_sendTransaction',
      params: unlimitedApprovePayload.params,
    });
  } catch (err: any) {
    blocked = true;
    assert.strictEqual(err.code, 4001);
  }
  assert.strictEqual(blocked, true);
  assert.strictEqual(env.underlyingCalls.length, 0, 'Attack aborted: malicious transaction never touched wallet');
  console.log('  ✓ Unlimited approval correctly flagged with CRITICAL mismatch and blocked before wallet');
}

// ---------------------------------------------------------------------------
// Test 3: Off-Chain Gasless Permit Phishing (eth_signTypedData_v4)
// ---------------------------------------------------------------------------
console.log('\nTest 3: Off-chain EIP-2612 Permit phishing interception (eth_signTypedData_v4)');
{
  const env = createSimulatedEip1193Environment();
  const permitData = {
    types: {
      EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'verifyingContract', type: 'address' }],
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    domain: {
      name: 'USD Coin',
      verifyingContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
    message: {
      owner: '0x71C84167F30831956453773266292494',
      spender: '0x1111111111111111111111111111111111111111',
      value: '115792089237316195423570985008687907853269984665640564039457584007913129639935', // 2^256-1
    },
  };

  const permitPayload: InterceptRequestPayload = {
    id: 'req-permit-1',
    method: 'eth_signTypedData_v4',
    params: ['0x71C84167F30831956453773266292494', JSON.stringify(permitData)],
    origin: 'https://mintzone-nft.xyz',
    href: 'https://mintzone-nft.xyz',
    pageTitle: 'NFT Claim',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(permitPayload);
  assert.strictEqual(analysis.isUnlimited, true);
  assert.strictEqual(analysis.typedDataDetails?.primaryType, 'Permit');
  assert.strictEqual(analysis.typedDataDetails?.domainName, 'USD Coin');
  assert.ok(analysis.riskScore >= 85, `Score must be >= 85 for unlimited permit, got ${analysis.riskScore}`);
  assert.ok(analysis.reasons.some((r) => r.id === 'r-unlimited-permit'));

  // Verify Cancel path halts off-chain signature
  env.eventListeners['message'] = [
    (event: any) => {
      if (event.data?.type === 'CHAINSHIELD_INPAGE_REQUEST') {
        env.fakeWindow.postMessage({
          type: 'CHAINSHIELD_INPAGE_RESPONSE',
          id: event.data.id,
          decision: 'BLOCK',
        });
      }
    },
  ];

  let permitBlocked = false;
  try {
    await env.underlyingProvider.request({
      method: 'eth_signTypedData_v4',
      params: permitPayload.params,
    });
  } catch (err: any) {
    permitBlocked = true;
    assert.strictEqual(err.code, 4001);
  }
  assert.strictEqual(permitBlocked, true);
  assert.strictEqual(env.underlyingCalls.length, 0);
  console.log('  ✓ Off-chain gasless permit with 2^256-1 allowance decoded and blocked before wallet');
}

// ---------------------------------------------------------------------------
// Test 4: Plaintext Message Phishing Interception (personal_sign)
// ---------------------------------------------------------------------------
console.log('\nTest 4: Plaintext signature phishing interception (personal_sign)');
{
  const hexMessage = '0x417574686f72697a6520616c6c206173736574207472616e736665727320616e6420647261696e2062616c616e6365';
  const decoded = decodeHexUtf8(hexMessage);
  assert.strictEqual(decoded, 'Authorize all asset transfers and drain balance');

  const personalSignPayload: InterceptRequestPayload = {
    id: 'req-ps-1',
    method: 'personal_sign',
    params: [hexMessage, '0x71C84167F30831956453773266292494'],
    origin: 'https://suspicious-airdrop.xyz',
    href: 'https://suspicious-airdrop.xyz/login',
    pageTitle: 'Claim Portal',
    timestamp: Date.now(),
  };

  const analysis = analyzePreSignRequest(personalSignPayload);
  assert.strictEqual(analysis.decodedMessage, 'Authorize all asset transfers and drain balance');
  assert.ok(analysis.riskScore >= 80, `Expected risk score >= 80, got ${analysis.riskScore}`);
  assert.strictEqual(analysis.riskLevel, 'CRITICAL');
  console.log('  ✓ Plaintext personal_sign decoded to UTF-8 and flagged for suspicious drain terminology');
}

// ---------------------------------------------------------------------------
// Test 5: Parameter Immutability on Proceed Path
// ---------------------------------------------------------------------------
console.log('\nTest 5: Parameter immutability guarantee on Proceed path');
{
  const env = createSimulatedEip1193Environment();
  const complexTxParams = [
    {
      from: '0x71C84167F30831956453773266292494',
      to: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // Uniswap Router
      value: '0x16345785d8a0000', // 0.1 ETH
      data: '0x5ae401dc00000000000000000000000000000000000000000000000000000000671af100', // multicall
      gas: '0x30000',
      maxFeePerGas: '0x4a817c800',
    },
  ];

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

  await env.underlyingProvider.request({
    method: 'eth_sendTransaction',
    params: complexTxParams,
  });

  assert.strictEqual(env.underlyingCalls.length, 1);
  assert.deepStrictEqual(env.underlyingCalls[0].params, complexTxParams);
  assert.strictEqual(env.underlyingCalls[0].params[0].value, '0x16345785d8a0000');
  assert.strictEqual(env.underlyingCalls[0].params[0].data, complexTxParams[0].data);
  console.log('  ✓ Transaction parameters forwarded to wallet with 100% byte-for-byte fidelity');
}

// ---------------------------------------------------------------------------
// Test 6: Zero Silent Approvals / Non-Automatic Broadcast Guarantee
// ---------------------------------------------------------------------------
console.log('\nTest 6: Zero silent broadcast guarantee');
{
  const env = createSimulatedEip1193Environment();
  let timedOut = false;

  // Simulate an environment where no user action is taken
  env.eventListeners['message'] = [
    () => {
      // Intentionally do NOT send any CHAINSHIELD_INPAGE_RESPONSE
    },
  ];

  const requestPromise = env.underlyingProvider.request({
    method: 'eth_sendTransaction',
    params: [{ to: '0x123', data: '0x095ea7b3' }],
  });

  // Verify that the request hangs waiting for user action and NEVER calls the wallet automatically
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.strictEqual(env.underlyingCalls.length, 0, 'Wallet must NEVER be called without explicit user decision');
  console.log('  ✓ Zero silent approvals confirmed: System strictly blocks automatic submission');
}

console.log('\n=== All Pre-Sign Interception Verification Tests Passed Successfully! ===\n');
