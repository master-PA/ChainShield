import {
  getSettings,
  saveSettings,
  addWhitelistedDomain,
  removeWhitelistedDomain,
  getThreatLogs,
  clearThreatLogs,
  logThreatItem,
  isDomainWhitelisted,
} from '../shared/storage';
import { analyzeVisitedPage } from '../shared/scannerBridge';
import { TabSecurityState, ExtensionMessage } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/config';

/**
 * ChainShield Sentinel Background Service Worker (Manifest V3)
 * Manages tab security badges, background scans, and settings storage.
 */

const tabSecurityCache = new Map<number, TabSecurityState>();

// Update extension icon badge for a tab
function updateTabBadge(tabId: number, state: TabSecurityState) {
  try {
    if (state.isWhitelisted) {
      chrome.action.setBadgeText({ tabId, text: 'SAFE' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#10B981' });
      return;
    }

    if (state.riskLevel === 'CRITICAL') {
      chrome.action.setBadgeText({ tabId, text: `${state.riskScore}` });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#EF4444' });
    } else if (state.riskLevel === 'HIGH') {
      chrome.action.setBadgeText({ tabId, text: `${state.riskScore}` });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#F97316' });
    } else if (state.riskLevel === 'CAUTION') {
      chrome.action.setBadgeText({ tabId, text: 'WARN' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#F59E0B' });
    } else {
      chrome.action.setBadgeText({ tabId, text: 'SAFE' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#10B981' });
    }
  } catch (err) {
    // Tab may have closed
  }
}

// Clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId: number) => {
  tabSecurityCache.delete(tabId);
});

// Update badge when user switches active tab
chrome.tabs.onActivated.addListener(async (activeInfo: any) => {
  const cached = tabSecurityCache.get(activeInfo.tabId);
  if (cached) {
    updateTabBadge(activeInfo.tabId, cached);
  }
});

// Handle incoming messages from content scripts and popup
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender: any, sendResponse: (res: any) => void) => {
  const handleMessage = async () => {
    switch (message.type) {
      case 'CS_PAGE_VISITED': {
        const tabId = sender.tab?.id;
        if (!tabId) return { success: false };

        const isWhitelisted = await isDomainWhitelisted(message.hostname);
        const state: TabSecurityState = {
          tabId,
          url: message.url,
          hostname: message.hostname,
          riskScore: message.riskScore,
          riskLevel: message.riskLevel,
          reasons: message.reasons,
          isWhitelisted,
          isScanning: false,
          lastScannedAt: Date.now(),
        };

        tabSecurityCache.set(tabId, state);
        updateTabBadge(tabId, state);
        return { success: true, state };
      }

      case 'CS_GET_CURRENT_TAB_STATUS': {
        let tabId = message.tabId;
        if (!tabId) {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          tabId = activeTab?.id;
        }

        if (!tabId) {
          return { success: false, error: 'No active tab found' };
        }

        let state = tabSecurityCache.get(tabId);
        if (!state) {
          // If not cached, get active tab URL and evaluate
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.url && !tab.url.startsWith('chrome://')) {
            const isWhitelisted = await isDomainWhitelisted(new URL(tab.url).hostname);
            const analysis = analyzeVisitedPage(tab.url);
            state = {
              tabId,
              url: tab.url,
              hostname: analysis.hostname,
              riskScore: isWhitelisted ? 0 : analysis.finalScore,
              riskLevel: isWhitelisted ? 'LOW' : analysis.riskLevel,
              reasons: isWhitelisted ? [] : analysis.reasons,
              isWhitelisted,
              isScanning: false,
              lastScannedAt: Date.now(),
            };
            tabSecurityCache.set(tabId, state);
            updateTabBadge(tabId, state);
          }
        }

        return { success: true, state };
      }

      case 'CS_TEST_API_CONNECTION': {
        const settings = await getSettings();
        const baseUrl = message.url || settings.apiBaseUrl || 'http://localhost:3000';
        const startTime = Date.now();
        try {
          const res = await fetch(`${baseUrl}/api/v1/health`);
          const latencyMs = Date.now() - startTime;
          if (!res.ok) {
            return { success: false, error: `HTTP ${res.status}` };
          }
          const data = await res.json();
          return { success: true, data, latencyMs, baseUrl };
        } catch (err: any) {
          return { success: false, error: err.message || 'Connection failed', baseUrl };
        }
      }

      case 'CS_GET_SETTINGS': {
        const settings = await getSettings();
        return { success: true, settings };
      }

      case 'CS_SAVE_SETTINGS': {
        const updated = await saveSettings(message.settings);
        return { success: true, settings: updated };
      }

      case 'CS_ADD_WHITELIST': {
        const list = await addWhitelistedDomain(message.domain);
        return { success: true, whitelist: list };
      }

      case 'CS_REMOVE_WHITELIST': {
        const list = await removeWhitelistedDomain(message.domain);
        return { success: true, whitelist: list };
      }

      case 'CS_GET_THREAT_LOGS': {
        const logs = await getThreatLogs();
        return { success: true, logs };
      }

      case 'CS_CLEAR_THREAT_LOGS': {
        await clearThreatLogs();
        return { success: true };
      }

      case 'CS_LOG_THREAT_EVENT': {
        await logThreatItem(message.item);
        return { success: true };
      }

      default:
        return { success: false, error: 'Unknown message type' };
    }
  };

  handleMessage().then(sendResponse).catch((err) => sendResponse({ success: false, error: err.message }));
  return true; // Keep sendResponse open for async
});

// Initialization
chrome.runtime.onInstalled.addListener(async (details: any) => {
  if (details.reason === 'install') {
    await saveSettings(DEFAULT_SETTINGS);
    console.log('[ChainShield Sentinel] Extension installed with default configuration.');
  }
});
