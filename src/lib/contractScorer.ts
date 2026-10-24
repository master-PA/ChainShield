import {
  ContractFinding,
  ContractScanStatus,
  ContractSourceMetadata,
  ReasonItem,
  RiskLevel,
} from '../types/security';

export interface ContractScoringResult {
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  recommendation: 'AVOID' | 'PROCEED_WITH_CAUTION' | 'SAFE_TO_PROCEED';
  recommendationText: string;
  reasons: ReasonItem[];
  rulesScore: number;
  mlScore: number;
}

export function getContractRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'CAUTION';
  return 'LOW';
}

/**
 * Calculates a deterministic, explainable risk score for smart contracts.
 * Fully reproducible: identical findings always yield identical scores.
 */
export function calculateContractRiskScore(
  status: ContractScanStatus,
  findings: ContractFinding[],
  metadata?: ContractSourceMetadata
): ContractScoringResult {
  const reasons: ReasonItem[] = [];

  // 1. Handle addresses with no contract code
  if (status === 'NO_CONTRACT_CODE') {
    reasons.push({
      id: 'rs-no-code',
      category: 'contract',
      description: 'Address contains 0 bytes of deployed runtime bytecode (EOA or undeployed)',
      points: 20,
      severity: 'caution',
    });
    return {
      riskScore: 20,
      riskLevel: 'CAUTION',
      confidence: 100,
      recommendation: 'AVOID',
      recommendationText:
        'Target address has no deployed smart contract code on this network. It is an externally owned account (EOA) or has not been deployed.',
      reasons,
      rulesScore: 20,
      mlScore: 20,
    };
  }

  // 2. Handle provider errors
  if (status === 'PROVIDER_ERROR') {
    reasons.push({
      id: 'rs-provider-err',
      category: 'contract',
      description: 'Blockchain RPC or explorer provider query failed or timed out',
      points: 0,
      severity: 'warning',
    });
    return {
      riskScore: 0,
      riskLevel: 'CAUTION',
      confidence: 0,
      recommendation: 'PROCEED_WITH_CAUTION',
      recommendationText:
        'Security analysis inconclusive due to provider communication error. Retry the scan or verify network connectivity.',
      reasons,
      rulesScore: 0,
      mlScore: 0,
    };
  }

  // 3. Handle unverified contracts (bytecode exists, but no source code published)
  if (status === 'UNVERIFIED_SOURCE') {
    reasons.push({
      id: 'rs-unverified',
      category: 'contract',
      description:
        'Contract bytecode is deployed on-chain but source code is unverified (+55 points). Score reflects verification uncertainty and audit limitations, not a confirmed source vulnerability.',
      points: 55,
      severity: 'warning',
    });
    return {
      riskScore: 55,
      riskLevel: 'HIGH',
      confidence: 90,
      recommendation: 'AVOID',
      recommendationText:
        'AVOID. Contract source code is not verified on supported registries. Static AST security analysis was skipped; this elevated risk score reflects verification uncertainty and lack of auditability rather than a confirmed source-code exploit.',
      reasons,
      rulesScore: 55,
      mlScore: 55,
    };
  }

  // 4. Group findings by rule and function to prevent double counting
  let totalScore = 0;
  const functionGroupCount = new Map<string, number>();

  for (const finding of findings) {
    const fnKey = `${finding.ruleId}-${finding.affectedFunction}`;
    const previousInGroup = functionGroupCount.get(fnKey) || 0;
    functionGroupCount.set(fnKey, previousInGroup + 1);

    // Diminishing returns: 1st finding = 100%, 2nd = 50%, 3rd = 25%, subsequent = 0
    let multiplier = 1.0;
    if (previousInGroup === 1) multiplier = 0.5;
    else if (previousInGroup === 2) multiplier = 0.25;
    else if (previousInGroup >= 3) multiplier = 0.0;

    const netContribution = Math.round(finding.scoreContribution * multiplier);
    totalScore += netContribution;

    // Convert finding to ReasonItem
    reasons.push({
      id: finding.id,
      category: 'contract',
      description: `${finding.title} in ${finding.sourceFile}:${finding.lineStart} (+${netContribution} points)`,
      points: netContribution,
      severity:
        finding.severity === 'CRITICAL'
          ? 'critical'
          : finding.severity === 'HIGH'
          ? 'warning'
          : finding.severity === 'CAUTION'
          ? 'caution'
          : 'info',
    });
  }

  // Additional penalty if partial analysis (e.g. unverified proxy implementation)
  if (status === 'PARTIAL_ANALYSIS') {
    totalScore = Math.max(totalScore, 30);
    reasons.push({
      id: 'rs-partial-proxy',
      category: 'contract',
      description: 'Partial analysis: proxy implementation or dependent source files unverified (+20 points)',
      points: 20,
      severity: 'caution',
    });
  }

  // Score capped between 0 and 100
  const finalScore = Math.min(100, Math.max(0, totalScore));
  const riskLevel = getContractRiskLevel(finalScore);

  let recommendation: 'AVOID' | 'PROCEED_WITH_CAUTION' | 'SAFE_TO_PROCEED' = 'SAFE_TO_PROCEED';
  let recommendationText =
    'SAFE TO PROCEED. Smart contract source verified with zero critical or high-risk vulnerabilities.';

  if (riskLevel === 'CRITICAL') {
    recommendation = 'AVOID';
    recommendationText =
      'DO NOT INTERACT. Severe critical security vulnerabilities detected. Arbitrary callers can mint unlimited tokens or hijack ownership.';
  } else if (riskLevel === 'HIGH') {
    recommendation = 'AVOID';
    recommendationText =
      'AVOID. High-severity vulnerabilities detected in smart contract source code. Interaction carries elevated risk of fund loss.';
  } else if (riskLevel === 'CAUTION') {
    recommendation = 'PROCEED_WITH_CAUTION';
    recommendationText =
      'PROCEED WITH CAUTION. Moderate risk patterns, low-level calls, or unverified proxy components detected.';
  }

  const confidence = findings.length > 0 ? 95 : 90;

  return {
    riskScore: finalScore,
    riskLevel,
    confidence,
    recommendation,
    recommendationText,
    reasons,
    rulesScore: finalScore,
    mlScore: finalScore,
  };
}
