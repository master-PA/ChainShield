/**
 * ChainShield Sentinel In-Page EIP-1193 Provider Interceptor
 * Runs in the page's MAIN world context to wrap window.ethereum.request.
 */

(function () {
  // Prevent double injection
  if ((window as any).__CHAINSHIELD_INPAGE_INJECTED__) {
    return;
  }
  (window as any).__CHAINSHIELD_INPAGE_INJECTED__ = true;

  let lastClickedText = '';
  let lastClickTime = 0;

  // Track recent user clicks on buttons, links, or action elements to capture "Claim", "Mint", etc.
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
    // Only use click text if it happened within the last 15 seconds
    if (Date.now() - lastClickTime < 15000 && lastClickedText) {
      return lastClickedText;
    }
    return document.title || '';
  }

  const INTERCEPTABLE_METHODS = new Set([
    'eth_sendTransaction',
    'eth_signTransaction',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ]);

  function wrapProvider(provider: any) {
    if (!provider) return;

    // Handle multiple providers array if present (MetaMask + Coinbase + Rabby)
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

      const id = 'cs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const claimText = getRecentClaimText();
      const capturedArguments = arguments;
      const callerContext = this && this !== window ? this : provider;

      // Post message to content script
      const requestPayload = {
        type: 'CHAINSHIELD_INPAGE_REQUEST',
        id,
        method: args.method,
        params: args.params || [],
        origin: window.location.origin,
        href: window.location.href,
        pageTitle: document.title,
        lastClaimText: claimText,
        timestamp: Date.now(),
      };

      window.postMessage(requestPayload, '*');

      return new Promise((resolve, reject) => {
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
            originalRequest
              .apply(callerContext, capturedArguments as any)
              .then(resolve)
              .catch(reject);
          } else {
            const err: any = new Error(
              event.data.reason || 'Transaction rejected by user via ChainShield Sentinel Pre-Sign Security.'
            );
            err.code = 4001; // EIP-1193 standard user-rejected action
            reject(err);
          }
        }

        window.addEventListener('message', responseListener);
      });
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
