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
      ? '#a82642'
      : analysis.riskLevel === 'HIGH'
      ? '#c2570c'
      : analysis.riskLevel === 'CAUTION'
      ? '#8a5a10'
      : '#166b45';

  const badgeBg =
    analysis.riskLevel === 'CRITICAL'
      ? '#fce8ec'
      : analysis.riskLevel === 'HIGH'
      ? '#fdebdd'
      : analysis.riskLevel === 'CAUTION'
      ? '#fbf1dc'
      : '#e4f2ea';

  const badgeBorder =
    analysis.riskLevel === 'CRITICAL'
      ? 'rgba(168, 38, 66, 0.3)'
      : analysis.riskLevel === 'HIGH'
      ? 'rgba(194, 87, 12, 0.3)'
      : analysis.riskLevel === 'CAUTION'
      ? 'rgba(180, 121, 27, 0.3)'
      : 'rgba(34, 122, 85, 0.22)';

  const reasonsHtml = analysis.reasons
    .slice(0, 5)
    .map(
      (r) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:9px 12px; background:#f5f7f5; border:1px solid rgba(19, 33, 26, 0.09); border-radius:8px; font-size:11.5px; margin-bottom:6px;">
        <span style="color:#3b4a42; font-weight:500; max-width:80%; line-height:1.35;">${escapeHtml(r.description)}</span>
        <span style="color:${r.points >= 30 ? '#a82642' : '#8a5a10'}; font-weight:700; font-family:'JetBrains Mono', monospace;">+${r.points}</span>
      </div>`
    )
    .join('');

  const mismatchHtml = analysis.mismatch
    ? `
    <div style="background:#fce8ec; border:1px solid rgba(168, 38, 66, 0.3); border-radius:10px; padding:13px 15px; margin-bottom:12px;">
      <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#a82642; text-transform:uppercase; font-family:'JetBrains Mono', monospace;">
        <span>⚠️ Intent Mismatch (${analysis.mismatch.mismatchScore}/100)</span>
      </div>
      <div style="font-size:12px; color:#13211a; margin-top:4px; line-height:1.45;">
        ${escapeHtml(analysis.mismatch.explanation)}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; font-size:11px; font-family:'JetBrains Mono', monospace;">
        <div style="background:#ffffff; padding:7px 10px; border-radius:6px; border:1px solid rgba(19, 33, 26, 0.09);">
          <span style="color:#6a7a71; display:block; font-size:10px;">Page Claimed</span>
          <span style="color:#3e63dd; font-weight:600;">"${escapeHtml(analysis.mismatch.claimedText)}"</span>
        </div>
        <div style="background:#ffffff; padding:7px 10px; border-radius:6px; border:1px solid rgba(19, 33, 26, 0.09);">
          <span style="color:#6a7a71; display:block; font-size:10px;">Actual Action</span>
          <span style="color:#a82642; font-weight:600;">${escapeHtml(analysis.mismatch.actualAction)}</span>
        </div>
      </div>
    </div>`
    : '';

  // Degraded mode alert if scanner backend is unavailable
  const degradedHtml = analysis.degradedMode
    ? `
    <div style="background:#fbf1dc; border:1px solid rgba(180, 121, 27, 0.3); border-radius:10px; padding:12px 14px; margin-bottom:12px;">
      <div style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#8a5a10; text-transform:uppercase; font-family:'JetBrains Mono', monospace;">
        <span>⚠️ DEGRADED MODE: Scanner Unavailable</span>
      </div>
      <div style="font-size:11.5px; color:#3b4a42; margin-top:3px; line-height:1.45;">
        External smart contract security API could not be reached. Local heuristic analysis was performed, but contract source code could not be verified on-chain.
      </div>
    </div>`
    : '';

  // Seaport Order details if present
  const seaportHtml = analysis.seaportDetails
    ? `
    <div style="background:#f5f7f5; border:1px solid ${analysis.seaportDetails.isZeroConsiderationRisk ? 'rgba(168, 38, 66, 0.4)' : 'rgba(19, 33, 26, 0.09)'}; border-radius:10px; padding:12px 14px; margin-bottom:12px; font-size:11px; font-family:'JetBrains Mono', monospace;">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="color:#6e56cf; font-weight:700;">OpenSea Seaport Order</span>
        <span style="color:#6a7a71;">Off-Chain Signature</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#6a7a71;">Offered Items:</span>
        <span style="color:#13211a; font-weight:600;">${analysis.seaportDetails.offerCount} asset(s)</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#6a7a71;">Consideration Received:</span>
        <span style="color:${analysis.seaportDetails.isZeroConsiderationRisk ? '#a82642' : '#166b45'}; font-weight:600;">
          ${analysis.seaportDetails.isZeroConsiderationRisk ? '0 (FREE GIVEAWAY / DRAINER)' : `${analysis.seaportDetails.considerationCount} item(s)`}
        </span>
      </div>
      <div style="font-size:10.5px; color:#6a7a71; margin-top:6px; font-family:'Plus Jakarta Sans', system-ui, sans-serif;">
        ℹ️ Note: This signs an off-chain listing or offer. It does not transfer tokens or approve contracts on-chain immediately.
      </div>
    </div>`
    : '';

  // Batch calls if present
  const batchCallsHtml =
    analysis.batchCalls && analysis.batchCalls.length > 0
      ? `
    <div style="background:#f5f7f5; border:1px solid rgba(19, 33, 26, 0.09); border-radius:10px; padding:12px 14px; margin-bottom:12px; font-size:11px; font-family:'JetBrains Mono', monospace;">
      <div style="color:#227a55; font-weight:700; margin-bottom:6px;">Smart Account Batched Calls (${analysis.batchCalls.length})</div>
      ${analysis.batchCalls
        .slice(0, 3)
        .map(
          (c, idx) => `
        <div style="padding:6px 0; border-top:${idx > 0 ? '1px solid rgba(19, 33, 26, 0.09)' : 'none'}; font-size:10.5px;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#6a7a71;">Call #${idx + 1} Target:</span>
            <span style="color:#227a55; font-weight:600;">${shortenAddress(c.to)}</span>
          </div>
          <div style="color:${c.isUnlimited ? '#a82642' : '#13211a'}; margin-top:2px;">
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
      ? '#e4f2ea'
      : analysis.coverageStatus === 'PARTIALLY_ANALYZED'
      ? '#fbf1dc'
      : '#fce8ec';

  const coverageBadgeColor =
    analysis.coverageStatus === 'FULLY_INTERCEPTED'
      ? '#166b45'
      : analysis.coverageStatus === 'PARTIALLY_ANALYZED'
      ? '#8a5a10'
      : '#a82642';

  const coverageBadgeBorder =
    analysis.coverageStatus === 'FULLY_INTERCEPTED'
      ? 'rgba(34, 122, 85, 0.22)'
      : analysis.coverageStatus === 'PARTIALLY_ANALYZED'
      ? 'rgba(180, 121, 27, 0.3)'
      : 'rgba(168, 38, 66, 0.3)';

  const modalContainer = document.createElement('div');
  modalContainer.id = 'chainshield-modal-container';
  modalContainer.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(19, 33, 26, 0.55);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    font-family: "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 16px;
    box-sizing: border-box;
    animation: csFadeIn 0.15s ease-out;
  `;

  modalContainer.innerHTML = `
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap");
      @keyframes csFadeIn {
        from { opacity: 0; transform: scale(0.98); }
        to { opacity: 1; transform: scale(1); }
      }
      .cs-btn { transition: all 0.15s ease; }
      .cs-btn:hover { filter: brightness(0.96); transform: translateY(-1px); }
      .cs-btn:active { transform: translateY(0); }
    </style>
    <div style="background:#ffffff; border:1px solid ${isCritical ? 'rgba(214, 69, 95, 0.4)' : 'rgba(34, 122, 85, 0.25)'}; border-radius:16px; width:100%; max-width:490px; box-shadow:0 25px 60px -15px rgba(19, 33, 26, 0.25), 0 0 0 1px rgba(19, 33, 26, 0.05); overflow:hidden; display:flex; flex-direction:column; box-sizing:border-box;">
      <!-- Header -->
      <div style="background:#f5f7f5; padding:15px 20px; border-bottom:1px solid rgba(19, 33, 26, 0.09); display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:32px; height:32px; border-radius:8px; background:#e4f2ea; border:1px solid rgba(34, 122, 85, 0.22); display:flex; align-items:center; justify-content:center; font-size:15px;">🛡️</div>
          <div>
            <div style="font-size:13px; font-weight:800; color:#13211a; letter-spacing:-0.01em; font-family:'Plus Jakarta Sans', system-ui, sans-serif;">CHAINSHIELD SENTINEL</div>
            <div style="font-size:10.5px; color:#6a7a71; margin-top:1px; font-weight:500;">Security Gate • Pre-Sign Interception</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="background:${coverageBadgeBg}; color:${coverageBadgeColor}; border:1px solid ${coverageBadgeBorder}; padding:3px 9px; border-radius:9999px; font-size:10px; font-weight:700; font-family:'JetBrains Mono', monospace;">
            ${coverageBadgeText}
          </div>
          <div style="background:${badgeBg}; color:${badgeColor}; border:1px solid ${badgeBorder}; padding:4px 10px; border-radius:9999px; font-size:11px; font-weight:800; font-family:'JetBrains Mono', monospace; display:flex; align-items:center; gap:5px;">
            <span>${analysis.riskLevel}</span>
            <span style="opacity:0.6;">•</span>
            <span>${analysis.riskScore}/100</span>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:18px 20px; max-height:75vh; overflow-y:auto; box-sizing:border-box;">
        ${degradedHtml}

        <!-- Recommendation -->
        <div style="background:${isCritical ? '#fce8ec' : '#e4f2ea'}; border:1px solid ${isCritical ? 'rgba(168, 38, 66, 0.3)' : 'rgba(34, 122, 85, 0.22)'}; border-radius:10px; padding:13px 15px; margin-bottom:14px;">
          <div style="font-size:11px; font-weight:800; color:${isCritical ? '#a82642' : '#166b45'}; text-transform:uppercase; font-family:'JetBrains Mono', monospace; letter-spacing:0.03em;">
            GATE DECISION: ${escapeHtml(analysis.securityGateDecision)} • ${escapeHtml(analysis.recommendation)}
          </div>
          <div style="font-size:12px; color:#13211a; margin-top:4px; line-height:1.45; font-weight:500;">
            ${escapeHtml(analysis.recommendationText)}
          </div>
        </div>

        ${mismatchHtml}
        ${seaportHtml}
        ${batchCallsHtml}

        <!-- Decoded Intent -->
        <div style="background:#f5f7f5; border:1px solid rgba(19, 33, 26, 0.09); border-radius:10px; padding:14px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:10.5px; font-weight:700; color:#6a7a71; text-transform:uppercase; font-family:'JetBrains Mono', monospace; letter-spacing:0.04em;">
              Decoded Request Intent
            </span>
            <span style="background:#e4f2ea; color:#165a3d; border:1px solid rgba(34, 122, 85, 0.22); font-size:10px; padding:2px 7px; border-radius:4px; font-family:'JetBrains Mono', monospace; font-weight:600;">
              ${escapeHtml(analysis.methodName)}
            </span>
          </div>
          <div style="font-size:13px; font-weight:700; color:#13211a; line-height:1.45;">
            ${escapeHtml(analysis.intent.plainEnglish)}
          </div>

          ${
            analysis.contractAddress &&
            analysis.contractAddress !== analysis.targetSpender &&
            analysis.contractAddress !== '0x0000000000000000000000000000000000000000'
              ? `
          <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:8px; border-top:1px solid rgba(19, 33, 26, 0.09); font-size:11px; font-family:'JetBrains Mono', monospace;">
            <span style="color:#6a7a71;">Token / NFT Contract</span>
            <span style="color:#227a55; font-weight:600;">${shortenAddress(analysis.contractAddress)}</span>
          </div>`
              : ''
          }
          ${
            analysis.targetSpender && analysis.targetSpender !== '0x0000000000000000000000000000000000000000'
              ? `
          <div style="display:flex; justify-content:space-between; margin-top:8px; padding-top:8px; border-top:1px solid rgba(19, 33, 26, 0.09); font-size:11px; font-family:'JetBrains Mono', monospace;">
            <span style="color:#6a7a71;">${analysis.intent.actionType === 'setApprovalForAll' ? 'Authorized Operator' : 'Target / Spender'}</span>
            <span style="color:#227a55; font-weight:600;">${shortenAddress(analysis.targetSpender)}</span>
          </div>`
              : ''
          }

          ${
            analysis.decodedMessage
              ? `
          <div style="margin-top:10px; padding:9px 12px; background:#ffffff; border-radius:6px; border:1px solid rgba(19, 33, 26, 0.09);">
            <div style="color:#6a7a71; font-size:10px; font-family:'JetBrains Mono', monospace; margin-bottom:2px;">Decoded Message Text:</div>
            <div style="color:#13211a; font-size:11.5px; font-family:'JetBrains Mono', monospace; word-break:break-all;">"${escapeHtml(analysis.decodedMessage)}"</div>
          </div>`
              : ''
          }

          ${
            analysis.typedDataDetails
              ? `
          <div style="margin-top:10px; padding:9px 12px; background:#ffffff; border-radius:6px; border:1px solid rgba(19, 33, 26, 0.09); font-size:11px; font-family:'JetBrains Mono', monospace;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:#6a7a71;">EIP-712 Type:</span>
              <span style="color:#6e56cf; font-weight:600;">${escapeHtml(analysis.typedDataDetails.primaryType || '')}</span>
            </div>
            ${
              analysis.typedDataDetails.domainName
                ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:#6a7a71;">Domain:</span>
              <span style="color:#227a55; font-weight:600;">${escapeHtml(analysis.typedDataDetails.domainName)}</span>
            </div>`
                : ''
            }
            ${
              analysis.typedDataDetails.spender
                ? `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="color:#6a7a71;">Permit Spender:</span>
              <span style="color:#a82642; font-weight:600;">${shortenAddress(analysis.typedDataDetails.spender)}</span>
            </div>`
                : ''
            }
          </div>`
              : ''
          }

          ${
            analysis.rawCalldata && analysis.rawCalldata.length > 2
              ? `
          <div style="margin-top:10px; padding-top:8px; border-top:1px solid rgba(19, 33, 26, 0.09); font-size:10.5px; font-family:'JetBrains Mono', monospace; color:#6a7a71; display:flex; justify-content:space-between;">
            <span>Calldata:</span>
            <span style="color:#3b4a42;">${escapeHtml(analysis.rawCalldata.slice(0, 10))}... (${Math.floor((analysis.rawCalldata.length - 2) / 2)} bytes)</span>
          </div>`
              : ''
          }
        </div>

        <!-- Risk Factors -->
        ${
          analysis.reasons.length > 0
            ? `
        <div style="margin-bottom:14px;">
          <div style="font-size:10.5px; font-weight:700; color:#6a7a71; text-transform:uppercase; font-family:'JetBrains Mono', monospace; margin-bottom:6px; letter-spacing:0.04em;">
            Key Risk Factors Identified (${analysis.reasons.length})
          </div>
          ${reasonsHtml}
        </div>`
            : ''
        }

        <!-- Explicit Safety Notice -->
        <div style="font-size:10.5px; color:#6a7a71; text-align:center; padding:4px 8px; line-height:1.45;">
          🛡️ <strong>Safety Guarantee:</strong> Intercepted before wallet confirmation. Clicking <strong>Cancel</strong> aborts immediately with code 4001 without signing or broadcasting.
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="background:#f5f7f5; padding:14px 20px; border-top:1px solid rgba(19, 33, 26, 0.09); display:flex; gap:10px;">
        <button id="cs-block-btn" class="cs-btn" style="flex:1; padding:11px 16px; border-radius:8px; background:#d6455f; border:none; color:#ffffff; font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 1px 2px rgba(214,69,95,0.2);">
          <span>🛑</span>
          <span>Cancel & Block Request</span>
        </button>
        <button id="cs-proceed-btn" class="cs-btn" style="padding:11px 18px; border-radius:8px; background:#ffffff; border:1px solid rgba(19, 33, 26, 0.16); color:#3b4a42; font-weight:600; font-size:11.5px; cursor:pointer; font-family:'JetBrains Mono', monospace;">
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
    decisionMade = true;
    modalContainer.remove();
    onDecision('PROCEED');
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
    background: #fce8ec;
    color: #a82642;
    padding: 11px 20px;
    font-family: "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12.5px;
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 16px rgba(19, 33, 26, 0.08);
    border-bottom: 1px solid rgba(168, 38, 66, 0.3);
    pointer-events: auto;
    box-sizing: border-box;
  `;

  banner.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size:16px;">⚠️</span>
      <span><strong style="color:#8e1f36;">ChainShield Sentinel Warning:</strong> ${escapeHtml(hostname)} has a risk score of <strong>${riskScore}/100</strong>. ${escapeHtml(explanation)}</span>
    </div>
    <button id="cs-close-banner-btn" style="background:rgba(168,38,66,0.1); border:1px solid rgba(168,38,66,0.25); color:#a82642; border-radius:6px; padding:4px 10px; font-size:11.5px; cursor:pointer; font-weight:700; font-family:inherit;">
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
