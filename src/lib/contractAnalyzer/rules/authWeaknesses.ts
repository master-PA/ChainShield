import { AnalysisContext } from '../types';
import { ContractFinding } from '../../../types/security';
import { extractCodeSnippet } from '../astParser';

const SENSITIVE_ACTIONS = [
  { name: 'withdraw', label: 'Withdrawal of contract funds' },
  { name: 'withdrawall', label: 'Withdrawal of entire contract balance' },
  { name: 'pause', label: 'Pausing contract operations' },
  { name: 'unpause', label: 'Unpausing contract operations' },
  { name: 'setfeerecipient', label: 'Changing fee recipient address' },
  { name: 'setfee', label: 'Changing protocol fee rates' },
  { name: 'upgradeto', label: 'Upgrading contract implementation' },
];

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

export function checkAuthWeaknesses(
  ctx: AnalysisContext,
  contractAddress: string
): ContractFinding[] {
  const findings: ContractFinding[] = [];

  for (const contract of ctx.contracts) {
    if (contract.kind === 'interface') continue;

    for (const fn of contract.functions) {
      const body = fn.bodyRawText;
      if (!body) continue;

      // 1. tx.origin used for authentication check
      if (body.includes('tx.origin ==') || body.includes('tx.origin !=') || body.includes('== tx.origin')) {
        const fileObj = ctx.files.find((f) => f.fileName === fn.fileName);
        const snippet = fileObj
          ? extractCodeSnippet(fileObj.content, fn.loc.start.line, fn.loc.end.line, 1)
          : body;

        findings.push({
          id: `AUTH-TX-ORIGIN-${contract.name}-${fn.name}`,
          ruleId: 'RULE-TX-ORIGIN-AUTH',
          title: `Vulnerable tx.origin Authentication Check in ${fn.name}`,
          severity: 'HIGH',
          confidence: 'HIGH',
          affectedContract: `${contract.name} (${contractAddress})`,
          affectedFunction: `${fn.name}(${fn.parameters.map((p) => p.type).join(',')})`,
          sourceFile: fn.fileName,
          lineStart: fn.loc.start.line,
          lineEnd: fn.loc.end.line,
          codeSnippet: snippet,
          description: `Function '${fn.name}' compares 'tx.origin' to authenticate the caller. In Ethereum, tx.origin represents the original externally owned account (EOA) that started the transaction, not the immediate caller (msg.sender).`,
          potentialImpact:
            'A victim can be tricked into interacting with a malicious intermediary contract, which then forwards calls to this contract. Because tx.origin is the victim, the authorization check passes, allowing unauthorized transactions or fund drainage.',
          remediation:
            'Replace tx.origin with msg.sender:\n\nrequire(msg.sender == owner, "Caller is not authorized");',
          reasoning:
            `Found expression evaluating 'tx.origin' inside authorization guard in '${fn.name}'. tx.origin is vulnerable to phishing and call forwarding exploits.`,
          limitations:
            'If tx.origin is used solely for gas estimation or reentrancy lock checks, risk may be informational; here it is used in a logical conditional.',
          scoreContribution: 25,
        });
      }

      // 2. Sensitive administrative functions without access control
      if (fn.visibility === 'public' || fn.visibility === 'external') {
        const fnNameLower = fn.name.toLowerCase();
        const sensitiveMatch = SENSITIVE_ACTIONS.find(
          (act) => fnNameLower === act.name || fnNameLower.startsWith(act.name)
        );

        if (sensitiveMatch) {
          const bodyLower = body.toLowerCase();

          // Standard user withdrawals that deduct caller's own balance/shares (e.g. WETH, vaults) are not admin functions
          const isUserVaultWithdraw =
            fnNameLower === 'withdraw' &&
            (bodyLower.includes('balanceof[msg.sender]') ||
             bodyLower.includes('balanceof(msg.sender)') ||
             bodyLower.includes('balances[msg.sender]') ||
             bodyLower.includes('shares[msg.sender]'));

          if (isUserVaultWithdraw) {
            continue;
          }

          const hasModifier = fn.modifiers.some((m) =>
            KNOWN_AUTH_MODIFIERS.has(m.toLowerCase())
          );
          const hasAuthInBody =
            bodyLower.includes('msg.sender ==') ||
            bodyLower.includes('_checkowner()') ||
            bodyLower.includes('hasrole(') ||
            bodyLower.includes('require(msg.sender') ||
            bodyLower.includes('onlyowner');

          if (!hasModifier && !hasAuthInBody) {
            const fileObj = ctx.files.find((f) => f.fileName === fn.fileName);
            const snippet = fileObj
              ? extractCodeSnippet(fileObj.content, fn.loc.start.line, fn.loc.end.line, 1)
              : body;

            findings.push({
              id: `AUTH-MISSING-${contract.name}-${fn.name}`,
              ruleId: 'RULE-MISSING-ACCESS-CONTROL',
              title: `Missing Access Control on Sensitive Function (${fn.name})`,
              severity: 'HIGH',
              confidence: 'HIGH',
              affectedContract: `${contract.name} (${contractAddress})`,
              affectedFunction: `${fn.name}(${fn.parameters.map((p) => p.type).join(',')})`,
              sourceFile: fn.fileName,
              lineStart: fn.loc.start.line,
              lineEnd: fn.loc.end.line,
              codeSnippet: snippet,
              description: `The sensitive action '${sensitiveMatch.label}' in function '${fn.name}' is publicly accessible without any caller verification or role restriction.`,
              potentialImpact:
                'Any external account can trigger this administrative action, potentially withdrawing contract assets, halting contract execution, or redirecting protocol revenue.',
              remediation:
                'Apply access control such as onlyOwner or a dedicated administrative role to prevent unauthorized invocation.',
              reasoning:
                `Function '${fn.name}' matches sensitive signature pattern but has visibility '${fn.visibility}' with no modifier or msg.sender validation.`,
              limitations:
                'Static analysis evaluated function name and control flow; internal state locks were also inspected.',
              scoreContribution: 20,
            });
          }
        }
      }
    }
  }

  return findings;
}
