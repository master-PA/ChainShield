import { CHATBOT_KNOWLEDGE_BASE, KBEntry } from '../data/chatbotKB';

export interface ChatAnswerResult {
  matchedEntry?: KBEntry;
  answerText: string;
  categoryLabel?: string;
  confidence: number;
  detectedEntities?: {
    addresses: string[];
    urls: string[];
    txHashes: string[];
  };
  suggestedTopics?: Array<{ label: string; question: string }>;
  action?: {
    label: string;
    route: string;
  };
}

function tokenize(text: string): Set<string> {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
  return new Set(words);
}

function cosineJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

export function answerSupportQuery(userQuery: string, language: 'en' | 'hinglish' = 'en'): ChatAnswerResult {
  const query = userQuery.trim();
  const queryTokens = tokenize(query);

  // 1. Entity extraction
  const addressRegex = /\b0x[a-fA-F0-9]{40}\b/g;
  const txHashRegex = /\b0x[a-fA-F0-9]{64}\b/g;
  const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(?:xyz|top|site|app|io|com|fi)[^\s]*)/gi;

  const addresses = query.match(addressRegex) || [];
  const txHashes = query.match(txHashRegex) || [];
  const urls = query.match(urlRegex) || [];

  // If user pasted an address or URL directly without a general question
  if (urls.length > 0 && urls[0] && queryTokens.size <= 4) {
    const targetUrl = urls[0];
    return {
      answerText: `Detected Web3 target URL: ${targetUrl}. You can run a complete pre-transaction risk analysis right now.`,
      categoryLabel: 'Target Scan Shortcut',
      confidence: 1.0,
      detectedEntities: { addresses, urls, txHashes },
      action: {
        label: `Scan ${targetUrl.slice(0, 24)}...`,
        route: `/scanner?target=${encodeURIComponent(targetUrl)}`,
      },
    };
  }

  if (addresses.length > 0 && addresses[0] && queryTokens.size <= 4) {
    const address = addresses[0];
    return {
      answerText: `Detected Ethereum address: ${address}. Would you like to check its token approvals and health score?`,
      categoryLabel: 'Wallet Health Shortcut',
      confidence: 1.0,
      detectedEntities: { addresses, urls, txHashes },
      action: {
        label: `Audit Approvals for ${address.slice(0, 8)}...`,
        route: `/wallet-health?address=${encodeURIComponent(address)}`,
      },
    };
  }

  // 2. Similarity scoring across KB entries
  let bestEntry: KBEntry | null = null;
  let bestScore = 0;

  for (const entry of CHATBOT_KNOWLEDGE_BASE) {
    // Check against canonical question and all training phrases
    const phrases = [entry.canonicalQuestion, ...entry.trainingPhrases];
    for (const phrase of phrases) {
      const phraseTokens = tokenize(phrase);
      const score = cosineJaccardSimilarity(queryTokens, phraseTokens);
      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }
  }

  // Precision threshold (>= 0.22)
  if (bestEntry && bestScore >= 0.22) {
    const answer =
      language === 'hinglish' && bestEntry.answerHinglish ? bestEntry.answerHinglish : bestEntry.answer;

    return {
      matchedEntry: bestEntry,
      answerText: answer,
      categoryLabel: bestEntry.category,
      confidence: Math.min(0.99, Math.round((bestScore + 0.4) * 100) / 100),
      detectedEntities: { addresses, urls, txHashes },
      action: bestEntry.action
        ? {
            label: bestEntry.action.label,
            route: bestEntry.action.route,
          }
        : undefined,
    };
  }

  // Below confidence fallback
  const fallbackSuggestions = [
    { label: 'How does risk scoring work?', question: 'How is the 0-100 risk score calculated?' },
    { label: 'What is Claim-vs-Reality?', question: 'What is Claim-vs-Reality checking?' },
    { label: 'How to revoke approvals?', question: 'How do I revoke risky approvals?' },
  ];

  return {
    answerText:
      language === 'hinglish'
        ? "Mere paas is specific sawaal ka reliable answer nahi hai. Lekin aap neeche diye gaye topics choose kar sakte hain ya Wallet / Transaction scan try kar sakte hain."
        : "I don't have a high-confidence answer for that specific question in my deterministic knowledge base. Please select one of the related topics below or use the scanner.",
    categoryLabel: 'Fallback / Clarification',
    confidence: Math.round(bestScore * 100) / 100,
    suggestedTopics: fallbackSuggestions,
    detectedEntities: { addresses, urls, txHashes },
  };
}
