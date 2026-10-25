/**
 * ChainShield Sentinel In-Page EIP-1193 Provider Interceptor
 * Runs in the page's MAIN world context to wrap window.ethereum.request, send, and sendAsync.
 */

(function () {
  // Prevent double injection
  if ((window as any).__CHAINSHIELD_INPAGE_INJECTED__) {
    return;
  }
  (window as any).__CHAINSHIELD_INPAGE_INJECTED__ = true;

  let lastClickedText = '';
  let lastClickTime = 0;

  // Track recent user clicks on buttons, links, or action elements to capture "Claim", "Mint", "Swap", "Approve", etc.
  window.addEventListener(
    'click',
    (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const clickable = target.closest('button, a, [role="button"], input[type="submit"]');
        const text = (clickable ? clickable.textContent : target.textContent) || '';
        const trimmed = text.trim().replace(/\s+/g, ' ').slice(0, 100);
        if (trimmed) {
          lastClickedText = trimmed;
          lastClickTime = Date.now();
        }
      } catch {
        // ignore
      }
    },
    true
  );

  function getRecentClaimText(): string {
    if (Date.now() - lastClickTime < 15000 && lastClickedText) {
      return lastClickedText;
    }
    return document.title || '';
  }

  const INTERCEPTABLE_METHODS = new Set([
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sendRawTransaction',
    'wallet_sendCalls',
    'personal_sign',
    'eth_sign',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'wallet_switchEthereumChain',
    'wallet_addEthereumChain',
    'wallet_requestPermissions',
    'wallet_watchAsset',
  ]);

  function isValidEthereumAddress(address: any): boolean {
    return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address.trim());
  }

  function validateRequestAddresses(method: string, params: any[]): void {
    if (method === 'eth_sendTransaction' || method === 'eth_signTransaction') {
      const tx = params && params[0];
      if (tx && typeof tx === 'object') {
        if (tx.from !== undefined && tx.from !== null && !isValidEthereumAddress(tx.from)) {
          throw new Error(
            `Invalid parameters: 'from' must provide a valid Ethereum address (received: "${String(tx.from)}").`
          );
        }
        if (tx.to !== undefined && tx.to !== null && tx.to !== '' && !isValidEthereumAddress(tx.to)) {
          throw new Error(
            `Invalid parameters: 'to' must provide a valid Ethereum address (received: "${String(tx.to)}").`
          );
        }
      }
    } else if (method === 'wallet_sendCalls') {
      const calls = params && params[0]?.calls;
      if (Array.isArray(calls)) {
        for (let i = 0; i < calls.length; i++) {
          const call = calls[i];
          if (call && call.to && !isValidEthereumAddress(call.to)) {
            throw new Error(
              `Invalid parameters in batch call[${i}]: 'to' must provide a valid Ethereum address (received: "${String(call.to)}").`
            );
          }
        }
      }
    } else if (method === 'personal_sign') {
      const p0 = params[0];
      const p1 = params[1];
      const hasValidAddr = isValidEthereumAddress(p0) || isValidEthereumAddress(p1);
      if (!hasValidAddr) {
        const candidate = typeof p1 === 'string' ? p1 : typeof p0 === 'string' ? p0 : String(p1);
        throw new Error(
          `Invalid parameters: must provide an Ethereum address (received: "${candidate}").`
        );
      }
    } else if (method.startsWith('eth_signTypedData')) {
      const addr = params[0];
      if (!isValidEthereumAddress(addr)) {
        throw new Error(
          `Invalid parameters: must provide an Ethereum address (received: "${String(addr)}").`
        );
      }
    }
  }

  function sanitizeParamsForLogging(method: string, params: any[]) {
    if (!Array.isArray(params)) return { paramCount: 0 };
    if (method === 'eth_sendTransaction' || method === 'eth_signTransaction') {
      const tx = params[0] || {};
      return {
        paramCount: params.length,
        from: tx.from || '(omitted)',
        to: tx.to || '(contract creation)',
        value: tx.value || '0x0',
        dataLength: typeof tx.data === 'string' ? tx.data.length : 0,
        dataSelector: typeof tx.data === 'string' ? tx.data.slice(0, 10) : 'none',
      };
    }
    if (method === 'personal_sign') {
      return {
        paramCount: params.length,
        address: isValidEthereumAddress(params[1]) ? params[1] : isValidEthereumAddress(params[0]) ? params[0] : '(invalid)',
        messageLength: typeof params[0] === 'string' ? params[0].length : 0,
      };
    }
    if (method.startsWith('eth_signTypedData')) {
      let primaryType = 'unknown';
      let verifyingContract = 'unknown';
      try {
        const data = typeof params[1] === 'string' ? JSON.parse(params[1]) : params[1] || {};
        primaryType = data.primaryType || 'unknown';
        verifyingContract = data.domain?.verifyingContract || 'unknown';
      } catch {}
      return {
        paramCount: params.length,
        address: params[0],
        primaryType,
        verifyingContract,
      };
    }
    return { paramCount: params.length };
  }

  /**
   * RequestQueueManager: Prevents race conditions, handles double-clicks,
   * tracks active requests, and enforces bounded request timeouts.
   */
  class RequestQueueManager {
    private pendingRequests = new Map<
      string,
      {
        id: string;
        method: string;
        timestamp: number;
        resolve: (val: any) => void;
        reject: (err: any) => void;
        timeoutHandle: any;
      }
    >();

    private inFlightHash = new Map<string, Promise<any>>();

    // Deduplication hash for fast repeated clicks
    private computeFingerprint(method: string, params: any[]): string {
      try {
        const repr = typeof params === 'object' ? JSON.stringify(params).slice(0, 200) : String(params);
        return `${method}:${repr}`;
      } catch {
        return `${method}:${Date.now()}`;
      }
    }

    public checkExistingPromise(method: string, params: any[]): Promise<any> | null {
      const fp = this.computeFingerprint(method, params);
      const existing = this.inFlightHash.get(fp);
      if (existing) {
        return existing;
      }
      return null;
    }

    public register(
      id: string,
      method: string,
      params: any[],
      promise: Promise<any>,
      resolve: (val: any) => void,
      reject: (err: any) => void
    ) {
      const fp = this.computeFingerprint(method, params);
      this.inFlightHash.set(fp, promise);

      // 90s bounded timeout
      const timeoutHandle = setTimeout(() => {
        this.cleanup(id);
        const err: any = new Error('ChainShield Sentinel: Request timed out awaiting user decision.');
        err.code = 4001;
        reject(err);
      }, 90000);

      this.pendingRequests.set(id, {
        id,
        method,
        timestamp: Date.now(),
        resolve,
        reject,
        timeoutHandle,
      });

      promise
        .catch(() => {})
        .finally(() => {
          this.cleanup(id);
          this.inFlightHash.delete(fp);
        });
    }

    public get(id: string) {
      return this.pendingRequests.get(id);
    }

    public cleanup(id: string) {
      const entry = this.pendingRequests.get(id);
      if (entry) {
        clearTimeout(entry.timeoutHandle);
        this.pendingRequests.delete(id);
      }
    }
  }

  const queueManager = new RequestQueueManager();

  function wrapProvider(provider: any) {
    if (!provider) return;

    if (Array.isArray(provider.providers)) {
      provider.providers.forEach((p: any) => wrapProvider(p));
    }

    if (provider.__chainshield_wrapped__) {
      return;
    }

    const originalRequest = provider.request;
    if (typeof originalRequest !== 'function') {
      return;
    }

    provider.__chainshield_wrapped__ = true;

    provider.request = async function (args: { method: string; params?: any[] }) {
      if (!args || !args.method || !INTERCEPTABLE_METHODS.has(args.method)) {
        return originalRequest.apply(this, arguments as any);
      }

      // Check if this request is already tagged as internally approved / bypassed to avoid recursion
      if ((args as any).__chainshield_bypassed__) {
        delete (args as any).__chainshield_bypassed__;
        return originalRequest.apply(this, arguments as any);
      }

      // 1. Validate Ethereum addresses before forwarding or interception
      validateRequestAddresses(args.method, args.params || []);

      // 2. Double-click deduplication check
      const existingInFlight = queueManager.checkExistingPromise(args.method, args.params || []);
      if (existingInFlight) {
        console.log('[ChainShield Sentinel: InPage] Deduplicating rapid repeat request:', args.method);
        return existingInFlight;
      }

      const id = 'cs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const claimText = getRecentClaimText();
      const capturedArguments = arguments;
      const callerContext = this && this !== window ? this : provider;
      const chainId = provider.chainId || (provider.networkVersion ? '0x' + Number(provider.networkVersion).toString(16) : undefined);

      console.log('[ChainShield Sentinel: InPage] Request intercepted:', {
        id,
        method: args.method,
        chainId,
        ...sanitizeParamsForLogging(args.method, args.params || []),
      });

      // Post message to content script
      const requestPayload = {
        type: 'CHAINSHIELD_INPAGE_REQUEST',
        id,
        method: args.method,
        params: args.params || [],
        origin: window.location.origin,
        href: window.location.href,
        pageTitle: document.title,
        chainId,
        lastClaimText: claimText,
        timestamp: Date.now(),
      };

      let pendingResolve: (val: any) => void = () => {};
      let pendingReject: (err: any) => void = () => {};

      const requestPromise = new Promise((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;

        function responseListener(event: MessageEvent) {
          if (
            event.source !== window ||
            !event.data ||
            event.data.type !== 'CHAINSHIELD_INPAGE_RESPONSE' ||
            event.data.id !== id
          ) {
            return;
          }

          window.removeEventListener('message', responseListener);

          if (event.data.decision === 'PROCEED') {
            console.log('[ChainShield Sentinel: InPage] Proceed approved. Forwarding unmodified request to wallet provider:', {
              id,
              method: args.method,
            });

            // Mark internal bypass flag to prevent recursive interception
            (args as any).__chainshield_bypassed__ = true;

            originalRequest
              .apply(callerContext, capturedArguments as any)
              .then((result: any) => {
                console.log('[ChainShield Sentinel: InPage] Wallet provider confirmed transaction successfully.');
                resolve(result);
              })
              .catch((err: any) => {
                console.warn('[ChainShield Sentinel: InPage] Wallet provider error/rejection:', err?.message || err);
                reject(err);
              });
          } else {
            console.log('[ChainShield Sentinel: InPage] Request rejected/blocked. Aborting with EIP-1193 code 4001.');
            const err: any = new Error(
              event.data.reason || 'Transaction rejected by user via ChainShield Sentinel Pre-Sign Security.'
            );
            err.code = 4001; // EIP-1193 standard user-rejected action
            reject(err);
          }
        }

        window.addEventListener('message', responseListener);
      });

      queueManager.register(id, args.method, args.params || [], requestPromise, pendingResolve, pendingReject);

      // Post message to content script
      window.postMessage(requestPayload, '*');

      return requestPromise;
    };

    // Also wrap legacy sendAsync if present
    if (typeof provider.sendAsync === 'function' && !provider.sendAsync.__chainshield_wrapped__) {
      const originalSendAsync = provider.sendAsync;
      provider.sendAsync = function (payload: any, callback: any) {
        if (!payload || !payload.method || !INTERCEPTABLE_METHODS.has(payload.method)) {
          return originalSendAsync.apply(this, arguments as any);
        }

        provider
          .request({ method: payload.method, params: payload.params })
          .then((result: any) => {
            if (typeof callback === 'function') {
              callback(null, { id: payload.id, jsonrpc: '2.0', result });
            }
          })
          .catch((error: any) => {
            if (typeof callback === 'function') {
              callback(error);
            }
          });
      };
      provider.sendAsync.__chainshield_wrapped__ = true;
    }

    // Also wrap legacy send if present
    if (typeof provider.send === 'function' && !provider.send.__chainshield_wrapped__) {
      const originalSend = provider.send;
      provider.send = function (methodOrPayload: any, params?: any) {
        if (typeof methodOrPayload === 'string' && INTERCEPTABLE_METHODS.has(methodOrPayload)) {
          return provider.request({ method: methodOrPayload, params: Array.isArray(params) ? params : [] });
        }
        if (typeof methodOrPayload === 'object' && methodOrPayload?.method && INTERCEPTABLE_METHODS.has(methodOrPayload.method)) {
          return provider.request({ method: methodOrPayload.method, params: methodOrPayload.params || [] });
        }
        return originalSend.apply(this, arguments as any);
      };
      provider.send.__chainshield_wrapped__ = true;
    }
  }

  // 1. Wrap window.ethereum if already defined
  if ((window as any).ethereum) {
    wrapProvider((window as any).ethereum);
  }

  // 2. Wrap via property descriptor in case wallet injects later
  let currentEthereum = (window as any).ethereum;
  try {
    Object.defineProperty(window, 'ethereum', {
      configurable: true,
      enumerable: true,
      get() {
        return currentEthereum;
      },
      set(val) {
        currentEthereum = val;
        wrapProvider(val);
      },
    });
  } catch {
    // If window.ethereum is non-configurable, fallback to event/poll
  }

  // 3. EIP-6963 provider announcement listener (MetaMask, Rabby, Coinbase, Brave, etc.)
  window.addEventListener('eip6963:announceProvider', (event: any) => {
    if (event && event.detail && event.detail.provider) {
      wrapProvider(event.detail.provider);
    }
  });

  // 4. MetaMask initialization event
  window.addEventListener('ethereum#initialized', () => {
    if ((window as any).ethereum) {
      wrapProvider((window as any).ethereum);
    }
  });

  // 5. Fallback interval check for slow extensions
  let pollAttempts = 0;
  const pollInterval = setInterval(() => {
    pollAttempts++;
    if ((window as any).ethereum) {
      wrapProvider((window as any).ethereum);
    }
    if (pollAttempts > 30) {
      clearInterval(pollInterval);
    }
  }, 100);

  console.log('[ChainShield Sentinel] In-Page EIP-1193 pre-sign interceptor active.');
})();
