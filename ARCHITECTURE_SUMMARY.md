# ChainShield Sentinel — Architecture Summary & Pre-Sign Interception Audit

## Executive Summary

ChainShield Sentinel is a production-grade Web3 security extension built under Chrome/Edge Manifest V3. It intercepts wallet requests originated by decentralized applications (dApps) directly at the EIP-1193 JavaScript provider boundary before they reach the user's wallet (e.g. MetaMask, Rabby, Coinbase Wallet). It enforces a deterministic, evidence-based security gate (`ALLOW`, `WARN`, `BLOCK`), decodes transaction calldata and typed signatures, and guarantees zero silent broadcasts.

---

## 1. Request Lifecycle Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                      dApp Execution Context                                        |
|  (app.uniswap.org / opensea.io / test-dapp)                                                        |
|                                                                                                    |
|  [dApp JS Action] ---> window.ethereum.request({ method, params })                                 |
+---------------------------------------------------|------------------------------------------------+
                                                    |
                                                    v
+----------------------------------------------------------------------------------------------------+
|  MAIN World In-Page Interceptor (inpage.ts)                                                        |
|  1. Intercepts EIP-1193 provider request / send / sendAsync                                       |
|  2. Validates Ethereum address parameters (42-char checksummed hex)                                |
|  3. Enforces RequestQueueManager (concurrency lock, deduplication, double-click protection)        |
|  4. Posts CHAINSHIELD_INPAGE_REQUEST via window.postMessage                                        |
+---------------------------------------------------|------------------------------------------------+
                                                    | (window.postMessage)
                                                    v
+----------------------------------------------------------------------------------------------------+
|  ISOLATED World Content Script (contentScript.ts)                                                  |
|  1. Receives CHAINSHIELD_INPAGE_REQUEST, extracts origin & active DOM metadata                     |
|  2. Evaluates Central Security Gate via ScannerBridge (rulesEngine, mlEngine, txDecoder)           |
|  3. Determines outcome:                                                                           |
|     - ALLOW: Immediate bypass -> returns PROCEED to inpage.js -> forwarded to wallet              |
|     - WARN: Renders isolated Shadow DOM Pre-Sign Security Gate modal (overlay.ts)                  |
|     - BLOCK: Immediately halts with EIP-1193 code 4001, logs threat event                          |
+---------------------------------------------------|------------------------------------------------+
                                                    | (Shadow DOM User Interaction)
                         +--------------------------+--------------------------+
                         | (User clicks Cancel)                                | (User clicks Proceed)
                         v                                                     v
+--------------------------------------------------+  +--------------------------------------------------+
|  Cancel Action:                                  |  |  Proceed Action:                                 |
|  1. Content script sends BLOCK decision to inpage|  |  1. Content script sends PROCEED to inpage.js    |
|  2. In-page wrapper rejects Promise with 4001    |  |  2. In-page wrapper forwards exact original args |
|  3. Request NEVER reaches wallet provider        |  |  3. Calls originalRequest.apply(callerContext)   |
|  4. Releases request queue lock                  |  |  4. Opens wallet confirmation popup exactly once |
+--------------------------------------------------+  +--------------------------------------------------+
```

---

## 2. Component Audits

### 2.1 Manifest V3 Configuration & Host Permissions (`manifest.json`)
- **Manifest Version:** 3 (`"manifest_version": 3`).
- **Permissions:** `storage`, `activeTab`, `tabs`.
- **Host Permissions:** `http://*/*`, `https://*/*` (enables real-time site inspection across all Web3 dApps including Uniswap and OpenSea).
- **Execution Worlds:**
  - `dist/inpage.js` runs in `"world": "MAIN"`, `"run_at": "document_start"`, directly wrapping `window.ethereum` before dApps mount.
  - `dist/contentScript.js` runs in `"world": "ISOLATED"`, `"run_at": "document_start"`, isolating security logic, storage access, and shadow DOM from malicious page scripts.
- **Web Accessible Resources:** `dist/inpage.js` and `icons/*` are exposed to `<all_urls>` to support programmatic injection fallbacks.

### 2.2 In-Page EIP-1193 Provider Interceptor (`inpage.ts`)
- Wraps `window.ethereum.request`, `window.ethereum.sendAsync`, and `window.ethereum.send`.
- Observes `Object.defineProperty(window, 'ethereum', ...)` to capture delayed provider injections.
- Listens to EIP-6963 provider announcements (`eip6963:announceProvider`) and `ethereum#initialized`.
- Handles multi-provider configurations (e.g. `window.ethereum.providers`).

### 2.3 Background Service Worker (`serviceWorker.ts`)
- Manages tab security status and dynamic badge indicators (`CRIT`, `HIGH`, `WARN`, `SAFE`).
- Stores historical threat logs and handles cross-tab state synchronization.
- Communicates via typed message exchange (`ExtensionMessage`).

### 2.4 Overlay & Warning UI (`overlay.ts`)
- Injected strictly into an isolated **closed Shadow DOM** (`host.attachShadow({ mode: 'closed' })`) with maximum z-index (`2147483647`).
- Prevents host page CSS contamination and shields security dialogs from page JavaScript inspection or automated clickjacking.
- Provides explicit method badges, risk factors, claim-vs-reality warnings, decoded target/spender, and action buttons.

### 2.5 Security Gate & Scanner Bridge (`scannerBridge.ts`, `txDecoder.ts`)
- Decodes transaction calldata:
  - ERC-20 `approve(address,uint256)`
  - ERC-721 / ERC-1155 `setApprovalForAll(address,bool)`
  - ERC-20 `transfer(address,uint256)` and `transferFrom(address,address,uint256)`
  - EIP-2612 gasless permits
  - Off-chain plaintext messages (`personal_sign`, `eth_sign`)
  - EIP-712 structured data (`eth_signTypedData_v4`), including Uniswap Permit2 and OpenSea Seaport orders
- Detects claim-vs-reality mismatches (e.g. page button says "Claim Airdrop" while transaction requests unlimited token approval).

---

## 3. Root Cause Analysis: `Invalid parameters: must provide an Ethereum address`

### 3.1 Observed Failure
In earlier tests, when clicking `Proceed` on intercepted `eth_sendTransaction`, ERC-20 `approve`, or ERC-721 `setApprovalForAll` requests, the test harness reported:
```
Error: Invalid parameters: must provide an Ethereum address.
```

### 3.2 Investigation and Proof of Root Cause
1. **Tracing Error Propagation:**
   - The error did not originate from ChainShield's internal decoders. ChainShield's decoders (`decodeTransactionCalldata`) successfully decoded the action and rendered the pre-sign warning modal.
   - When the user clicked `Proceed`, ChainShield forwarded the original request arguments to the wallet provider via `originalRequest.apply(callerContext, capturedArguments)`.
   - The underlying provider (MetaMask / EIP-1193 provider) executes parameter validation prior to displaying its confirmation prompt:
     ```typescript
     // MetaMask internal validator (@metamask/utils / eth-sig-util):
     function assertIsAddress(address) {
       if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
         throw new Error('Invalid parameters: must provide an Ethereum address.');
       }
     }
     ```
2. **Identifying the Malformed Parameter:**
   - Inspecting the dApp request construction revealed the following test parameter:
     `0x71C84167F30831956453773266292494`
   - Counting the hex characters:
     - `0x` followed by 32 hexadecimal characters (16 bytes).
     - Standard Ethereum addresses require **40 hexadecimal characters** (20 bytes).
   - Because the test dApp supplied a truncated 32-hex-digit address instead of a 40-hex-digit address, MetaMask rejected the request at the provider boundary with:
     `Invalid parameters: must provide an Ethereum address.`

### 3.3 Resolution Implemented
1. **Corrected Addresses in dApp Harness:**
   - Replaced all truncated test addresses with valid 42-character (20-byte) checksummed addresses:
     `0x71C84167F30831956453773266292494e8B68112`
   - Dynamically bound `from` to `window.ethereum.selectedAddress` where available.
2. **Pre-Forwarding Validation Guard in `inpage.ts`:**
   - Added `validateRequestAddresses(method, params)` in `inpage.ts` to validate address parameters before initiating interception or forwarding.
   - Rejects malformed addresses with clear, actionable diagnostics before sending them to the wallet provider.
3. **Calldata Decoder Address Extractor in `txDecoder.ts`:**
   - Updated `parseAddressFrom32Bytes` to strictly take the last 40 hex digits (`chunk.slice(-40)`), matching EVM ABI 32-byte word right-alignment.
