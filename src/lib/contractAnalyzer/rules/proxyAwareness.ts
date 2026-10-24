import { AnalysisContext } from '../types';
import { ContractFinding, ContractSourceMetadata } from '../../../types/security';

export function checkProxyAwareness(
  ctx: AnalysisContext,
  contractAddress: string,
  metadata: ContractSourceMetadata
): ContractFinding[] {
  const findings: ContractFinding[] = [];

  if (metadata.isProxy) {
    if (metadata.implementationAddress && metadata.implementationAddress !== '0x0000000000000000000000000000000000000000') {
      const isImplVerified = Boolean(metadata.implementationVerified);

      findings.push({
        id: `PROXY-AWARENESS-${contractAddress}`,
        ruleId: 'RULE-PROXY-IMPLEMENTATION',
        title: `Upgradeable Proxy Architecture Detected (${metadata.proxyType || 'EIP-1967'})`,
        severity: isImplVerified ? 'INFO' : 'CAUTION',
        confidence: 'HIGH',
        affectedContract: `Proxy: ${contractAddress} -> Impl: ${metadata.implementationAddress}`,
        affectedFunction: 'fallback() / _delegate()',
        sourceFile: metadata.sourceFiles[0]?.fileName || 'Proxy.sol',
        lineStart: 1,
        lineEnd: 20,
        codeSnippet: `// Proxy Address: ${contractAddress}\n// Implementation Address: ${metadata.implementationAddress}\n// Implementation Source Verified: ${isImplVerified ? 'YES' : 'NO'}\n// Storage Slot: 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`,
        description: `This contract is an upgradeable proxy (${metadata.proxyType || 'EIP-1967'}) that delegates its runtime execution and storage state to implementation address ${metadata.implementationAddress}. ${
          isImplVerified
            ? 'The underlying implementation source code was resolved and verified.'
            : 'CAUTION: The implementation contract source code is NOT verified on the block explorer.'
        }`,
        potentialImpact: isImplVerified
          ? 'Contract logic can be upgraded by authorized admin accounts. Storage collisions or unauthorized upgrade triggers can alter state.'
          : 'Because the implementation source is unverified, the actual runtime execution logic cannot be statically verified for safety.',
        remediation: isImplVerified
          ? 'Verify upgrade authorization mechanisms, multi-sig timelocks, and storage layout compatibility across implementations.'
          : 'Require the implementation contract at ' + metadata.implementationAddress + ' to be publicly verified on the explorer before interacting.',
        reasoning:
          `EIP-1967 implementation slot check returned address ${metadata.implementationAddress}. Proxy delegation confirmed on-chain.`,
        limitations: isImplVerified
          ? 'Analyzed proxy contract and known implementation reference.'
          : 'Analysis coverage is limited because implementation contract source code was unavailable.',
        scoreContribution: isImplVerified ? 0 : 15,
      });
    } else {
      findings.push({
        id: `PROXY-UNRESOLVED-${contractAddress}`,
        ruleId: 'RULE-PROXY-IMPLEMENTATION',
        title: 'Proxy Pattern Detected with Unresolved Implementation',
        severity: 'CAUTION',
        confidence: 'MEDIUM',
        affectedContract: `Proxy: ${contractAddress}`,
        affectedFunction: 'fallback()',
        sourceFile: metadata.sourceFiles[0]?.fileName || 'Proxy.sol',
        lineStart: 1,
        lineEnd: 10,
        codeSnippet: `// Proxy Address: ${contractAddress}\n// Implementation slot is empty or could not be read via RPC.`,
        description: 'Contract exhibits proxy delegation structure but the active implementation address could not be resolved from storage slots.',
        potentialImpact: 'Incomplete static analysis coverage: target behavior is dictated by an uninspected implementation contract.',
        remediation: 'Ensure contract initialization has completed and implementation slot is properly populated.',
        reasoning: 'Proxy keywords detected in bytecode or source, but storage slot read returned zero or failed.',
        limitations: 'Only proxy wrapper was inspected; implementation logic remains unverified.',
        scoreContribution: 15,
      });
    }
  }

  return findings;
}
