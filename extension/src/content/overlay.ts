import { PreSignAnalysisResult } from '../shared/types';

let activeShadowRoot: ShadowRoot | null = null;
let activeHostElement: HTMLElement | null = null;

function ensureHostElement(): ShadowRoot {
  if (activeShadowRoot && activeHostElement && document.contains(activeHostElement)) {
    return activeShadowRoot;
  }

  const existing = document.getElementById('chainshield-sentinel-host');
  if (existing) {
    existing.remove();
  }

  const host = document.createElement('div');
  host.id = 'chainshield-sentinel-host';
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647'; // Maximum 32-bit z-index
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100vw';
  host.style.height = '0';
  host.style.overflow = 'visible';
  host.style.pointerEvents = 'none';

  // Closed shadow DOM to prevent dApp page scripts from tampering
  const shadow = host.attachShadow({ mode: 'closed' });
  (document.documentElement || document.body).appendChild(host);

  activeHostElement = host;
  activeShadowRoot = shadow;
  return shadow;
}

export function showPreSignModal(
  analysis: PreSignAnalysisResult,
  onDecision: (decision: 'PROCEED' | 'BLOCK') => void
) {
  const shadow = ensureHostElement();

  const isCritical = analysis.riskLevel === 'CRITICAL' || analysis.riskLevel === 'HIGH';
  const badgeColor =
    analysis.riskLevel === 'CRITICAL'
      ? '#ef4444'
      : analysis.riskLevel === 'HIGH'
      ? '#f97316'
      : analysis.riskLevel === 'CAUTION'
      ? '#f59e0b'
      : '#10b981';

  const badgeBg =
    analysis.riskLevel === 'CRITICAL'
      ? 'rgba(239, 68, 68, 0.15)'
      : analysis.riskLevel === 'HIGH'
      ? 'rgba(249, 115, 22, 0.15)'
      : analysis.riskLevel === 'CAUTION'
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(16, 185, 129, 0.15)';

  const reasonsHtml = analysis.reasons
    .slice(0, 5)
    .map(
      (r) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#0B0F14; border:1px solid #1F2630; border-radius:6px; font-size:11px; margin-bottom:5px;">
        <span style="color:#D1D5DB; max-width:80%; line-height:1.3;">${escapeHtml(r.description)}</span>
        <span style="color:${r.points >= 30 ? '#F87171' : '#FBBF24'}; font-weight:700; font-family:monospace;">+${r.points}</span>
      </div>`
    )
    .join('');

  const mismatchHtml = analysis.mismatch
    ? `
    <div style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.4); border-radius:8px; padding:12px; margin-bottom:12px;">
      <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#F87171; text-transform:uppercase; font-family:monospace;">
        <span>⚠️ Intent Mismatch (${analysis.mismatch.mismatchScore}/100)</span>
      </div>
      <div style="font-size:12px; color:#E5E7EB; margin-top:4px; line-height:1.4;">
        ${escapeHtml(analysis.mismatch.explanation)}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; font-size:11px; font-family:monospace;">
        <div style="background:#0B0F14; padding:6px 8px; border-radius:4px; border:1px solid #1F2630;">
          <span style="color:#9CA3AF; display:block; font-size:10px;">Page Claimed</span>
          <span style="color:#60A5FA; font-weight:600;">"${escapeHtml(analysis.mismatch.claimedText)}"</span>
        </div>
        <div style="background:#0B0F14; padding:6px 8px; border-radius:4px; border:1px solid #1F2630;">
          <span style="color:#9CA3AF; display:block; font-size:10px;">Actual Action</span>
          <span style="color:#F87171; font-weight:600;">${escapeHtml(analysis.mismatch.actualAction)}</span>
        </div>
      </div>
    </div>`
    : '';

  // Degraded mode alert if scanner backend is unavailable
  const degradedHtml = analysis.degradedMode
    ? `
    <div style="background:rgba(245, 158, 11, 0.12); border:1px solid rgba(245, 158, 11, 0.5); border-radius:8px; padding:10px; margin-bottom:12px;">
      <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#FBBF24; text-transform:uppercase; font-family:monospace;">
        <span>⚠️ DEGRADED MODE: Scanner Unavailable</span>
      </div>
      <div style="font-size:11px; color:#E5E7EB; margin-top:3px; line-height:1.4;">
        External smart contract security API could not be reached. Local heuristic analysis was performed, but contract source code could not be verified on-chain.
      </div>
    </div>`
    : '';

  // Seaport Order details if present
  const seaportHtml = analysis.seaportDetails
    ? `
    <div style="background:#0B0F14; border:1px solid ${analysis.seaportDetails.isZeroConsiderationRisk ? '#EF4444' : '#1F2630'}; border-radius:8px; padding:10px; margin-bottom:12px; font-size:11px; font-family:monospace;">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="color:#A78BFA; font-weight:700;">OpenSea Seaport Order</span>
        <span style="color:#9CA3AF;">Off-Chain Signature</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
        <span style="color:#6B7280;">Offered Items:</span>
        <span style="color:#F3F4F6; font-weight:600;">${analysis.seaportDetails.offerCount} asset(s)</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
        <span style="color:#6B7280;">Consideration Received:</span>
        <span style="color:${analysis.seaportDetails.isZeroConsiderationRisk ? '#F87171' : '#34D399'}; font-weight:600;">
          ${analysis.seaportDetails.isZeroConsiderationRisk ? '0 (FREE GIVEAWAY / DRAINER)' : `${analysis.seaportDetails.considerationCount} item(s)`}
        </span>
      </div>
      <div style="font-size:10px; color:#9CA3AF; margin-top:4px;">
        ℹ️ Note: This signs an off-chain listing or offer. It does not transfer tokens or approve contracts on-chain immediately.
      </div>
    </div>`
    : '';

  // Batch calls if present
  const batchCallsHtml =
    analysis.batchCalls && analysis.batchCalls.length > 0
      ? `
    <div style="background:#0B0F14; border:1px solid #1F2630; border-radius:8px; padding:10px; margin-bottom:12px; font-size:11px; font-family:monospace;">
      <div style="color:#60A5FA; font-weight:700; margin-bottom:6px;">Smart Account Batched Calls (${analysis.batchCalls.length})</div>
      ${analysis.batchCalls
        .slice(0, 3)
        .map(
          (c, idx) => `
        <div style="padding:4px 0; border-top:${idx > 0 ? '1px solid #1F2630' : 'none'}; font-size:10px;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#9CA3AF;">Call #${idx + 1} Target:</span>
            <span style="color:#93C5FD;">${shortenAddress(c.to)}</span>
          </div>
          <div style="color:${c.isUnlimited ? '#F87171' : '#D1D5DB'}; margin-top:2px;">
            ${escapeHtml(c.decodedIntent || 'Custom Call')}
          </div>
        </div>`
        )
        .join('')}
    </div>`
      : '';

  const coverageBadgeText =
    analysis.coverageStatus === 'FULLY_INTERCEPTED'
      ? 'Fully Intercepted'
      : analysis.coverageStatus === 'PARTIALLY_ANALYZED'
      ? 'Partially Analyzed'
      : 'Unsupported Method';

  const coverageBadgeBg =
    analysis.coverageStatus === 'FULLY_INTERCEPTED'
      ? 'rgba(16, 185, 129, 0.15)'
      : analysis.coverageStatus === 'PARTIALLY_ANALYZED'
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(239, 68, 68, 0.15)';

  const coverageBadgeColor =
    analysis.coverageStatus === 'FULLY_INTERCEPTED'
      ? '#34D399'
      : analysis.coverageStatus === 'PARTIALLY_ANALYZED'
      ? '#FBBF24'
      : '#F87171';

  const modalContainer = document.createElement('div');
  modalContainer.id = 'chainshield-modal-container';
  modalContainer.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 16px;
    box-sizing: border-box;
    animation: csFadeIn 0.15s ease-out;
  `;

  modalContainer.innerHTML = `
    <style>
      @keyframes csFadeIn {
        from { opacity: 0; transform: scale(0.98); }
        to { opacity: 1; transform: scale(1); }
      }
      .cs-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
      .cs-btn:active { transform: translateY(0); }
    </style>
    <div style="background:#11161D; border:1px solid ${isCritical ? '#991B1B' : '#14B8A6'}; border-radius:14px; width:100%; max-width:480px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.8); overflow:hidden; display:flex; flex-direction:column; box-sizing:border-box;">
      <!-- Header -->
      <div style="background:#0B0F14; padding:14px 18px; border-bottom:1px solid #1F2630; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:28px; height:28px; border-radius:6px; background:#134E4A; border:1px solid #14B8A6; display:flex; align-items:center; justify-content:center; color:#2DD4BF; font-weight:bold; font-size:14px;">🛡️</div>
          <div>
            <div style="font-size:13px; font-weight:800; color:#F3F4F6; letter-spacing:0.04em; font-family:monospace;">CHAINSHIELD SENTINEL</div>
            <div style="font-size:10px; color:#9CA3AF; margin-top:1px;">Security Gate • Pre-Sign Interception</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="background:${coverageBadgeBg}; color:${coverageBadgeColor}; border:1px solid ${coverageBadgeColor}; padding:2px 8px; border-radius:9999px; font-size:10px; font-weight:700; font-family:monospace;">
            ${coverageBadgeText}
          </div>
          <div style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeColor}; padding:4px 10px; border-radius:9999px; font-size:11px; font-weight:800; font-family:monospace; display:flex; align-items:center; gap:5px;">
            <span>${analysis.riskLevel}</span>
            <span style="opacity:0.7;">•</span>
            <span>${analysis.riskScore}/100</span>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:18px; max-height:75vh; overflow-y:auto; box-sizing:border-box;">
        ${degradedHtml}

        <!-- Recommendation -->
        <div style="background:${isCritical ? 'rgba(239,68,68,0.15)' : 'rgba(20,184,166,0.1)'}; border:1px solid ${isCritical ? 'rgba(239,68,68,0.5)' : 'rgba(20,184,166,0.4)'}; border-radius:8px; padding:12px; margin-bottom:14px;">
          <div style="font-size:11px; font-weight:800; color:${isCritical ? '#F87171' : '#2DD4BF'}; text-transform:uppercase; font-family:monospace;">
            GATE DECISION: ${escapeHtml(analysis.securityGateDecision)} • ${escapeHtml(analysis.recommendation)}
          </div>
          <div style="font-size:12px; color:#D1D5DB; margin-top:4px; line-height:1.4;">
            ${escapeHtml(analysis.recommendationText)}
          </div>
        </div>

        ${mismatchHtml}
        ${seaportHtml}
        ${batchCallsHtml}

        <!-- Decoded Intent -->
        <div style="background:#0B0F14; border:1px solid #1F2630; border-radius:8px; padding:12px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:10px; font-weight:700; color:#9CA3AF; text-transform:uppercase; font-family:monospace;">
              Decoded Request Intent
            </span>
            <span style="background:#1F2937; color:#93C5FD; font-size:10px; padding:2px 6px; border-radius:4px; font-family:monospace; font-weight:600;">
              ${escapeHtml(analysis.methodName)}
            </span>
          </div>
          <div style="font-size:13px; font-weight:600; color:#F9FAFB; line-height:1.4;">
            ${escapeHtml(analysis.intent.plainEnglish)}
          </div>

          ${
            analysis.contractAddress &&
            analysis.contractAddress !== analysis.targetSpender &&
            analysis.contractAddress !== '0x0000000000000000000000000000000000000000'
              ? `
          <div style="display:flex; justify-content:space-between; margin-top:8px; padding-top:8px; border-top:1px solid #1F2630; font-size:11px; font-family:monospace;">
            <span style="color:#6B7280;">Token / NFT Contract</span>
            <span style="color:#60A5FA;">${shortenAddress(analysis.contractAddress)}</span>
          </div>`
              : ''
          }
          ${
            analysis.targetSpender && analysis.targetSpender !== '0x0000000000000000000000000000000000000000'
              ? `
          <div style="display:flex; justify-content:space-between; margin-top:8px; padding-top:8px; border-top:1px solid #1F2630; font-size:11px; font-family:monospace;">
            <span style="color:#6B7280;">${analysis.intent.actionType === 'setApprovalForAll' ? 'Authorized Operator' : 'Target / Spender'}</span>
            <span style="color:#93C5FD;">${shortenAddress(analysis.targetSpender)}</span>
          </div>`
              : ''
          }

          ${
            analysis.decodedMessage
              ? `
          <div style="margin-top:8px; padding:8px; background:#11161D; border-radius:4px; border:1px solid #1F2630;">
            <div style="color:#9CA3AF; font-size:10px; font-family:monospace; margin-bottom:2px;">Decoded Message Text:</div>
            <div style="color:#E5E7EB; font-size:11px; font-family:monospace; word-break:break-all;">"${escapeHtml(analysis.decodedMessage)}"</div>
          </div>`
              : ''
          }

          ${
            analysis.typedDataDetails
              ? `
          <div style="margin-top:8px; padding:8px; background:#11161D; border-radius:4px; border:1px solid #1F2630; font-size:11px; font-family:monospace;">
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
              <span style="color:#9CA3AF;">EIP-712 Type:</span>
              <span style="color:#A78BFA; font-weight:600;">${escapeHtml(analysis.typedDataDetails.primaryType || '')}</span>
            </div>
            ${
              analysis.typedDataDetails.domainName
                ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
              <span style="color:#9CA3AF;">Domain:</span>
              <span style="color:#93C5FD;">${escapeHtml(analysis.typedDataDetails.domainName)}</span>
            </div>`
                : ''
            }
            ${
              analysis.typedDataDetails.spender
                ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
              <span style="color:#9CA3AF;">Permit Spender:</span>
              <span style="color:#FCA5A5;">${shortenAddress(analysis.typedDataDetails.spender)}</span>
            </div>`
                : ''
            }
          </div>`
              : ''
          }

          ${
            analysis.rawCalldata && analysis.rawCalldata.length > 2
              ? `
          <div style="margin-top:8px; padding-top:6px; border-top:1px solid #1F2630; font-size:10px; font-family:monospace; color:#6B7280; display:flex; justify-content:space-between;">
            <span>Calldata:</span>
            <span style="color:#9CA3AF;">${escapeHtml(analysis.rawCalldata.slice(0, 10))}... (${Math.floor((analysis.rawCalldata.length - 2) / 2)} bytes)</span>
          </div>`
              : ''
          }
        </div>

        <!-- Risk Factors -->
        ${
          analysis.reasons.length > 0
            ? `
        <div style="margin-bottom:14px;">
          <div style="font-size:10px; font-weight:700; color:#9CA3AF; text-transform:uppercase; font-family:monospace; margin-bottom:6px;">
            Key Risk Factors Identified (${analysis.reasons.length})
          </div>
          ${reasonsHtml}
        </div>`
            : ''
        }

        <!-- Explicit Safety Notice -->
        <div style="font-size:10px; color:#6B7280; text-align:center; padding:4px 8px; line-height:1.4;">
          🛡️ <strong>Safety Guarantee:</strong> Intercepted before wallet confirmation. Clicking <strong>Cancel</strong> aborts immediately with code 4001 without signing or broadcasting.
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="background:#0B0F14; padding:14px 18px; border-top:1px solid #1F2630; display:flex; gap:10px;">
        <button id="cs-block-btn" class="cs-btn" style="flex:1; padding:11px 16px; border-radius:8px; background:#DC2626; border:none; color:#FFFFFF; font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; cursor:pointer; transition:all 0.15s ease; display:flex; align-items:center; justify-content:center; gap:6px;">
          <span>🛑</span>
          <span>Cancel & Block Request</span>
        </button>
        <button id="cs-proceed-btn" class="cs-btn" style="padding:11px 16px; border-radius:8px; background:#1F2937; border:1px solid #374151; color:#D1D5DB; font-weight:600; font-size:11px; cursor:pointer; font-family:monospace; transition:all 0.15s ease;">
          Proceed to Wallet
        </button>
      </div>
    </div>
  `;

  shadow.innerHTML = '';
  shadow.appendChild(modalContainer);

  const blockBtn = modalContainer.querySelector('#cs-block-btn') as HTMLButtonElement;
  const proceedBtn = modalContainer.querySelector('#cs-proceed-btn') as HTMLButtonElement;

  let decisionMade = false;

  blockBtn?.addEventListener('click', () => {
    if (decisionMade) return;
    decisionMade = true;
    modalContainer.remove();
    onDecision('BLOCK');
  });

  proceedBtn?.addEventListener('click', () => {
    if (decisionMade) return;
    if (isCritical) {
      if (
        confirm(
          'CRITICAL SECURITY WARNING: This transaction exhibits confirmed drainer, unlimited withdrawal, or zero-consideration asset loss signatures. Are you sure you want to proceed?'
        )
      ) {
        decisionMade = true;
        modalContainer.remove();
        onDecision('PROCEED');
      }
    } else {
      decisionMade = true;
      modalContainer.remove();
      onDecision('PROCEED');
    }
  });
}

export function showThreatBanner(hostname: string, riskScore: number, explanation: string) {
  const shadow = ensureHostElement();

  if (shadow.getElementById('chainshield-threat-banner')) {
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'chainshield-threat-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100vw;
    background: #7F1D1D;
    color: #FEE2E2;
    padding: 10px 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 12px;
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    border-bottom: 1px solid #EF4444;
    pointer-events: auto;
    box-sizing: border-box;
  `;

  banner.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-size:16px;">⚠️</span>
      <span><strong>ChainShield Sentinel Warning:</strong> ${escapeHtml(hostname)} has a risk score of <strong>${riskScore}/100</strong>. ${escapeHtml(explanation)}</span>
    </div>
    <button id="cs-close-banner-btn" style="background:rgba(255,255,255,0.2); border:none; color:#FFFFFF; border-radius:4px; padding:4px 8px; font-size:11px; cursor:pointer; font-weight:bold;">
      Dismiss
    </button>
  `;

  shadow.appendChild(banner);

  const closeBtn = banner.querySelector('#cs-close-banner-btn');
  closeBtn?.addEventListener('click', () => banner.remove());
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || '0x0000...0000';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
