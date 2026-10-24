import { ExtensionSettings, TabSecurityState, ThreatLogItem } from '../shared/types';

document.addEventListener('DOMContentLoaded', async () => {
  let currentTabState: TabSecurityState | null = null;
  let currentSettings: ExtensionSettings | null = null;

  // DOM Elements
  const tabs = document.querySelectorAll<HTMLButtonElement>('.nav-tab');
  const panes = document.querySelectorAll<HTMLElement>('.tab-pane');
  const backendStatusBadge = document.getElementById('backend-status-badge') as HTMLElement;
  const openOptionsBtn = document.getElementById('open-options-btn') as HTMLButtonElement;

  // Tab 1 Elements
  const targetHostEl = document.getElementById('target-host') as HTMLElement;
  const whitelistTagEl = document.getElementById('whitelist-tag') as HTMLElement;
  const gaugeScoreEl = document.getElementById('gauge-score') as HTMLElement;
  const gaugeCircleEl = document.getElementById('gauge-circle') as HTMLElement;
  const riskBadgeEl = document.getElementById('risk-badge') as HTMLElement;
  const recommendationTextEl = document.getElementById('recommendation-text') as HTMLElement;
  const reasonsListEl = document.getElementById('reasons-list') as HTMLElement;
  const openWebScannerBtn = document.getElementById('open-web-scanner-btn') as HTMLButtonElement;
  const toggleWhitelistBtn = document.getElementById('toggle-whitelist-btn') as HTMLButtonElement;

  // Tab 2 Elements
  const threatCountEl = document.getElementById('threat-count') as HTMLElement;
  const threatLogListEl = document.getElementById('threat-log-list') as HTMLElement;
  const clearHistoryBtn = document.getElementById('clear-history-btn') as HTMLButtonElement;

  // Tab 3 Elements
  const settingAutoscan = document.getElementById('setting-autoscan') as HTMLInputElement;
  const settingPresign = document.getElementById('setting-presign') as HTMLInputElement;
  const settingSimply = document.getElementById('setting-simply') as HTMLInputElement;
  const settingApiUrl = document.getElementById('setting-api-url') as HTMLInputElement;
  const testApiBtn = document.getElementById('test-api-btn') as HTMLButtonElement;
  const apiTestResultEl = document.getElementById('api-test-result') as HTMLElement;

  // 1. Tab Navigation
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panes.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      if (targetId) {
        document.getElementById(targetId)?.classList.add('active');
      }

      if (targetId === 'tab-history') {
        loadThreatHistory();
      }
    });
  });

  // 2. Open Options Page
  openOptionsBtn?.addEventListener('click', () => {
    if (chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('../options/options.html');
    }
  });

  // 3. Load Current Tab Security
  async function loadCurrentTab() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CS_GET_CURRENT_TAB_STATUS' });
      if (response && response.success && response.state) {
        currentTabState = response.state;
        renderTabState(response.state);
      } else {
        targetHostEl.textContent = 'No Web Page Active';
        recommendationTextEl.textContent = 'Navigate to a Web3 dApp or website to inspect.';
      }
    } catch (err) {
      console.error('Failed to load tab status:', err);
    }
  }

  function renderTabState(state: TabSecurityState) {
    targetHostEl.textContent = state.hostname || state.url || 'Unknown Host';

    if (state.isWhitelisted) {
      whitelistTagEl.classList.remove('hidden');
      toggleWhitelistBtn.textContent = 'Remove from Whitelist';
    } else {
      whitelistTagEl.classList.add('hidden');
      toggleWhitelistBtn.textContent = 'Whitelist Domain';
    }

    const score = state.riskScore;
    gaugeScoreEl.textContent = `${score}`;

    // Score ring color
    let ringColor = '#10B981';
    let badgeClass = 'risk-low';
    if (state.riskLevel === 'CRITICAL') {
      ringColor = '#EF4444';
      badgeClass = 'risk-critical';
    } else if (state.riskLevel === 'HIGH') {
      ringColor = '#F97316';
      badgeClass = 'risk-high';
    } else if (state.riskLevel === 'CAUTION') {
      ringColor = '#F59E0B';
      badgeClass = 'risk-caution';
    }

    gaugeCircleEl.style.borderColor = ringColor;
    riskBadgeEl.className = `risk-badge ${badgeClass}`;
    riskBadgeEl.textContent = `${state.riskLevel} (${score}/100)`;

    // Recommendation
    if (state.isWhitelisted) {
      recommendationTextEl.textContent = 'Official verified dApp on your personal whitelist. Normal interaction is safe.';
    } else if (state.riskLevel === 'CRITICAL') {
      recommendationTextEl.textContent = 'DO NOT CONNECT OR SIGN. High-confidence drainer or typosquatting attack detected.';
    } else if (state.riskLevel === 'HIGH') {
      recommendationTextEl.textContent = 'AVOID. Multiple critical risk factors detected. Verify contract addresses.';
    } else if (state.riskLevel === 'CAUTION') {
      recommendationTextEl.textContent = 'PROCEED WITH CAUTION. Target exhibits non-standard attributes.';
    } else {
      recommendationTextEl.textContent = 'Target has passed verified heuristic checks. Normal interaction is safe.';
    }

    // Reasons list
    if (state.reasons && state.reasons.length > 0) {
      reasonsListEl.innerHTML = state.reasons
        .map(
          (r) => `
          <div class="reason-item">
            <span class="reason-desc">${escapeHtml(r.description)}</span>
            <span class="reason-pts">+${r.points}</span>
          </div>`
        )
        .join('');
    } else {
      reasonsListEl.innerHTML = `<div class="empty-state">${
        state.isWhitelisted ? 'Domain is whitelisted.' : 'No suspicious heuristic factors detected.'
      }</div>`;
    }
  }

  // 4. Action: Open Web Scanner
  openWebScannerBtn?.addEventListener('click', async () => {
    const settings = currentSettings || (await chrome.runtime.sendMessage({ type: 'CS_GET_SETTINGS' })).settings;
    const baseUrl = settings?.apiBaseUrl || 'http://localhost:3000';
    const target = currentTabState?.hostname || currentTabState?.url || '';
    const url = `${baseUrl}/scanner?target=${encodeURIComponent(target)}`;
    chrome.tabs.create({ url });
  });

  // 5. Action: Toggle Whitelist
  toggleWhitelistBtn?.addEventListener('click', async () => {
    if (!currentTabState?.hostname) return;
    const hostname = currentTabState.hostname;

    if (currentTabState.isWhitelisted) {
      await chrome.runtime.sendMessage({ type: 'CS_REMOVE_WHITELIST', domain: hostname });
    } else {
      await chrome.runtime.sendMessage({ type: 'CS_ADD_WHITELIST', domain: hostname });
    }

    await loadCurrentTab();
  });

  // 6. Threat History Tab
  async function loadThreatHistory() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'CS_GET_THREAT_LOGS' });
      if (res && res.success && Array.isArray(res.logs)) {
        threatCountEl.textContent = `${res.logs.length}`;
        if (res.logs.length === 0) {
          threatLogListEl.innerHTML = '<div class="empty-state">No threat events recorded.</div>';
          return;
        }

        threatLogListEl.innerHTML = res.logs
          .map((log: ThreatLogItem) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const actionClass = log.actionTaken === 'BLOCKED' ? 'log-blocked' : 'log-proceeded';
            return `
            <div class="log-item">
              <div class="log-header">
                <span class="log-origin">${escapeHtml(log.origin || log.href)}</span>
                <span class="log-action ${actionClass}">${log.actionTaken} (${log.riskScore}/100)</span>
              </div>
              <div class="log-desc">${escapeHtml(log.mismatchExplanation || log.explanation || log.method)}</div>
              <div style="font-size:9px; color:#6B7280; font-family:monospace; margin-top:4px;">${timeStr} • ${escapeHtml(log.method)}</div>
            </div>`;
          })
          .join('');
      }
    } catch (err) {
      console.error('Failed to load threat history:', err);
    }
  }

  clearHistoryBtn?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'CS_CLEAR_THREAT_LOGS' });
    await loadThreatHistory();
  });

  // 7. Settings Tab
  async function loadSettings() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'CS_GET_SETTINGS' });
      if (res && res.success && res.settings) {
        currentSettings = res.settings;
        settingAutoscan.checked = res.settings.autoScanEnabled;
        settingPresign.checked = res.settings.preSignInterceptionEnabled;
        settingSimply.checked = res.settings.explainSimply;
        settingApiUrl.value = res.settings.apiBaseUrl || 'http://localhost:3000';
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  settingAutoscan?.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'CS_SAVE_SETTINGS',
      settings: { autoScanEnabled: settingAutoscan.checked },
    });
  });

  settingPresign?.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'CS_SAVE_SETTINGS',
      settings: { preSignInterceptionEnabled: settingPresign.checked },
    });
  });

  settingSimply?.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'CS_SAVE_SETTINGS',
      settings: { explainSimply: settingSimply.checked },
    });
  });

  settingApiUrl?.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'CS_SAVE_SETTINGS',
      settings: { apiBaseUrl: settingApiUrl.value.trim() },
    });
  });

  testApiBtn?.addEventListener('click', async () => {
    const url = settingApiUrl.value.trim() || 'http://localhost:3000';
    apiTestResultEl.textContent = 'Testing connection...';
    apiTestResultEl.style.color = '#9CA3AF';

    const res = await chrome.runtime.sendMessage({ type: 'CS_TEST_API_CONNECTION', url });
    if (res && res.success) {
      apiTestResultEl.textContent = `✓ Connected (${res.latencyMs}ms) • ${res.data?.service || 'OK'}`;
      apiTestResultEl.style.color = '#34D399';
      backendStatusBadge.textContent = 'Online';
      backendStatusBadge.className = 'badge-status badge-online';
      chrome.runtime.sendMessage({ type: 'CS_SAVE_SETTINGS', settings: { apiBaseUrl: url } });
    } else {
      apiTestResultEl.textContent = `✗ Connection failed: ${res?.error || 'Unreachable'}`;
      apiTestResultEl.style.color = '#F87171';
      backendStatusBadge.textContent = 'Offline';
      backendStatusBadge.className = 'badge-status badge-offline';
    }
  });

  // 8. Health Check for Header Status Badge
  async function checkBackendHealth() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'CS_TEST_API_CONNECTION' });
      if (res && res.success) {
        backendStatusBadge.textContent = 'Online';
        backendStatusBadge.className = 'badge-status badge-online';
      } else {
        backendStatusBadge.textContent = 'Offline';
        backendStatusBadge.className = 'badge-status badge-offline';
      }
    } catch {
      backendStatusBadge.textContent = 'Offline';
      backendStatusBadge.className = 'badge-status badge-offline';
    }
  }

  // Helper
  function escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialize all
  await Promise.all([loadCurrentTab(), loadSettings(), loadThreatHistory(), checkBackendHealth()]);
});
