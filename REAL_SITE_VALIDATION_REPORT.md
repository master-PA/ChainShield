# ChainShield Sentinel — Real-Site Validation Report

## 1. Test Environment Specifications

| Parameter | Specification |
|:---|:---|
| **Extension Version** | ChainShield Sentinel v1.0.0 (Manifest V3) |
| **Tested Browsers** | Microsoft Edge 131.0.2903 / Google Chrome 131.0.6778 (Windows x64) |
| **Host Permissions** | `http://*/*`, `https://*/*` |
| **API Permissions** | `storage`, `activeTab`, `tabs` |
| **Execution Contexts** | Main World (`inpage.js`, `document_start`), Isolated World (`contentScript.js`, `document_start`) |
| **Tested Wallets** | MetaMask v12.6.0, EIP-6963 Compatible EVM Providers, ChainShield Local Harness |
| **Test Networks** | Ethereum Mainnet (Chain ID: 1), Ethereum Sepolia (Chain ID: 11155111) |

---

## 2. Real-Site Flow Audit Matrix

### 2.1 Uniswap (`https://app.uniswap.org/`)

| Action Tested | Intercepted JSON-RPC Method | Parameters Availability | Security Gate Outcome | Evidence & Decoded Findings | Proceed Behavior | Cancel Behavior | Verification Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **Wallet Connection** | `eth_requestAccounts` | Full (`[]`) | `ALLOW` | Domain reputation evaluated: `app.uniswap.org` verified legit. Low risk (0/100). | Forwards to wallet; MetaMask account picker appears. | Rejects with code `4001`; connection prompt dismissed. | **Verified** |
| **Network Switching** | `wallet_switchEthereumChain` | Full (`[{ chainId: '0xaa36a7' }]`) | `ALLOW` | Verified standard network: Ethereum Sepolia. Safe chain transition. | Forwards to wallet; MetaMask network switch confirmation appears. | Rejects with code `4001`; network switch aborted. | **Verified** |
| **ERC-20 Token Approval** | `eth_sendTransaction` | Full (`[{ from, to, data: '0x095ea7b3...' }]`) | `WARN` | Selector `0x095ea7b3` (`approve`). Decoded spender: Uniswap Permit2 / Router. Unlimited threshold evaluated. | Forwards unmodified params; MetaMask approval confirmation opens. | Rejects with code `4001`; request never reaches wallet provider. | **Verified** |
| **Permit2 Gasless Authorization** | `eth_signTypedData_v4` | Full (`[address, JSON string]`) | `WARN` | Primary type `PermitSingle` / `PermitBatch`. Verifying contract: Permit2 (`0x000000000022D473030F116dDEE9F6B43aC78BA3`). | Forwards exact typed data; MetaMask signature confirmation opens. | Rejects with code `4001`; signature prompt prevented. | **Verified** |
| **Token Swap Transaction** | `eth_sendTransaction` | Full (`[{ from, to: UniversalRouter, data: '0x3593564c...' }]`) | `ALLOW` / `WARN` | Selector `0x3593564c` (`execute`) or `0x5ae401dc` (`multicall`). Decoded Universal Router swap commands. | Forwards exact tx fields; MetaMask transaction confirmation opens. | Rejects with code `4001`; no gas spent, no tx broadcast. | **Verified** |

### 2.2 OpenSea (`https://opensea.io/`)

| Action Tested | Intercepted JSON-RPC Method | Parameters Availability | Security Gate Outcome | Evidence & Decoded Findings | Proceed Behavior | Cancel Behavior | Verification Status |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **Wallet Connection** | `eth_requestAccounts` | Full (`[]`) | `ALLOW` | Domain evaluated: `opensea.io` verified legit. Low risk. | Opens MetaMask account selector. | Rejects with code `4001`; connection aborted. | **Verified** |
| **Off-Chain Listing Order** | `eth_signTypedData_v4` | Full (`[address, JSON string]`) | `ALLOW` / `WARN` | Primary type `OrderComponents`. Seaport 1.5 order. Offers 1 NFT, receives consideration > 0. Differentiated as off-chain order (NOT on-chain approval). | Forwards typed data to wallet; MetaMask signature prompt opens. | Rejects with code `4001`; listing signature aborted. | **Verified** |
| **Zero-Price Listing Exploit (Drainer Attack)** | `eth_signTypedData_v4` | Full (`[address, JSON string]`) | `BLOCK` | Primary type `OrderComponents`. Offers NFT but consideration is 0 or empty. Confirmed asset-drain exploit signature. | **Blocked**: User cannot proceed; request aborted before wallet. | Rejects with code `4001`; wallet prompt never opened. | **Verified** |
| **Collection NFT Approval** | `eth_sendTransaction` | Full (`[{ to: NFT, data: '0xa2205344...' }]`) | `WARN` | Selector `0xa2205344` (`setApprovalForAll`). Spender: OpenSea Conduit (`0x1E0049783F008A0085193E00003D00cd54003c71`). Blanket operator flagged. | Forwards unmodified params to wallet; MetaMask displays NFT approval. | Rejects with code `4001`; operator approval prevented. | **Verified** |
| **Order Settlement / Purchase** | `eth_sendTransaction` | Full (`[{ to: Seaport, data: '0xb3a34c4c...' }]`) | `ALLOW` / `WARN` | Selector `0xb3a34c4c` (`fulfillOrder`). Settle order on-chain. | Forwards to wallet; MetaMask transaction prompt opens. | Rejects with code `4001`; order purchase cancelled cleanly. | **Verified** |

---

## 3. Explicit Method Coverage Registry

| JSON-RPC Method | Interception Status | Category | Scope & Architecture Limitations |
|:---|:---|:---|:---|
| `eth_sendTransaction` | `FULLY_INTERCEPTED` | Transaction | Complete pre-sign decoding of destination, value, calldata, approvals, transfers. |
| `eth_signTransaction` | `FULLY_INTERCEPTED` | Transaction | Pre-sign inspection of transaction fields prior to signature generation. |
| `eth_sendRawTransaction` | `PARTIALLY_ANALYZED` | Transaction | Raw signed transaction broadcast. Limitation: Payload is pre-signed by user's private key; calldata cannot be altered. Extension inspects broadcast destination and blocks transmission to confirmed drainers. |
| `wallet_sendCalls` | `FULLY_INTERCEPTED` | Transaction | EIP-5792 Smart Account batch calls. Unpacks individual sub-calls array and inspects each target and calldata. |
| `personal_sign` | `FULLY_INTERCEPTED` | Signature | Decodes hex messages to UTF-8 text, inspects phishing terminology and domain reputation. |
| `eth_sign` | `FULLY_INTERCEPTED` | Signature | Flags critical danger: Blind signing over arbitrary 32-byte hashes can authorize transactions or drain balances. |
| `eth_signTypedData` | `FULLY_INTERCEPTED` | Signature | EIP-712 structured data inspection. |
| `eth_signTypedData_v1` | `FULLY_INTERCEPTED` | Signature | Early typed data standard inspection. |
| `eth_signTypedData_v3` | `FULLY_INTERCEPTED` | Signature | EIP-712 v3 structured data inspection. |
| `eth_signTypedData_v4` | `FULLY_INTERCEPTED` | Signature | EIP-712 v4 deep inspection: EIP-2612 Permits, Uniswap Permit2, OpenSea Seaport orders. |
| `wallet_switchEthereumChain` | `FULLY_INTERCEPTED` | Network Permission | Chain ID validation and network security auditing. |
| `wallet_addEthereumChain` | `FULLY_INTERCEPTED` | Network Permission | Inspects custom RPC URLs, chain IDs, and explorers to prevent RPC tampering. |
| `wallet_requestPermissions` | `FULLY_INTERCEPTED` | Network Permission | Permission scoping audit before granting account access. |
| `wallet_watchAsset` | `FULLY_INTERCEPTED` | Network Permission | Audits token contract addresses and symbol impersonation (e.g. fake USDT/USDC). |
| `eth_requestAccounts` | `FULLY_INTERCEPTED` | Account | Audits initial wallet connection requests against domain reputation. |
| `eth_accounts` | `FULLY_INTERCEPTED` | Account | Audits background account queries. |

---

## 4. Known Limitations & Degraded Mode Disclosures

1. **Raw Serialized Transactions (`eth_sendRawTransaction`):**
   - When a dApp submits an `eth_sendRawTransaction`, the transaction payload has already been cryptographically signed by the user's private key.
   - The extension can inspect the broadcast and reject the network call, but cannot modify gas, recipient, or calldata inside a pre-signed envelope without invalidating the cryptographic signature.
2. **Scanner Backend Unavailability (Degraded Mode):**
   - If the external ChainShield scanner API is unreachable or times out, the extension enters **Degraded Mode** (`scanStatus: 'UNAVAILABLE'`).
   - The UI explicitly renders an amber degraded mode notice: *"External smart contract security API could not be reached. Local heuristic analysis was performed, but contract source code could not be verified on-chain."*
   - Requests are never silently marked safe when unscanned.
3. **Hardware Wallets & Alternative Signing Transports:**
   - Interception occurs at the browser's JavaScript EIP-1193 provider layer (`window.ethereum`).
   - Direct hardware wallet communication (e.g. WebHID or Ledger Live desktop bridges bypassing `window.ethereum`) is outside the browser provider boundary and is marked unsupported.
