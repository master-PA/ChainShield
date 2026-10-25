/**
 * ChainShield Sentinel — Provider Bridge
 *
 * Secure communication bridge connecting:
 * - MAIN world inpage provider wrapper (inpage.ts)
 * - ISOLATED world security analysis & overlay gate (contentScript.ts)
 *
 * Invariants:
 * 1. Validates sender window and origin.
 * 2. Skips opaque-origin ('null') sandboxed iframes.
 * 3. Enforces structured diagnostics across all 7 pipeline stages.
 * 4. Never logs signatures, private keys, or raw sensitive payloads.
 */

import { InterceptRequestPayload, InterceptResponsePayload } from '../shared/types';

export const BRIDGE_MESSAGE_TYPES = {
  REQUEST: 'CHAINSHIELD_INPAGE_REQUEST' as const,
  RESPONSE: 'CHAINSHIELD_INPAGE_RESPONSE' as const,
};

export type DiagnosticStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Format and log structured diagnostics across the 7 stages of request lifecycle.
 * Uses correlation ID and strictly sanitizes data.
 */
export function logDiagnostic(
  stage: DiagnosticStage,
  id: string,
  details: {
    walletType?: string;
    isTop?: boolean;
    origin?: string;
    targetOrigin?: string;
    method?: string;
    riskScore?: number;
    riskLevel?: string;
    decision?: string;
    showingUI?: boolean;
    action?: 'PROCEED' | 'CANCEL';
    reason?: string;
    [key: string]: any;
  }
): void {
  switch (stage) {
    case 1:
      console.log(
        `[ChainShield:Stage1:ProviderWrapped] Provider wrapper initialized. Type: ${details.walletType || 'EIP1193Provider'}, Frame: ${details.isTop ? 'top' : 'iframe'}, Origin: ${details.origin || 'unknown'}`
      );
      break;
    case 2:
      console.log(
        `[ChainShield:Stage2:RequestCalled] id=${id} method=${details.method || 'unknown'}`
      );
      break;
    case 3:
      console.log(
        `[ChainShield:Stage3:BridgeSent] id=${id} method=${details.method || 'unknown'} targetOrigin=${details.targetOrigin || '*'}`
      );
      break;
    case 4:
      console.log(
        `[ChainShield:Stage4:BridgeReceived] id=${id} method=${details.method || 'unknown'} origin=${details.origin || 'unknown'}`
      );
      break;
    case 5:
      console.log(
        `[ChainShield:Stage5:AnalysisComplete] id=${id} method=${details.method || 'unknown'} riskScore=${details.riskScore ?? 0} riskLevel=${details.riskLevel || 'LOW'} decision=${details.decision || 'ALLOW'}`
      );
      break;
    case 6:
      console.log(
        `[ChainShield:Stage6:UIReceived] id=${id} method=${details.method || 'unknown'} decision=${details.decision || 'ALLOW'} showingUI=${Boolean(details.showingUI)}`
      );
      break;
    case 7:
      console.log(
        `[ChainShield:Stage7:ForwardOrReject] id=${id} action=${details.action || 'PROCEED'} method=${details.method || 'unknown'}`
      );
      break;
  }
}

/**
 * Inspects frame window to determine if the frame can be safely supported for pre-sign interception.
 * Sandboxed frames with opaque origin ('null') cannot be attributed to a verified domain and are rejected.
 */
export function inspectFrameSupport(win: Window): {
  isSupported: boolean;
  origin: string;
  isTop: boolean;
  reason?: string;
} {
  const isTop = win.top === win;
  let origin = 'null';

  try {
    origin = win.location?.origin || 'null';
  } catch {
    origin = 'null';
  }

  // Opaque origin check (sandboxed iframes without allow-same-origin, or about:blank)
  if (!origin || origin === 'null' || win.location?.protocol === 'about:') {
    return {
      isSupported: false,
      origin: 'null',
      isTop,
      reason: 'Sandboxed opaque frame (origin: null) cannot be securely attributed to a verified Web3 origin.',
    };
  }

  // Supported HTTP/HTTPS origin
  if (origin.startsWith('http://') || origin.startsWith('https://')) {
    return {
      isSupported: true,
      origin,
      isTop,
    };
  }

  return {
    isSupported: false,
    origin,
    isTop,
    reason: `Unsupported protocol (${win.location?.protocol || 'unknown'}).`,
  };
}

/**
 * Schema validation for inpage request payloads coming from the page world.
 */
export function validateBridgeRequest(data: any): data is InterceptRequestPayload {
  if (!data || typeof data !== 'object') return false;
  if (data.type !== BRIDGE_MESSAGE_TYPES.REQUEST) return false;
  if (typeof data.id !== 'string' || !data.id.startsWith('cs_')) return false;
  if (typeof data.method !== 'string' || !data.method) return false;
  if (!Array.isArray(data.params)) return false;
  return true;
}

/**
 * Schema validation for response payloads returning from the isolated content script.
 */
export function validateBridgeResponse(data: any): data is InterceptResponsePayload {
  if (!data || typeof data !== 'object') return false;
  if (data.type !== BRIDGE_MESSAGE_TYPES.RESPONSE) return false;
  if (typeof data.id !== 'string' || !data.id.startsWith('cs_')) return false;
  if (data.decision !== 'PROCEED' && data.decision !== 'BLOCK') return false;
  return true;
}
