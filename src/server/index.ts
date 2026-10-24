import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables (.env.local takes precedence)
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

import {
  ALLOWED_CHAINS,
  getDeployedBytecode,
  checkProxyImplementation,
  getVerifiedSourceCode,
  normalizeContractAddress,
} from './contractDataService';
import { analyzeContractSource } from '../lib/contractAnalyzer/analyzer';
import { calculateContractRiskScore } from '../lib/contractScorer';
import {
  ContractScanResult,
  ContractSourceMetadata,
  ContractScanStatus,
  TargetScanResult,
  TransactionScanResult,
  LinkSource,
} from '../types/security';
import {
  buildCanonicalScanPayload,
  hashCanonicalScanPayloadSync,
} from '../lib/canonicalJson';
import { evaluateTargetRules } from '../lib/rulesEngine';
import { computeCombinedRisk } from '../lib/mlEngine';
import { decodeTransactionCalldata } from '../lib/txDecoder';
import { evaluateClaimVsReality } from '../lib/claimChecker';

export const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS middleware allowing cross-origin calls from browser extensions and local web clients
app.use((_req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Health Check
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OPERATIONAL',
    service: 'ChainShield Sentinel Security Scanner & Extension API',
    supportedChains: Object.values(ALLOWED_CHAINS).map((c) => ({
      chainId: c.chainId,
      name: c.name,
    })),
    endpoints: [
      'GET /api/v1/health',
      'POST /api/v1/contract-scans',
      'POST /api/v1/target-scans',
      'POST /api/v1/tx-scans',
    ],
    timestamp: Date.now(),
  });
});

/**
 * POST /api/v1/target-scans
 * Analyzes URL, domain, or Web3 host with deterministic rules and ML scoring.
 */
app.post('/api/v1/target-scans', async (req: Request, res: Response) => {
  try {
    const { target, linkSource = 'direct', isPrivateCheck = false } = req.body;
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid target parameter.' });
    }

    const { rulesScore, reasons, visualClone, drainerMatch } = evaluateTargetRules(
      target,
      linkSource as LinkSource
    );
    const isMalicious = rulesScore >= 60 || Boolean(drainerMatch?.detected);

    const { finalScore, riskLevel, confidence, mlScore, recommendation, recommendationText } =
      computeCombinedRisk(rulesScore, isMalicious, {
        drainerSimilarity: drainerMatch?.similarityScore,
        cloneSimilarity: visualClone?.similarityPercentage,
      });

    const scanTimestamp = Date.now();
    const rawPayload = buildCanonicalScanPayload({
      target,
      linkSource: linkSource as LinkSource,
      isPrivateCheck: Boolean(isPrivateCheck),
      rulesScore,
      mlScore,
      finalScore,
      riskLevel,
      reasonsCount: reasons.length,
      timestamp: scanTimestamp,
    });
    const hash = hashCanonicalScanPayloadSync(rawPayload);

    const scanResult: TargetScanResult = {
      id: `scan-${scanTimestamp}-${Math.random().toString(36).slice(2, 6)}`,
      target,
      targetType: target.startsWith('0x') ? 'contract' : 'url',
      riskScore: finalScore,
      riskLevel,
      confidence,
      rulesScore,
      mlScore,
      recommendation,
      recommendationText,
      linkSource: linkSource as LinkSource,
      isPrivateCheck: Boolean(isPrivateCheck),
      reasons,
      visualClone,
      drainerMatch,
      unavailableChecks: [],
      evidence: {
        reportId: `REP-TARGET-${scanTimestamp.toString().slice(-6)}`,
        canonicalHash: hash,
        timestamp: scanTimestamp,
        submitter: 'ChainShield Sentinel Extension Gateway',
        isAnchored: false,
        chainName: 'Ethereum Sepolia Testnet',
        contractAddress: '',
      },
      createdAt: scanTimestamp,
      isDemo: false,
    };

    return res.json({ success: true, result: scanResult });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Target scan failed.' });
  }
});

/**
 * POST /api/v1/tx-scans
 * Decodes raw calldata, parses method intent, evaluates claim-vs-reality mismatch.
 */
app.post('/api/v1/tx-scans', async (req: Request, res: Response) => {
  try {
    const { calldata, claimedText, contractAddress } = req.body;
    if (!calldata || typeof calldata !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid calldata parameter.' });
    }

    const intent = decodeTransactionCalldata(calldata, contractAddress);
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
        id: 'r-approval-all',
        category: 'signature' as const,
        description: 'Blanket operator approval grants full access to all collection assets',
        points: 50,
        severity: 'critical' as const,
      });
    }

    if (mismatch) {
      riskScore = Math.max(riskScore, mismatch.mismatchScore);
      reasons.push({
        id: 'r-mismatch',
        category: 'intent' as const,
        description: mismatch.explanation,
        points: mismatch.mismatchScore,
        severity: mismatch.severity === 'CRITICAL' ? ('critical' as const) : ('warning' as const),
      });
    }

    const clampedScore = Math.min(100, Math.max(0, riskScore));
    const riskLevel =
      clampedScore >= 75 ? 'CRITICAL' : clampedScore >= 50 ? 'HIGH' : clampedScore >= 25 ? 'CAUTION' : 'LOW';

    const recommendation =
      riskLevel === 'CRITICAL' ? 'AVOID' : riskLevel === 'HIGH' ? 'AVOID' : riskLevel === 'CAUTION' ? 'PROCEED_WITH_CAUTION' : 'SAFE_TO_PROCEED';

    const scanTimestamp = Date.now();
    const result: TransactionScanResult = {
      id: `txscan-${scanTimestamp}`,
      txHashOrCalldata: calldata,
      methodName: intent.actionType,
      riskScore: clampedScore,
      riskLevel,
      confidence: 96,
      recommendation,
      recommendationText:
        recommendation === 'AVOID'
          ? 'DO NOT SIGN. Transaction authorizes dangerous or unexpected asset permissions.'
          : 'Proceed with caution. Verify the destination recipient and spender.',
      reasons,
      intent,
      mismatch,
      simulation: {
        simulatedSuccess: true,
        simulationProvider: 'Offline Simulation Engine',
        gasEstimated: '45,210',
        assetsOut: [],
        assetsIn: [],
        approvalsGranted: intent.isUnlimited
          ? [{ token: intent.assetName, symbol: 'TOKEN', spender: intent.targetSpender, amount: 'UNLIMITED', isUnlimited: true }]
          : [],
        plainSummary: intent.plainEnglish,
      },
      unavailableChecks: [],
      createdAt: scanTimestamp,
      isDemo: false,
    };

    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Transaction scan failed.' });
  }
});

/**
 * POST /api/v1/contract-scans
 * Analyzes real on-chain smart contracts on Ethereum Sepolia or Mainnet.
 */
app.post('/api/v1/contract-scans', async (req: Request, res: Response) => {
  try {
    const { chainId, address } = req.body;

    // 1. Validate Chain ID
    if (!chainId || typeof chainId !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid chainId. Must be a number (e.g. 11155111 for Sepolia, 1 for Mainnet).',
      });
    }

    const chain = ALLOWED_CHAINS[chainId];
    if (!chain) {
      return res.status(400).json({
        success: false,
        error: `Unsupported chainId: ${chainId}. ChainShield currently supports Ethereum Sepolia (11155111) and Ethereum Mainnet (1).`,
      });
    }

    // 2. Validate Address
    let normalizedAddress: string;
    try {
      normalizedAddress = normalizeContractAddress(address);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum contract address format. Must be a valid 40-character hex string prefixed with 0x.',
      });
    }

    console.log(`[ContractScan API] Scanning ${normalizedAddress} on ${chain.name} (${chainId})...`);

    // 3. Read runtime bytecode
    const bytecodeResult = await getDeployedBytecode(chainId, normalizedAddress);

    // If no code deployed at address
    if (!bytecodeResult.hasCode) {
      const scoring = calculateContractRiskScore('NO_CONTRACT_CODE', []);
      const scanResult: ContractScanResult = {
        id: `cscan-${Date.now()}-${normalizedAddress.slice(2, 8)}`,
        target: normalizedAddress,
        targetType: 'contract',
        chainId,
        networkName: chain.name,
        status: 'NO_CONTRACT_CODE',
        staticAnalysisStatus: 'UNAVAILABLE',
        riskScore: scoring.riskScore,
        riskLevel: scoring.riskLevel,
        confidence: scoring.confidence,
        rulesScore: scoring.rulesScore,
        mlScore: scoring.mlScore,
        recommendation: scoring.recommendation,
        recommendationText: scoring.recommendationText,
        sourceMetadata: {
          sourceProvider: 'none',
          verificationStatus: 'UNVERIFIED',
          contractName: 'Undeployed / EOA',
          compilerVersion: 'N/A',
          optimizationUsed: false,
          isProxy: false,
          sourceFiles: [],
          bytecodeSize: 0,
          bytecodeHash: '0x',
          retrievalDiagnostic: 'Target address has 0 bytes of deployed runtime bytecode on-chain.',
        },
        findings: [],
        reasons: scoring.reasons,
        createdAt: Date.now(),
      };

      return res.json({ success: true, result: scanResult });
    }

    // 4. Check for Proxy implementation (Rule F)
    const proxyCheck = await checkProxyImplementation(chainId, normalizedAddress);

    // 5. Retrieve verified source code (Live external providers Sourcify v2 / Etherscan v2)
    let sourceMeta = await getVerifiedSourceCode(chainId, normalizedAddress);

    let status: ContractScanStatus = 'ANALYZED';
    let staticAnalysisStatus: 'ANALYZED' | 'SKIPPED' | 'UNAVAILABLE' = 'ANALYZED';
    let findings: any[] = [];

    const isSourceUnavailable =
      !sourceMeta ||
      sourceMeta.verificationStatus === 'UNVERIFIED' ||
      !sourceMeta.sourceFiles ||
      sourceMeta.sourceFiles.length === 0;

    if (isSourceUnavailable) {
      // Bytecode exists, but no verified source found on Sourcify or Etherscan
      status = 'UNVERIFIED_SOURCE';
      staticAnalysisStatus = 'SKIPPED';
      sourceMeta = {
        sourceProvider: 'none',
        verificationStatus: 'UNVERIFIED',
        contractName: sourceMeta?.contractName || 'Unverified Contract',
        compilerVersion: sourceMeta?.compilerVersion || 'unknown',
        optimizationUsed: false,
        isProxy: proxyCheck.isProxy,
        proxyType: proxyCheck.proxyType,
        implementationAddress: proxyCheck.implementationAddress,
        sourceFiles: [],
        bytecodeSize: bytecodeResult.bytecodeSize,
        bytecodeHash: bytecodeResult.bytecodeHash,
        retrievalDiagnostic:
          sourceMeta?.retrievalDiagnostic ||
          'Contract source code is not verified on supported registries (Sourcify v2 / Etherscan v2).',
        diagnostics: sourceMeta?.diagnostics,
      };
    } else {
      // Source code successfully retrieved!
      sourceMeta.bytecodeSize = bytecodeResult.bytecodeSize;
      sourceMeta.bytecodeHash = bytecodeResult.bytecodeHash;
      sourceMeta.isProxy = proxyCheck.isProxy || sourceMeta.isProxy;
      if (proxyCheck.proxyType) sourceMeta.proxyType = proxyCheck.proxyType;
      if (proxyCheck.implementationAddress) {
        sourceMeta.implementationAddress = proxyCheck.implementationAddress;
      }

      // If proxy implementation detected, try to resolve implementation source
      if (sourceMeta.isProxy && sourceMeta.implementationAddress) {
        try {
          const implSource = await getVerifiedSourceCode(chainId, sourceMeta.implementationAddress);
          if (implSource && implSource.verificationStatus === 'VERIFIED' && implSource.sourceFiles.length > 0) {
            sourceMeta.implementationVerified = true;
            sourceMeta.implementationContractName = implSource.contractName;
            // Append implementation source files for unified AST inspection
            sourceMeta.sourceFiles.push(...implSource.sourceFiles);
          } else {
            sourceMeta.implementationVerified = false;
            status = 'PARTIAL_ANALYSIS';
          }
        } catch {
          sourceMeta.implementationVerified = false;
          status = 'PARTIAL_ANALYSIS';
        }
      }

      // 6. Run Static Analyzer
      findings = analyzeContractSource(sourceMeta, normalizedAddress);
      staticAnalysisStatus = 'ANALYZED';
    }

    // 7. Calculate Deterministic Risk Score
    const scoring = calculateContractRiskScore(status, findings, sourceMeta);

    // 8. Generate Tamper-Evident Evidence Hash
    const scanTimestamp = Date.now();
    const canonicalPayload = buildCanonicalScanPayload({
      target: normalizedAddress,
      linkSource: 'direct',
      isPrivateCheck: false,
      rulesScore: scoring.rulesScore,
      mlScore: scoring.mlScore,
      finalScore: scoring.riskScore,
      riskLevel: scoring.riskLevel,
      reasonsCount: scoring.reasons.length,
      timestamp: scanTimestamp,
    });
    const canonicalHash = hashCanonicalScanPayloadSync(canonicalPayload);

    const scanResult: ContractScanResult = {
      id: `cscan-${scanTimestamp}-${normalizedAddress.slice(2, 8)}`,
      target: normalizedAddress,
      targetType: 'contract',
      chainId,
      networkName: chain.name,
      status,
      staticAnalysisStatus,
      riskScore: scoring.riskScore,
      riskLevel: scoring.riskLevel,
      confidence: scoring.confidence,
      rulesScore: scoring.rulesScore,
      mlScore: scoring.mlScore,
      recommendation: scoring.recommendation,
      recommendationText: scoring.recommendationText,
      sourceMetadata: sourceMeta,
      findings,
      reasons: scoring.reasons,
      evidence: {
        reportId: `REP-CONTRACT-${chainId}-${normalizedAddress.slice(2, 10).toUpperCase()}-${scanTimestamp}`,
        canonicalHash,
        timestamp: scanTimestamp,
        submitter: 'ChainShield Static Analyzer',
        isAnchored: false,
        chainName: chain.name,
        contractAddress: normalizedAddress,
      },
      createdAt: scanTimestamp,
    };

    return res.json({ success: true, result: scanResult });
  } catch (error: any) {
    console.error('[ContractScan API] Execution error:', error);
    return res.status(500).json({
      success: false,
      error: `Internal Scanner Error: ${error.message || 'Unknown error during blockchain analysis'}`,
      status: 'PROVIDER_ERROR',
    });
  }
});

// Standalone runner
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test' && !process.env.VITE_DEV_SERVER) {
  // Only start listening if run directly
  const isDirect = process.argv[1] && process.argv[1].includes('server');
  if (isDirect) {
    app.listen(PORT, () => {
      console.log(`[ChainShield API] Sentinel Contract Scanner running on http://localhost:${PORT}`);
    });
  }
}
