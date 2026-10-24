import { ethers } from 'ethers';
import artifact from '../contracts/EvidenceRegistry.json';

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';
export const DEFAULT_SEPOLIA_RPC = 'https://rpc.sepolia.org';

export interface BlockchainConfig {
  rpcUrl: string;
  contractAddress: string;
  chainId: number;
  networkName: string;
  isConfigured: boolean;
}

export interface OnChainEvidenceRecord {
  reportId: string;
  evidenceHash: string;
  timestamp: number;
  submitter: string;
  blockNumber: number;
  contractAddress: string;
  network: string;
  txHash?: string;
}

export type OnChainStatus =
  | 'UNCONFIGURED'
  | 'NOT_ANCHORED'
  | 'ANCHORED'
  | 'RPC_ERROR';

export interface OnChainVerificationResult {
  status: OnChainStatus;
  evidence?: OnChainEvidenceRecord;
  error?: string;
  network: string;
  contractAddress?: string;
  isMatch?: boolean;
}

export interface AnchorSubmissionResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  submitter?: string;
  contractAddress?: string;
  network?: string;
  error?: string;
}

/**
 * Reads blockchain configuration from environment variables safely.
 * Works in both browser (Vite import.meta.env) and Node (process.env) contexts.
 */
export function getBlockchainConfig(): BlockchainConfig {
  let rpcUrl = '';
  let contractAddress = '';

  // 1. Vite environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    rpcUrl = (import.meta.env.VITE_SEPOLIA_RPC_URL as string) || '';
    contractAddress = (import.meta.env.VITE_EVIDENCE_REGISTRY_ADDRESS as string) || '';
  }

  // 2. Node/test process.env fallback
  if (typeof process !== 'undefined' && process.env) {
    if (!rpcUrl) {
      rpcUrl = process.env.VITE_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL || '';
    }
    if (!contractAddress) {
      contractAddress =
        process.env.VITE_EVIDENCE_REGISTRY_ADDRESS || process.env.EVIDENCE_REGISTRY_ADDRESS || '';
    }
  }

  // Clean values
  rpcUrl = rpcUrl.trim() || DEFAULT_SEPOLIA_RPC;
  contractAddress = contractAddress.trim();

  const isAddressValid = ethers.isAddress(contractAddress);

  return {
    rpcUrl,
    contractAddress: isAddressValid ? contractAddress : '',
    chainId: SEPOLIA_CHAIN_ID,
    networkName: 'Ethereum Sepolia Testnet',
    isConfigured: isAddressValid,
  };
}

/**
 * Formats low-level ethers or RPC errors into human-readable diagnostics.
 */
export function formatRpcError(err: unknown): string {
  if (!err) return 'Unknown RPC error';
  const errObj = err as Record<string, unknown>;

  if (typeof errObj.message === 'string') {
    const msg = errObj.message;
    if (msg.includes('user rejected') || errObj.code === 4001 || errObj.code === 'ACTION_REJECTED') {
      return 'User rejected the transaction in wallet.';
    }
    if (msg.includes('EvidenceAlreadyRegistered')) {
      return 'This report ID is already anchored on-chain in EvidenceRegistry. Re-anchoring with the same ID is not permitted.';
    }
    if (msg.includes('EmptyReportId')) {
      return 'Report ID cannot be empty.';
    }
    if (msg.includes('InvalidEvidenceHash')) {
      return 'Evidence hash cannot be zero.';
    }
    if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
      return 'Insufficient Sepolia ETH in wallet to pay gas fees.';
    }
    if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
      return 'Sepolia RPC rate limit exceeded. Please configure a custom RPC URL in .env.';
    }
    if (msg.includes('could not detect network') || msg.includes('ECONNREFUSED')) {
      return 'Unable to connect to Sepolia RPC endpoint. Check your internet connection or RPC URL.';
    }
    if (msg.includes('BAD_DATA') || msg.includes('CALL_EXCEPTION')) {
      return 'Contract call reverted or contract not deployed at the configured address.';
    }
    return msg.slice(0, 160);
  }

  return String(err).slice(0, 160);
}

/**
 * Queries real on-chain evidence from the deployed EvidenceRegistry smart contract.
 * Never fabricates responses. Returns clear status if unconfigured, not anchored, or on RPC failure.
 */
export async function queryOnChainEvidence(
  reportId: string,
  customConfig?: Partial<BlockchainConfig>,
  customContractRunner?: ethers.ContractRunner
): Promise<OnChainVerificationResult> {
  const config = { ...getBlockchainConfig(), ...customConfig };

  if (!config.isConfigured || !config.contractAddress) {
    return {
      status: 'UNCONFIGURED',
      network: config.networkName,
      error: 'EvidenceRegistry contract address is not configured. Set VITE_EVIDENCE_REGISTRY_ADDRESS to query live on-chain data.',
    };
  }

  try {
    let runner: ethers.ContractRunner;
    if (customContractRunner) {
      runner = customContractRunner;
    } else {
      const network = ethers.Network.from({
        chainId: config.chainId,
        name: 'sepolia',
      });
      runner = new ethers.JsonRpcProvider(config.rpcUrl, network, {
        staticNetwork: network,
      });
    }

    const contract = new ethers.Contract(config.contractAddress, artifact.abi, runner);

    // Call getEvidence(string) view function
    const result = await contract.getEvidence(reportId);
    const [rawHash, rawTimestamp, rawSubmitter, rawBlockNumber] = result;

    const evidenceHash = String(rawHash).toLowerCase();

    // Check if report is registered (bytes32(0) means unanchored)
    const isZeroHash =
      !evidenceHash ||
      evidenceHash === ethers.ZeroHash.toLowerCase() ||
      evidenceHash === '0x' + '00'.repeat(32);

    if (isZeroHash) {
      return {
        status: 'NOT_ANCHORED',
        network: config.networkName,
        contractAddress: config.contractAddress,
      };
    }

    const record: OnChainEvidenceRecord = {
      reportId,
      evidenceHash,
      timestamp: Number(rawTimestamp) * 1000,
      submitter: String(rawSubmitter),
      blockNumber: Number(rawBlockNumber),
      contractAddress: config.contractAddress,
      network: config.networkName,
    };

    return {
      status: 'ANCHORED',
      evidence: record,
      network: config.networkName,
      contractAddress: config.contractAddress,
    };
  } catch (err) {
    return {
      status: 'RPC_ERROR',
      error: formatRpcError(err),
      network: config.networkName,
      contractAddress: config.contractAddress,
    };
  }
}

/**
 * Submits an evidence hash to the live Sepolia EvidenceRegistry contract via user's Web3 wallet.
 */
export async function anchorEvidenceWithWallet(
  reportId: string,
  evidenceHash: string,
  customConfig?: Partial<BlockchainConfig>
): Promise<AnchorSubmissionResult> {
  const config = { ...getBlockchainConfig(), ...customConfig };

  if (!config.isConfigured || !config.contractAddress) {
    return {
      success: false,
      error: 'EvidenceRegistry contract address is not configured. Set VITE_EVIDENCE_REGISTRY_ADDRESS in .env.',
    };
  }

  if (typeof window === 'undefined' || !(window as unknown as { ethereum?: unknown }).ethereum) {
    return {
      success: false,
      error: 'No Web3 wallet (such as MetaMask) detected. Please install a Web3 wallet extension.',
    };
  }

  try {
    const ethereum = (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum;
    const provider = new ethers.BrowserProvider(ethereum);

    // Ensure wallet is on Sepolia testnet
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
        });
      } catch (switchError: unknown) {
        return {
          success: false,
          error: 'Please switch your wallet network to Ethereum Sepolia Testnet.',
        };
      }
    }

    const signer = await provider.getSigner();
    const submitter = await signer.getAddress();

    const contract = new ethers.Contract(config.contractAddress, artifact.abi, signer);

    // Submit transaction
    const tx = await contract.anchorEvidence(reportId, evidenceHash);
    const receipt = await tx.wait(1);

    if (!receipt || receipt.status !== 1) {
      return {
        success: false,
        error: 'On-chain transaction execution failed or reverted.',
        txHash: tx.hash,
      };
    }

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      submitter,
      contractAddress: config.contractAddress,
      network: config.networkName,
    };
  } catch (err) {
    return {
      success: false,
      error: formatRpcError(err),
    };
  }
}
