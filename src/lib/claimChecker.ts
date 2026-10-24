import { IntentMismatch, IntentSummary, RiskLevel } from '../types/security';

export function evaluateClaimVsReality(
  claimedText: string,
  actualIntent: IntentSummary
): IntentMismatch | undefined {
  if (!claimedText || !claimedText.trim()) {
    return undefined;
  }

  const claimLower = claimedText.toLowerCase();
  const actualAction = actualIntent.actionType;

  // Case 1: Page claims "Claim", "Mint", "Free NFT", "Airdrop" but actual is setApprovalForAll or unlimited approve
  const isClaimOrMint =
    claimLower.includes('claim') ||
    claimLower.includes('mint') ||
    claimLower.includes('free') ||
    claimLower.includes('airdrop') ||
    claimLower.includes('whitelist') ||
    claimLower.includes('reward');

  if (isClaimOrMint) {
    if (actualAction === 'setApprovalForAll') {
      return {
        claimedText: claimedText.trim(),
        expectedAction: 'Free NFT Mint (contract mint() with 0 ETH)',
        actualAction: `setApprovalForAll(operator=${actualIntent.targetSpender.slice(0, 8)}..., approved=true)`,
        mismatchScore: 96,
        explanation:
          'Critical Intent Mismatch: The webpage claims a free mint or airdrop, but the transaction gives a third-party operator blanket permission to take ALL your NFTs.',
        severity: 'CRITICAL',
      };
    }

    if (actualAction === 'approve' && actualIntent.isUnlimited) {
      return {
        claimedText: claimedText.trim(),
        expectedAction: 'Receive Airdrop Tokens',
        actualAction: `approve(spender=${actualIntent.targetSpender.slice(0, 8)}..., amount=UNLIMITED)`,
        mismatchScore: 92,
        explanation:
          'Critical Intent Mismatch: The button states you are claiming tokens, but the transaction actually authorizes an unlimited withdrawal allowance from your existing balance.',
        severity: 'CRITICAL',
      };
    }

    if (actualAction === 'transfer') {
      return {
        claimedText: claimedText.trim(),
        expectedAction: 'Receive Free Mint / Airdrop',
        actualAction: `transfer(${actualIntent.amountOrScope} to ${actualIntent.targetSpender.slice(0, 8)}...)`,
        mismatchScore: 84,
        explanation:
          'Intent Mismatch: The site promises a free claim, but is immediately requesting a direct outbound transfer of your funds.',
        severity: 'HIGH',
      };
    }
  }

  // Case 2: Page claims "Verify", "Connect", "Collab.Land", "Sync Node"
  const isVerifyOrConnect =
    claimLower.includes('verify') ||
    claimLower.includes('connect') ||
    claimLower.includes('sync') ||
    claimLower.includes('auth') ||
    claimLower.includes('collab');

  if (isVerifyOrConnect) {
    if (actualAction === 'setApprovalForAll' || actualAction === 'approve' || actualAction === 'permit') {
      return {
        claimedText: claimedText.trim(),
        expectedAction: 'Read-only wallet verification or harmless authentication challenge',
        actualAction: `${actualAction}(${actualIntent.targetSpender.slice(0, 8)}...)`,
        mismatchScore: 94,
        explanation:
          'Severe Phishing Mismatch: Webpage claims you are merely "verifying" or "connecting", but is stealthily triggering asset approval and transfer rights.',
        severity: 'CRITICAL',
      };
    }
  }

  // Case 3: Swap claimed, but unlimited approval to unverified spender
  const isSwap = claimLower.includes('swap') || claimLower.includes('exchange') || claimLower.includes('trade');
  if (isSwap && actualAction === 'approve' && actualIntent.isUnlimited && !actualIntent.contractVerified) {
    return {
      claimedText: claimedText.trim(),
      expectedAction: 'Token Swap Trade',
      actualAction: 'Unlimited Approval to unverified router contract',
      mismatchScore: 68,
      explanation:
        'Caution: Swapping tokens usually requires approval, but this router contract is unverified and requests maximum 2^256-1 allowance.',
      severity: 'HIGH',
    };
  }

  // If claimed matches expected
  return {
    claimedText: claimedText.trim(),
    expectedAction: actualIntent.plainEnglish,
    actualAction: actualIntent.plainEnglish,
    mismatchScore: 0,
    explanation: 'Transaction action is consistent with page claim context.',
    severity: 'LOW',
  };
}
