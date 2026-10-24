import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment from .env.local first (secure local config), falling back to .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('[Deploy] Loaded configuration from .env.local');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('[Deploy] Loaded configuration from .env');
} else {
  dotenv.config();
}

import artifact from '../src/contracts/EvidenceRegistry.json';

async function main() {
  console.log('=== ChainShield Sentinel: EvidenceRegistry Sepolia Deployment ===\n');

  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.VITE_SEPOLIA_RPC_URL;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!rpcUrl) {
    console.error('ERROR: Missing RPC URL. Please set SEPOLIA_RPC_URL in .env.local');
    process.exit(1);
  }

  if (!privateKey) {
    console.error('ERROR: Missing Deployer Private Key.');
    console.error('Please configure DEPLOYER_PRIVATE_KEY in .env.local (never commit this file to git).');
    process.exit(1);
  }

  // Connect to Sepolia testnet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

  if (Number(network.chainId) !== 11155111) {
    console.warn(`WARNING: Target chain ID is ${network.chainId}, expected 11155111 (Sepolia).`);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const deployerAddress = await wallet.getAddress();
  const balance = await provider.getBalance(deployerAddress);
  console.log(`Deployer address: ${deployerAddress}`);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error('ERROR: Deployer account has 0 Sepolia ETH. Obtain testnet ETH from a Sepolia faucet.');
    process.exit(1);
  }

  console.log('\nDeploying EvidenceRegistry contract...');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();

  console.log(`Deployment transaction submitted: ${contract.deploymentTransaction()?.hash}`);
  console.log('Waiting for block confirmation...');
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait(1) : null;

  console.log('\n======================================================');
  console.log('SUCCESS: EvidenceRegistry deployed to Sepolia!');
  console.log(`Contract Address : ${contractAddress}`);
  console.log(`Block Number     : ${receipt?.blockNumber ?? 'confirmed'}`);
  console.log(`Transaction Hash : ${deployTx?.hash}`);
  console.log(`Etherscan Link   : https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log('======================================================\n');
  console.log('Next step: Update your .env or .env.local with:');
  console.log(`VITE_EVIDENCE_REGISTRY_ADDRESS="${contractAddress}"`);
}

main().catch((error) => {
  console.error('\nDeployment failed:', error);
  process.exit(1);
});
