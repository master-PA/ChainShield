import { ContractFinding, ContractSourceMetadata } from '../../types/security';
import { parseSoliditySources } from './astParser';
import { checkUnrestrictedMint } from './rules/unrestrictedMint';
import { checkUnprotectedOwnership } from './rules/unprotectedOwnership';
import { checkDangerousCalls } from './rules/dangerousCalls';
import { checkAuthWeaknesses } from './rules/authWeaknesses';
import { checkDestructiveOps } from './rules/destructiveOps';
import { checkProxyAwareness } from './rules/proxyAwareness';

export function analyzeContractSource(
  metadata: ContractSourceMetadata,
  contractAddress: string
): ContractFinding[] {
  if (!metadata.sourceFiles || metadata.sourceFiles.length === 0) {
    return [];
  }

  // 1. Parse AST across all source files
  const ctx = parseSoliditySources(metadata.sourceFiles);

  // 2. Evaluate all rules
  const findings: ContractFinding[] = [
    ...checkUnrestrictedMint(ctx, contractAddress),
    ...checkUnprotectedOwnership(ctx, contractAddress),
    ...checkDangerousCalls(ctx, contractAddress),
    ...checkAuthWeaknesses(ctx, contractAddress),
    ...checkDestructiveOps(ctx, contractAddress),
    ...checkProxyAwareness(ctx, contractAddress, metadata),
  ];

  // 3. Deduplicate findings
  const seenIds = new Set<string>();
  const deduplicated: ContractFinding[] = [];

  for (const f of findings) {
    const key = `${f.ruleId}-${f.affectedFunction}-${f.lineStart}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      deduplicated.push(f);
    }
  }

  return deduplicated;
}
