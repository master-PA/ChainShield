export type RiskLevel = 'LOW' | 'CAUTION' | 'HIGH' | 'CRITICAL';

export type LinkSource =
  | 'telegram_dm'
  | 'discord'
  | 'twitter_reply'
  | 'email'
  | 'search'
  | 'direct'
  | 'unsolicited_dm';

export interface CanonicalScanPayload {
  target: string;
  linkSource: LinkSource;
  isPrivateCheck: boolean;
  rulesScore: number;
  mlScore: number;
  finalScore: number;
  riskLevel: RiskLevel;
  reasonsCount: number;
  timestamp: number;
}

export interface StoredScanPayload {
  version: number;
  timestamp: number;
  scans: TargetScanResult[];
}

export interface ReasonItem {
  id: string;
  category: 'domain' | 'contract' | 'signature' | 'reputation' | 'sandbox' | 'intent' | 'source' | 'drainer' | 'honeypot';
  description: string;
  points: number;
  severity: 'info' | 'caution' | 'warning' | 'critical';
}

export interface IntentSummary {
  actionType: string;
  plainEnglish: string;
  plainHinglish: string;
  plainSimple: string;
  targetSpender: string;
  spenderLabel?: string;
  assetName: string;
  amountOrScope: string;
  isUnlimited: boolean;
  contractVerified: boolean;
}

export interface IntentMismatch {
  claimedText: string;
  expectedAction: string;
  actualAction: string;
  mismatchScore: number; // 0 - 100
  explanation: string;
  severity: RiskLevel;
}

export interface SimulationAssetChange {
  asset: string;
  amount: string;
  symbol: string;
  usdValue?: number;
  recipient?: string;
}

export interface SimulationApproval {
  token: string;
  symbol: string;
  spender: string;
  spenderName?: string;
  amount: string;
  isUnlimited: boolean;
}

export interface SimulationPreview {
  simulatedSuccess: boolean;
  simulationProvider: 'Tenderly Virtual RPC' | 'Offline Simulation Engine';
  gasEstimated: string;
  assetsOut: SimulationAssetChange[];
  assetsIn: SimulationAssetChange[];
  approvalsGranted: SimulationApproval[];
  plainSummary: string;
}

export interface CounterfactualResult {
  originalScore: number;
  newScore: number;
  delta: number;
  recommendedAction: string;
  saferTxCalldata?: string;
  cappedAmountText?: string;
  explanation: string;
}

export interface VisualCloneEvidence {
  matchedBrand: string;
  officialDomain: string;
  similarityPercentage: number;
  screenshotHash: string;
  referenceHash: string;
  flagMismatch: boolean;
  orbFeaturePoints: number;
}

export interface DrainerKitMatch {
  detected: boolean;
  kitName: string;
  family: string;
  similarityScore: number;
  signaturesMatched: string[];
  confidence: number;
}

export interface SandboxRequest {
  id: string;
  timestamp: number;
  method: string;
  params: unknown;
  wasBlocked: boolean;
  riskAssessment: string;
}

export interface SandboxRunResult {
  targetUrl: string;
  durationMs: number;
  totalRequests: number;
  approvalRequestsCount: number;
  signatureRequestsCount: number;
  autoPromptDetected: boolean;
  drainerBehaviorDetected: boolean;
  requests: SandboxRequest[];
  networkEgressBlocked: boolean;
}

export interface EvidenceRecord {
  reportId: string;
  canonicalHash: string;
  txHash?: string;
  blockNumber?: number;
  timestamp: number;
  submitter: string;
  isAnchored: boolean;
  chainName: string;
  contractAddress: string;
  isDemo?: boolean;
}

export interface TargetScanResult {
  id: string;
  target: string;
  targetType: 'domain' | 'url' | 'contract';
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  confidence: number; // 0 - 100
  rulesScore: number;
  mlScore: number;
  recommendation: 'AVOID' | 'PROCEED_WITH_CAUTION' | 'SAFE_TO_PROCEED';
  recommendationText: string;
  linkSource: LinkSource;
  isPrivateCheck: boolean;
  reasons: ReasonItem[];
  intent?: IntentSummary;
  mismatch?: IntentMismatch;
  simulation?: SimulationPreview;
  counterfactual?: CounterfactualResult;
  visualClone?: VisualCloneEvidence;
  drainerMatch?: DrainerKitMatch;
  sandbox?: SandboxRunResult;
  contractScan?: ContractScanResult;
  unavailableChecks: string[];
  evidence?: EvidenceRecord;
  createdAt: number;
  isDemo?: boolean;
}

export interface TransactionScanResult {
  id: string;
  txHashOrCalldata: string;
  methodName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  recommendation: 'AVOID' | 'PROCEED_WITH_CAUTION' | 'SAFE_TO_PROCEED';
  recommendationText: string;
  reasons: ReasonItem[];
  intent: IntentSummary;
  mismatch?: IntentMismatch;
  simulation: SimulationPreview;
  counterfactual?: CounterfactualResult;
  unavailableChecks: string[];
  evidence?: EvidenceRecord;
  createdAt: number;
  isDemo?: boolean;
}

export interface MessageScanResult {
  id: string;
  rawMessage: string;
  languageDetected: 'en' | 'hinglish' | 'mixed';
  scamCategory: 'airdrop_scam' | 'support_scam' | 'fake_investment' | 'romance_pig_butchering' | 'seed_phrase_trap' | 'benign';
  confidence: number;
  riskScore: number;
  riskLevel: RiskLevel;
  urgencyDetected: boolean;
  authorityImpersonated: boolean;
  seedPhraseRequested: boolean;
  unknownLinksExtracted: string[];
  actionRecommendation: string;
  reasons: ReasonItem[];
  createdAt: number;
  isDemo?: boolean;
}

export interface WalletApprovalItem {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenType: 'ERC-20' | 'ERC-721' | 'ERC-1155';
  spenderAddress: string;
  spenderLabel: string;
  isSpenderVerified: boolean;
  approvedAmount: string;
  isUnlimited: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  approvalDate: string;
  lastInteractionDate: string;
  hasProxyUpgrade: boolean;
  proxyImplementation?: string;
}

export interface WalletHealthReport {
  walletAddress: string;
  overallScore: number; // 0 - 100
  healthStatus: 'HEALTHY' | 'MODERATE_RISK' | 'CRITICAL_RISK';
  totalApprovals: number;
  unlimitedApprovals: number;
  unverifiedSpenders: number;
  staleApprovalsCount: number;
  approvals: WalletApprovalItem[];
  checkedAt: number;
  isDemo?: boolean;
}

export interface TripwireAlert {
  id: string;
  title: string;
  walletAddress: string;
  tokenSymbol: string;
  spenderName: string;
  spenderAddress: string;
  oldImplementation: string;
  newImplementation: string;
  isNewImplementationVerified: boolean;
  riskLevel: RiskLevel;
  timestamp: number;
  status: 'active' | 'dismissed' | 'revoked';
  recommendation: string;
  isDemo?: boolean;
}

export interface AddressPoisoningAlert {
  id: string;
  walletAddress: string;
  suspectAddress: string;
  legitimateAddress: string;
  matchedPrefix: string;
  matchedSuffix: string;
  differingMiddle: string;
  riskScore: number;
  riskLevel: RiskLevel;
  timestamp: number;
  details: string;
  isDemo?: boolean;
}

export interface CommunityReport {
  id: string;
  target: string;
  targetType: 'domain' | 'contract' | 'wallet' | 'drainer';
  reportedCategory: string;
  description: string;
  reporterAddress: string;
  reporterReputation: number;
  stakeAmountEth?: string;
  status: 'pending' | 'verified_malicious' | 'rejected_benign';
  upvotes: number;
  evidenceHash: string;
  timestamp: number;
  resolvedAt?: number;
  isDemo?: boolean;
}

export interface DrainerKit {
  id: string;
  name: string;
  family: string;
  firstSeen: string;
  detectionsThisWeek: number;
  totalDetections: number;
  riskLevel: RiskLevel;
  attackVectors: string[];
  defensiveSignatures: string[];
  fingerprintHash: string;
  status: 'active' | 'monitoring' | 'declining';
  isDemo?: boolean;
}

export interface ModelMetrics {
  name: string;
  version: string;
  algorithm: string;
  datasetSize: number;
  precision: number;
  recall: number;
  f1Score: number;
  prAuc: number;
  rocAuc: number;
  lastTrained: string;
  topFeatures: Array<{ feature: string; importance: number }>;
}

export interface ProviderHealth {
  name: string;
  category: 'threat_intelligence' | 'blockchain' | 'simulation' | 'domain';
  status: 'OPERATIONAL' | 'DEGRADED' | 'LIMITED_OFFLINE';
  latencyMs: number;
  lastChecked: string;
  endpoint: string;
  isFallback: boolean;
}

export type ContractScanStatus =
  | 'ANALYZED'
  | 'PARTIAL_ANALYSIS'
  | 'UNVERIFIED_SOURCE'
  | 'NO_CONTRACT_CODE'
  | 'PROVIDER_ERROR';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'CAUTION' | 'LOW' | 'INFO';
export type FindingConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ContractFinding {
  id: string;
  ruleId: string;
  title: string;
  severity: FindingSeverity;
  confidence: FindingConfidence;
  affectedContract: string;
  affectedFunction: string;
  sourceFile: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  description: string;
  potentialImpact: string;
  remediation: string;
  reasoning: string;
  limitations?: string;
  scoreContribution: number;
}

export interface ContractSourceFile {
  fileName: string;
  content: string;
}

export interface ContractSourceMetadata {
  sourceProvider: 'etherscan-v2' | 'sourcify' | 'local' | 'none';
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'PARTIAL';
  contractName: string;
  compilerVersion: string;
  optimizationUsed: boolean;
  runs?: number;
  isProxy: boolean;
  proxyType?: 'EIP-1967' | 'EIP-1822' | 'Beacon' | 'Custom';
  implementationAddress?: string;
  implementationContractName?: string;
  implementationVerified?: boolean;
  sourceFiles: ContractSourceFile[];
  bytecodeSize: number;
  bytecodeHash: string;
  deployedBlock?: number;
  retrievalDiagnostic?: string;
  diagnostics?: {
    sourcify?: string;
    etherscan?: string;
  };
  matchType?: string;
}

export interface ContractScanResult {
  id: string;
  target: string; // normalized checksum contract address
  targetType: 'contract';
  chainId: number;
  networkName: string;
  status: ContractScanStatus;
  staticAnalysisStatus?: 'ANALYZED' | 'SKIPPED' | 'UNAVAILABLE';
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  confidence: number; // 0 - 100
  rulesScore: number;
  mlScore: number;
  recommendation: 'AVOID' | 'PROCEED_WITH_CAUTION' | 'SAFE_TO_PROCEED';
  recommendationText: string;
  sourceMetadata: ContractSourceMetadata;
  findings: ContractFinding[];
  reasons: ReasonItem[];
  evidence?: EvidenceRecord;
  createdAt: number;
  isDemo?: boolean;
  errorMessage?: string;
}
