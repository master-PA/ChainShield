import { AnalysisContext } from '../types';
import { ContractFinding } from '../../../types/security';
import { extractCodeSnippet } from '../astParser';

export function checkDangerousCalls(
  ctx: AnalysisContext,
  contractAddress: string
): ContractFinding[] {
  const findings: ContractFinding[] = [];

  for (const contract of ctx.contracts) {
    if (contract.kind === 'interface') continue;

    for (const fn of contract.functions) {
      const body = fn.bodyRawText;
      if (!body) continue;

      // 1. Check for delegatecall
      if (body.includes('.delegatecall(')) {
        const fileObj = ctx.files.find((f) => f.fileName === fn.fileName);
        const snippet = fileObj
          ? extractCodeSnippet(fileObj.content, fn.loc.start.line, fn.loc.end.line, 1)
          : body;

        // Is it inside a standard proxy fallback/upgrade, or user-callable function?
        const isStandardProxy =
          contract.name.toLowerCase().includes('proxy') ||
          fn.name === 'fallback' ||
          fn.name === '_delegate' ||
          fn.name === '_upgradeToAndCall';

        const severity = isStandardProxy ? 'CAUTION' : 'HIGH';
        const confidence = isStandardProxy ? 'MEDIUM' : 'HIGH';

        findings.push({
          id: `CALL-DELEGATECALL-${contract.name}-${fn.name}`,
          ruleId: 'RULE-DELEGATECALL-DANGEROUS',
          title: `Low-Level Delegatecall Invocation in ${fn.name}`,
          severity,
          confidence,
          affectedContract: `${contract.name} (${contractAddress})`,
          affectedFunction: `${fn.name}(${fn.parameters.map((p) => p.type).join(',')})`,
          sourceFile: fn.fileName,
          lineStart: fn.loc.start.line,
          lineEnd: fn.loc.end.line,
          codeSnippet: snippet,
          description: `Function '${fn.name}' executes code in the context of the calling contract using delegatecall. Delegatecall preserves msg.sender and msg.value but operates directly on the caller's storage layout.`,
          potentialImpact:
            'If the target address or calldata can be influenced by untrusted parties, an attacker can overwrite storage slots (including owner or proxy state) or execute arbitrary malicious instructions.',
          remediation:
            'Ensure that delegatecall targets are strictly immutable or verified through an authorization registry. Avoid passing user-supplied calldata directly into delegatecall.',
          reasoning:
            `Detected '.delegatecall(' instruction in function '${fn.name}' of contract '${contract.name}'. Context: ${isStandardProxy ? 'Standard proxy mechanism' : 'Custom logic execution'}.`,
          limitations:
            'Static source analysis verified presence of the delegatecall instruction; dynamic storage layout collisions require layout introspection.',
          scoreContribution: isStandardProxy ? 10 : 25,
        });
      }

      // 2. Check for unchecked low-level call
      // Pattern: addr.call{...}("") without checking (bool success, )
      if (body.includes('.call{') || body.includes('.call(')) {
        // If not using (bool success, ) or require(success)
        const hasSuccessCheck =
          body.includes('bool success') ||
          body.includes('bool ok') ||
          body.includes('require(') ||
          body.includes('if (!success)') ||
          body.includes('if (!ok)');

        if (!hasSuccessCheck) {
          const fileObj = ctx.files.find((f) => f.fileName === fn.fileName);
          const snippet = fileObj
            ? extractCodeSnippet(fileObj.content, fn.loc.start.line, fn.loc.end.line, 1)
            : body;

          findings.push({
            id: `CALL-UNCHECKED-${contract.name}-${fn.name}`,
            ruleId: 'RULE-UNCHECKED-LOWLEVEL-CALL',
            title: `Unchecked Low-Level External Call in ${fn.name}`,
            severity: 'CAUTION',
            confidence: 'HIGH',
            affectedContract: `${contract.name} (${contractAddress})`,
            affectedFunction: `${fn.name}(${fn.parameters.map((p) => p.type).join(',')})`,
            sourceFile: fn.fileName,
            lineStart: fn.loc.start.line,
            lineEnd: fn.loc.end.line,
            codeSnippet: snippet,
            description: `Function '${fn.name}' performs a low-level .call() without validating the boolean return value. Low-level calls do not revert on target failure by default.`,
            potentialImpact:
              'If the recipient reverts or consumes all gas, the execution will proceed silently as if successful, causing accounting mismatches or state desynchronization.',
            remediation:
              'Capture the boolean return value and revert on failure:\n\n(bool success, ) = recipient.call{value: amount}("");\nrequire(success, "Transfer failed");',
            reasoning:
              `Detected low-level .call in function '${fn.name}' without return value check or require wrapper.`,
            limitations:
              'Analysis inspected function block for success/ok variable assignment and require checks.',
            scoreContribution: 10,
          });
        }
      }
    }
  }

  return findings;
}
