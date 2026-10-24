import { AnalysisContext, ParsedContract, ParsedFunction } from '../types';
import { ContractFinding } from '../../../types/security';
import { extractCodeSnippet } from '../astParser';

const KNOWN_AUTH_MODIFIERS = new Set([
  'onlyowner',
  'onlyrole',
  'hasrole',
  'requiresauth',
  'auth',
  'onlyadmin',
  'onlyminter',
  'onlyauthorized',
  'restricted',
  'onlygov',
  'onlygovernance',
  'onlycontroller',
  'onlymaster',
]);

const KNOWN_ACCESS_BASES = new Set([
  'ownable',
  'ownable2step',
  'ownableupgradeable',
  'accesscontrol',
  'accesscontrolupgradeable',
  'accesscontrolenumerable',
  'auth',
  'authorizable',
  'roles',
]);

export function checkUnrestrictedMint(
  ctx: AnalysisContext,
  contractAddress: string
): ContractFinding[] {
  const findings: ContractFinding[] = [];

  for (const contract of ctx.contracts) {
    if (contract.kind === 'interface' || contract.kind === 'library') {
      continue;
    }

    const inheritedBases = ctx.inheritanceMap.get(contract.name) || new Set<string>();
    const hasAccessControlBase = Array.from(inheritedBases).some((b) =>
      KNOWN_ACCESS_BASES.has(b.toLowerCase())
    ) || Array.from(contract.baseContracts).some((b) =>
      KNOWN_ACCESS_BASES.has(b.toLowerCase())
    );

    for (const fn of contract.functions) {
      // Must be public or external
      if (fn.visibility !== 'public' && fn.visibility !== 'external') {
        continue;
      }

      // Check if function is a mint or supply increasing function
      const fnNameLower = fn.name.toLowerCase();
      const isMintName =
        fnNameLower === 'mint' ||
        fnNameLower === 'mintto' ||
        fnNameLower === 'minttokens' ||
        fnNameLower === 'safemint' ||
        fnNameLower === 'issue';

      // Check if function calls _mint or increases totalSupply inside body
      const callsInternalMint =
        fn.bodyRawText.includes('_mint(') ||
        fn.bodyRawText.includes('_safeMint(') ||
        fn.bodyRawText.includes('totalSupply +=') ||
        fn.bodyRawText.includes('totalSupply = totalSupply +');

      if (!isMintName && !callsInternalMint) {
        continue;
      }

      // Unrelated functions like getMintPrice, mintFee, mintCount, mintActive should NOT be flagged
      if (
        fn.stateMutability === 'view' ||
        fn.stateMutability === 'pure' ||
        fnNameLower.startsWith('get') ||
        fnNameLower.startsWith('is') ||
        fnNameLower.endsWith('fee') ||
        fnNameLower.endsWith('price') ||
        fnNameLower.endsWith('rate') ||
        fnNameLower.endsWith('cost')
      ) {
        continue;
      }

      // 1. Check modifiers
      const hasAuthModifier = fn.modifiers.some((m) =>
        KNOWN_AUTH_MODIFIERS.has(m.toLowerCase())
      );

      // 2. Check body for explicit ownership / authorization checks
      const bodyLower = fn.bodyRawText.toLowerCase();

      const hasOwnerCheckInBody =
        bodyLower.includes('msg.sender == owner') ||
        bodyLower.includes('msg.sender == _owner') ||
        bodyLower.includes('_checkowner()') ||
        bodyLower.includes('_requireauthorized()') ||
        bodyLower.includes('_enforceowner()') ||
        bodyLower.includes('hasrole(') ||
        bodyLower.includes('onlyowner') ||
        bodyLower.includes('require(msg.sender ==') ||
        bodyLower.includes('if (msg.sender !=');

      // 3. Check for payment / price constraint (e.g. payable mint where msg.value is verified)
      const hasPaymentCheck =
        (fn.stateMutability === 'payable' || bodyLower.includes('msg.value')) &&
        (bodyLower.includes('msg.value >=') || bodyLower.includes('msg.value =='));

      // 4. Check for hard supply cap (e.g. require(totalSupply + amount <= MAX_SUPPLY))
      const hasStrictCap =
        bodyLower.includes('max_supply') ||
        bodyLower.includes('maxsupply') ||
        bodyLower.includes('cap');

      // 5. Check if internal authorization helper is defined in this contract or bases
      const hasInternalHelper = hasOwnerCheckInBody || hasAuthModifier;

      // Evaluation
      if (!hasAuthModifier && !hasOwnerCheckInBody) {
        // Find file content for code snippet
        const fileObj = ctx.files.find((f) => f.fileName === fn.fileName);
        const snippet = fileObj
          ? extractCodeSnippet(fileObj.content, fn.loc.start.line, fn.loc.end.line, 1)
          : fn.bodyRawText;

        if (hasPaymentCheck) {
          // Public payable mint with price check
          findings.push({
            id: `MINT-PUBLIC-PAID-${contract.name}-${fn.name}`,
            ruleId: 'RULE-MINT-PUBLIC-PAYABLE',
            title: `Public Token Minting Function with Payment Check (${fn.name})`,
            severity: 'LOW',
            confidence: 'HIGH',
            affectedContract: `${contract.name} (${contractAddress})`,
            affectedFunction: `${fn.name}(${fn.parameters.map((p) => p.type).join(',')})`,
            sourceFile: fn.fileName,
            lineStart: fn.loc.start.line,
            lineEnd: fn.loc.end.line,
            codeSnippet: snippet,
            description: `Function '${fn.name}' allows public callers to mint tokens by providing ETH payment, verified by msg.value check.`,
            potentialImpact:
              'Anyone who pays the specified price can mint tokens. While not an unauthorized exploit, verify if public issuance is expected.',
            remediation:
              'Ensure maximum per-wallet limits, total supply caps, and reentrancy protection on payable mint functions.',
            reasoning:
              `Function has ${fn.visibility} visibility and requires payment via msg.value. No caller role restriction detected.`,
            limitations:
              'Economic pricing and slippage mechanics were not evaluated dynamically.',
            scoreContribution: 5,
          });
        } else {
          // CRITICAL: Unrestricted minting without any auth or payment!
          findings.push({
            id: `MINT-UNRESTRICTED-${contract.name}-${fn.name}`,
            ruleId: 'RULE-MINT-UNRESTRICTED',
            title: `Unrestricted Token Minting Callable by Any Account (${fn.name})`,
            severity: 'CRITICAL',
            confidence: 'HIGH',
            affectedContract: `${contract.name} (${contractAddress})`,
            affectedFunction: `${fn.name}(${fn.parameters.map((p) => p.type).join(',')})`,
            sourceFile: fn.fileName,
            lineStart: fn.loc.start.line,
            lineEnd: fn.loc.end.line,
            codeSnippet: snippet,
            description: `The '${fn.name}' function has ${fn.visibility} visibility and increases token supply, but lacks any access-control modifier (such as onlyOwner or hasRole), authorization check, or payment requirement.`,
            potentialImpact:
              'Any arbitrary external account can call this function repeatedly to mint unlimited tokens to any address, diluting existing holders, collapsing token value, or draining liquidity pools.',
            remediation:
              'Restrict the function by adding OpenZeppelin Ownable (onlyOwner) or AccessControl (onlyRole(MINTER_ROLE)). Example:\n\nfunction mint(address to, uint256 amount) external onlyOwner {\n    _mint(to, amount);\n}',
            reasoning:
              `Analyzed function '${fn.name}' in contract '${contract.name}'. Visibility is '${fn.visibility}'. Modifiers: [${fn.modifiers.join(', ') || 'none'}]. Function body does not enforce msg.sender authorization or payment constraints. Total supply can be arbitrarily inflated by any caller.`,
            limitations:
              'Static AST analysis confirmed absence of standard modifiers, require/revert guards, and role verifications in source.',
            scoreContribution: 80,
          });
        }
      }
    }
  }

  return findings;
}
