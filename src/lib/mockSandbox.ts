import { SandboxRequest, SandboxRunResult } from '../types/security';

export async function runBurnerSandbox(targetUrl: string): Promise<SandboxRunResult> {
  // Simulate 1.2s sandbox execution with safety guarantees
  await new Promise((resolve) => setTimeout(resolve, 800));

  const urlLower = targetUrl.toLowerCase();
  const isMaliciousTarget =
    urlLower.includes('mintzone') ||
    urlLower.includes('claim') ||
    urlLower.includes('drainer') ||
    urlLower.includes('free') ||
    urlLower.includes('sync');

  const requests: SandboxRequest[] = [
    {
      id: 'req-sb-1',
      timestamp: Date.now() - 1100,
      method: 'eth_requestAccounts',
      params: ['burner_wallet_0x00...bEEF'],
      wasBlocked: false,
      riskAssessment: 'Normal read-only address connection handshake',
    },
  ];

  if (isMaliciousTarget) {
    requests.push(
      {
        id: 'req-sb-2',
        timestamp: Date.now() - 650,
        method: 'eth_sendTransaction',
        params: {
          to: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
          data: '0xa2205344000000000000000000000000abc9941a80c944b209e89d10e09210ab2e18821f0000000000000000000000000000000000000000000000000000000000000001',
          value: '0x0',
        },
        wasBlocked: true,
        riskAssessment: 'HIGH RISK: Immediate automated prompt for setApprovalForAll(all NFTs, true)',
      },
      {
        id: 'req-sb-3',
        timestamp: Date.now() - 200,
        method: 'eth_signTypedData_v4',
        params: {
          types: { Permit: [{ name: 'spender', type: 'address' }] },
          primaryType: 'Permit',
        },
        wasBlocked: true,
        riskAssessment: 'HIGH RISK: Secondary gasless Permit signature request without prior user click',
      }
    );
  } else {
    requests.push({
      id: 'req-sb-2',
      timestamp: Date.now() - 400,
      method: 'eth_chainId',
      params: [],
      wasBlocked: false,
      riskAssessment: 'Standard chain query (EVM Mainnet 0x1)',
    });
  }

  return {
    targetUrl,
    durationMs: 1240,
    totalRequests: requests.length,
    approvalRequestsCount: isMaliciousTarget ? 1 : 0,
    signatureRequestsCount: isMaliciousTarget ? 1 : 0,
    autoPromptDetected: isMaliciousTarget,
    drainerBehaviorDetected: isMaliciousTarget,
    requests,
    networkEgressBlocked: true,
  };
}
