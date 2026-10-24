import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment from .env.local first, falling back to .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('[DeployDemo] Loaded configuration from .env.local');
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('[DeployDemo] Loaded configuration from .env');
} else {
  dotenv.config();
}

import artifact from '../src/contracts/ChainShieldUnsafeMintDemo.json';

async function main() {
  console.log('=== ChainShield Sentinel: ChainShieldUnsafeMintDemo Sepolia Deployment ===\n');

  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.error('ERROR: Missing Deployer Private Key.');
    console.error('Please configure DEPLOYER_PRIVATE_KEY in .env.local (never commit this file to git).');
    process.exit(1);
  }

  const network = ethers.Network.from({ chainId: 11155111, name: 'sepolia' });
  const provider = new ethers.JsonRpcProvider(rpcUrl, network, { staticNetwork: network });
  console.log(`Targeting network: Sepolia (Chain ID: 11155111) via ${rpcUrl}`);

  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(formattedKey)) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY must be a valid 32-byte hex string (64 characters).');
    process.exit(1);
  }

  const wallet = new ethers.Wallet(formattedKey, provider);
  const deployerAddress = await wallet.getAddress();
  const balance = await provider.getBalance(deployerAddress);
  console.log(`Deployer address: ${deployerAddress}`);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error('ERROR: Deployer account has 0 Sepolia ETH. Obtain testnet ETH from a Sepolia faucet.');
    process.exit(1);
  }

  console.log('\nDeploying ChainShieldUnsafeMintDemo contract...');
  const initialSupply = ethers.parseUnits('1000000', 18); // 1,000,000 demo tokens
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(initialSupply);

  console.log(`Deployment transaction submitted: ${contract.deploymentTransaction()?.hash}`);
  console.log('Waiting for block confirmation...');
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait(1) : null;

  console.log('\n======================================================');
  console.log('SUCCESS: ChainShieldUnsafeMintDemo deployed to Sepolia!');
  console.log(`Contract Address : ${contractAddress}`);
  console.log(`Block Number     : ${receipt?.blockNumber ?? 'confirmed'}`);
  console.log(`Transaction Hash : ${deployTx?.hash}`);
  console.log(`Etherscan Link   : https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log('======================================================\n');
  console.log('Next step: Update your .env or .env.local with:');
  console.log(`VITE_SEPOLIA_DEMO_CONTRACT_ADDRESS="${contractAddress}"`);
  console.log(`SEPOLIA_DEMO_CONTRACT_ADDRESS="${contractAddress}"`);
}

main().catch((error) => {
  console.error('\nDeployment failed:', error);
  process.exit(1);
});
