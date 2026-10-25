import { evaluateTargetRules, extractHostname } from '../../../src/lib/rulesEngine';
import { computeCombinedRisk } from '../../../src/lib/mlEngine';
import { decodeTransactionCalldata } from '../../../src/lib/txDecoder';
import { evaluateClaimVsReality } from '../../../src/lib/claimChecker';
import { shortenAddress } from '../../../src/lib/formatters';
import {
  InterceptRequestPayload,
  PreSignAnalysisResult,
  METHOD_COVERAGE_REGISTRY,
  InterceptionCoverageStatus,
  SecurityGateDecision,
  ScanStatus,
  SeaportOrderDetails,
  BatchCallItem,
} from './types';
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

export function isMaxAllowance(val: any): boolean {
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

export function analyzePreSignRequest(
  payload: InterceptRequestPayload,
  options?: { scannerAvailable?: boolean; strictMode?: boolean }
): PreSignAnalysisResult {
  const method = payload.method;
  const params = Array.isArray(payload.params) ? payload.params : [];
  let calldata = '';
  let contractAddress: string | undefined = undefined;
  let targetSpender = '0x0000000000000000000000000000000000000000';
  let txValue = '0x0';
  let decodedMessage: string | undefined = undefined;
  let typedDataDetails: PreSignAnalysisResult['typedDataDetails'] = undefined;
  let seaportDetails: SeaportOrderDetails | undefined = undefined;
  let batchCalls: BatchCallItem[] | undefined = undefined;
  let limitations: string | undefined = undefined;
  let isUnlimited = false;

  // Retrieve coverage status from registry
  const coverageEntry = METHOD_COVERAGE_REGISTRY[method];
  const coverageStatus: InterceptionCoverageStatus = coverageEntry
    ? coverageEntry.status
    : 'UNSUPPORTED';
  limitations = coverageEntry?.limitations;

  let scanStatus: ScanStatus = 'ANALYZED';
  const degradedMode = options?.scannerAvailable === false;
  if (degradedMode) {
    scanStatus = 'UNAVAILABLE';
  } else if (coverageStatus === 'UNSUPPORTED') {
    scanStatus = 'UNSUPPORTED';
  } else if (coverageStatus === 'PARTIALLY_ANALYZED') {
    scanStatus = 'PARTIALLY_ANALYZED';
  }

  let intent: IntentSummary = createDefaultIntent(
    'unknown',
    `Request method ${method} intercepted`,
    targetSpender
  );

  // 1. Evaluate domain reputation and visual phishing heuristics
  const { rulesScore: domainRulesScore, reasons: domainReasons, visualClone, drainerMatch } = evaluateTargetRules(
    payload.origin || payload.href,
    'direct'
  );
  let baseScore = domainRulesScore;
  const reasons: ReasonItem[] = [...domainReasons];

  // 2. Decode based on intercepted JSON-RPC method
  if (method === 'eth_sendTransaction' || method === 'eth_signTransaction') {
    if (params[0] && typeof params[0] === 'object') {
      calldata = params[0].data || params[0].input || '';
      contractAddress = params[0].to;
      targetSpender = params[0].to || targetSpender;
      txValue = params[0].value || '0x0';
    }

    intent = decodeTransactionCalldata(calldata, targetSpender);
    isUnlimited = intent.isUnlimited;

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

    // Unlimited ERC-20 approval
    if (intent.isUnlimited && intent.actionType === 'approve') {
      baseScore = Math.max(baseScore, 70);
      reasons.push({
        id: 'r-unlimited-allowance',
        category: 'signature',
        description: 'Transaction requests UNLIMITED (2^256-1) token withdrawal permissions',
        points: 45,
        severity: 'critical',
      });
    }

    // Blanket NFT setApprovalForAll
    if (intent.actionType === 'setApprovalForAll') {
      baseScore = Math.max(baseScore, 85);
      reasons.push({
        id: 'r-set-approval-for-all',
        category: 'signature',
        description: 'Blanket NFT operator authorization allows recipient to manage and drain ALL your collection NFTs',
        points: 50,
        severity: 'critical',
      });
    }

    // Suspicious destination / known drainer check
    if (drainerMatch?.detected) {
      baseScore = 100;
      reasons.push({
        id: 'r-confirmed-drainer-target',
        category: 'domain',
        description: 'Target destination matches confirmed malicious drainer network',
        points: 60,
        severity: 'critical',
      });
    }
  } else if (method === 'eth_sendRawTransaction') {
    // Raw signed transaction broadcast
    const rawTxHex = typeof params[0] === 'string' ? params[0] : '';
    intent = createDefaultIntent(
      'send_raw_transaction',
      `Submitting pre-signed serialized raw transaction (${rawTxHex.length} hex chars)`,
      targetSpender,
      false,
      'Raw Signed Transaction'
    );
    limitations =
      'Transaction payload is already signed with user private key. Calldata cannot be altered; broadcast can be rejected if target is malicious.';
    if (domainRulesScore >= 25) {
      baseScore = Math.max(baseScore, 75);
    }
  } else if (method === 'wallet_sendCalls') {
    // EIP-5792 Smart Account batch transaction calls
    const callBatch = params[0]?.calls || (Array.isArray(params[0]) ? params[0] : []);
    batchCalls = [];
    let hasUnlimitedBatch = false;

    for (const call of callBatch) {
      const callData = call.data || '0x';
      const callTo = call.to || '0x0000000000000000000000000000000000000000';
      const subIntent = decodeTransactionCalldata(callData, callTo);
      if (subIntent.isUnlimited) hasUnlimitedBatch = true;
      batchCalls.push({
        to: callTo,
        value: call.value || '0x0',
        data: callData,
        decodedIntent: subIntent.plainEnglish,
        isUnlimited: subIntent.isUnlimited,
      });
    }

    isUnlimited = hasUnlimitedBatch;
    if (hasUnlimitedBatch) {
      baseScore = Math.max(baseScore, 80);
      reasons.push({
        id: 'r-batch-unlimited-approval',
        category: 'signature',
        description: 'Batch transaction contains an UNLIMITED allowance or blanket operator authorization',
        points: 50,
        severity: 'critical',
      });
    }

    intent = createDefaultIntent(
      'batch_calls',
      `Batch execution of ${batchCalls.length} transactions via smart account`,
      targetSpender,
      hasUnlimitedBatch,
      'Smart Account Batch'
    );
  } else if (method === 'personal_sign') {
    const p0 = typeof params[0] === 'string' ? params[0] : '';
    const p1 = typeof params[1] === 'string' ? params[1] : '';
    const hexCandidate =
      p0.startsWith('0x') && p0.length !== 42 ? p0 : p1.startsWith('0x') && p1.length !== 42 ? p1 : p0 || p1;
    decodedMessage = decodeHexUtf8(hexCandidate);

    const lowerMsg = (decodedMessage || '').toLowerCase();
    const hasPhishingKeywords =
      lowerMsg.includes('drain') ||
      lowerMsg.includes('transfer all') ||
      lowerMsg.includes('authorize all') ||
      lowerMsg.includes('private key') ||
      lowerMsg.includes('seed phrase');

    if (hasPhishingKeywords) {
      baseScore = Math.max(baseScore, 90);
      reasons.push({
        id: 'r-sig-phishing-words',
        category: 'signature',
        description: 'Plaintext signature request contains suspicious authorization or drainer terminology',
        points: 50,
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
  } else if (method === 'eth_sign') {
    // eth_sign: blind signing arbitrary 32-byte hash
    baseScore = Math.max(baseScore, 90);
    reasons.push({
      id: 'r-eth-sign-blind',
      category: 'signature',
      description: 'CRITICAL: eth_sign requests blind signature over arbitrary hash. Malicious sites can use this to sign arbitrary transactions or drain wallets.',
      points: 60,
      severity: 'critical',
    });
    intent = createDefaultIntent(
      'eth_sign',
      'Blind cryptographic hash signature (HIGH RISK: Can sign arbitrary transactions)',
      targetSpender,
      true,
      'Blind Hash'
    );
  } else if (method.startsWith('eth_signTypedData')) {
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
      const chainId = typedDataObj.domain?.chainId || payload.chainId;
      targetSpender = verifyingContract;
      const msg = typedDataObj.message || {};

      // OpenSea Seaport Order Detection (OrderComponents)
      if (primaryType === 'OrderComponents' || domainName.toLowerCase().includes('seaport')) {
        const offerer = msg.offerer || params[0] || 'Unknown';
        const zone = msg.zone || '0x0000000000000000000000000000000000000000';
        const orderType = Number(msg.orderType || 0);
        const offers = Array.isArray(msg.offer) ? msg.offer : [];
        const considerations = Array.isArray(msg.consideration) ? msg.consideration : [];

        // Check if offer items exist but consideration is empty or 0 (zero-dollar listing drainer exploit)
        const hasOfferItems = offers.length > 0;
        const hasZeroConsideration =
          considerations.length === 0 ||
          considerations.every((c: any) => !c.startAmount || c.startAmount === '0' || c.startAmount === '0x0');

        const isZeroConsiderationRisk = hasOfferItems && hasZeroConsideration;

        seaportDetails = {
          offerer,
          zone,
          orderType,
          offerCount: offers.length,
          considerationCount: considerations.length,
          offers: offers.map((o: any) => ({
            itemType: Number(o.itemType || 0),
            token: o.token || '0x0',
            amount: String(o.startAmount || o.amount || '1'),
            identifier: o.identifierOrCriteria,
          })),
          considerations: considerations.map((c: any) => ({
            itemType: Number(c.itemType || 0),
            token: c.token || '0x0',
            amount: String(c.startAmount || c.amount || '0'),
            recipient: c.recipient || offerer,
          })),
          isZeroConsiderationRisk,
        };

        typedDataDetails = {
          primaryType,
          verifyingContract,
          domainName,
          chainId,
        };

        if (isZeroConsiderationRisk) {
          baseScore = Math.max(baseScore, 95);
          reasons.push({
            id: 'r-seaport-zero-consideration',
            category: 'signature',
            description: 'CRITICAL: OpenSea Seaport order offers items but receives ZERO consideration (free asset giveaway/drainer exploit)',
            points: 60,
            severity: 'critical',
          });
          intent = createDefaultIntent(
            'seaport_order',
            `DANGER: OpenSea Seaport listing offers ${offers.length} asset(s) with ZERO consideration in return`,
            verifyingContract,
            true,
            'Seaport Zero-Price Order'
          );
        } else {
          // Legitimate marketplace listing signature
          intent = createDefaultIntent(
            'seaport_order',
            `OpenSea Seaport off-chain order: Offering ${offers.length} item(s) for ${considerations.length} consideration item(s). (Off-chain signature, not on-chain transfer)`,
            verifyingContract,
            false,
            'OpenSea Seaport Order'
          );
        }
      } else if (
        primaryType === 'Permit' ||
        primaryType === 'PermitSingle' ||
        primaryType === 'PermitBatch' ||
        domainName === 'Permit2'
      ) {
        // EIP-2612 & Uniswap Permit2
        const spender = msg.spender || msg.details?.spender || targetSpender;
        const amount = msg.value || msg.amount || msg.details?.amount || '0';
        targetSpender = spender;
        const isUnlimitedPermit = isMaxAllowance(amount);
        isUnlimited = isUnlimitedPermit;

        typedDataDetails = {
          primaryType,
          verifyingContract,
          spender,
          amount: String(amount),
          domainName,
          chainId,
        };

        if (isUnlimitedPermit) {
          baseScore = Math.max(baseScore, 90);
          reasons.push({
            id: 'r-unlimited-permit',
            category: 'signature',
            description: 'Off-chain Permit signature (EIP-2612 / Uniswap Permit2) grants UNLIMITED token withdrawal rights without gas',
            points: 50,
            severity: 'critical',
          });
        }

        intent = createDefaultIntent(
          'permit',
          `Sign off-chain EIP-2612 / Permit2 Permit granting ${isUnlimitedPermit ? 'UNLIMITED' : amount} ${domainName} allowance to ${shortenAddress(spender)}`,
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
          chainId,
        };
        intent = createDefaultIntent(
          'typed_data',
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
  } else if (method === 'wallet_switchEthereumChain') {
    const targetChainId = params[0]?.chainId;
    intent = createDefaultIntent(
      'switch_chain',
      `Requesting network switch to Chain ID ${targetChainId}`,
      targetSpender,
      false,
      'Network Switch'
    );
  } else if (method === 'wallet_addEthereumChain') {
    const chainInfo = params[0] || {};
    intent = createDefaultIntent(
      'add_chain',
      `Adding custom network: ${chainInfo.chainName || 'Unknown'} (Chain ID: ${chainInfo.chainId || 'unknown'})`,
      targetSpender,
      false,
      'Custom Network'
    );
  } else if (method === 'wallet_watchAsset') {
    const asset = params[0]?.options || {};
    intent = createDefaultIntent(
      'watch_asset',
      `Suggesting wallet asset tracking: ${asset.symbol || 'Token'} (${shortenAddress(asset.address || '0x0')})`,
      asset.address || targetSpender,
      false,
      'Token Asset'
    );
  } else if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
    intent = createDefaultIntent(
      'request_accounts',
      `Connecting wallet accounts to ${payload.origin || 'dApp'}`,
      targetSpender,
      false,
      'Account Connection'
    );
  }

  // 3. Evaluate Claim vs. Reality mismatch
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

  // Degraded mode notice if scanner was unavailable
  if (degradedMode) {
    reasons.push({
      id: 'r-degraded-mode',
      category: 'reputation',
      description: 'Scanner API unavailable or timed out. Operating in conservative degraded mode (local heuristics only).',
      points: 15,
      severity: 'warning',
    });
    baseScore = Math.max(baseScore, 45); // fail-safe baseline caution
  }

  // 4. Synthesize final risk score and recommendation
  const isMalicious = baseScore >= 60 || Boolean(drainerMatch?.detected);
  const { finalScore, riskLevel, recommendation, recommendationText } = computeCombinedRisk(
    baseScore,
    isMalicious,
    {
      drainerSimilarity: drainerMatch?.similarityScore,
      cloneSimilarity: visualClone?.similarityPercentage,
    }
  );

  // 5. Central Security Gate Decision: ALLOW | WARN | BLOCK
  let securityGateDecision: SecurityGateDecision = 'ALLOW';
  const isConfirmedDrainer = Boolean(drainerMatch?.detected) || (visualClone?.similarityPercentage || 0) >= 80;
  const isZeroPriceSeaportAttack = Boolean(seaportDetails?.isZeroConsiderationRisk);

  if (isConfirmedDrainer || isZeroPriceSeaportAttack || finalScore >= 85) {
    securityGateDecision = 'BLOCK';
  } else if (finalScore >= 35 || isUnlimited || riskLevel !== 'LOW' || degradedMode) {
    securityGateDecision = 'WARN';
  } else {
    securityGateDecision = 'ALLOW';
  }

  return {
    riskScore: finalScore,
    riskLevel,
    recommendation,
    recommendationText,
    securityGateDecision,
    coverageStatus,
    scanStatus,
    degradedMode,
    intent,
    mismatch,
    reasons,
    origin: payload.origin,
    targetSpender: intent.targetSpender || targetSpender,
    contractAddress,
    chainId: payload.chainId,
    isUnlimited,
    methodName: intent.actionType !== 'unknown' ? intent.actionType : method,
    decodedMessage,
    typedDataDetails,
    seaportDetails,
    batchCalls,
    rawCalldata: calldata || undefined,
    txValue: txValue !== '0x0' ? txValue : undefined,
    limitations,
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
