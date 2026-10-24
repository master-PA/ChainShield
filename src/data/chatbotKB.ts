export interface KBEntry {
  id: string;
  category: string;
  canonicalQuestion: string;
  answer: string;
  answerHinglish?: string;
  trainingPhrases: string[];
  relatedIds: string[];
  action?: {
    label: string;
    route: string;
    type: 'internal_link' | 'scan_action';
  };
}

export const CHATBOT_KNOWLEDGE_BASE: KBEntry[] = [
  {
    id: 'kb-what-is-chainshield',
    category: 'Platform Overview',
    canonicalQuestion: 'What does ChainShield Sentinel do?',
    answer:
      'ChainShield Sentinel evaluates Web3 websites, calldata, and messages BEFORE you connect your wallet or confirm a transaction. It provides an explainable 0-100 risk score, plain-language intent decoding, simulation preview, claim-vs-reality verification, and tamper-evident cryptographic evidence.',
    answerHinglish:
      'ChainShield Sentinel aapke wallet connect karne ya transaction sign karne se pehle websites, calldata aur messages ko verify karta hai. Yeh 0-100 ka risk score, exact plain-language explanation, simulation aur Sepolia testnet par proof deta hai.',
    trainingPhrases: [
      'what is chainshield',
      'how does sentinel work',
      'kya karta hai chainshield',
      'what is this tool',
      'pre-transaction security overview',
      'why should i use chainshield',
      'sentinel features',
      'how does it protect my wallet',
    ],
    relatedIds: ['kb-risk-scoring', 'kb-claim-vs-reality', 'kb-private-check'],
    action: {
      label: 'Open Scanner',
      route: '/scanner',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-risk-scoring',
    category: 'Platform Scoring',
    canonicalQuestion: 'How is the 0-100 risk score calculated?',
    answer:
      'The risk score is computed deterministically using 60% rule-based indicators and 40% calibrated supervised machine learning (RandomForest). Scores range from LOW (0-24), CAUTION (25-49), HIGH (50-74), to CRITICAL (75-100). Any verified drainer kit or known threat feed match automatically forces at least HIGH risk.',
    answerHinglish:
      'Risk score 60% rule-based checks aur 40% supervised machine learning se calculate hota hai. Score 4 levels mein divided hai: LOW (0-24), CAUTION (25-49), HIGH (50-74), aur CRITICAL (75-100). Agar drainer kit mil jaye toh directly HIGH ya CRITICAL score assign hota hai.',
    trainingPhrases: [
      'how is risk score calculated',
      'score formula',
      'risk levels explanation',
      'score kaise calculate hota hai',
      'what does critical mean',
      'explain the scoring methodology',
      'rules vs ml weights',
      'points contribution',
    ],
    relatedIds: ['kb-what-is-chainshield', 'kb-counterfactual'],
    action: {
      label: 'Inspect ML Models',
      route: '/dashboard#models',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-claim-vs-reality',
    category: 'Security Engine',
    canonicalQuestion: 'What is Claim-vs-Reality checking?',
    answer:
      'Claim-vs-Reality compares the visible text on a webpage or button (e.g. "Claim free NFT" or "Verify wallet") against the actual calldata in the transaction payload. If the button promises a free mint but the transaction executes setApprovalForAll or an unlimited token approval, Sentinel flags an Intent Mismatch (e.g. 96/100).',
    answerHinglish:
      'Claim-vs-Reality check website ke button text (jaise "Claim free NFT") aur actual smart contract code ko compare karta hai. Agar button free mint bol raha hai lekin transaction aapke saare NFTs transfer karne ka permission maang raha hai, toh yeh warning trigger karta hai.',
    trainingPhrases: [
      'what is claim vs reality',
      'how does mismatch detection work',
      'intent mismatch',
      'page says claim free nft',
      'claim vs reality kya hota hai',
      'button claim bol raha hai par tx kuch aur hai',
      'intent analyzer explanation',
      'detecting misleading web3 buttons',
    ],
    relatedIds: ['kb-approvals-explanation', 'kb-drainers'],
    action: {
      label: 'Test Rohit Worked Example',
      route: '/scanner?target=https%3A%2F%2Fmintzone-nft.xyz',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-approvals-explanation',
    category: 'Wallet Security',
    canonicalQuestion: 'What is a token approval and why is unlimited approval dangerous?',
    answer:
      'A token approval grants a third-party smart contract permission to spend ERC-20 tokens or transfer NFTs from your wallet. Unlimited approvals (2^256-1) allow that contract or its owner to drain your balance at any time in the future, even if you never visit the dApp again.',
    answerHinglish:
      'Token approval se smart contract ko aapke tokens ya NFTs transfer karne ki permission milti hai. Unlimited approval dene se contract ke paas permanent access rehta hai, aur agar wo contract hack ho gaya toh aapka wallet kabhi bhi empty ho sakta hai.',
    trainingPhrases: [
      'what is token approval',
      'why is unlimited approval dangerous',
      'what is setapprovalforall',
      'token approval kya hai',
      'unlimited approval se kya hota hai',
      'erc20 approve function',
      'how do drainers steal with approvals',
      'should i give unlimited allowance',
    ],
    relatedIds: ['kb-how-to-revoke', 'kb-permit-signatures'],
    action: {
      label: 'Check Wallet Approvals',
      route: '/wallet-health',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-how-to-revoke',
    category: 'Wallet Security',
    canonicalQuestion: 'How do I revoke risky approvals?',
    answer:
      'Open the Wallet Health page in ChainShield Sentinel and enter your public address. Review all existing token and NFT allowances, unverified spenders, and proxy upgrades. Click the "Revoke" button next to any flagged approval to generate a zero-allowance transaction that you can sign using your own wallet.',
    answerHinglish:
      'ChainShield Sentinel ke Wallet Health page par jaakar apna public wallet address enter karein. Jo approvals risky ya unverified hain unke saamne "Revoke" button dabayein. Yeh zero-allowance transaction build karega jise aap apne wallet se sign karke access revoke kar sakte hain.',
    trainingPhrases: [
      'how to revoke approval',
      'revoke dangerous contracts',
      'how do i cancel token permission',
      'approval revoke kaise kare',
      'revoke button in sentinel',
      'remove allowance',
      'revoke tool',
      'cancel setapprovalforall',
    ],
    relatedIds: ['kb-approvals-explanation', 'kb-wallet-health-score'],
    action: {
      label: 'Open Wallet Health',
      route: '/wallet-health',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-permit-signatures',
    category: 'Signature Security',
    canonicalQuestion: 'What is an EIP-2612 Permit or Permit2 signature?',
    answer:
      'A Permit signature is an off-chain cryptographic signature (EIP-712) that authorizes token spending without costing you gas. Because it does not create a visible on-chain transaction immediately, drainers often trick users into signing gasless permits that relayers then execute to siphon funds.',
    answerHinglish:
      'Permit signature ek off-chain EIP-712 signature hota hai jisme bina gas fee ke token approval de diya jata hai. Drainers iska misuse karte hain kyunki user ko lagta hai ki koi transaction nahi ho rahi, jabki wo token access sign kar dete hain.',
    trainingPhrases: [
      'what is permit signature',
      'what is eip-2612',
      'what is permit2',
      'permit signature kya hota hai',
      'gasless approval risk',
      'typed data signature scam',
      'why did my wallet prompt sign message',
      'offline signature danger',
    ],
    relatedIds: ['kb-approvals-explanation', 'kb-drainers'],
  },
  {
    id: 'kb-drainers',
    category: 'Threat Intelligence',
    canonicalQuestion: 'What are Web3 drainer kits and how do they operate?',
    answer:
      'Drainer kits (such as Inferno, Angel, and Pink Drainer) are turn-key malicious software packages deployed on phishing websites. Once connected, they inspect your wallet balances and automatically prompt for blanket approvals (setApprovalForAll), Permit signatures, or Create2 bypass contracts to drain high-value assets.',
    answerHinglish:
      'Drainer kits malicious software packages hote hain (jaise Inferno ya Angel Drainer) jo fake websites par lagaye jaate hain. Ye aapka wallet balance check karke turant blanket approval ya permit signatures maangte hain taaki aapke valuable tokens aur NFTs chura sakein.',
    trainingPhrases: [
      'what is a drainer kit',
      'inferno drainer explanation',
      'angel drainer',
      'drainer kaise kaam karta hai',
      'how do drainers work',
      'web3 drainer families',
      'malicious drainer signatures',
      'anti-drainer protection',
    ],
    relatedIds: ['kb-claim-vs-reality', 'kb-drainer-library'],
    action: {
      label: 'View Drainer Kits Library',
      route: '/drainer-kits',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-drainer-library',
    category: 'Threat Intelligence',
    canonicalQuestion: 'Where can I see known drainer kit fingerprints?',
    answer:
      'Navigate to the Drainer Kits page in Sentinel. Our database tracks defensive fingerprints, MinHash code shingle signatures, attack vectors, and weekly detection counts for known families like Inferno, Angel, Pink, MS, Monkey, and Venom without hosting any exploit code.',
    answerHinglish:
      'Sentinel ke Drainer Kits page par aap known drainers ke defensive fingerprints, attack vectors aur detection stats dekh sakte hain. Isme koi offensive code nahi hota, sirf defensive signatures hoti hain.',
    trainingPhrases: [
      'where is drainer library',
      'view known kits',
      'drainer kits page',
      'kit fingerprints',
      'defensive signatures database',
    ],
    relatedIds: ['kb-drainers'],
    action: {
      label: 'Explore Drainer Kits',
      route: '/drainer-kits',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-upgrade-tripwire',
    category: 'Monitoring & Alerts',
    canonicalQuestion: 'What is Upgrade Tripwire and how does it protect me?',
    answer:
      'Upgrade Tripwire monitors EIP-1967 and UUPS proxy contracts that your wallet has previously approved. If an admin upgrades the underlying implementation address to new or unverified code, Sentinel detects the storage slot change and fires an immediate alert so you can revoke before funds are compromised.',
    answerHinglish:
      'Upgrade Tripwire un proxy contracts ko track karta hai jinhe aapne pehle approval diya hua hai. Agar unka implementation address badalta hai ya unverified bytecode lagaya jata hai, toh Sentinel turant alert bhejta hai taaki aap revoke kar sakein.',
    trainingPhrases: [
      'what is upgrade tripwire',
      'proxy implementation change',
      'eip-1967 proxy risk',
      'upgrade tripwire kya hai',
      'priya proxy alert',
      'contract upgrade alert',
      'how does tripwire detect malicious logic',
    ],
    relatedIds: ['kb-how-to-revoke', 'kb-alerts-overview'],
    action: {
      label: 'View Active Alerts',
      route: '/alerts',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-address-poisoning',
    category: 'Wallet Security',
    canonicalQuestion: 'What is address poisoning and how do I avoid it?',
    answer:
      'Address poisoning is an attack where a scammer sends you a 0-value transaction from an address that has the exact same beginning (e.g. 0x71C8...) and end (e.g. ...84e81) as someone you frequently transact with. Never copy recipient addresses from your transaction history; always verify the middle characters or use address books.',
    answerHinglish:
      'Address poisoning mein attacker ek 0 ETH ki transaction bhejta hai jiska address aapke regular contact ke starting aur ending characters se match karta hai. Kabhi bhi transaction history se address copy na karein, pura address check karein.',
    trainingPhrases: [
      'what is address poisoning',
      'vanity address scam',
      'address poisoning se kaise bache',
      'why did i receive 0 eth from similar address',
      'copy paste address trick',
      'poisoning alert',
    ],
    relatedIds: ['kb-alerts-overview'],
  },
  {
    id: 'kb-private-check',
    category: 'Privacy',
    canonicalQuestion: 'How does Privacy-Preserving Check work?',
    answer:
      'When "Private check" is enabled in Sentinel, the full target URL never leaves your browser. The client normalizes the hostname, calculates its SHA-256 hash, and transmits only the first 8 hex characters (32 bits) to the server. The server responds with matching blocklist prefixes, and exact hash matching occurs entirely inside your browser.',
    answerHinglish:
      'Private check mode mein pura URL server par nahi jata. Browser hostname ka SHA-256 hash nikaalkar sirf pehle 8 characters bhejta hai. Server match hone wale records bhejta hai aur exact comparison aapke local browser mein hota hai.',
    trainingPhrases: [
      'how does private check work',
      'privacy preserving scan',
      'k-anonymity host check',
      'hash prefix check',
      'private check kya hai',
      'does sentinel track my visited urls',
      'zero knowledge target check',
    ],
    relatedIds: ['kb-what-is-chainshield'],
    action: {
      label: 'Try Private Check in Scanner',
      route: '/scanner',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-evidence-anchoring',
    category: 'Cryptographic Proof',
    canonicalQuestion: 'How does evidence hashing and Sepolia anchoring work?',
    answer:
      'When a target or transaction is analyzed, Sentinel serializes the scan findings into deterministic canonical JSON (sorted keys, no whitespace) and computes its SHA-256 hash. This hash is anchored on the Ethereum Sepolia EvidenceRegistry contract. Anyone can recompute the hash on the Verify page to prove the report has never been altered.',
    answerHinglish:
      'Scan result ko canonical JSON mein serialize karke uska SHA-256 hash nikala jata hai aur Sepolia testnet par EvidenceRegistry contract mein anchor kiya jata hai. Verify page par koi bhi hash re-check karke proof verify kar sakta hai.',
    trainingPhrases: [
      'how does evidence anchoring work',
      'sepolia evidence registry',
      'canonical json hashing',
      'evidence proof verification',
      'verify page explanation',
      'tamper evident reports',
      'proof on blockchain',
    ],
    relatedIds: ['kb-what-is-chainshield'],
    action: {
      label: 'Verify Evidence on Sepolia',
      route: '/verify',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-seed-phrases',
    category: 'Fundamental Rules',
    canonicalQuestion: 'Will Sentinel or any legitimate dApp ever ask for my seed phrase?',
    answer:
      'NO. NEVER. Neither ChainShield Sentinel, MetaMask, WalletConnect, nor any legitimate support team will ever ask for your 12 or 24-word recovery seed phrase or private keys. Any website, message, or bot requesting your seed phrase is 100% a theft attempt.',
    answerHinglish:
      'KABHI NAHI! ChainShield Sentinel ya koi bhi legitimate Web3 app ya support aapse 12 ya 24 words ki seed phrase ya private key kabhi nahi maangta. Jo bhi seed phrase maange wo 100% scam hai.',
    trainingPhrases: [
      'will you ask for seed phrase',
      'can i share my 12 words',
      'support agent asked for recovery phrase',
      'seed phrase dena chahiye kya',
      'is it safe to enter seed phrase into dApp',
      'private key request',
    ],
    relatedIds: ['kb-what-is-chainshield'],
  },
  {
    id: 'kb-counterfactual',
    category: 'Security Engine',
    canonicalQuestion: 'What is a Counterfactual Explanation and "Safer Approval"?',
    answer:
      'Counterfactual analysis recalculates the risk score by altering dangerous transaction parameters—such as reducing an unlimited allowance down to the exact amount needed for a trade. Sentinel presents a "Safer Approval" calldata payload that caps your exposure, reducing risk from CRITICAL (e.g. 82) down to CAUTION (e.g. 31).',
    answerHinglish:
      'Counterfactual explanation batata hai ki transaction mein kya badal kar risk kam kiya ja sakta hai. Jaise unlimited approval ko 100 tokens tak restrict karne se risk score 82 se ghatkar 31 ho jata hai.',
    trainingPhrases: [
      'what is counterfactual explanation',
      'what if analysis',
      'safer approval builder',
      'how to lower my risk score',
      'counterfactual kya hota hai',
      'capped approval calldata',
    ],
    relatedIds: ['kb-risk-scoring', 'kb-approvals-explanation'],
  },
  {
    id: 'kb-sandbox',
    category: 'Security Engine',
    canonicalQuestion: 'How does the Burner-Wallet Sandbox work?',
    answer:
      'The Burner Sandbox loads the suspicious target inside an isolated headless browser environment with an injected mock EIP-1193 provider using an empty burner address. It logs every RPC call (such as eth_requestAccounts or instant eth_sendTransaction prompts) without ever exposing real private keys or executing live transactions.',
    answerHinglish:
      'Burner sandbox website ko ek isolated environment mein dummy wallet ke sath test karta hai. Website jo bhi prompt ya transaction maangti hai, sandbox usko log karta hai bina kisi real token ya private key ke risk ke.',
    trainingPhrases: [
      'how does burner sandbox work',
      'sandbox runner explanation',
      'mock provider eip-1193',
      'sandbox kya karta hai',
      'isolated testing of dapps',
    ],
    relatedIds: ['kb-drainers', 'kb-claim-vs-reality'],
    action: {
      label: 'Open Sandbox in Scanner',
      route: '/scanner?tab=sandbox',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-extension',
    category: 'Browser Extension',
    canonicalQuestion: 'How does the ChainShield Chrome Extension protect me?',
    answer:
      'The ChainShield Manifest V3 Chrome Extension injects a lightweight wrapper around window.ethereum. When a dApp triggers eth_sendTransaction, setApprovalForAll, or eth_signTypedData_v4, Sentinel intercepts the call, scans it via the API, and displays a pre-sign modal with the 0-100 score, plain intent, and an Avoid button before your wallet popup appears.',
    answerHinglish:
      'ChainShield Chrome Extension window.ethereum ko intercept karta hai. Jab koi site transaction ya signature maangti hai, extension pehle score aur plain explanation dikhata hai. Agar site scam hai toh "Avoid" dabakar transaction block kar sakte hain.',
    trainingPhrases: [
      'how does chrome extension work',
      'manifest v3 extension',
      'intercept window.ethereum',
      'extension kya karta hai',
      'pre-sign overlay',
      'browser extension setup',
    ],
    relatedIds: ['kb-what-is-chainshield'],
    action: {
      label: 'View Extension Guide',
      route: '/extension',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-community-staking',
    category: 'Community Intelligence',
    canonicalQuestion: 'How does Community Intelligence and Reporter Staking work?',
    answer:
      'Community members submit threat reports with optional Sepolia ETH staking via ReporterStaking.sol. Reports are validated by community consensus and authorized resolvers. Accurate reports earn reputation and returned stake, while malicious false reports are slashed, preventing spam.',
    answerHinglish:
      'Users scam websites aur contracts ke reports submit kar sakte hain aur Sepolia testnet par stake kar sakte hain. Sahi report hone par reputation badhti hai aur stake wapas milta hai, jabki galat report par stake slash hota hai.',
    trainingPhrases: [
      'how does community staking work',
      'reporter staking contract',
      'community reports reputation',
      'staking kaise kaam karti hai',
      'community intelligence page',
    ],
    relatedIds: ['kb-evidence-anchoring'],
    action: {
      label: 'Go to Community Intelligence',
      route: '/community',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-financial-advice-scope',
    category: 'Scope & Safety',
    canonicalQuestion: 'Can you tell me if ETH or Bitcoin will go up?',
    answer:
      'No. ChainShield Sentinel strictly evaluates pre-transaction technical security, smart contract vulnerabilities, and phishing indicators. We do not provide financial advice, price predictions, or investment recommendations.',
    answerHinglish:
      'Nahi. ChainShield Sentinel sirf technical security aur scam detection provide karta hai. Hum kisi bhi token ka price prediction ya financial advice nahi dete.',
    trainingPhrases: [
      'should i buy bitcoin',
      'eth price prediction',
      'will solana go up',
      'crypto investment tip',
      'paisa lagau ya nahi',
      'best token to buy today',
    ],
    relatedIds: ['kb-what-is-chainshield'],
  },
  {
    id: 'kb-alerts-overview',
    category: 'Monitoring & Alerts',
    canonicalQuestion: 'How do alerts and notifications work in Sentinel?',
    answer:
      'Sentinel monitors active proxy contracts and counterparties for registered wallets. When an Upgrade Tripwire or Address Poisoning anomaly is detected, alerts appear in the in-app notification center and can be dispatched via Webhook, Email, or Telegram bots.',
    answerHinglish:
      'Sentinel aapke watched wallets ko 24/7 monitor karta hai. Agar koi proxy upgrade ya suspicious counterparty milti hai toh turant in-app aur notification channels par alert bhejta hai.',
    trainingPhrases: [
      'how do alerts work',
      'configure telegram alerts',
      'notification channels',
      'alerts setup',
      'tripwire notifications',
    ],
    relatedIds: ['kb-upgrade-tripwire', 'kb-address-poisoning'],
    action: {
      label: 'Configure Alerts',
      route: '/alerts',
      type: 'internal_link',
    },
  },
  {
    id: 'kb-wallet-health-score',
    category: 'Wallet Security',
    canonicalQuestion: 'What does the Wallet Health Score (0-100) measure?',
    answer:
      'The Wallet Health Score evaluates the safety posture of an address based on total active allowances, ratio of unlimited approvals, exposure to unverified spender contracts, approval age, and past interactions with flagged contracts. 100 represents a pristine, minimal-risk configuration.',
    answerHinglish:
      'Wallet Health Score aapke address ke active approvals, unverified contracts aur purani permissions ko evaluate karta hai. Score 100 ka matlab hai ki wallet me koi unnecessary ya dangerous approvals active nahi hain.',
    trainingPhrases: [
      'what is wallet health score',
      'health score kaise calculate hota hai',
      'improve wallet health',
      'wallet audit score',
      'stale approvals count',
    ],
    relatedIds: ['kb-approvals-explanation', 'kb-how-to-revoke'],
    action: {
      label: 'Inspect Wallet Health',
      route: '/wallet-health',
      type: 'internal_link',
    },
  },
];
