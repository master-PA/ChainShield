import { RiskLevel, ReasonItem, IntentSummary, IntentMismatch } from '../../../src/types/security';

export interface ExtensionSettings {
  apiBaseUrl: string;
  autoScanEnabled: boolean;
  preSignInterceptionEnabled: boolean;
  explainSimply: boolean;
  strictMode: boolean;
  whitelistedDomains: string[];
}

export interface InterceptRequestPayload {
  id: string;
  method: string;
  params: any[];
  origin: string;
  href: string;
  pageTitle: string;
  lastClaimText?: string;
  timestamp: number;
}

export interface InterceptResponsePayload {
  id: string;
  decision: 'PROCEED' | 'BLOCK';
  reason?: string;
}

export interface PreSignAnalysisResult {
  riskScore: number;
  riskLevel: RiskLevel;
  recommendation: 'AVOID' | 'PROCEED_WITH_CAUTION' | 'SAFE_TO_PROCEED';
  recommendationText: string;
  intent: IntentSummary;
  mismatch?: IntentMismatch;
  reasons: ReasonItem[];
  origin: string;
  targetSpender: string;
  isUnlimited: boolean;
  methodName: string;
  decodedMessage?: string;
  typedDataDetails?: {
    primaryType?: string;
    verifyingContract?: string;
    spender?: string;
    amount?: string;
    domainName?: string;
  };
  rawCalldata?: string;
  txValue?: string;
}

export interface ThreatLogItem {
  id: string;
  timestamp: number;
  origin: string;
  href: string;
  method: string;
  calldata?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  actionTaken: 'BLOCKED' | 'PROCEEDED' | 'AUDITED';
  explanation: string;
  mismatchExplanation?: string;
}

export interface TabSecurityState {
  tabId: number;
  url: string;
  hostname: string;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: ReasonItem[];
  isWhitelisted: boolean;
  isScanning: boolean;
  lastScannedAt: number;
}

export type ExtensionMessage =
  | { type: 'CS_GET_CURRENT_TAB_STATUS'; tabId?: number }
  | { type: 'CS_TAB_STATUS_UPDATE'; state: TabSecurityState }
  | {
      type: 'CS_PAGE_VISITED';
      url: string;
      href?: string;
      hostname: string;
      riskScore: number;
      riskLevel: RiskLevel;
      reasons: ReasonItem[];
      isWhitelisted: boolean;
      tabId?: number;
    }
  | { type: 'CS_PRE_SIGN_ANALYZE'; payload: InterceptRequestPayload }
  | { type: 'CS_LOG_THREAT_EVENT'; item: ThreatLogItem }
  | { type: 'CS_GET_SETTINGS' }
  | { type: 'CS_SAVE_SETTINGS'; settings: Partial<ExtensionSettings> }
  | { type: 'CS_GET_THREAT_LOGS' }
  | { type: 'CS_CLEAR_THREAT_LOGS' }
  | { type: 'CS_ADD_WHITELIST'; domain: string }
  | { type: 'CS_REMOVE_WHITELIST'; domain: string }
  | { type: 'CS_TEST_API_CONNECTION'; url?: string };


