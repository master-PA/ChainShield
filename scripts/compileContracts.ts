import solc from 'solc';
import fs from 'fs';
import path from 'path';

function compileContract(sourcePath: string, contractName: string, outputPath: string) {
  const code = fs.readFileSync(sourcePath, 'utf8');
  const fileName = path.basename(sourcePath);

  const input = {
    language: 'Solidity',
    sources: {
      [fileName]: { content: code },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object', 'metadata'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    for (const error of output.errors) {
      if (error.severity === 'error') {
        throw new Error(`Solidity Compilation Error: ${error.formattedMessage}`);
      } else {
        console.warn(`[solc warning] ${error.formattedMessage}`);
      }
    }
  }

  const contractData = output.contracts[fileName][contractName];
  if (!contractData) {
    throw new Error(`Contract ${contractName} not found in compilation output`);
  }

  const artifact = {
    contractName,
    sourceName: fileName,
    abi: contractData.abi,
    bytecode: '0x' + contractData.evm.bytecode.object,
    metadata: contractData.metadata,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2), 'utf8');
  console.log(`✓ Compiled ${contractName} -> ${outputPath}`);
}

async function main() {
  console.log('=== Compiling ChainShield Solidity Contracts ===');
  compileContract(
    path.resolve(process.cwd(), 'contracts/ChainShieldUnsafeMintDemo.sol'),
    'ChainShieldUnsafeMintDemo',
    path.resolve(process.cwd(), 'src/contracts/ChainShieldUnsafeMintDemo.json')
  );
  compileContract(
    path.resolve(process.cwd(), 'contracts/EvidenceRegistry.sol'),
    'EvidenceRegistry',
    path.resolve(process.cwd(), 'src/contracts/EvidenceRegistry.json')
  );
  console.log('=== All Contracts Successfully Compiled ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
