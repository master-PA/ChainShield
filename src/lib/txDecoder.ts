import { IntentSummary } from '../types/security';

const UNLIMITED_THRESHOLD = BigInt('0x8000000000000000000000000000000000000000000000000000000000000000');

export function cleanHex(input: string): string {
  let hex = input.trim();
  if (hex.startsWith('0x') || hex.startsWith('0X')) {
    hex = hex.slice(2);
  }
  return hex;
}

export function parseAddressFrom32Bytes(chunk: string): string {
  const clean = chunk.replace(/^0+/, '');
  return '0x' + clean.padStart(40, '0').toLowerCase();
}

export function decodeTransactionCalldata(calldata: string, contractAddress?: string): IntentSummary {
  const hex = cleanHex(calldata);
  if (hex.length < 8) {
    return {
      actionType: 'unknown',
      plainEnglish: 'Low-level transaction with empty or unrecognized calldata.',
      plainHinglish: 'Unrecognized transaction calldata. Isme koi standard function match nahi hua.',
      plainSimple: 'This action is sending unknown data to a smart contract.',
      targetSpender: contractAddress || '0x0000000000000000000000000000000000000000',
      assetName: 'ETH / Unknown Token',
      amountOrScope: '0 or Native Value',
      isUnlimited: false,
      contractVerified: false,
    };
  }

  const selector = '0x' + hex.slice(0, 8).toLowerCase();
  const params = hex.slice(8);

  // 1. approve(address spender, uint256 amount) - selector 0x095ea7b3
  if (selector === '0x095ea7b3' && params.length >= 128) {
    const spenderChunk = params.slice(0, 64);
    const amountChunk = params.slice(64, 128);
    const spender = parseAddressFrom32Bytes(spenderChunk);
    const amountBig = BigInt('0x' + (amountChunk || '0'));
    const isUnlimited = amountBig >= UNLIMITED_THRESHOLD;

    const amountFormatted = isUnlimited
      ? 'UNLIMITED (Maximum Allowance)'
      : (Number(amountBig) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' Tokens';

    return {
      actionType: 'approve',
      plainEnglish: isUnlimited
        ? `Authorizes spender ${spender.slice(0, 6)}...${spender.slice(-4)} to withdraw an UNLIMITED balance of your tokens.`
        : `Authorizes spender ${spender.slice(0, 6)}...${spender.slice(-4)} to spend up to ${amountFormatted}.`,
      plainHinglish: isUnlimited
        ? `Spender ${spender.slice(0, 6)}...${spender.slice(-4)} ko aapke wallet se UNLIMITED tokens nikalne ki permanent permission de raha hai.`
        : `Spender ${spender.slice(0, 6)}...${spender.slice(-4)} ko maximum ${amountFormatted} spend karne ki limited permission de raha hai.`,
      plainSimple: isUnlimited
        ? 'WARNING: You are allowing this smart contract to drain ALL tokens of this type at any time.'
        : `You are approving this app to spend up to ${amountFormatted}.`,
      targetSpender: spender,
      spenderLabel: spender === '0x7a250d5630b4cf539739df2c5dacb4c659f2488d' ? 'Uniswap V2 Router' : 'External Spender',
      assetName: 'ERC-20 Token Allowance',
      amountOrScope: amountFormatted,
      isUnlimited,
      contractVerified: false,
    };
  }

  // 2. setApprovalForAll(address operator, bool approved) - selector 0xa2205344
  if (selector === '0xa2205344' && params.length >= 128) {
    const operatorChunk = params.slice(0, 64);
    const approvedChunk = params.slice(64, 128);
    const operator = parseAddressFrom32Bytes(operatorChunk);
    const approved = BigInt('0x' + (approvedChunk || '0')) !== 0n;

    return {
      actionType: 'setApprovalForAll',
      plainEnglish: approved
        ? `Grants operator ${operator.slice(0, 6)}...${operator.slice(-4)} BLANKET PERMISSION to transfer and manage ALL your NFTs in this collection.`
        : `Revokes blanket NFT operator permission from ${operator.slice(0, 6)}...${operator.slice(-4)}.`,
      plainHinglish: approved
        ? `Operator ${operator.slice(0, 6)}...${operator.slice(-4)} ko is collection ke SAARE NFTs transfer karne ki full blanket permission de raha hai.`
        : `Operator ${operator.slice(0, 6)}...${operator.slice(-4)} se blanket NFT permission revoke kar raha hai.`,
      plainSimple: approved
        ? 'DANGER: You are giving away full ownership access to ALL NFTs in your wallet for this collection.'
        : 'You are disabling operator access for this contract.',
      targetSpender: operator,
      spenderLabel: 'NFT Operator / Drainer',
      assetName: 'All ERC-721 / ERC-1155 Collection NFTs',
      amountOrScope: approved ? 'ALL NFTs (Blanket Access)' : 'REVOKED (false)',
      isUnlimited: approved,
      contractVerified: false,
    };
  }

  // 3. transfer(address to, uint256 amount) - selector 0xa9059cbb
  if (selector === '0xa9059cbb' && params.length >= 128) {
    const toChunk = params.slice(0, 64);
    const amountChunk = params.slice(64, 128);
    const recipient = parseAddressFrom32Bytes(toChunk);
    const amountBig = BigInt('0x' + (amountChunk || '0'));
    const amountStr = (Number(amountBig) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' Tokens';

    return {
      actionType: 'transfer',
      plainEnglish: `Transfers ${amountStr} directly to recipient address ${recipient.slice(0, 6)}...${recipient.slice(-4)}.`,
      plainHinglish: `${amountStr} directly recipient ${recipient.slice(0, 6)}...${recipient.slice(-4)} ke address par send kar raha hai.`,
      plainSimple: `You are sending ${amountStr} to ${recipient.slice(0, 6)}...${recipient.slice(-4)}.`,
      targetSpender: recipient,
      spenderLabel: 'Direct Recipient',
      assetName: 'ERC-20 Token Transfer',
      amountOrScope: amountStr,
      isUnlimited: false,
      contractVerified: false,
    };
  }

  // 4. transferFrom(address from, address to, uint256 amount) - selector 0x23b87266
  if (selector === '0x23b87266' && params.length >= 192) {
    const from = parseAddressFrom32Bytes(params.slice(0, 64));
    const to = parseAddressFrom32Bytes(params.slice(64, 128));
    return {
      actionType: 'transferFrom',
      plainEnglish: `Executes delegated transfer of assets from ${from.slice(0, 6)}... to ${to.slice(0, 6)}...`,
      plainHinglish: `${from.slice(0, 6)}... se tokens lekar ${to.slice(0, 6)}... ko transfer karne ki request execute kar raha hai.`,
      plainSimple: 'A third party contract is moving assets on your behalf using a prior approval.',
      targetSpender: to,
      spenderLabel: 'Transfer Recipient',
      assetName: 'ERC-20 / ERC-721 Asset',
      amountOrScope: 'Delegated Transfer',
      isUnlimited: false,
      contractVerified: false,
    };
  }

  // 5. permit (EIP-2612) - selector 0xd505accf
  if (selector === '0xd505accf') {
    return {
      actionType: 'permit',
      plainEnglish: 'Signs a gasless EIP-2612 Permit giving a spender off-chain authorization to execute token transfers.',
      plainHinglish: 'Off-chain gasless Permit sign kar raha hai jo spender ko baad me tokens transfer karne ka right deta hai.',
      plainSimple: 'You are signing a digital permission slip that lets someone spend your tokens without you paying gas.',
      targetSpender: contractAddress || '0x0000000000000000000000000000000000000000',
      spenderLabel: 'Permit Spender',
      assetName: 'ERC-20 Gasless Permit',
      amountOrScope: 'Off-chain Signature Authorization',
      isUnlimited: true,
      contractVerified: false,
    };
  }

  // Fallback for general contract execution
  return {
    actionType: 'contract_call',
    plainEnglish: `Calling method selector ${selector} on target smart contract.`,
    plainHinglish: `Contract par method ${selector} call kar raha hai.`,
    plainSimple: 'Executing a specific smart contract function.',
    targetSpender: contractAddress || '0x0000000000000000000000000000000000000000',
    spenderLabel: 'Target Contract',
    assetName: 'Smart Contract State',
    amountOrScope: 'Function Execution',
    isUnlimited: false,
    contractVerified: false,
  };
}
