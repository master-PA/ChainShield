import { RiskLevel, ReasonItem, IntentSummary, IntentMismatch } from '../../../src/types/security';

export interface ExtensionSettings {
  apiBaseUrl: string;
  autoScanEnabled: boolean;
  preSignInterceptionEnabled: boolean;
  explainSimply: boolean;
  strictMode: boolean;
  whitelistedDomains: string[];
}

export type InterceptionCoverageStatus = 'FULLY_INTERCEPTED' | 'PARTIALLY_ANALYZED' | 'UNSUPPORTED';

export type SecurityGateDecision = 'ALLOW' | 'WARN' | 'BLOCK';

export type ScanStatus = 'ANALYZED' | 'PARTIALLY_ANALYZED' | 'UNAVAILABLE' | 'UNSUPPORTED';

export interface MethodCoverageEntry {
  method: string;
  category: 'transaction' | 'signature' | 'network_permission' | 'account' | 'system';
  status: InterceptionCoverageStatus;
  description: string;
  limitations?: string;
}

export const METHOD_COVERAGE_REGISTRY: Record<string, MethodCoverageEntry> = {
  // Transactions
  eth_sendTransaction: {
    method: 'eth_sendTransaction',
    category: 'transaction',
    status: 'FULLY_INTERCEPTED',
    description: 'Fully intercepts and analyzes transaction destination, ETH value, calldata, token approvals, transfers, and contract interactions before wallet confirmation.',
  },
  eth_signTransaction: {
    method: 'eth_signTransaction',
    category: 'transaction',
    status: 'FULLY_INTERCEPTED',
    description: 'Inspects transaction parameters and intent prior to wallet signature creation.',
  },
  eth_sendRawTransaction: {
    method: 'eth_sendRawTransaction',
    category: 'transaction',
    status: 'PARTIALLY_ANALYZED',
    description: 'Intercepts pre-signed serialized transaction broadcast.',
    limitations: 'Transaction payload is already cryptographically signed by the user key. Calldata cannot be modified; extension inspects raw RLP bytes if decodable and can block network broadcast to confirmed malicious destinations.',
  },
  wallet_sendCalls: {
    method: 'wallet_sendCalls',
    category: 'transaction',
    status: 'FULLY_INTERCEPTED',
    description: 'EIP-5792 Smart Account batch transaction calls. Unpacks individual calls array, inspecting destination, value, and calldata for each action in the batch.',
  },

  // Signatures & Typed Data
  personal_sign: {
    method: 'personal_sign',
    category: 'signature',
    status: 'FULLY_INTERCEPTED',
    description: 'Decodes hex-encoded UTF-8 messages, detects drainer keywords, phishing phrases, and correlates with domain reputation.',
  },
  eth_sign: {
    method: 'eth_sign',
    category: 'signature',
    status: 'FULLY_INTERCEPTED',
    description: 'High-risk blind cryptographic hash signing. Flags critical danger because arbitrary 32-byte hashes can authorize transactions or drain assets.',
  },
  eth_signTypedData: {
    method: 'eth_signTypedData',
    category: 'signature',
    status: 'FULLY_INTERCEPTED',
    description: 'Legacy EIP-712 typed data signing.',
  },
  eth_signTypedData_v1: {
    method: 'eth_signTypedData_v1',
    category: 'signature',
    status: 'FULLY_INTERCEPTED',
    description: 'Early typed data signing standard with raw schemas.',
  },
  eth_signTypedData_v3: {
    method: 'eth_signTypedData_v3',
    category: 'signature',
    status: 'FULLY_INTERCEPTED',
    description: 'Standard EIP-712 structured data signing with domain and type validation.',
  },
  eth_signTypedData_v4: {
    method: 'eth_signTypedData_v4',
    category: 'signature',
    status: 'FULLY_INTERCEPTED',
    description: 'Modern EIP-712 structured data. Deeply inspects EIP-2612 Permits, Uniswap Permit2 (PermitSingle/PermitBatch), OpenSea Seaport orders (OrderComponents), and consideration items.',
  },

  // Network & Chain Permissions
  wallet_switchEthereumChain: {
    method: 'wallet_switchEthereumChain',
    category: 'network_permission',
    status: 'FULLY_INTERCEPTED',
    description: 'Validates target chain ID, detects suspicious or unverified chain IDs, and prevents silent network switching attacks.',
  },
  wallet_addEthereumChain: {
    method: 'wallet_addEthereumChain',
    category: 'network_permission',
    status: 'FULLY_INTERCEPTED',
    description: 'Inspects RPC URL, native currency symbols, chain ID, and block explorer endpoints to prevent malicious RPC interception.',
  },
  wallet_requestPermissions: {
    method: 'wallet_requestPermissions',
    category: 'network_permission',
    status: 'FULLY_INTERCEPTED',
    description: 'Inspects requested permission scope (e.g. eth_accounts) before granting wallet session access.',
  },
  wallet_watchAsset: {
    method: 'wallet_watchAsset',
    category: 'network_permission',
    status: 'FULLY_INTERCEPTED',
    description: 'Inspects token contract address, symbol, and decimals to prevent token impersonation (e.g. fake USDT/USDC addition).',
  },

  // Account Access
  eth_requestAccounts: {
    method: 'eth_requestAccounts',
    category: 'account',
    status: 'FULLY_INTERCEPTED',
    description: 'Audits initial wallet connection requests against domain reputation and visual clone detection.',
  },
  eth_accounts: {
    method: 'eth_accounts',
    category: 'account',
    status: 'FULLY_INTERCEPTED',
    description: 'Monitors background account query frequency and origin verification.',
  },
};

export interface InterceptRequestPayload {
  id: string;
  method: string;
  params: any[];
  origin: string;
  href: string;
  pageTitle: string;
  chainId?: string | number;
  lastClaimText?: string;
  timestamp: number;
}

export interface InterceptResponsePayload {
  id: string;
  decision: 'PROCEED' | 'BLOCK';
  reason?: string;
}

export interface BatchCallItem {
  to: string;
  value?: string;
  data?: string;
  decodedIntent?: string;
  isUnlimited?: boolean;
}

export interface SeaportOrderDetails {
  offerer: string;
  zone: string;
  orderType: number;
  offerCount: number;
  considerationCount: number;
  offers: Array<{ itemType: number; token: string; amount: string; identifier?: string }>;
  considerations: Array<{ itemType: number; token: string; amount: string; recipient: string }>;
  isZeroConsiderationRisk: boolean;
}

export interface PreSignAnalysisResult {
  riskScore: number;
  riskLevel: RiskLevel;
  recommendation: 'AVOID' | 'PROCEED_WITH_CAUTION' | 'SAFE_TO_PROCEED';
  recommendationText: string;
  securityGateDecision: SecurityGateDecision;
  coverageStatus: InterceptionCoverageStatus;
  scanStatus: ScanStatus;
  degradedMode?: boolean;
  intent: IntentSummary;
  mismatch?: IntentMismatch;
  reasons: ReasonItem[];
  origin: string;
  targetSpender: string;
  contractAddress?: string;
  chainId?: string | number;
  isUnlimited: boolean;
  methodName: string;
  decodedMessage?: string;
  typedDataDetails?: {
    primaryType?: string;
    verifyingContract?: string;
    spender?: string;
    amount?: string;
    domainName?: string;
    chainId?: string | number;
  };
  seaportDetails?: SeaportOrderDetails;
  batchCalls?: BatchCallItem[];
  rawCalldata?: string;
  txValue?: string;
  limitations?: string;
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
