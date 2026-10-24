import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { analyzePreSignRequest, analyzeVisitedPage } from '../extension/src/shared/scannerBridge';
import {
  getSettings,
  saveSettings,
  isDomainWhitelisted,
  addWhitelistedDomain,
  removeWhitelistedDomain,
  getThreatLogs,
  logThreatItem,
  clearThreatLogs,
} from '../extension/src/shared/storage';
import { DEFAULT_SETTINGS, DEFAULT_API_BASE_URL, FALLBACK_API_BASE_URLS } from '../extension/src/shared/config';
import { InterceptRequestPayload, ThreatLogItem } from '../extension/src/shared/types';

console.log('=== Running ChainShield Sentinel Browser Extension Tests ===\n');

// ---------------------------------------------------------------------------
// Test 1: Manifest V3 Schema & Resource Declarations
// ---------------------------------------------------------------------------
console.log('Test 1: Manifest V3 schema and filesystem resource validation');
const manifestPath = path.resolve(process.cwd(), 'extension', 'manifest.json');
assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist in extension directory');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');
assert.ok(manifest.name.includes('ChainShield Sentinel'), 'Name must contain brand');
assert.ok(manifest.version, 'Must have version string');

// Permissions
assert.ok(manifest.permissions.includes('storage'), 'Must request storage permission');
assert.ok(manifest.permissions.includes('activeTab'), 'Must request activeTab permission');
assert.ok(manifest.permissions.includes('tabs'), 'Must request tabs permission');

// Host permissions
assert.ok(manifest.host_permissions.includes('http://*/*'), 'Must allow http host permission');
assert.ok(manifest.host_permissions.includes('https://*/*'), 'Must allow https host permission');

// Background service worker
assert.strictEqual(manifest.background?.service_worker, 'dist/background.js', 'Service worker must point to dist/background.js');
assert.ok(fs.existsSync(path.resolve(process.cwd(), 'extension', manifest.background.service_worker)), 'Compiled background.js must exist on disk');

// Content scripts (MAIN world inpage interceptor + ISOLATED contentScript)
assert.ok(Array.isArray(manifest.content_scripts), 'content_scripts must be declared');
const hasInpage = manifest.content_scripts.some((cs: any) => cs.js.includes('dist/inpage.js') && cs.world === 'MAIN');
const hasContentScript = manifest.content_scripts.some((cs: any) => cs.js.includes('dist/contentScript.js'));
assert.ok(hasInpage, 'Manifest must declare dist/inpage.js with world: MAIN');
assert.ok(hasContentScript, 'Manifest must declare dist/contentScript.js');
assert.ok(fs.existsSync(path.resolve(process.cwd(), 'extension', 'dist', 'contentScript.js')), 'Compiled contentScript.js must exist on disk');
assert.ok(fs.existsSync(path.resolve(process.cwd(), 'extension', 'dist', 'inpage.js')), 'Compiled inpage.js must exist on disk');

// Web accessible resources
assert.ok(Array.isArray(manifest.web_accessible_resources), 'web_accessible_resources must be declared');
assert.ok(manifest.web_accessible_resources[0].resources.includes('dist/inpage.js'));
assert.ok(fs.existsSync(path.resolve(process.cwd(), 'extension', 'dist', 'inpage.js')), 'Compiled inpage.js must exist on disk');

// Action popup & Options page
assert.strictEqual(manifest.action?.default_popup, 'popup/popup.html');
assert.ok(fs.existsSync(path.resolve(process.cwd(), 'extension', manifest.action.default_popup)), 'popup.html must exist on disk');
assert.strictEqual(manifest.options_ui?.page, 'options/options.html');
assert.ok(fs.existsSync(path.resolve(process.cwd(), 'extension', manifest.options_ui.page)), 'options.html must exist on disk');

// Icons
assert.ok(fs.existsSync(path.resolve(process.cwd(), 'extension', manifest.icons['16'])), 'icon16.png must exist');
assert.ok(fs.existsSync(path.resolve(process.cwd(), 'extension', manifest.icons['48'])), 'icon48.png must exist');
assert.ok(fs.existsSync(path.resolve(process.cwd(), 'extension', manifest.icons['128'])), 'icon128.png must exist');
console.log('  ✓ Manifest V3 schema and all bundled asset paths verified');

// ---------------------------------------------------------------------------
// Test 2: Pre-Sign Interception & Intent Decoding (Unlimited Approve)
// ---------------------------------------------------------------------------
console.log('Test 2: Pre-sign interception of unlimited ERC-20 approve()');
const unlimitedApprovePayload: InterceptRequestPayload = {
  id: 'req-1',
  method: 'eth_sendTransaction',
  params: [
    {
      to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC contract
      // approve(spender=0x1111111111111111111111111111111111111111, amount=2^256-1)
      data: '0x095ea7b30000000000000000000000001111111111111111111111111111111111111111ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    },
  ],
  origin: 'https://dex-swap.io',
  href: 'https://dex-swap.io/trade',
  pageTitle: 'DEX Swap',
  timestamp: Date.now(),
};

const approveAnalysis = analyzePreSignRequest(unlimitedApprovePayload);
assert.strictEqual(approveAnalysis.methodName, 'approve');
assert.strictEqual(approveAnalysis.isUnlimited, true);
assert.ok(approveAnalysis.riskScore >= 70, `Score must be >= 70 for unlimited approval, got ${approveAnalysis.riskScore}`);
assert.ok(approveAnalysis.reasons.some((r) => r.id === 'r-unlimited-allowance'));
console.log('  ✓ Unlimited ERC-20 approval accurately flagged with high risk score');

// ---------------------------------------------------------------------------
// Test 3: Claim-vs-Reality Mismatch in Pre-Sign Interception (Blanket NFT Drain)
// ---------------------------------------------------------------------------
console.log('Test 3: Claim-vs-Reality mismatch evaluation on simulated dApp button click');
const blanketDrainPayload: InterceptRequestPayload = {
  id: 'req-2',
  method: 'eth_sendTransaction',
  params: [
    {
      to: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d', // Bored Ape contract
      // setApprovalForAll(operator=0x6666666666666666666666666666666666666666, approved=true)
      data: '0xa220534400000000000000000000000066666666666666666666666666666666666666660000000000000000000000000000000000000000000000000000000000000001',
    },
  ],
  origin: 'https://mintzone-nft.xyz',
  href: 'https://mintzone-nft.xyz/airdrop',
  pageTitle: 'Free Mint',
  lastClaimText: 'Claim Free NFT',
  timestamp: Date.now(),
};

const drainAnalysis = analyzePreSignRequest(blanketDrainPayload);
assert.strictEqual(drainAnalysis.methodName, 'setApprovalForAll');
assert.ok(drainAnalysis.mismatch, 'Mismatch must be detected between Claim and setApprovalForAll');
assert.strictEqual(drainAnalysis.mismatch?.mismatchScore, 96);
assert.strictEqual(drainAnalysis.riskLevel, 'CRITICAL');
assert.strictEqual(drainAnalysis.recommendation, 'AVOID');
assert.ok(drainAnalysis.reasons.some((r) => r.id === 'r-claim-mismatch'));
console.log('  ✓ Blanket setApprovalForAll claim mismatch detected and classified as CRITICAL (AVOID)');

// ---------------------------------------------------------------------------
// Test 4: Automated Page Visit Threat Scanning
// ---------------------------------------------------------------------------
console.log('Test 4: Automated page visit threat scanning (Legitimate vs Malicious)');
// Legitimate domain
const safeVisit = analyzeVisitedPage('https://app.uniswap.org/#/swap');
assert.strictEqual(safeVisit.rulesScore, 0, 'Official Uniswap domain must have rulesScore 0');
assert.strictEqual(safeVisit.riskLevel, 'LOW');
assert.strictEqual(safeVisit.recommendation, 'SAFE_TO_PROCEED');

// Typosquatted domain with disposable TLD
const phishingVisit = analyzeVisitedPage('https://app.un1swap.xyz/airdrop');
assert.ok(phishingVisit.rulesScore >= 40, `Typosquatted domain should have high score, got ${phishingVisit.rulesScore}`);
assert.ok(phishingVisit.riskLevel === 'HIGH' || phishingVisit.riskLevel === 'CRITICAL');
assert.strictEqual(phishingVisit.recommendation, 'AVOID');
console.log('  ✓ Automated navigation scanner differentiates verified dApps from typosquats');

// ---------------------------------------------------------------------------
// Test 5: Whitelist Domain Matching Logic
// ---------------------------------------------------------------------------
console.log('Test 5: Whitelist verification and domain matching');
await saveSettings({ whitelistedDomains: ['app.uniswap.org', 'opensea.io'] });

assert.strictEqual(await isDomainWhitelisted('app.uniswap.org'), true);
assert.strictEqual(await isDomainWhitelisted('sub.app.uniswap.org'), true);
assert.strictEqual(await isDomainWhitelisted('opensea.io'), true);
assert.strictEqual(await isDomainWhitelisted('fake-uniswap.xyz'), false);

// Add and remove
const afterAdd = await addWhitelistedDomain('mycustomdapp.eth');
assert.ok(afterAdd.includes('mycustomdapp.eth'));
assert.strictEqual(await isDomainWhitelisted('mycustomdapp.eth'), true);

const afterRemove = await removeWhitelistedDomain('mycustomdapp.eth');
assert.ok(!afterRemove.includes('mycustomdapp.eth'));
assert.strictEqual(await isDomainWhitelisted('mycustomdapp.eth'), false);
console.log('  ✓ Domain whitelist addition, removal, and wildcard/subdomain matching passed');

// ---------------------------------------------------------------------------
// Test 6: Threat History Storage & Persistence
// ---------------------------------------------------------------------------
console.log('Test 6: Threat audit log persistence and serialization');
await clearThreatLogs();
let logs = await getThreatLogs();
assert.strictEqual(logs.length, 0);

const testLog: ThreatLogItem = {
  id: 'threat-test-1',
  timestamp: Date.now(),
  origin: 'https://mintzone-nft.xyz',
  href: 'https://mintzone-nft.xyz',
  method: 'setApprovalForAll',
  riskScore: 96,
  riskLevel: 'CRITICAL',
  actionTaken: 'BLOCKED',
  explanation: 'Blocked blanket NFT drain attack.',
  mismatchExplanation: 'Button promised free mint but stole all collection NFTs.',
};

await logThreatItem(testLog);
logs = await getThreatLogs();
assert.strictEqual(logs.length, 1);
assert.strictEqual(logs[0].id, 'threat-test-1');
assert.strictEqual(logs[0].actionTaken, 'BLOCKED');

await clearThreatLogs();
logs = await getThreatLogs();
assert.strictEqual(logs.length, 0);
console.log('  ✓ Threat log event recording, retrieval, and clearing verified');

// ---------------------------------------------------------------------------
// Test 7: Configurable API Gateway Settings
// ---------------------------------------------------------------------------
console.log('Test 7: Configurable API base URL resolution');
assert.strictEqual(DEFAULT_SETTINGS.apiBaseUrl, DEFAULT_API_BASE_URL);
assert.ok(FALLBACK_API_BASE_URLS.includes('http://localhost:3000'));
assert.ok(FALLBACK_API_BASE_URLS.includes('http://localhost:3001'));

await saveSettings({ apiBaseUrl: 'http://custom-node.local:8080' });
const updatedSettings = await getSettings();
assert.strictEqual(updatedSettings.apiBaseUrl, 'http://custom-node.local:8080');

// Reset
await saveSettings({ apiBaseUrl: DEFAULT_API_BASE_URL });
const restoredSettings = await getSettings();
assert.strictEqual(restoredSettings.apiBaseUrl, DEFAULT_API_BASE_URL);
console.log('  ✓ Configurable API endpoint setting correctly stored and restored');

// ---------------------------------------------------------------------------
// Test 8: Off-Chain Signature Phishing Detection
// ---------------------------------------------------------------------------
console.log('Test 8: Off-chain signature (personal_sign / eth_signTypedData) evaluation');
const sigOnPhishingDomain: InterceptRequestPayload = {
  id: 'req-sig',
  method: 'personal_sign',
  params: ['0x4c6f67696e20746f2053697465', '0x1111111111111111111111111111111111111111'],
  origin: 'https://app.opensea1.xyz',
  href: 'https://app.opensea1.xyz/login',
  pageTitle: 'Claim Portal',
  timestamp: Date.now(),
};

const sigAnalysis = analyzePreSignRequest(sigOnPhishingDomain);
assert.ok(sigAnalysis.riskScore >= 75, `Expected high risk for signature on suspicious domain, got ${sigAnalysis.riskScore}`);
assert.ok(sigAnalysis.reasons.some((r) => r.id === 'r-sig-suspicious-domain'));
console.log('  ✓ Off-chain personal_sign on suspicious domain correctly intercepted');

console.log('\n=== All 8 Extension Test Suites Passed Successfully! ===\n');
