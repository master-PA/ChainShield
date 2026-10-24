import { MessageScanResult, ReasonItem, RiskLevel } from '../types/security';

export function classifyMessage(rawText: string): MessageScanResult {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const reasons: ReasonItem[] = [];
  let pointsTotal = 0;

  // Language detection (English vs Hinglish / Hindi words)
  const hinglishTokens = [
    'karein',
    'karo',
    'paisa',
    'bhai',
    'aapka',
    'wallet',
    'jaldi',
    'milega',
    'bhejo',
    'hoga',
    'nahi',
    'hai',
    'karo',
    'ke',
    'se',
    'ka',
    'aur',
    'lelo',
    'sir',
  ];
  const matchedHinglish = hinglishTokens.filter((token) => new RegExp(`\\b${token}\\b`, 'i').test(lower));
  const isHinglish = matchedHinglish.length >= 2;
  const languageDetected: 'en' | 'hinglish' | 'mixed' = isHinglish
    ? 'hinglish'
    : matchedHinglish.length === 1
      ? 'mixed'
      : 'en';

  // Extract URLs
  const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(?:xyz|top|site|app|link|io|com)[^\s]*)/gi;
  const urls = text.match(urlRegex) || [];

  // 1. Seed phrase / private key trap
  const seedPhraseKeywords = [
    'seed phrase',
    'recovery phrase',
    '12 words',
    '24 words',
    'private key',
    'recovery key',
    'mnemonic',
    'secret words',
    'seed words',
  ];
  const seedPhraseRequested = seedPhraseKeywords.some((kw) => lower.includes(kw));

  if (seedPhraseRequested) {
    pointsTotal += 95;
    reasons.push({
      id: 'msg-seed-phrase',
      category: 'signature',
      description: 'CRITICAL THEFT INDICATOR: Message explicitly solicits secret recovery words or seed phrase.',
      points: 95,
      severity: 'critical',
    });
  }

  // 2. Urgency signals
  const urgencyKeywords = [
    'immediately',
    'urgent',
    'within 24 hours',
    'within 1 hour',
    'last chance',
    'claim now or lose',
    'jaldi',
    'hurry',
    'expiring',
    'account suspended',
    'blocked',
  ];
  const urgencyDetected = urgencyKeywords.some((kw) => lower.includes(kw));
  if (urgencyDetected) {
    pointsTotal += 20;
    reasons.push({
      id: 'msg-urgency',
      category: 'intent',
      description: 'High urgency psychological manipulation detected ("urgent", "immediately", "jaldi")',
      points: 20,
      severity: 'warning',
    });
  }

  // 3. Authority / Support Impersonation
  const authorityKeywords = [
    'metamask support',
    'official support',
    'helpdesk',
    'admin',
    'collab.land bot',
    'walletconnect support',
    'opensea agent',
    'binance help',
    'telegram staff',
  ];
  const authorityImpersonated = authorityKeywords.some((kw) => lower.includes(kw));
  if (authorityImpersonated) {
    pointsTotal += 25;
    reasons.push({
      id: 'msg-authority',
      category: 'reputation',
      description: 'Impersonation of official Web3 support or protocol admin',
      points: 25,
      severity: 'critical',
    });
  }

  // 4. Fake Airdrop / Free Token Minting
  const airdropKeywords = ['free mint', 'airdrop claim', 'whitelist spot', 'free eth', 'free usdt', 'congratulations you won'];
  const isAirdrop = airdropKeywords.some((kw) => lower.includes(kw));
  if (isAirdrop) {
    pointsTotal += 25;
    reasons.push({
      id: 'msg-airdrop',
      category: 'intent',
      description: 'Unsolicited free airdrop or whitelist mint lure',
      points: 25,
      severity: 'warning',
    });
  }

  // 5. Fake Investment / Guaranteed Profit
  const investmentKeywords = ['guaranteed return', 'paisa double', '100% profit', 'daily roi', 'crypto trading signal', 'insider tip'];
  const isInvestment = investmentKeywords.some((kw) => lower.includes(kw));
  if (isInvestment) {
    pointsTotal += 30;
    reasons.push({
      id: 'msg-investment',
      category: 'intent',
      description: 'Unrealistic guaranteed return / high-yield investment scheme',
      points: 30,
      severity: 'critical',
    });
  }

  // Determine Category
  let scamCategory: MessageScanResult['scamCategory'] = 'benign';
  if (seedPhraseRequested) {
    scamCategory = 'seed_phrase_trap';
  } else if (authorityImpersonated) {
    scamCategory = 'support_scam';
  } else if (isAirdrop) {
    scamCategory = 'airdrop_scam';
  } else if (isInvestment) {
    scamCategory = 'fake_investment';
  }

  const finalScore = Math.min(100, Math.max(0, pointsTotal));
  let riskLevel: RiskLevel = 'LOW';
  if (finalScore >= 75) riskLevel = 'CRITICAL';
  else if (finalScore >= 50) riskLevel = 'HIGH';
  else if (finalScore >= 25) riskLevel = 'CAUTION';

  let actionRecommendation =
    'This message appears benign or informational. Never share private keys or sign unverified transactions.';
  if (riskLevel === 'CRITICAL') {
    actionRecommendation = isHinglish
      ? 'DO NOT REPLY. Yeh message scam hai. Apni seed phrase ya private key kisi se share na karein aur diye gaye link par click na karein.'
      : 'DO NOT ENGAGE. This is an active theft attempt. Block the sender and never share seed phrases or sign transactions.';
  } else if (riskLevel === 'HIGH' || riskLevel === 'CAUTION') {
    actionRecommendation = isHinglish
      ? 'CAUTION: Yeh message suspicious lag raha hai. Sender ko verify karein aur kisi link par wallet connect na karein.'
      : 'CAUTION: This message contains red flags. Verify the sender through official community channels before clicking.';
  }

  return {
    id: `msg-${Date.now()}`,
    rawMessage: text,
    languageDetected,
    scamCategory,
    confidence: 96,
    riskScore: finalScore,
    riskLevel,
    urgencyDetected,
    authorityImpersonated,
    seedPhraseRequested,
    unknownLinksExtracted: urls,
    actionRecommendation,
    reasons,
    createdAt: Date.now(),
    isDemo: false,
  };
}
