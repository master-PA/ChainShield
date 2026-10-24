import React, { useState } from 'react';
import { Code2, Key, Copy, Check, Terminal, ExternalLink, Zap } from 'lucide-react';

export const Developers: React.FC = () => {
  const [apiKey, setApiKey] = useState('cs_live_9941a80c944b209e89d10e09210ab2e1');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const sampleCurl = `curl -X POST https://api.chainshield.sentinel/v1/scans/target \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"target": "https://mintzone-nft.xyz", "link_source": "telegram_dm"}'`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Public API Documentation (v1)</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            RESTful endpoints, rate limits, and authentication for automated Web3 security scans
          </p>
        </div>
      </div>

      {/* API Key Management */}
      <div className="p-5 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-teal-400" />
            <h2 className="text-xs font-semibold text-zinc-200">Production API Key</h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
            Rate Limit: 1,000 req/min
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={apiKey}
            className="flex-1 bg-[#0E131A] border border-[#1F2630] rounded-md px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(apiKey);
              setCopiedKey(true);
              setTimeout(() => setCopiedKey(false), 2000);
            }}
            className="px-3 py-2 rounded text-xs font-mono bg-[#161D26] hover:bg-[#1F2634] text-zinc-200 border border-[#1F2630] transition-colors flex items-center space-x-1.5 shrink-0"
          >
            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
          </button>
        </div>
      </div>

      {/* Quick Start cURL */}
      <div className="p-5 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-200">Target Risk Check (cURL Example)</h3>
          <button
            onClick={() => {
              navigator.clipboard.writeText(sampleCurl);
              setCopiedCurl(true);
              setTimeout(() => setCopiedCurl(false), 2000);
            }}
            className="text-[11px] font-mono text-teal-400 hover:underline flex items-center gap-1"
          >
            {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
          </button>
        </div>

        <pre className="p-3 rounded bg-[#0E131A] border border-[#1F2630] text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
          {sampleCurl}
        </pre>
      </div>

      {/* Endpoints Reference */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-200">Available Public Endpoints</h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 rounded bg-[#11161D] border border-[#1F2630] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[10px]">
                POST
              </span>
              <span className="text-zinc-200">/api/v1/scans/target</span>
            </div>
            <span className="text-zinc-500 font-sans">Full domain & URL heuristics check</span>
          </div>

          <div className="p-3 rounded bg-[#11161D] border border-[#1F2630] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[10px]">
                POST
              </span>
              <span className="text-zinc-200">/api/v1/scans/transaction</span>
            </div>
            <span className="text-zinc-500 font-sans">Calldata decode, intent & simulation</span>
          </div>

          <div className="p-3 rounded bg-[#11161D] border border-[#1F2630] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="px-1.5 py-0.5 rounded bg-teal-950 text-teal-400 font-bold text-[10px]">
                GET
              </span>
              <span className="text-zinc-200">/api/v1/privacy/check/:prefix</span>
            </div>
            <span className="text-zinc-500 font-sans">8-hex prefix k-anonymity host check</span>
          </div>

          <div className="p-3 rounded bg-[#11161D] border border-[#1F2630] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="px-1.5 py-0.5 rounded bg-teal-950 text-teal-400 font-bold text-[10px]">
                GET
              </span>
              <span className="text-zinc-200">/api/v1/wallet/:address/health</span>
            </div>
            <span className="text-zinc-500 font-sans">Wallet health score & active allowances</span>
          </div>
        </div>
      </div>
    </div>
  );
};
