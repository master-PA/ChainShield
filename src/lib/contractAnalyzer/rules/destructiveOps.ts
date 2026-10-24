import { AnalysisContext } from '../types';
import { ContractFinding } from '../../../types/security';
import { extractCodeSnippet } from '../astParser';

const KNOWN_AUTH_MODIFIERS = new Set([
  'onlyowner',
  'onlyrole',
  'hasrole',
  'requiresauth',
  'auth',
  'onlyadmin',
]);

export function checkDestructiveOps(
  ctx: AnalysisContext,
  contractAddress: string
): ContractFinding[] {
  const findings: ContractFinding[] = [];

  for (const contract of ctx.contracts) {
    if (contract.kind === 'interface') continue;

    for (const fn of contract.functions) {
      const body = fn.bodyRawText;
      if (!body) continue;

      const hasSelfdestruct =
        body.includes('selfdestruct(') || body.includes('suicide(');

      if (hasSelfdestruct) {
        const fileObj = ctx.files.find((f) => f.fileName === fn.fileName);
        const snippet = fileObj
          ? extractCodeSnippet(fileObj.content, fn.loc.start.line, fn.loc.end.line, 1)
          : body;

        const hasModifier = fn.modifiers.some((m) =>
          KNOWN_AUTH_MODIFIERS.has(m.toLowerCase())
        );
        const bodyLower = body.toLowerCase();
        const hasAuthInBody =
          bodyLower.includes('msg.sender ==') ||
          bodyLower.includes('_checkowner()') ||
          bodyLower.includes('onlyowner');

        const isUnprotected =
          (fn.visibility === 'public' || fn.visibility === 'external') &&
          !hasModifier &&
          !hasAuthInBody;

        findings.push({
          id: `SELFDESTRUCT-${contract.name}-${fn.name}`,
          ruleId: 'RULE-SELFDESTRUCT',
          title: isUnprotected
            ? `Unprotected selfdestruct Operation in ${fn.name}`
            : `Contract Contains selfdestruct Instruction in ${fn.name}`,
          severity: isUnprotected ? 'CRITICAL' : 'HIGH',
          confidence: 'HIGH',
          affectedContract: `${contract.name} (${contractAddress})`,
          affectedFunction: `${fn.name}(${fn.parameters.map((p) => p.type).join(',')})`,
          sourceFile: fn.fileName,
          lineStart: fn.loc.start.line,
          lineEnd: fn.loc.end.line,
          codeSnippet: snippet,
          description: isUnprotected
            ? `Function '${fn.name}' invokes 'selfdestruct' without access control, allowing any caller to sweep remaining ether. Under EIP-6780 (Cancun hard fork), selfdestruct only deletes bytecode if executed in the same transaction as contract deployment, but it unconditionally transfers all Ether balance to the target address.`
            : `Function '${fn.name}' contains a 'selfdestruct' instruction controlled by contract administrators. Under EIP-6780 (Cancun hard fork), selfdestruct only deletes code if called in the same transaction as contract creation, but it continues to transfer all Ether balance to the target recipient.`,
          potentialImpact: isUnprotected
            ? 'Any account can destroy or disable this contract, causing permanent disruption of dependent applications and unauthorized withdrawal of ETH.'
            : 'Contract balance can be drained to the designated recipient address upon destruction. On post-Cancun EVM chains, bytecode removal is constrained.',
          remediation:
            'Remove selfdestruct entirely if contract termination is not required. If emergency pausing or fund sweeping is needed, use pausable patterns and explicit withdrawal methods.',
          reasoning:
            `Found selfdestruct/suicide keyword in function '${fn.name}'. Access control status: ${isUnprotected ? 'UNPROTECTED (anyone can call)' : 'Protected by administrative check'}.`,
          limitations:
            'EIP-6780 EVM semantics apply on Ethereum Mainnet and Sepolia since the Dencun/Cancun upgrade.',
          scoreContribution: isUnprotected ? 45 : 20,
        });
      }
    }
  }

  return findings;
}
