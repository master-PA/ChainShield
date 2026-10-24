# ChainShield Sentinel: Evidence-Based Web3 Security Scanner

ChainShield Sentinel is a real-time, evidence-based pre-transaction security scanner and smart-contract vulnerability analyzer for Web3. It replaces mock responses and seeded simulations with live on-chain bytecode inspection, official explorer source retrieval, AST-based static vulnerability analysis, and reproducible cryptographic evidence anchoring.

---

## Real-World Smart Contract Scanning Workflow

```
┌─────────────────────────┐
│ User enters Contract    │
│ Address & Selects Chain │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Runtime Bytecode Query (`eth_getCode`)                   │
│    • Queries allowlisted JSON-RPC provider                  │
│    • Validates deployed bytecode; detects EOAs (0 bytes)    │
│    • Computes Keccak-256 bytecode hash                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. EIP-1967 Proxy Resolution (`eth_getStorageAt`)           │
│    • Checks slot 0x360894... and beacon slot                │
│    • Resolves underlying implementation address             │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Verified Source Retrieval (Multi-Provider Abstraction)   │
│    • Primary: Etherscan API V2 (`chainid`, `getsourcecode`) │
│    • Alternative / Fallback: Sourcify IPFS / HTTP registry  │
│    • Distinguishes VERIFIED, UNVERIFIED, and PARTIAL source │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Dedicated Static Source Code Analysis Engine             │
│    • `@solidity-parser/parser` AST inspection               │
│    • Inheritance graph & modifier resolution                │
│    • Rules A - F: Unrestricted mint, ownership, calls,      │
│      tx.origin auth, selfdestruct, proxy delegation         │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Deterministic, Explainable Risk Scorer                   │
│    • Non-double-counting rule aggregation                   │
│    • Documented severity weights: CRITICAL (80), HIGH (25)  │
│    • Score states: ANALYZED, UNVERIFIED_SOURCE, NO_CODE     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Cryptographic Evidence Anchoring                         │
│    • Canonical RFC-8785 JSON serialization & SHA-256 hash   │
│    • Tamper-evident anchoring to Sepolia EvidenceRegistry   │
└─────────────────────────────────────────────────────────────┘
```

---

## Vulnerability Detection Rules

| Rule ID | Name | Severity | Detection Scope |
| :--- | :--- | :--- | :--- |
| `RULE-MINT-UNRESTRICTED` | **Unrestricted Token Minting** | `CRITICAL` | Detects `public`/`external` `mint()` functions lacking `onlyOwner`, `onlyRole`, or caller checks. Confirms arbitrary accounts can inflate total supply. |
| `RULE-MINT-PUBLIC-PAYABLE` | **Public Paid Minting** | `LOW` | Identifies public payable mints with explicit `msg.value` checks and supply caps. |
| `RULE-OWNERSHIP-UNPROTECTED` | **Unprotected Privilege Management** | `CRITICAL` | Detects public ownership reassignment (`transferOwnership`, `grantRole`, `setOwner`) without authorization guards. |
| `RULE-DELEGATECALL-DANGEROUS` | **Dangerous Delegatecall** | `HIGH` / `CAUTION` | Flags `delegatecall` where execution target or calldata can be controlled by callers, risking storage collision. |
| `RULE-UNCHECKED-LOWLEVEL-CALL` | **Unchecked Low-Level Call** | `CAUTION` | Identifies `.call{...}("")` where boolean return value is ignored. |
| `RULE-TX-ORIGIN-AUTH` | **Phishing `tx.origin` Authorization** | `HIGH` | Detects `tx.origin == owner` checks vulnerable to contract call-forwarding phishing. |
| `RULE-MISSING-ACCESS-CONTROL` | **Missing Administrative Access Control** | `HIGH` | Flags sensitive administrative mutators (`pause`, `setFeeRecipient`, `withdrawAll`) lacking caller validation. |
| `RULE-SELFDESTRUCT` | **Destructive Operation** | `CRITICAL` / `HIGH` | Detects `selfdestruct` / `suicide`. Informs of post-Cancun / EIP-6780 EVM semantics where bytecode deletion only occurs in the creation transaction. |
| `RULE-PROXY-IMPLEMENTATION` | **Proxy Implementation Awareness** | `INFO` / `CAUTION` | Checks EIP-1967 implementation slot `0x360894...`, reports proxy vs. implementation address, and warns if implementation source is unverified. |

---

## Deterministic Scoring System

Risk scores (0 – 100) are computed strictly from verified findings and data provenance:

- **Score >= 75**: `CRITICAL` (Recommendation: `AVOID`) — Severe vulnerabilities detected (unrestricted minting or ownership hijack).
- **Score >= 50**: `HIGH` (Recommendation: `AVOID`) — High-severity issues or unverified contract bytecode.
- **Score >= 25**: `CAUTION` (Recommendation: `PROCEED_WITH_CAUTION`) — Moderate risk patterns, low-level calls, or unverified proxy components.
- **Score < 25**: `LOW` (Recommendation: `SAFE_TO_PROCEED`) — Verified contract passing all static security checks.

### Analysis Status States

- `ANALYZED`: Bytecode and verified source retrieved and analyzed with full AST coverage.
- `PARTIAL_ANALYSIS`: Proxy wrapper analyzed, but underlying implementation is unverified.
- `UNVERIFIED_SOURCE`: Bytecode is deployed on-chain, but no verified source is published. Receives cautionary score of 55 (`HIGH`), never marked `SAFE`.
- `NO_CONTRACT_CODE`: Target address has 0 bytes of runtime bytecode (EOA or undeployed).
- `PROVIDER_ERROR`: JSON-RPC or explorer API timed out or unreachable. Labelled inconclusive.

---

## Environment Configuration

Configure `.env.local` in the project root (never committed to git):

```bash
# Etherscan API V2 Key for verified contract source fetching (Backend only)
ETHERSCAN_API_KEY="YOUR_ETHERSCAN_API_KEY"

# JSON-RPC Provider Endpoints
SEPOLIA_RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
MAINNET_RPC_URL="https://ethereum-rpc.publicnode.com"

# Evidence Registry Contract Address on Sepolia (Optional, for on-chain anchoring)
VITE_EVIDENCE_REGISTRY_ADDRESS="0x..."

# Sepolia Demo Contract Address (Optional, for 1-click UI preset filling)
VITE_SEPOLIA_DEMO_CONTRACT_ADDRESS="0x..."
SEPOLIA_DEMO_CONTRACT_ADDRESS="0x..."

# Deployer Private Key (Optional, for deploying test contracts)
# DEPLOYER_PRIVATE_KEY="0x..."
```

---

## Development & Test Commands

```bash
# Install dependencies
npm install

# Run automated test suite (Evidence Hashing, Scan Storage, Anchoring, Contract Analyzer)
npm test

# Run TypeScript type check
npm run lint

# Compile Solidity contracts to JSON artifacts
npm run compile:contracts

# Start development server (serves frontend & /api/v1/contract-scans on port 3000)
npm run dev

# Run standalone backend server (port 3001)
npm run server

# Build Manifest V3 browser extension for Edge and Chrome
npm run build:extension

# Build production bundle
npm run build
```

---

## Browser Extension: Edge & Chrome Installation (Manifest V3)

ChainShield Sentinel includes a production-ready **Manifest V3 Browser Extension** that runs in Microsoft Edge and Google Chrome. It actively guards users as they browse Web3 websites and dApps by:
- Intercepting `window.ethereum.request`, `ethereum.send`, and `ethereum.sendAsync` directly in the page's MAIN world before transaction/signature requests reach the wallet.
- Intercepting all major wallet methods:
  - `eth_sendTransaction`: Evaluates calldata selectors (`approve`, `setApprovalForAll`, `transfer`, `transferFrom`, `permit`), token transfer targets, transaction value, and unlimited allowances (`2^256-1`).
  - `personal_sign` / `eth_sign`: Decodes hex-encoded UTF-8 plaintext messages and inspects them for wallet drainer triggers, fake ownership claims, or seed/credential solicitations.
  - `eth_signTypedData_v4` / `v3`: Decodes EIP-712 structured data for gasless approvals (`Permit`, `PermitSingle`, `PermitBatch`, Uniswap Permit2, Seaport orders) and flags unlimited authorizations.
- Rendering an isolated, tamper-proof **Closed Shadow DOM** pre-sign modal (`attachShadow({ mode: 'closed' })`) displaying decoded intent, method badge, claim-vs-reality mismatch alerts, and risk scores.
- Providing explicit **Cancel & Block** (rejects with standard EIP-1193 user rejection code `4001` without invoking the underlying wallet) and **Proceed to Wallet** (forwards the exact, unmodified request byte-for-byte to the wallet).
- Enforcing a strict **Zero Silent Broadcast** guarantee: the extension never approves, signs, or broadcasts any transaction automatically.
- Automatically analyzing visited page URLs, evaluating homoglyphs, typosquatting, and drainer kit signatures, and displaying live risk badges (`SAFE`, `WARN`, `DANGER` or numerical score) on the extension icon.
- Providing an action popup and full options page with configurable API base URL (`http://localhost:3000` / `http://localhost:3001`), whitelist management, and JSON audit log export.

### 1. Build the Extension Artifacts

Run the automated esbuild bundler:
```bash
npm run build:extension
```
This compiles all 5 TypeScript bundles (`dist/background.js`, `dist/contentScript.js`, `dist/inpage.js`, `dist/popup.js`, `dist/options.js`) and generates compliant 16x16, 48x48, and 128x128 PNG icons directly into the `extension/` directory.

### 2. Install in Microsoft Edge
1. Open Microsoft Edge and navigate to `edge://extensions`.
2. Toggle on the **Developer mode** switch in the bottom left of the sidebar.
3. Click the **Load unpacked** button at the top of the page.
4. Select the extension directory:
   ```
   c:\Users\Lenovo\Documents\IITG\New folder\chainshield\extension
   ```
5. ChainShield Sentinel will appear in your installed extensions list. Pin it to your toolbar for quick access to the risk gauge and threat feed.

### 3. Install in Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension/` directory in this repository:
   ```
   c:\Users\Lenovo\Documents\IITG\New folder\chainshield\extension
   ```
5. The extension will be installed immediately. Pin it to your toolbar.

---

## Reproducible Local Test dApp & Pre-Sign Interception Verification

A dedicated standalone test dApp is included at `test-dapp/index.html` and served by the dev server at:
```
http://localhost:3000/test-dapp.html
```

The test dApp provides 5 interactive test scenarios designed for reproducible security auditing **without requiring gas, testnet tokens, or actual transaction broadcasts**:

1. **Harmless Test Transaction (`eth_sendTransaction`)**:
   - Triggers a safe 0 ETH transfer (`data: '0x'`, `value: '0x0'`).
   - ChainShield inspects the payload, flags it as **LOW (Score: 10)**, and presents the pre-sign modal.
   - **Cancel Path:** User clicks *"🛑 Cancel & Block Request"*. The request is aborted immediately with EIP-1193 rejection error `code: 4001`. The underlying wallet is **never invoked**.
   - **Proceed Path:** User clicks *"Proceed to Wallet"*. The extension forwards the exact, unmodified transaction parameters to the underlying wallet.
2. **Simulated Unlimited Token Allowance Phish (`eth_sendTransaction`)**:
   - Page button claims *"Claim 5,000 Free Airdrop Tokens"*.
   - Underlying calldata invokes `approve(spender, 2^256-1)` (`0x095ea7b3`).
   - ChainShield detects the **CRITICAL Claim-vs-Reality Mismatch (Score: 100)** and warns that an unlimited allowance is being requested under the guise of an airdrop claim.
3. **Blanket NFT Operator Approval (`eth_sendTransaction`)**:
   - Page button claims *"Claim Free Whitelist NFT"*.
   - Underlying calldata invokes `setApprovalForAll(attacker, true)` (`0xa2205344`).
   - ChainShield flags the severe mismatch and warns that all collection NFTs are at risk of being drained.
4. **Off-Chain Gasless Permit Phishing (`eth_signTypedData_v4`)**:
   - Requests an EIP-712 / EIP-2612 gasless `Permit` signature with `value: 2^256-1`.
   - ChainShield parses the typed data struct, extracts the verifying contract, spender address, and unlimited value, and displays a **CRITICAL (Score: 86)** gasless drain warning.
5. **Suspicious Plaintext Signature (`personal_sign`)**:
   - Requests a hex-encoded plaintext signature containing drainer verification wording (*"I agree to grant access to claim airdrop and approve all balance withdrawals"*).
   - ChainShield decodes the hex payload to plaintext UTF-8, flags the malicious keyword triggers, and presents the decoded text in the modal.

### Testing Without an Installed Wallet Extension
The test dApp includes a built-in mock EIP-1193 wallet fallback. If no external wallet (MetaMask, Rabby, Coinbase) is installed, the test dApp automatically initializes a mock provider at `window.ethereum` and logs all intercepted/received calls in a live on-page terminal:
- Confirms whether requests reached the underlying wallet.
- Verifies that Cancel completely prevents requests from reaching the wallet.
- Verifies that Proceed forwards exact unmodified parameters.

### Browser-Specific Architecture & Limitations

| Architectural Consideration | Microsoft Edge & Google Chrome (Manifest V3) | Technical Guarantee & Fallback |
| :--- | :--- | :--- |
| **MAIN World Interception** | Declared in `manifest.json` under `content_scripts` with `"world": "MAIN"` and `"run_at": "document_start"`. | Supported natively in Edge 111+ and Chrome 111+. Allows `dist/inpage.js` to execute synchronously before dApp scripts. In older environments, `dist/contentScript.js` falls back to dynamic `<script>` tag injection into the DOM head. |
| **Multi-Provider Aggregation** | Modern wallets often inject into `window.ethereum.providers` (array of coexisting providers for MetaMask, Rabby, Coinbase Wallet, etc.). | `inpage.ts` iterates across `provider.providers` if present, wrapping `.request`, `.send`, and `.sendAsync` on all detected providers simultaneously. |
| **EIP-6963 Provider Discovery** | dApps and modern wallets announce providers via `window.dispatchEvent(new CustomEvent('eip6963:announceProvider', ...))` | `inpage.ts` listens for `eip6963:announceProvider` and `ethereum#initialized` events, automatically wrapping newly announced provider instances. |
| **Closed Shadow DOM Isolation** | `host.attachShadow({ mode: 'closed' })` ensures `host.shadowRoot === null` to host page scripts. | Prevents malicious dApp scripts from programmatically hiding the warning modal, overriding CSS styles, or dispatching synthetic click events to bypass user approval. |
| **Zero Silent Broadcast** | The extension never calls `sign`, `sendRawTransaction`, or any broadcast method. | The extension acts strictly as an inspection and gatekeeping proxy. It either returns code `4001` or delegates to the underlying wallet for real user signature. |

---

## Live Acceptance Procedure: Sepolia `ChainShieldUnsafeMintDemo`

1. **Deploy or Configure Demo Contract on Sepolia**:
   - To deploy a fresh instance of `ChainShieldUnsafeMintDemo.sol` to Sepolia:
     ```bash
     npm run deploy:demo
     ```
   - Copy the deployed address and set it in `.env.local`:
     ```bash
     VITE_SEPOLIA_DEMO_CONTRACT_ADDRESS="0xYourDeployedAddress"
     SEPOLIA_DEMO_CONTRACT_ADDRESS="0xYourDeployedAddress"
     ```
2. **Launch Scanner**:
   - Start the app with `npm run dev` and navigate to `http://localhost:3000`.
   - Click on the **Smart Contract** tab in the Pre-Transaction Scanner.
   - Click the preset **🔥 UnsafeMintDemo (Sepolia)** or paste the address.
   - Click **Scan Contract**.
3. **Verify Results**:
   - The scanner retrieves live bytecode via RPC and verified source.
   - Rule `RULE-MINT-UNRESTRICTED` is detected with **CRITICAL** severity.
   - Explains that `mint(address,uint256)` lacks access control, allowing any caller to arbitrarily increase token supply.
   - Line numbers and source code excerpts are displayed directly from the contract.
   - Deterministic risk score computes to **80/100 (`CRITICAL`)** with verdict **`AVOID`**.
