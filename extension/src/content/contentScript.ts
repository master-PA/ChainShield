import { analyzePreSignRequest, analyzeVisitedPage } from '../shared/scannerBridge';
import { getSettings, isDomainWhitelisted, logThreatItem } from '../shared/storage';
import { DEFAULT_SETTINGS } from '../shared/config';
import { showPreSignModal, showThreatBanner } from './overlay';
import { InterceptRequestPayload, ThreatLogItem } from '../shared/types';
import {
  logDiagnostic,
  inspectFrameSupport,
  validateBridgeRequest,
  BRIDGE_MESSAGE_TYPES,
} from './providerBridge';

/**
 * ChainShield Sentinel Content Script (ISOLATED world)
 *
 * Architecture notes:
 * - inpage.js runs in the MAIN world via manifest.json content_scripts (world: "MAIN")
 * - This script runs in the ISOLATED world and bridges MAIN world messages to the Security Gate.
 * - Enforces frame support: skips opaque-origin ('null') sandboxed iframes.
 * - Logs structured diagnostics across Stages 4, 5, and 6.
 */

// Inspect frame support
const frame = inspectFrameSupport(window);
if (!frame.isSupported) {
  console.log(
    `[ChainShield:Bridge] Sandboxed frame with opaque origin (null) detected in content script. Skipping pre-sign listener in opaque frame.`
  );
}

// Fallback injection for environments that don't support manifest "world": "MAIN"
function injectInpageScriptFallback() {
  if (!frame.isSupported) return;
  if (document.querySelector('script[data-chainshield-inpage]')) return;

  try {
    const script = document.createElement('script');
    script.setAttribute('data-chainshield-inpage', 'true');
    script.src = chrome.runtime.getURL('dist/inpage.js');
    script.async = false;
    (document.documentElement || document.head || document.body).appendChild(script);
    script.onload = () => script.remove();
    script.onerror = () => {
      // Expected in CSP-strict pages where script tags are blocked; MAIN world content_scripts handles it
    };
  } catch (err) {
    // ignore in restricted contexts
  }
}

if (frame.isSupported) {
  injectInpageScriptFallback();
}

// 2. Automated Page Visit Threat Scanning
async function evaluateCurrentPage() {
  if (!frame.isSupported) return;

  try {
    const settings = await getSettings();
    if (!settings.autoScanEnabled) {
      return;
    }

    const currentUrl = window.location.href;
    const hostname = window.location.hostname;

    // Skip internal browser protocols or empty hosts
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return;
    }

    const isWhitelisted = await isDomainWhitelisted(hostname);
    const analysis = analyzeVisitedPage(currentUrl);

    // Notify background worker to update tab badge
    try {
      chrome.runtime.sendMessage({
        type: 'CS_PAGE_VISITED',
        url: currentUrl,
        hostname,
        riskScore: isWhitelisted ? 0 : analysis.finalScore,
        riskLevel: isWhitelisted ? 'LOW' : analysis.riskLevel,
        reasons: isWhitelisted ? [] : analysis.reasons,
        isWhitelisted,
      });
    } catch {
      // background worker may be temporarily idle
    }

    // If critical threat and not whitelisted, present threat banner
    if (!isWhitelisted && (analysis.riskLevel === 'CRITICAL' || analysis.riskLevel === 'HIGH')) {
      showThreatBanner(hostname, analysis.finalScore, analysis.recommendationText);
    }
  } catch (err) {
    console.error('[ChainShield ContentScript] Page evaluation error:', err);
  }
}

// Run page scan after initial DOM load
if (frame.isSupported) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', evaluateCurrentPage);
  } else {
    evaluateCurrentPage();
  }
}

// 3. Central Security Gate: Listen for EIP-1193 pre-sign requests from inpage.js (MAIN world)
// Messages flow: dApp -> inpage.js (MAIN world) -> window.postMessage -> here (ISOLATED world)
if (frame.isSupported) {
  window.addEventListener('message', async (event: MessageEvent) => {
    // Strict window validation
    if (event.source !== window) {
      return;
    }

    // Origin validation: event origin must match frame origin (if specified)
    if (event.origin && frame.origin && frame.origin !== 'null' && event.origin !== frame.origin) {
      return;
    }

    // Schema validation
    if (!validateBridgeRequest(event.data)) {
      return;
    }

    const payload = event.data as InterceptRequestPayload;
    const requestId = payload.id;

    // Stage 4: Bridge receives the message
    logDiagnostic(4, requestId, { method: payload.method, origin: payload.origin });

    try {
      let settings = DEFAULT_SETTINGS;
      try {
        settings = await getSettings();
      } catch {
        settings = DEFAULT_SETTINGS;
      }

      // If user disabled pre-sign interception, proceed automatically
      if (!settings.preSignInterceptionEnabled) {
        console.log('[ChainShield ContentScript] Pre-sign interception disabled. Proceeding automatically.');
        respondToInpage(requestId, 'PROCEED');
        return;
      }

      let isWhitelisted = false;
      try {
        isWhitelisted = await isDomainWhitelisted(window.location.hostname);
      } catch {
        isWhitelisted = false;
      }

      const analysis = analyzePreSignRequest(payload, { strictMode: settings.strictMode });

      // Stage 5: Security analysis starts and finishes
      logDiagnostic(5, requestId, {
        method: payload.method,
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        decision: analysis.securityGateDecision,
      });

      // Log event in threat history
      const logItem: ThreatLogItem = {
        id: `threat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        origin: payload.origin,
        href: payload.href,
        method: payload.method,
        riskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        actionTaken: 'AUDITED',
        explanation: analysis.recommendationText,
        mismatchExplanation: analysis.mismatch?.explanation,
      };

      // Classify request type: is this an action that signs or moves assets?
      const isTransactionOrSignature =
        payload.method === 'eth_sendTransaction' ||
        payload.method === 'eth_signTransaction' ||
        payload.method === 'eth_sendRawTransaction' ||
        payload.method === 'wallet_sendCalls' ||
        payload.method === 'personal_sign' ||
        payload.method === 'eth_sign' ||
        payload.method.startsWith('eth_signTypedData');



      // Outcome 2: Safe read-only or network permission call on a whitelisted domain
      // e.g. eth_accounts, eth_requestAccounts, wallet_switchEthereumChain on verified legitimate dApps
      if (!isTransactionOrSignature && analysis.securityGateDecision === 'ALLOW' && isWhitelisted) {
        // Stage 6: UI received result (Auto-proceeding low-impact call on whitelisted domain)
        logDiagnostic(6, requestId, {
          method: payload.method,
          decision: 'ALLOW',
          showingUI: false,
        });

        logItem.actionTaken = 'PROCEEDED';
        await logThreatItem(logItem);
        respondToInpage(requestId, 'PROCEED');
        return;
      }

      // Outcome 3: Transaction / Signature requests OR Warnings
      // ALWAYS present the Pre-Sign Security Gate modal so user can inspect intent, target, spender, value, and approve or reject!
      // Stage 6: Warning UI receives result
      logDiagnostic(6, requestId, {
        method: payload.method,
        decision: analysis.securityGateDecision,
        showingUI: true,
      });

      showPreSignModal(analysis, async (decision) => {
        logItem.actionTaken = decision === 'BLOCK' ? 'BLOCKED' : 'PROCEEDED';
        await logThreatItem(logItem);

        respondToInpage(
          requestId,
          decision,
          decision === 'BLOCK'
            ? 'Transaction rejected by user via ChainShield Sentinel Security Gate.'
            : undefined
        );
      });
    } catch (err: any) {
      console.error('[ChainShield ContentScript] Security Gate evaluation error:', err);
      // On unexpected error, fail safe and allow proceeding so dApps aren't permanently locked
      respondToInpage(requestId, 'PROCEED');
    }
  });
}

function respondToInpage(id: string, decision: 'PROCEED' | 'BLOCK', reason?: string) {
  const targetOrigin = frame.isSupported ? frame.origin : '*';
  window.postMessage(
    {
      type: BRIDGE_MESSAGE_TYPES.RESPONSE,
      id,
      decision,
      reason,
    },
    targetOrigin
  );
}
