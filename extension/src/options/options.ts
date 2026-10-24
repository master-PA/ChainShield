import { DEFAULT_API_BASE_URL, DEFAULT_WHITELISTED_DOMAINS } from '../shared/config';
import { ExtensionSettings, ThreatLogItem } from '../shared/types';

document.addEventListener('DOMContentLoaded', async () => {
  let settings: ExtensionSettings;

  // DOM Elements
  const statusBadge = document.getElementById('opt-status-badge') as HTMLElement;
  const apiUrlInput = document.getElementById('opt-api-url') as HTMLInputElement;
  const testApiBtn = document.getElementById('opt-test-api-btn') as HTMLButtonElement;
  const resetApiBtn = document.getElementById('opt-reset-api-btn') as HTMLButtonElement;
  const apiStatusBox = document.getElementById('opt-api-status') as HTMLElement;

  const togglePresign = document.getElementById('opt-toggle-presign') as HTMLInputElement;
  const toggleAutoscan = document.getElementById('opt-toggle-autoscan') as HTMLInputElement;
  const toggleStrict = document.getElementById('opt-toggle-strict') as HTMLInputElement;
  const toggleSimply = document.getElementById('opt-toggle-simply') as HTMLInputElement;

  const whitelistInput = document.getElementById('opt-add-whitelist-input') as HTMLInputElement;
  const addWhitelistBtn = document.getElementById('opt-add-whitelist-btn') as HTMLButtonElement;
  const resetWhitelistBtn = document.getElementById('opt-reset-whitelist-btn') as HTMLButtonElement;
  const whitelistContainer = document.getElementById('opt-whitelist-list') as HTMLElement;

  const exportLogsBtn = document.getElementById('opt-export-logs-btn') as HTMLButtonElement;
  const clearLogsBtn = document.getElementById('opt-clear-logs-btn') as HTMLButtonElement;
  const logsTbody = document.getElementById('opt-logs-tbody') as HTMLElement;

  // 1. Load Settings
  async function loadSettings() {
    const res = await chrome.runtime.sendMessage({ type: 'CS_GET_SETTINGS' });
    if (res && res.success && res.settings) {
      settings = res.settings;
      apiUrlInput.value = settings.apiBaseUrl || DEFAULT_API_BASE_URL;
      togglePresign.checked = settings.preSignInterceptionEnabled;
      toggleAutoscan.checked = settings.autoScanEnabled;
      toggleStrict.checked = settings.strictMode;
      toggleSimply.checked = settings.explainSimply;
      renderWhitelist(settings.whitelistedDomains);
    }
  }

  // 2. Render Whitelist Tags
  function renderWhitelist(domains: string[]) {
    whitelistContainer.innerHTML = '';
    if (!domains || domains.length === 0) {
      whitelistContainer.innerHTML = '<span style="color:#6B7280; font-size:11px;">No domains currently whitelisted.</span>';
      return;
    }

    domains.forEach((domain) => {
      const tag = document.createElement('div');
      tag.className = 'whitelist-tag';
      tag.innerHTML = `
        <span>${escapeHtml(domain)}</span>
        <span class="whitelist-tag-remove" data-domain="${escapeHtml(domain)}" title="Remove domain">&times;</span>
      `;
      whitelistContainer.appendChild(tag);
    });

    // Attach remove handlers
    whitelistContainer.querySelectorAll('.whitelist-tag-remove').forEach((el) => {
      el.addEventListener('click', async (e) => {
        const dom = (e.target as HTMLElement).getAttribute('data-domain');
        if (dom) {
          const res = await chrome.runtime.sendMessage({ type: 'CS_REMOVE_WHITELIST', domain: dom });
          if (res && res.success) {
            settings.whitelistedDomains = res.whitelist;
            renderWhitelist(res.whitelist);
          }
        }
      });
    });
  }

  // 3. Add Whitelist Domain
  addWhitelistBtn?.addEventListener('click', async () => {
    let domain = whitelistInput.value.trim().toLowerCase();
    if (!domain) return;
    try {
      if (domain.includes('://')) {
        domain = new URL(domain).hostname;
      }
    } catch {
      // use raw text
    }

    const res = await chrome.runtime.sendMessage({ type: 'CS_ADD_WHITELIST', domain });
    if (res && res.success) {
      settings.whitelistedDomains = res.whitelist;
      renderWhitelist(res.whitelist);
      whitelistInput.value = '';
    }
  });

  resetWhitelistBtn?.addEventListener('click', async () => {
    if (confirm('Reset whitelist to default verified dApp registry?')) {
      await chrome.runtime.sendMessage({
        type: 'CS_SAVE_SETTINGS',
        settings: { whitelistedDomains: DEFAULT_WHITELISTED_DOMAINS },
      });
      await loadSettings();
    }
  });

  // 4. Policy Toggles
  togglePresign?.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'CS_SAVE_SETTINGS',
      settings: { preSignInterceptionEnabled: togglePresign.checked },
    });
  });

  toggleAutoscan?.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'CS_SAVE_SETTINGS',
      settings: { autoScanEnabled: toggleAutoscan.checked },
    });
  });

  toggleStrict?.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'CS_SAVE_SETTINGS',
      settings: { strictMode: toggleStrict.checked },
    });
  });

  toggleSimply?.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'CS_SAVE_SETTINGS',
      settings: { explainSimply: toggleSimply.checked },
    });
  });

  // 5. Test Backend API
  async function testBackendApi(url: string) {
    apiStatusBox.className = 'status-box';
    apiStatusBox.textContent = 'Testing connection to ' + url + '...';
    apiStatusBox.classList.remove('hidden');

    const res = await chrome.runtime.sendMessage({ type: 'CS_TEST_API_CONNECTION', url });
    if (res && res.success) {
      statusBadge.textContent = 'Online';
      statusBadge.className = 'badge-status badge-online';

      const chains = Array.isArray(res.data?.supportedChains)
        ? res.data.supportedChains.map((c: any) => c.name).join(', ')
        : 'Sepolia, Mainnet';

      apiStatusBox.className = 'status-box success';
      apiStatusBox.innerHTML = `
        <strong>✓ Connected Successfully (${res.latencyMs}ms)</strong><br/>
        Service: ${escapeHtml(res.data?.service || 'ChainShield API')}<br/>
        Supported Chains: ${escapeHtml(chains)}
      `;

      chrome.runtime.sendMessage({
        type: 'CS_SAVE_SETTINGS',
        settings: { apiBaseUrl: url },
      });
    } else {
      statusBadge.textContent = 'Offline';
      statusBadge.className = 'badge-status badge-offline';

      apiStatusBox.className = 'status-box error';
      apiStatusBox.innerHTML = `
        <strong>✗ Connection Failed</strong><br/>
        Error: ${escapeHtml(res?.error || 'Unable to connect to ' + url)}<br/>
        Make sure the ChainShield Sentinel server is running via <code>npm run dev</code> or <code>npm run server</code>.
      `;
    }
  }

  testApiBtn?.addEventListener('click', () => {
    testBackendApi(apiUrlInput.value.trim() || DEFAULT_API_BASE_URL);
  });

  resetApiBtn?.addEventListener('click', () => {
    apiUrlInput.value = DEFAULT_API_BASE_URL;
    testBackendApi(DEFAULT_API_BASE_URL);
  });

  // 6. Threat Logs & Audit Table
  async function loadLogs() {
    const res = await chrome.runtime.sendMessage({ type: 'CS_GET_THREAT_LOGS' });
    if (res && res.success && Array.isArray(res.logs)) {
      if (res.logs.length === 0) {
        logsTbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No threat events recorded.</td></tr>';
        return;
      }

      logsTbody.innerHTML = res.logs
        .map((log: ThreatLogItem) => {
          const dateStr = new Date(log.timestamp).toLocaleString();
          const badgeClass = log.actionTaken === 'BLOCKED' ? 'badge-blocked' : 'badge-proceeded';
          return `
          <tr>
            <td style="font-family:monospace; color:#9CA3AF;">${escapeHtml(dateStr)}</td>
            <td style="font-family:monospace; font-weight:700; color:#F3F4F6;">${escapeHtml(log.origin || log.href)}</td>
            <td style="font-family:monospace; color:#60A5FA;">${escapeHtml(log.method)}</td>
            <td><strong style="color:${log.riskScore >= 75 ? '#EF4444' : '#F59E0B'}; font-family:monospace;">${log.riskScore}/100</strong></td>
            <td><span class="${badgeClass}">${log.actionTaken}</span></td>
            <td>${escapeHtml(log.mismatchExplanation || log.explanation)}</td>
          </tr>`;
        })
        .join('');
    }
  }

  clearLogsBtn?.addEventListener('click', async () => {
    if (confirm('Clear all logged threat interceptions and scans?')) {
      await chrome.runtime.sendMessage({ type: 'CS_CLEAR_THREAT_LOGS' });
      await loadLogs();
    }
  });

  exportLogsBtn?.addEventListener('click', async () => {
    const res = await chrome.runtime.sendMessage({ type: 'CS_GET_THREAT_LOGS' });
    if (res && res.success) {
      const blob = new Blob([JSON.stringify(res.logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chainshield-threat-audit-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });

  function escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial load
  await loadSettings();
  await loadLogs();
  await testBackendApi(apiUrlInput.value.trim() || DEFAULT_API_BASE_URL);
});
