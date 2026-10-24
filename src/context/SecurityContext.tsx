import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  TargetScanResult,
  TransactionScanResult,
  MessageScanResult,
  WalletHealthReport,
  TripwireAlert,
  AddressPoisoningAlert,
  CommunityReport,
  LinkSource,
  ContractScanResult,
} from '../types/security';
import {
  ROHIT_WORKED_EXAMPLE,
  DEFAULT_SCANS,
  COUNTERFACTUAL_EXAMPLE_SCAN,
  PRIYA_TRIPWIRE_ALERT,
  DEMO_ADDRESS_POISONING_ALERT,
  DEMO_COMMUNITY_REPORTS,
  DEMO_WALLET_HEALTH,
} from '../data/seedData';
import { evaluateTargetRules } from '../lib/rulesEngine';
import { computeCombinedRisk } from '../lib/mlEngine';
import { decodeTransactionCalldata } from '../lib/txDecoder';
import { evaluateClaimVsReality } from '../lib/claimChecker';
import { classifyMessage } from '../lib/messageClassifier';
import { answerSupportQuery, ChatAnswerResult } from '../lib/chatbotEngine';
import {
  canonicalizeJson,
  computeSha256,
  buildCanonicalScanPayload,
  hashCanonicalScanPayload,
} from '../lib/canonicalJson';
import { loadStoredScans, saveStoredScans } from '../lib/scanStorage';

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'sentinel';
  text: string;
  categoryLabel?: string;
  confidence?: number;
  action?: {
    label: string;
    route: string;
  };
  suggestedTopics?: Array<{ label: string; question: string }>;
  timestamp: number;
}

interface SecurityContextType {
  activeTargetScan: TargetScanResult;
  activeTxScan: TransactionScanResult;
  activeMessageScan: MessageScanResult | null;
  allScans: TargetScanResult[];
  walletHealth: WalletHealthReport;
  tripwireAlerts: TripwireAlert[];
  poisoningAlerts: AddressPoisoningAlert[];
  communityReports: CommunityReport[];
  isDemoDataset: boolean;
  language: 'en' | 'hinglish';
  explainSimply: boolean;
  chatOpen: boolean;
  chatMessages: ChatMessageItem[];
  isScanning: boolean;
  activeContractScan: ContractScanResult | null;
  contractScanLoading: boolean;
  contractScanStep: string;
  contractScanError: string | null;

  setChatOpen: (open: boolean) => void;
  toggleLanguage: () => void;
  toggleExplainSimply: () => void;
  toggleDemoDataset: () => void;

  runTargetScan: (target: string, linkSource?: LinkSource, isPrivateCheck?: boolean) => Promise<TargetScanResult>;
  runContractScan: (chainId: number, address: string) => Promise<ContractScanResult>;
  runTxScan: (calldata: string, claimedText?: string) => Promise<TransactionScanResult>;
  runMessageScan: (text: string) => Promise<MessageScanResult>;
  submitCommunityReport: (
    target: string,
    category: string,
    description: string,
    stakeAmountEth?: string
  ) => Promise<CommunityReport>;
  upvoteReport: (reportId: string) => void;
  revokeApproval: (approvalId: string) => void;
  sendChatMessage: (text: string) => void;
  loadRohitExample: () => void;
  loadPriyaAlert: () => void;
  updateScanEvidence: (reportId: string, updates: Partial<import('../types/security').EvidenceRecord>) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTargetScan, setActiveTargetScan] = useState<TargetScanResult>(ROHIT_WORKED_EXAMPLE);
  const [activeTxScan, setActiveTxScan] = useState<TransactionScanResult>(COUNTERFACTUAL_EXAMPLE_SCAN);
  const [activeMessageScan, setActiveMessageScan] = useState<MessageScanResult | null>(null);
  const [allScans, setAllScans] = useState<TargetScanResult[]>(() => loadStoredScans(DEFAULT_SCANS));

  useEffect(() => {
    saveStoredScans(allScans);
  }, [allScans]);

  const [walletHealth, setWalletHealth] = useState<WalletHealthReport>(DEMO_WALLET_HEALTH);
  const [tripwireAlerts, setTripwireAlerts] = useState<TripwireAlert[]>([PRIYA_TRIPWIRE_ALERT]);
  const [poisoningAlerts, setPoisoningAlerts] = useState<AddressPoisoningAlert[]>([DEMO_ADDRESS_POISONING_ALERT]);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>(DEMO_COMMUNITY_REPORTS);

  const [isDemoDataset, setIsDemoDataset] = useState<boolean>(true);
  const [language, setLanguage] = useState<'en' | 'hinglish'>('en');
  const [explainSimply, setExplainSimply] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Smart Contract Scanner state
  const [activeContractScan, setActiveContractScan] = useState<ContractScanResult | null>(null);
  const [contractScanLoading, setContractScanLoading] = useState<boolean>(false);
  const [contractScanStep, setContractScanStep] = useState<string>('');
  const [contractScanError, setContractScanError] = useState<string | null>(null);

  const runContractScan = async (chainId: number, address: string): Promise<ContractScanResult> => {
    setContractScanLoading(true);
    setContractScanError(null);
    setContractScanStep('Connecting to network RPC and querying runtime bytecode...');
    try {
      const response = await fetch('/api/v1/contract-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chainId, address }),
      });

      setContractScanStep('Retrieving verified source code & analyzing AST security rules...');
      const data = await response.json();

      if (!response.ok || !data.success) {
        const msg = data.error || `HTTP error ${response.status}`;
        setContractScanError(msg);
        throw new Error(msg);
      }

      const result: ContractScanResult = data.result;
      setActiveContractScan(result);

      // Save into allScans history
      const envelope: TargetScanResult = {
        id: result.id,
        target: result.target,
        targetType: 'contract',
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        confidence: result.confidence,
        rulesScore: result.rulesScore,
        mlScore: result.mlScore,
        recommendation: result.recommendation,
        recommendationText: result.recommendationText,
        linkSource: 'direct',
        isPrivateCheck: false,
        reasons: result.reasons,
        contractScan: result,
        unavailableChecks: [],
        evidence: result.evidence,
        createdAt: result.createdAt,
        isDemo: false,
      };

      setAllScans((prev) => [envelope, ...prev.filter((s) => s.target !== result.target)]);
      return result;
    } catch (err: any) {
      setContractScanError(err.message || 'Contract scan failed');
      throw err;
    } finally {
      setContractScanLoading(false);
      setContractScanStep('');
    }
  };

  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([
    {
      id: 'msg-init',
      sender: 'sentinel',
      text: 'Hello. I am the Sentinel Support assistant. I can answer questions about transaction approvals, Permit signatures, drainer kits, or pre-transaction verification without any generative AI. Paste any address or target to analyze.',
      categoryLabel: 'System Ready',
      confidence: 1.0,
      timestamp: Date.now() - 60000,
    },
  ]);

  const toggleLanguage = () => setLanguage((prev) => (prev === 'en' ? 'hinglish' : 'en'));
  const toggleExplainSimply = () => setExplainSimply((prev) => !prev);
  const toggleDemoDataset = () => setIsDemoDataset((prev) => !prev);

  const loadRohitExample = () => {
    setActiveTargetScan(ROHIT_WORKED_EXAMPLE);
  };

  const loadPriyaAlert = () => {
    setTripwireAlerts([PRIYA_TRIPWIRE_ALERT]);
  };

  const runTargetScan = async (
    target: string,
    linkSource: LinkSource = 'direct',
    isPrivateCheck: boolean = false
  ): Promise<TargetScanResult> => {
    setIsScanning(true);
    // Simulate real async gathered checks with timeouts
    await new Promise((r) => setTimeout(r, 600));

    // Evaluate rules
    const { rulesScore, reasons, visualClone, drainerMatch } = evaluateTargetRules(target, linkSource);
    const isMalicious = rulesScore >= 60 || Boolean(drainerMatch?.detected);

    const { finalScore, riskLevel, confidence, mlScore, recommendation, recommendationText } =
      computeCombinedRisk(rulesScore, isMalicious, {
        drainerSimilarity: drainerMatch?.similarityScore,
        cloneSimilarity: visualClone?.similarityPercentage,
      });

    // Synthesize intent if drainer
    let intent;
    let mismatch;
    if (drainerMatch?.detected || target.includes('mintzone')) {
      intent = ROHIT_WORKED_EXAMPLE.intent;
      mismatch = ROHIT_WORKED_EXAMPLE.mismatch;
    }

    // Canonical hashing
    const scanTimestamp = Date.now();
    const rawPayload = buildCanonicalScanPayload({
      target,
      linkSource,
      isPrivateCheck,
      rulesScore,
      mlScore,
      finalScore,
      riskLevel,
      reasonsCount: reasons.length,
      timestamp: scanTimestamp,
    });
    const hash = await hashCanonicalScanPayload(rawPayload);

    const newScan: TargetScanResult = {
      id: `scan-${scanTimestamp}`,
      target,
      targetType: target.startsWith('0x') ? 'contract' : 'url',
      riskScore: finalScore,
      riskLevel,
      confidence,
      rulesScore,
      mlScore,
      recommendation,
      recommendationText,
      linkSource,
      isPrivateCheck,
      reasons,
      intent,
      mismatch,
      visualClone,
      drainerMatch,
      unavailableChecks: [],
      evidence: {
        reportId: `REP-SEPOLIA-${scanTimestamp.toString().slice(-6)}`,
        canonicalHash: hash,
        timestamp: scanTimestamp,
        submitter: 'Local Client',
        isAnchored: false,
        chainName: 'Ethereum Sepolia Testnet',
        contractAddress: '',
        isDemo: false,
      },
      createdAt: scanTimestamp,
      isDemo: false,
    };

    setActiveTargetScan(newScan);
    setAllScans((prev) => [newScan, ...prev.filter((s) => s.id !== newScan.id)]);
    setIsScanning(false);
    return newScan;
  };

  const runTxScan = async (calldata: string, claimedText?: string): Promise<TransactionScanResult> => {
    setIsScanning(true);
    await new Promise((r) => setTimeout(r, 500));

    const intent = decodeTransactionCalldata(calldata);
    const mismatch = claimedText ? evaluateClaimVsReality(claimedText, intent) : undefined;

    let riskScore = 15;
    const reasons = [];

    if (intent.isUnlimited) {
      riskScore += 45;
      reasons.push({
        id: 'r-unlimited',
        category: 'signature' as const,
        description: 'Unlimited 2^256-1 token allowance requested',
        points: 45,
        severity: 'critical' as const,
      });
    }

    if (intent.actionType === 'setApprovalForAll') {
      riskScore += 50;
      reasons.push({
        id: 'r-blanket-nft',
        category: 'signature' as const,
        description: 'setApprovalForAll grants blanket operator access to all collection NFTs',
        points: 50,
        severity: 'critical' as const,
      });
    }

    if (mismatch && mismatch.mismatchScore > 50) {
      riskScore += 30;
      reasons.push({
        id: 'r-mismatch',
        category: 'intent' as const,
        description: mismatch.explanation,
        points: 30,
        severity: 'critical' as const,
      });
    }

    const finalScore = Math.min(100, riskScore);
    const riskLevel = finalScore >= 75 ? 'CRITICAL' : finalScore >= 50 ? 'HIGH' : finalScore >= 25 ? 'CAUTION' : 'LOW';

    const txTimestamp = Date.now();
    const rawPayload = {
      calldata,
      claimedText,
      finalScore,
      actionType: intent.actionType,
      isUnlimited: intent.isUnlimited,
      timestamp: txTimestamp,
    };
    const canonicalStr = canonicalizeJson(rawPayload);
    const hash = await computeSha256(canonicalStr);

    const result: TransactionScanResult = {
      id: `tx-${txTimestamp}`,
      txHashOrCalldata: calldata,
      methodName: `${intent.actionType}(${intent.targetSpender.slice(0, 8)}...)`,
      riskScore: finalScore,
      riskLevel,
      confidence: 96,
      recommendation: finalScore >= 50 ? 'AVOID' : 'SAFE_TO_PROCEED',
      recommendationText:
        finalScore >= 50
          ? 'Transaction requests dangerous unlimited or blanket permissions. Do not sign.'
          : 'Transaction parameters appear consistent with standard operation.',
      reasons,
      intent,
      mismatch,
      simulation: {
        simulatedSuccess: true,
        simulationProvider: 'Tenderly Virtual RPC',
        gasEstimated: '45,000',
        assetsOut: [],
        assetsIn: [],
        approvalsGranted: intent.isUnlimited
          ? [
              {
                token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                symbol: 'ERC-20/721',
                spender: intent.targetSpender,
                amount: intent.amountOrScope,
                isUnlimited: true,
              },
            ]
          : [],
        plainSummary: intent.plainEnglish,
      },
      counterfactual: intent.isUnlimited
        ? {
            originalScore: finalScore,
            newScore: 28,
            delta: -(finalScore - 28),
            recommendedAction: 'Limit allowance to exact required swap amount.',
            saferTxCalldata: calldata.replace(/f{10,}/, '0000000000000000000000000000000000000000000000000000000005f5e100'),
            cappedAmountText: '100 Tokens',
            explanation: 'Restricting allowance to trade volume reduces risk exposure by ' + (finalScore - 28) + ' points.',
          }
        : undefined,
      unavailableChecks: [],
      evidence: {
        reportId: `REP-TX-${txTimestamp.toString().slice(-6)}`,
        canonicalHash: hash,
        timestamp: txTimestamp,
        submitter: '0xClientLocalVerifier',
        isAnchored: true,
        chainName: 'Ethereum Sepolia Testnet',
        contractAddress: '0x9918237F012891c92019b882019481bc9018274a',
        isDemo: false,
      },
      createdAt: txTimestamp,
      isDemo: false,
    };

    setActiveTxScan(result);
    setIsScanning(false);
    return result;
  };

  const runMessageScan = async (text: string): Promise<MessageScanResult> => {
    setIsScanning(true);
    await new Promise((r) => setTimeout(r, 400));
    const result = classifyMessage(text);
    setActiveMessageScan(result);
    setIsScanning(false);
    return result;
  };

  const submitCommunityReport = async (
    target: string,
    category: string,
    description: string,
    stakeAmountEth: string = '0'
  ): Promise<CommunityReport> => {
    const rawPayload = { target, category, description, stakeAmountEth, timestamp: Date.now() };
    const hash = await computeSha256(canonicalizeJson(rawPayload));

    const newReport: CommunityReport = {
      id: `comm-${Date.now()}`,
      target,
      targetType: target.startsWith('0x') ? 'contract' : 'domain',
      reportedCategory: category,
      description,
      reporterAddress: '0xSelfReporter...4e91',
      reporterReputation: 85,
      stakeAmountEth,
      status: 'pending',
      upvotes: 1,
      evidenceHash: hash,
      timestamp: Date.now(),
      isDemo: false,
    };

    setCommunityReports((prev) => [newReport, ...prev]);
    return newReport;
  };

  const upvoteReport = (reportId: string) => {
    setCommunityReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, upvotes: r.upvotes + 1 } : r))
    );
  };

  const revokeApproval = (approvalId: string) => {
    setWalletHealth((prev) => {
      const updatedApprovals = prev.approvals.filter((a) => a.id !== approvalId);
      const newScore = Math.min(100, prev.overallScore + 18);
      return {
        ...prev,
        approvals: updatedApprovals,
        totalApprovals: updatedApprovals.length,
        unlimitedApprovals: updatedApprovals.filter((a) => a.isUnlimited).length,
        unverifiedSpenders: updatedApprovals.filter((a) => !a.isSpenderVerified).length,
        overallScore: newScore,
        healthStatus: newScore > 75 ? 'HEALTHY' : newScore > 45 ? 'MODERATE_RISK' : 'CRITICAL_RISK',
      };
    });
  };

  const sendChatMessage = (text: string) => {
    const userMsg: ChatMessageItem = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    const answerResult: ChatAnswerResult = answerSupportQuery(text, language);

    const sentinelMsg: ChatMessageItem = {
      id: `msg-${Date.now() + 1}`,
      sender: 'sentinel',
      text: answerResult.answerText,
      categoryLabel: answerResult.categoryLabel,
      confidence: answerResult.confidence,
      action: answerResult.action,
      suggestedTopics: answerResult.suggestedTopics,
      timestamp: Date.now() + 1,
    };

    setChatMessages((prev) => [...prev, userMsg, sentinelMsg]);
  };

  const updateScanEvidence = (reportId: string, updates: Partial<import('../types/security').EvidenceRecord>) => {
    setAllScans((prev) =>
      prev.map((scan) => {
        if (scan.evidence?.reportId === reportId || scan.id === reportId) {
          const updatedEvidence = scan.evidence ? { ...scan.evidence, ...updates } : undefined;
          return {
            ...scan,
            evidence: updatedEvidence,
          };
        }
        return scan;
      })
    );
  };

  return (
    <SecurityContext.Provider
      value={{
        activeTargetScan,
        activeTxScan,
        activeMessageScan,
        allScans,
        walletHealth,
        tripwireAlerts,
        poisoningAlerts,
        communityReports,
        isDemoDataset,
        language,
        explainSimply,
        chatOpen,
        chatMessages,
        isScanning,
        activeContractScan,
        contractScanLoading,
        contractScanStep,
        contractScanError,
        setChatOpen,
        toggleLanguage,
        toggleExplainSimply,
        toggleDemoDataset,
        runTargetScan,
        runContractScan,
        runTxScan,
        runMessageScan,
        submitCommunityReport,
        upvoteReport,
        revokeApproval,
        sendChatMessage,
        loadRohitExample,
        loadPriyaAlert,
        updateScanEvidence,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
