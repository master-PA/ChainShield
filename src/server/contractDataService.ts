import { ethers } from 'ethers';
import { ContractSourceMetadata, ContractSourceFile } from '../types/security';

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcs: string[];
  explorerUrl: string;
}

export const ALLOWED_CHAINS: Record<number, ChainConfig> = {
  11155111: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcs: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      process.env.SEPOLIA_RPC_URL || '',
      process.env.VITE_SEPOLIA_RPC_URL || '',
      'https://sepolia.drpc.org',
    ].filter(Boolean),
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcs: [
      'https://ethereum-rpc.publicnode.com',
      process.env.MAINNET_RPC_URL || '',
      process.env.VITE_MAINNET_RPC_URL || '',
      'https://eth.drpc.org',
    ].filter(Boolean),
    explorerUrl: 'https://etherscan.io',
  },
};

const EIP1967_IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const EIP1967_BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';

export function getRpcProvider(chainId: number): ethers.JsonRpcProvider {
  const chain = ALLOWED_CHAINS[chainId];
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}. Allowed chains: Sepolia (11155111), Mainnet (1)`);
  }
  const primaryRpc = chain.rpcs[0] || 'https://ethereum-sepolia-rpc.publicnode.com';
  const network = ethers.Network.from({ chainId, name: chain.name });
  return new ethers.JsonRpcProvider(primaryRpc, network, { staticNetwork: network });
}

/**
 * Reads deployed runtime bytecode via eth_getCode with RPC fallback.
 */
export async function getDeployedBytecode(
  chainId: number,
  address: string
): Promise<{ bytecode: string; bytecodeSize: number; bytecodeHash: string; hasCode: boolean }> {
  const chain = ALLOWED_CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain ID: ${chainId}`);

  const normalizedAddress = normalizeContractAddress(address);
  let lastError: Error | null = null;

  for (const rpcUrl of chain.rpcs) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const network = ethers.Network.from({ chainId, name: chain.name });
      const provider = new ethers.JsonRpcProvider(rpcUrl, network, { staticNetwork: network });

      const code = await Promise.race([
        provider.getCode(normalizedAddress),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error(`RPC timeout for ${rpcUrl}`)), 8000)
        ),
      ]);

      clearTimeout(timeout);

      const hasCode = Boolean(code && code !== '0x' && code !== '0x0');
      const bytecodeSize = hasCode ? (code.length - 2) / 2 : 0;
      const bytecodeHash = hasCode ? ethers.keccak256(code) : '0x';

      return {
        bytecode: code || '0x',
        bytecodeSize,
        bytecodeHash,
        hasCode,
      };
    } catch (err) {
      lastError = err as Error;
      console.warn(`[Bytecode RPC] Warning from ${rpcUrl}:`, (err as Error).message);
    }
  }

  throw new Error(`Failed to retrieve bytecode from any RPC: ${lastError?.message || 'Unknown network error'}`);
}

/**
 * Checks for EIP-1967 proxy implementation slot using eth_getStorageAt.
 */
export async function checkProxyImplementation(
  chainId: number,
  address: string
): Promise<{ isProxy: boolean; proxyType?: 'EIP-1967' | 'Beacon'; implementationAddress?: string }> {
  const chain = ALLOWED_CHAINS[chainId];
  if (!chain) return { isProxy: false };

  const normalizedAddress = normalizeContractAddress(address);

  for (const rpcUrl of chain.rpcs) {
    try {
      const network = ethers.Network.from({ chainId, name: chain.name });
      const provider = new ethers.JsonRpcProvider(rpcUrl, network, { staticNetwork: network });

      const getStorageWithTimeout = (slot: string) =>
        Promise.race([
          provider.getStorage(normalizedAddress, slot),
          new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ]);

      const implRaw = await getStorageWithTimeout(EIP1967_IMPL_SLOT);
      if (implRaw && implRaw !== '0x' + '0'.repeat(64)) {
        const hexAddr = '0x' + implRaw.slice(-40);
        if (ethers.isAddress(hexAddr) && hexAddr !== ethers.ZeroAddress) {
          return {
            isProxy: true,
            proxyType: 'EIP-1967',
            implementationAddress: ethers.getAddress(hexAddr),
          };
        }
      }

      const beaconRaw = await getStorageWithTimeout(EIP1967_BEACON_SLOT);
      if (beaconRaw && beaconRaw !== '0x' + '0'.repeat(64)) {
        const hexAddr = '0x' + beaconRaw.slice(-40);
        if (ethers.isAddress(hexAddr) && hexAddr !== ethers.ZeroAddress) {
          return {
            isProxy: true,
            proxyType: 'Beacon',
            implementationAddress: ethers.getAddress(hexAddr),
          };
        }
      }

      return { isProxy: false };
    } catch {
      continue;
    }
  }

  return { isProxy: false };
}

import * as fs from 'fs';
import * as path from 'path';

/**
 * Normalizes any valid 40-hex Ethereum address into strict EIP-55 checksum format,
 * regardless of whether the caller supplied lowercase, uppercase, or mixed casing.
 */
export function normalizeContractAddress(address: string): string {
  const clean = (address || '').trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(clean)) {
    throw new Error(`Invalid Ethereum address format: ${address}. Must be 40 hexadecimal characters prefixed with 0x.`);
  }
  return ethers.getAddress(clean);
}

export interface ProviderFetchResult {
  metadata: ContractSourceMetadata | null;
  diagnostic: string;
  isError: boolean;
}

export interface GetSourceOptions {
  allowLocalFixture?: boolean;
}

/**
 * Provider A: Sourcify API v2 Verified Source Registry
 * Endpoint: GET https://sourcify.dev/server/v2/contract/{chainId}/{address}?fields=all
 */
export async function fetchFromSourcifyV2(
  chainId: number,
  address: string
): Promise<ProviderFetchResult> {
  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeContractAddress(address);
  } catch {
    return {
      metadata: null,
      diagnostic: `Sourcify v2: Invalid Ethereum address format (${address})`,
      isError: true,
    };
  }

  const url = `https://sourcify.dev/server/v2/contract/${chainId}/${normalizedAddress}?fields=all`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ChainShield-Sentinel/1.0',
      },
    });
    clearTimeout(timeout);

    // 404: Explicitly indicates contract is unverified in Sourcify registry (not a provider error)
    if (resp.status === 404) {
      let detail = 'Contract source code not verified in repository (HTTP 404)';
      try {
        const body = await resp.json();
        if (body && body.match === null) {
          detail = 'Contract source code not verified in Sourcify repository (HTTP 404 match: null)';
        }
      } catch {
        // Fall back to default detail string
      }
      return {
        metadata: null,
        diagnostic: `Sourcify v2: ${detail}`,
        isError: false,
      };
    }

    // 429: Rate limited
    if (resp.status === 429) {
      return {
        metadata: null,
        diagnostic: 'Sourcify v2: Rate limit exceeded (HTTP 429)',
        isError: true,
      };
    }

    // Other non-200 HTTP statuses
    if (!resp.ok) {
      return {
        metadata: null,
        diagnostic: `Sourcify v2: Provider error (HTTP ${resp.status} ${resp.statusText})`,
        isError: true,
      };
    }

    // Parse JSON
    let data: any;
    try {
      data = await resp.json();
    } catch {
      return {
        metadata: null,
        diagnostic: 'Sourcify v2: Malformed JSON response received from server',
        isError: true,
      };
    }

    if (!data || data.match === null) {
      return {
        metadata: null,
        diagnostic: 'Sourcify v2: Contract source code not verified in repository (match: null)',
        isError: false,
      };
    }

    const sourceFiles: ContractSourceFile[] = [];
    if (data.sources && typeof data.sources === 'object') {
      for (const [filePath, fileObj] of Object.entries(data.sources)) {
        const content =
          typeof fileObj === 'string'
            ? fileObj
            : (fileObj as any)?.content || '';
        if (content) {
          sourceFiles.push({ fileName: filePath, content });
        }
      }
    }

    if (sourceFiles.length === 0) {
      return {
        metadata: null,
        diagnostic: 'Sourcify v2: Verified contract record found but contains 0 source files',
        isError: false,
      };
    }

    const compilation = data.compilation || {};
    const contractName = compilation.name || 'Contract';
    const compilerVersion = compilation.compilerVersion || 'unknown';
    const optimizer = compilation.compilerSettings?.optimizer;
    const optimizationUsed = Boolean(optimizer?.enabled);
    const runs = optimizer?.runs !== undefined ? Number(optimizer.runs) : undefined;
    const matchType = data.match || data.runtimeMatch || data.creationMatch || 'match';
    const verificationStatus = matchType === 'partial' ? 'PARTIAL' : 'VERIFIED';

    return {
      metadata: {
        sourceProvider: 'sourcify',
        verificationStatus,
        contractName,
        compilerVersion,
        optimizationUsed,
        runs,
        isProxy: false,
        sourceFiles,
        bytecodeSize: 0,
        bytecodeHash: '',
        matchType,
        retrievalDiagnostic: `Sourcify v2: Verified source code successfully retrieved (${sourceFiles.length} file(s), match: ${matchType})`,
      },
      diagnostic: `Sourcify v2: Verified source code successfully retrieved (${sourceFiles.length} file(s), match: ${matchType})`,
      isError: false,
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError' || err?.message?.toLowerCase().includes('timeout');
    const msg = isTimeout ? 'Request timed out after 8000ms' : err?.message || 'Network error';
    return {
      metadata: null,
      diagnostic: `Sourcify v2: Provider error (${msg})`,
      isError: true,
    };
  }
}

/**
 * Provider B: Etherscan API V2 Fallback
 * Endpoint: https://api.etherscan.io/v2/api?chainid={chainId}&module=contract&action=getsourcecode&address={address}&apikey={apiKey}
 */
export async function fetchFromEtherscanV2(
  chainId: number,
  address: string
): Promise<ProviderFetchResult> {
  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeContractAddress(address);
  } catch {
    return {
      metadata: null,
      diagnostic: `Etherscan v2: Invalid Ethereum address format (${address})`,
      isError: true,
    };
  }

  const apiKey = (process.env.ETHERSCAN_API_KEY || '').trim();
  if (!apiKey) {
    return {
      metadata: null,
      diagnostic: 'Etherscan v2: Backend ETHERSCAN_API_KEY not configured',
      isError: false,
    };
  }

  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${normalizedAddress}&apikey=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ChainShield-Sentinel/1.0',
      },
    });
    clearTimeout(timeout);

    if (resp.status === 429) {
      return {
        metadata: null,
        diagnostic: 'Etherscan v2: Rate limit exceeded (HTTP 429)',
        isError: true,
      };
    }

    if (!resp.ok) {
      return {
        metadata: null,
        diagnostic: `Etherscan v2: HTTP error ${resp.status} ${resp.statusText}`,
        isError: true,
      };
    }

    let data: any;
    try {
      data = await resp.json();
    } catch {
      return {
        metadata: null,
        diagnostic: 'Etherscan v2: Malformed JSON response received from server',
        isError: true,
      };
    }

    if (data.status === '0') {
      const resMsg = typeof data.result === 'string' ? data.result : data.message || 'Lookup rejected';
      const lower = resMsg.toLowerCase();
      if (lower.includes('missing/invalid api key') || lower.includes('invalid api key')) {
        return {
          metadata: null,
          diagnostic: 'Etherscan v2: Provider rejected request (Invalid API key)',
          isError: true,
        };
      }
      if (lower.includes('rate limit')) {
        return {
          metadata: null,
          diagnostic: 'Etherscan v2: Rate limit reached',
          isError: true,
        };
      }
      return {
        metadata: null,
        diagnostic: `Etherscan v2: ${resMsg}`,
        isError: true,
      };
    }

    if (data.status === '1' && Array.isArray(data.result) && data.result.length > 0) {
      const item = data.result[0];
      const sourceCodeRaw = item.SourceCode;

      if (!sourceCodeRaw || item.ABI === 'Contract source code not verified') {
        return {
          metadata: null,
          diagnostic: 'Etherscan v2: Contract source code not verified in explorer',
          isError: false,
        };
      }

      const sourceFiles: ContractSourceFile[] = [];
      const contractName = item.ContractName || 'Contract';
      const compilerVersion = item.CompilerVersion || 'unknown';
      const optimizationUsed = item.OptimizationUsed === '1';
      const runs = item.Runs ? parseInt(item.Runs, 10) : undefined;

      // Check if standard multi-file JSON input
      if (typeof sourceCodeRaw === 'string' && sourceCodeRaw.startsWith('{')) {
        let cleanJson = sourceCodeRaw;
        if (cleanJson.startsWith('{{') && cleanJson.endsWith('}}')) {
          cleanJson = cleanJson.slice(1, -1);
        }

        try {
          const parsed = JSON.parse(cleanJson);
          const sources = parsed.sources || parsed;
          for (const [filePath, fileObj] of Object.entries(sources)) {
            const content = (fileObj as any)?.content || (typeof fileObj === 'string' ? fileObj : '');
            if (content) {
              sourceFiles.push({ fileName: filePath, content });
            }
          }
        } catch {
          // If parse fails, treat as single file
          sourceFiles.push({ fileName: `${contractName}.sol`, content: sourceCodeRaw });
        }
      } else if (typeof sourceCodeRaw === 'string' && sourceCodeRaw.trim()) {
        sourceFiles.push({ fileName: `${contractName}.sol`, content: sourceCodeRaw });
      }

      if (sourceFiles.length === 0) {
        return {
          metadata: null,
          diagnostic: 'Etherscan v2: Contract verified record contained no valid source files',
          isError: false,
        };
      }

      let implementationAddress: string | undefined;
      if (item.Implementation && /^0x[0-9a-fA-F]{40}$/.test(item.Implementation.trim())) {
        try {
          const normImpl = normalizeContractAddress(item.Implementation);
          if (normImpl !== ethers.ZeroAddress) {
            implementationAddress = normImpl;
          }
        } catch {
          // ignore invalid implementation
        }
      }

      return {
        metadata: {
          sourceProvider: 'etherscan-v2',
          verificationStatus: 'VERIFIED',
          contractName,
          compilerVersion,
          optimizationUsed,
          runs,
          isProxy: Boolean(item.Proxy === '1'),
          implementationAddress,
          sourceFiles,
          bytecodeSize: 0,
          bytecodeHash: '',
          retrievalDiagnostic: `Etherscan v2: Verified source code successfully retrieved (${sourceFiles.length} file(s))`,
        },
        diagnostic: `Etherscan v2: Verified source code successfully retrieved (${sourceFiles.length} file(s))`,
        isError: false,
      };
    }

    return {
      metadata: null,
      diagnostic: 'Etherscan v2: Contract source code not verified',
      isError: false,
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError' || err?.message?.toLowerCase().includes('timeout');
    const msg = isTimeout ? 'Request timed out after 8000ms' : err?.message || 'Network error';
    return {
      metadata: null,
      diagnostic: `Etherscan v2: Provider error (${msg})`,
      isError: true,
    };
  }
}

/**
 * Local Fixture Provider for UnsafeMintDemo & Test Artifacts
 * ONLY invoked when options.allowLocalFixture is explicitly enabled (e.g. automated tests or test fixtures).
 */
export function fetchFromLocalDemo(
  chainId: number,
  address: string
): ContractSourceMetadata | null {
  const demoAddress = process.env.SEPOLIA_DEMO_CONTRACT_ADDRESS || process.env.VITE_SEPOLIA_DEMO_CONTRACT_ADDRESS;
  if (!demoAddress) return null;
  try {
    const normDemo = normalizeContractAddress(demoAddress);
    const normTarget = normalizeContractAddress(address);
    if (normTarget === normDemo) {
      const solPath = path.resolve(process.cwd(), 'contracts/ChainShieldUnsafeMintDemo.sol');
      if (fs.existsSync(solPath)) {
        const content = fs.readFileSync(solPath, 'utf8');
        return {
          sourceProvider: 'local',
          verificationStatus: 'VERIFIED',
          contractName: 'ChainShieldUnsafeMintDemo',
          compilerVersion: '0.8.20',
          optimizationUsed: true,
          runs: 200,
          isProxy: false,
          sourceFiles: [{ fileName: 'ChainShieldUnsafeMintDemo.sol', content }],
          bytecodeSize: 0,
          bytecodeHash: '',
          retrievalDiagnostic: 'Local fixture: Loaded from contracts/ChainShieldUnsafeMintDemo.sol',
        };
      }
    }
  } catch {
    // Fall through
  }
  return null;
}

/**
 * Main Source Code Provider abstraction with multi-provider fallback.
 * Live contract scans query real external providers (Sourcify v2, then Etherscan v2).
 * Local demo fixtures are NEVER silently substituted during live scans unless explicitly enabled via options.
 */
export async function getVerifiedSourceCode(
  chainId: number,
  address: string,
  options?: GetSourceOptions
): Promise<ContractSourceMetadata> {
  let normalizedAddress: string;
  try {
    normalizedAddress = normalizeContractAddress(address);
  } catch (err: any) {
    return {
      sourceProvider: 'none',
      verificationStatus: 'UNVERIFIED',
      contractName: 'Invalid Address',
      compilerVersion: 'unknown',
      optimizationUsed: false,
      isProxy: false,
      sourceFiles: [],
      bytecodeSize: 0,
      bytecodeHash: '',
      retrievalDiagnostic: err.message,
      diagnostics: {
        sourcify: err.message,
        etherscan: err.message,
      },
    };
  }

  // 1. Explicit local fixture ONLY when allowLocalFixture is explicitly true
  if (options?.allowLocalFixture) {
    const localMatch = fetchFromLocalDemo(chainId, normalizedAddress);
    if (localMatch) {
      localMatch.retrievalDiagnostic = 'Local fixture: Loaded from contracts/ChainShieldUnsafeMintDemo.sol (explicit fixture mode)';
      localMatch.diagnostics = {
        sourcify: 'Skipped (explicit local fixture mode)',
        etherscan: 'Skipped (explicit local fixture mode)',
      };
      return localMatch;
    }
  }

  // 2. Primary Provider: Sourcify API v2
  const sourcifyResult = await fetchFromSourcifyV2(chainId, normalizedAddress);
  if (sourcifyResult.metadata) {
    sourcifyResult.metadata.diagnostics = {
      sourcify: sourcifyResult.diagnostic,
      etherscan: 'Skipped (Sourcify v2 verified match retrieved)',
    };
    return sourcifyResult.metadata;
  }

  // 3. Fallback Provider: Etherscan API V2
  const etherscanResult = await fetchFromEtherscanV2(chainId, normalizedAddress);
  if (etherscanResult.metadata) {
    etherscanResult.metadata.diagnostics = {
      sourcify: sourcifyResult.diagnostic,
      etherscan: etherscanResult.diagnostic,
    };
    return etherscanResult.metadata;
  }

  // 4. Neither provider has verified source - return clean UNVERIFIED metadata with diagnostics
  const combinedDiagnostic = `${sourcifyResult.diagnostic}; ${etherscanResult.diagnostic}`;
  return {
    sourceProvider: 'none',
    verificationStatus: 'UNVERIFIED',
    contractName: 'Unverified Contract',
    compilerVersion: 'unknown',
    optimizationUsed: false,
    isProxy: false,
    sourceFiles: [],
    bytecodeSize: 0,
    bytecodeHash: '',
    retrievalDiagnostic: combinedDiagnostic,
    diagnostics: {
      sourcify: sourcifyResult.diagnostic,
      etherscan: etherscanResult.diagnostic,
    },
  };
}
