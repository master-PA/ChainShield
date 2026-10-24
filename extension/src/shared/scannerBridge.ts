import { evaluateTargetRules, extractHostname } from '../../../src/lib/rulesEngine';
import { computeCombinedRisk } from '../../../src/lib/mlEngine';
import { decodeTransactionCalldata } from '../../../src/lib/txDecoder';
import { evaluateClaimVsReality } from '../../../src/lib/claimChecker';
import { shortenAddress } from '../../../src/lib/formatters';
import { InterceptRequestPayload, PreSignAnalysisResult } from './types';
import { ReasonItem, RiskLevel, IntentSummary } from '../../../src/types/security';

export function decodeHexUtf8(hex: string): string {
  if (!hex || typeof hex !== 'string') return '';
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!clean || !/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) {
    return hex;
  }
  try {
    let str = '';
    for (let i = 0; i < clean.length; i += 2) {
      const code = parseInt(clean.slice(i, i + 2), 16);
      if (code >= 32 && code <= 126) {
        str += String.fromCharCode(code);
      } else if (code === 10 || code === 13 || code === 9) {
        str += String.fromCharCode(code);
      } else {
        return hex;
      }
    }
    return str;
  } catch {
    return hex;
  }
}

function isMaxAllowance(val: any): boolean {
  if (!val) return false;
  const s = String(val).toLowerCase();
  return (
    s.includes('ffffffff') ||
    s === '115792089237316195423570985008687907853269984665640564039457584007913129639935' ||
    s.startsWith('0xffffffff')
  );
}

function createDefaultIntent(
  actionType: string,
  plainEnglish: string,
  targetSpender: string,
  isUnlimited: boolean = false,
  assetName: string = 'EVM Asset',
  amountOrScope: string = 'Standard'
): IntentSummary {
  return {
    actionType,
    plainEnglish,
    plainHinglish: plainEnglish,
    plainSimple: plainEnglish,
    targetSpender,
    assetName,
    amountOrScope,
    isUnlimited,
    contractVerified: false,
  };
}

export function analyzePreSignRequest(payload: InterceptRequestPayload): PreSignAnalysisResult {
  const method = payload.method;
  const params = Array.isArray(payload.params) ? payload.params : [];
  let calldata = '';
  let targetSpender = '0x0000000000000000000000000000000000000000';
  let txValue = '0x0';
  let decodedMessage: string | undefined = undefined;
  let typedDataDetails: PreSignAnalysisResult['typedDataDetails'] = undefined;
  let intent: IntentSummary = createDefaultIntent('unknown', 'Unknown transaction or signature request', targetSpender);

  // 1. Evaluate domain rules first
  const { rulesScore: domainRulesScore, reasons: domainReasons, visualClone, drainerMatch } = evaluateTargetRules(
    payload.origin || payload.href,
    'direct'
  );
  let baseScore = domainRulesScore;
  const reasons: ReasonItem[] = [...domainReasons];

  // 2. Decode based on method
  if (method === 'eth_sendTransaction' || method === 'eth_signTransaction') {
    if (params[0] && typeof params[0] === 'object') {
      calldata = params[0].data || params[0].input || '';
      targetSpender = params[0].to || targetSpender;
      txValue = params[0].value || '0x0';
    }

    intent = decodeTransactionCalldata(calldata, targetSpender);

    // If harmless transfer or simple call with no calldata
    if (intent.actionType === 'unknown' && (!calldata || calldata === '0x' || calldata === '0x0')) {
      intent = createDefaultIntent(
        'transfer',
        `Standard call/transfer to ${shortenAddress(targetSpender)} (Value: ${txValue === '0x0' ? '0 ETH' : txValue})`,
        targetSpender,
        false,
        'ETH',
        txValue === '0x0' ? '0 ETH' : txValue
      );
    }

    // Calldata risk: Unlimited ERC-20 approval
    if (intent.isUnlimited) {
      baseScore = Math.max(baseScore, 70);
      reasons.push({
        id: 'r-unlimited-allowance',
        category: 'signature',
        description: 'Transaction requests UNLIMITED (2^256-1) token withdrawal permissions',
        points: 45,
        severity: 'critical',
      });
    }

    // Calldata risk: Blanket NFT setApprovalForAll
    if (intent.actionType === 'setApprovalForAll') {
      baseScore = Math.max(baseScore, 85);
      reasons.push({
        id: 'r-set-approval-for-all',
        category: 'signature',
        description: 'Blanket NFT operator authorization allows recipient to drain ALL your collection NFTs',
        points: 50,
        severity: 'critical',
      });
    }
  } else if (method === 'personal_sign' || method === 'eth_sign') {
    // personal_sign params: [messageHex, address] or [address, messageHex]
    const p0 = typeof params[0] === 'string' ? params[0] : '';
    const p1 = typeof params[1] === 'string' ? params[1] : '';
    const hexCandidate = p0.startsWith('0x') && p0.length !== 42 ? p0 : p1.startsWith('0x') && p1.length !== 42 ? p1 : p0 || p1;
    decodedMessage = decodeHexUtf8(hexCandidate);

    const lowerMsg = (decodedMessage || '').toLowerCase();
    const hasPhishingKeywords =
      lowerMsg.includes('drain') ||
      lowerMsg.includes('transfer all') ||
      lowerMsg.includes('authorize all') ||
      lowerMsg.includes('private key') ||
      lowerMsg.includes('seed phrase');

    if (hasPhishingKeywords) {
      baseScore = Math.max(baseScore, 85);
      reasons.push({
        id: 'r-sig-phishing-words',
        category: 'signature',
        description: 'Plaintext signature request contains suspicious authorization or drainer terminology',
        points: 45,
        severity: 'critical',
      });
    }

    if (domainRulesScore >= 25) {
      baseScore = Math.max(baseScore, 75);
      reasons.push({
        id: 'r-sig-suspicious-domain',
        category: 'signature',
        description: `Off-chain signature (${method}) requested on an unverified or high-risk domain`,
        points: 40,
        severity: 'critical',
      });
    }

    intent = createDefaultIntent(
      'personal_sign',
      `Sign plaintext message: "${decodedMessage.length > 70 ? decodedMessage.slice(0, 67) + '...' : decodedMessage}"`,
      targetSpender,
      false,
      'Message Signature'
    );
  } else if (method.startsWith('eth_signTypedData')) {
    // typed data: params[1] (or params[0] in older implementations)
    const rawData =
      typeof params[1] === 'string'
        ? params[1]
        : typeof params[0] === 'string' && params[0].startsWith('{')
        ? params[0]
        : params[1] || params[0];

    let typedDataObj: any = null;
    if (typeof rawData === 'string') {
      try {
        typedDataObj = JSON.parse(rawData);
      } catch {
        decodedMessage = rawData;
      }
    } else if (typeof rawData === 'object' && rawData !== null) {
      typedDataObj = rawData;
    }

    if (typedDataObj) {
      const primaryType = typedDataObj.primaryType || 'EIP712Domain';
      const domainName = typedDataObj.domain?.name || 'Protocol';
      const verifyingContract = typedDataObj.domain?.verifyingContract || targetSpender;
      targetSpender = verifyingContract;
      const msg = typedDataObj.message || {};

      if (primaryType === 'Permit' || primaryType === 'PermitSingle' || primaryType === 'PermitBatch') {
        const spender = msg.spender || msg.details?.spender || targetSpender;
        const amount = msg.value || msg.amount || msg.details?.amount || '0';
        targetSpender = spender;
        const isUnlimitedPermit = isMaxAllowance(amount);

        typedDataDetails = {
          primaryType,
          verifyingContract,
          spender,
          amount: String(amount),
          domainName,
        };

        if (isUnlimitedPermit) {
          baseScore = Math.max(baseScore, 90);
          reasons.push({
            id: 'r-unlimited-permit',
            category: 'signature',
            description: 'Off-chain Permit signature (EIP-2612 / Permit2) grants UNLIMITED token withdrawal rights without gas',
            points: 50,
            severity: 'critical',
          });
        }

        intent = createDefaultIntent(
          'permit',
          `Sign off-chain EIP-2612 Permit granting ${isUnlimitedPermit ? 'UNLIMITED' : amount} ${domainName} allowance to ${shortenAddress(spender)}`,
          spender,
          isUnlimitedPermit,
          domainName,
          isUnlimitedPermit ? 'Unlimited' : String(amount)
        );
      } else {
        typedDataDetails = {
          primaryType,
          verifyingContract,
          domainName,
        };
        intent = createDefaultIntent(
          'permit',
          `Sign structured ${primaryType} message for ${domainName} (${shortenAddress(verifyingContract)})`,
          verifyingContract,
          false,
          domainName
        );
      }
    }

    if (domainRulesScore >= 25) {
      baseScore = Math.max(baseScore, 75);
      reasons.push({
        id: 'r-sig-suspicious-domain',
        category: 'signature',
        description: `Off-chain signature (${method}) requested on an unverified or high-risk domain`,
        points: 40,
        severity: 'critical',
      });
    }
  }

  // 3. Evaluate claim vs reality
  const claimText = payload.lastClaimText || payload.pageTitle || '';
  const mismatch = claimText ? evaluateClaimVsReality(claimText, intent) : undefined;
  if (mismatch) {
    baseScore = Math.max(baseScore, mismatch.mismatchScore);
    reasons.push({
      id: 'r-claim-mismatch',
      category: 'intent',
      description: mismatch.explanation,
      points: mismatch.mismatchScore,
      severity: mismatch.severity === 'CRITICAL' ? 'critical' : 'warning',
    });
  }

  // 4. Synthesize final risk score
  const isMalicious = baseScore >= 60 || Boolean(drainerMatch?.detected);
  const { finalScore, riskLevel, recommendation, recommendationText } = computeCombinedRisk(
    baseScore,
    isMalicious,
    {
      drainerSimilarity: drainerMatch?.similarityScore,
      cloneSimilarity: visualClone?.similarityPercentage,
    }
  );

  return {
    riskScore: finalScore,
    riskLevel,
    recommendation,
    recommendationText,
    intent,
    mismatch,
    reasons,
    origin: payload.origin,
    targetSpender: intent.targetSpender || targetSpender,
    isUnlimited: intent.isUnlimited,
    methodName: intent.actionType !== 'unknown' ? intent.actionType : method,
    decodedMessage,
    typedDataDetails,
    rawCalldata: calldata || undefined,
    txValue: txValue !== '0x0' ? txValue : undefined,
  };
}

export function analyzeVisitedPage(url: string): {
  hostname: string;
  rulesScore: number;
  finalScore: number;
  riskLevel: RiskLevel;
  reasons: ReasonItem[];
  recommendation: 'AVOID' | 'PROCEED_WITH_CAUTION' | 'SAFE_TO_PROCEED';
  recommendationText: string;
} {
  const hostname = extractHostname(url);
  const { rulesScore, reasons, visualClone, drainerMatch } = evaluateTargetRules(url, 'direct');
  const isMalicious = rulesScore >= 60 || Boolean(drainerMatch?.detected) || (visualClone?.similarityPercentage || 0) >= 80;

  const { finalScore, riskLevel, recommendation, recommendationText } = computeCombinedRisk(
    rulesScore,
    isMalicious,
    {
      drainerSimilarity: drainerMatch?.similarityScore,
      cloneSimilarity: visualClone?.similarityPercentage,
    }
  );

  return {
    hostname,
    rulesScore,
    finalScore,
    riskLevel,
    reasons,
    recommendation,
    recommendationText,
  };
}
