import { AnalysisContext } from '../types';
import { ContractFinding } from '../../../types/security';
import { extractCodeSnippet } from '../astParser';

const PRIVILEGE_FUNCTIONS = new Set([
  'transferownership',
  'setowner',
  'changeowner',
  'nominateowner',
  'grantrole',
  'revokerole',
  'addadmin',
  'removeadmin',
  'setadmin',
  'setmaster',
  'setcontroller',
  'setoperator',
]);

const KNOWN_AUTH_MODIFIERS = new Set([
  'onlyowner',
  'onlyrole',
  'hasrole',
  'requiresauth',
  'auth',
  'onlyadmin',
  'onlyauthorized',
  'restricted',
  'onlygov',
  'onlygovernance',
]);

export function checkUnprotectedOwnership(
  ctx: AnalysisContext,
  contractAddress: string
): ContractFinding[] {
  const findings: ContractFinding[] = [];

  for (const contract of ctx.contracts) {
    if (contract.kind === 'interface' || contract.kind === 'library') continue;

    for (const fn of contract.functions) {
      if (fn.visibility !== 'public' && fn.visibility !== 'external') continue;

      const nameLower = fn.name.toLowerCase();
      if (!PRIVILEGE_FUNCTIONS.has(nameLower)) continue;

      // Check modifiers
      const hasModifier = fn.modifiers.some((m) =>
        KNOWN_AUTH_MODIFIERS.has(m.toLowerCase())
      );

      // Check body
      const bodyLower = fn.bodyRawText.toLowerCase();
      const hasAuthInBody =
        bodyLower.includes('msg.sender == owner') ||
        bodyLower.includes('msg.sender == _owner') ||
        bodyLower.includes('_checkowner()') ||
        bodyLower.includes('_requireauthorized()') ||
        bodyLower.includes('hasrole(') ||
        bodyLower.includes('onlyowner') ||
        bodyLower.includes('require(msg.sender ==') ||
        bodyLower.includes('if (msg.sender !=');

      // If missing both modifier and body check -> VULNERABLE!
      if (!hasModifier && !hasAuthInBody) {
        const fileObj = ctx.files.find((f) => f.fileName === fn.fileName);
        const snippet = fileObj
          ? extractCodeSnippet(fileObj.content, fn.loc.start.line, fn.loc.end.line, 1)
          : fn.bodyRawText;

        findings.push({
          id: `OWNERSHIP-UNPROTECTED-${contract.name}-${fn.name}`,
          ruleId: 'RULE-OWNERSHIP-UNPROTECTED',
          title: `Unprotected Ownership or Role Management Function (${fn.name})`,
          severity: 'CRITICAL',
          confidence: 'HIGH',
          affectedContract: `${contract.name} (${contractAddress})`,
          affectedFunction: `${fn.name}(${fn.parameters.map((p) => p.type).join(',')})`,
          sourceFile: fn.fileName,
          lineStart: fn.loc.start.line,
          lineEnd: fn.loc.end.line,
          codeSnippet: snippet,
          description: `The privilege-granting function '${fn.name}' has ${fn.visibility} visibility but contains no caller verification or access-control modifier. Any external caller can claim ownership or admin privileges.`,
          potentialImpact:
            'A malicious user can invoke this function to hijack ownership of the contract, seize admin privileges, and potentially drain deposited funds or alter critical protocol parameters.',
          remediation:
            'Add authorization modifiers or internal validation guards such as onlyOwner, hasRole(DEFAULT_ADMIN_ROLE), or _checkOwner().',
          reasoning:
            `Function '${fn.name}' alters contract administrative state without enforcing that msg.sender holds existing ownership or administrative credentials.`,
          limitations:
            'Multi-sig proxy patterns without standard on-chain ownership checks were evaluated based on available source files.',
          scoreContribution: 80,
        });
      }
    }
  }

  return findings;
}
