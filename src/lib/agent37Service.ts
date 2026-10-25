import { answerSupportQuery } from './chatbotEngine';

export interface Agent37ChatResponse {
  answer: string;
  sessionId?: string;
  isAi: boolean;
  agent: string;
  confidence?: number;
  categoryLabel?: string;
  action?: { label: string; route: string };
  suggestedTopics?: { label: string; question: string }[];
}

let activeSessionId: string | undefined = undefined;

export function getActiveSessionId(): string | undefined {
  return activeSessionId;
}

export function resetAgent37Session(): void {
  activeSessionId = undefined;
}

/**
 * Queries the Agent 37 Hermes cloud AI runner via the /api/v1/agent37/chat gateway.
 * Falls back to local deterministic KB if offline or on unexpected error.
 */
export async function askAgent37(
  userQuery: string,
  options?: {
    language?: 'en' | 'hinglish';
    systemContext?: string;
    useAi?: boolean;
  }
): Promise<Agent37ChatResponse> {
  const language = options?.language || 'en';
  const useAi = options?.useAi !== false;

  if (useAi) {
    const systemPrompt =
      options?.systemContext ||
      'You are Hermes, the official AI Web3 Security Sentinel for ChainShield. ' +
        'Answer concisely, accurately, and professionally. Focus on EVM security, token approvals, smart contract safety, and phishing defense. ' +
        (language === 'hinglish' ? 'Respond in natural, friendly Hinglish (Hindi + English mix).' : 'Respond in clear English.');

    const promptInput = systemPrompt + '\n\nUser Question: ' + userQuery;

    try {
      const res = await fetch('/api/v1/agent37/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: promptInput,
          sessionId: activeSessionId,
          reasoningEffort: 'low',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.data?.outputText) {
          if (data.data.sessionId) {
            activeSessionId = data.data.sessionId;
          }

          return {
            answer: data.data.outputText.trim(),
            sessionId: data.data.sessionId,
            isAi: true,
            agent: data.data.agent || 'hermes',
            categoryLabel: 'Agent 37 • Hermes AI',
            confidence: 0.98,
          };
        }
      }
    } catch (err) {
      console.warn('[Agent37 Service] Cloud AI unreachable, falling back to local KB:', err);
    }
  }

  // Graceful fallback to supervised deterministic KB
  const fallback = answerSupportQuery(userQuery, language);
  return {
    answer: fallback.answerText,
    isAi: false,
    agent: 'local-kb',
    categoryLabel: fallback.categoryLabel,
    confidence: fallback.confidence,
    action: fallback.action,
    suggestedTopics: fallback.suggestedTopics,
  };
}

/**
 * Uses Agent 37 to generate an executive AI smart contract vulnerability assessment.
 */
export async function auditContractWithAgent37(
  address: string,
  chainName: string,
  findings: string[],
  sourceSnippet?: string
): Promise<string> {
  const prompt =
    'You are Hermes, the AI Security Auditor for ChainShield.\n' +
    'Perform an executive security assessment for contract: ' + address + ' on ' + chainName + '.\n' +
    'Detected Automated Findings:\n' + findings.map((f, i) => String(i + 1) + '. ' + f).join('\n') + '\n' +
    (sourceSnippet ? '\nCode Excerpt:\n' + sourceSnippet.slice(0, 1500) + '\n' : '') +
    '\nProvide:\n1. Executive Summary of Risk\n2. Real-World Attack Scenario\n3. Exact Remediation Advice\nKeep it structured, clear, and concise.';

  try {
    const res = await fetch('/api/v1/agent37/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: prompt,
        reasoningEffort: 'low',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.data?.outputText) {
        return data.data.outputText;
      }
    }
  } catch (err) {
    console.warn('[Agent37 Service] Audit AI call failed:', err);
  }

  return 'Agent 37 AI Audit is temporarily unavailable. Please refer to the automated rule-based findings above.';
}