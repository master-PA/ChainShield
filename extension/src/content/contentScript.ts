import { analyzePreSignRequest, analyzeVisitedPage } from '../shared/scannerBridge';
import { getSettings, isDomainWhitelisted, logThreatItem } from '../shared/storage';
import { showPreSignModal, showThreatBanner } from './overlay';
import { InterceptRequestPayload, ThreatLogItem } from '../shared/types';

/**
 * ChainShield Sentinel Content Script
 * Injects in-page provider wrapper and manages pre-sign modals & threat banners.
 */

// 1. Inject inpage.js into the main execution context
function injectInpageScript() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('dist/inpage.js');
    script.async = false;
    (document.documentElement || document.head || document.body).appendChild(script);
    script.onload = () => script.remove();
  } catch (err) {
    console.error('[ChainShield ContentScript] Failed to inject inpage script:', err);
  }
}

injectInpageScript();

// 2. Automated Page Visit Threat Scanning
async function evaluateCurrentPage() {
  try {
    const settings = await getSettings();
    if (!settings.autoScanEnabled) {
      return;
    }

    const currentUrl = window.location.href;
    const hostname = window.location.hostname;

    // Skip chrome internal or empty hosts
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', evaluateCurrentPage);
} else {
  evaluateCurrentPage();
}

// 3. Listen for EIP-1193 pre-sign requests from inpage.js
window.addEventListener('message', async (event: MessageEvent) => {
  if (
    event.source !== window ||
    !event.data ||
    event.data.type !== 'CHAINSHIELD_INPAGE_REQUEST'
  ) {
    return;
  }

  const payload = event.data as InterceptRequestPayload;
  const requestId = payload.id;

  try {
    const settings = await getSettings();

    // If user disabled pre-sign interception, proceed automatically
    if (!settings.preSignInterceptionEnabled) {
      respondToInpage(requestId, 'PROCEED');
      return;
    }

    const isWhitelisted = await isDomainWhitelisted(window.location.hostname);
    const analysis = analyzePreSignRequest(payload);

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

    // If whitelisted and risk is LOW, proceed without blocking
    if (isWhitelisted && analysis.riskLevel === 'LOW') {
      respondToInpage(requestId, 'PROCEED');
      logItem.actionTaken = 'PROCEEDED';
      await logThreatItem(logItem);
      return;
    }

    // Display Pre-Sign Modal
    showPreSignModal(analysis, async (decision) => {
      logItem.actionTaken = decision === 'BLOCK' ? 'BLOCKED' : 'PROCEEDED';
      await logThreatItem(logItem);

      respondToInpage(
        requestId,
        decision,
        decision === 'BLOCK' ? 'Transaction rejected by user via ChainShield Sentinel.' : undefined
      );
    });
  } catch (err: any) {
    console.error('[ChainShield ContentScript] Interception error:', err);
    // On unexpected error, fail safe and allow proceeding so dApps aren't permanently locked
    respondToInpage(requestId, 'PROCEED');
  }
});

function respondToInpage(id: string, decision: 'PROCEED' | 'BLOCK', reason?: string) {
  window.postMessage(
    {
      type: 'CHAINSHIELD_INPAGE_RESPONSE',
      id,
      decision,
      reason,
    },
    '*'
  );
}
