// engine.js — LintMail Audit Engine v0.3
import { runAccessibilityRules }  from "./accessibility.js";
import { runDeliverabilityRules } from "./deliverability.js";
import { runBestPracticesRules }  from "./bestPractices.js";
import { runCompatibilityRules }  from "./compatibility.js";
import { runDarkModeRules }       from "./darkMode.js";
import { runSpamRules }           from "./spam.js";

const CAMPAIGN_WEIGHTS = {
  promotional:   { accessibility:.18, deliverability:.30, bestPractices:.22, compatibility:.10, darkMode:.08, spam:.12 },
  transactional: { accessibility:.22, deliverability:.28, bestPractices:.14, compatibility:.18, darkMode:.08, spam:.10 },
  welcome:       { accessibility:.22, deliverability:.22, bestPractices:.22, compatibility:.14, darkMode:.08, spam:.12 },
  abandoned_cart:{ accessibility:.14, deliverability:.26, bestPractices:.30, compatibility:.10, darkMode:.08, spam:.12 },
  newsletter:    { accessibility:.18, deliverability:.26, bestPractices:.22, compatibility:.14, darkMode:.08, spam:.12 },
};

export function runAudit(rawHtml, campaignType = "promotional") {
  const parser  = new DOMParser();
  const doc     = parser.parseFromString(rawHtml, "text/html");
  const weights = CAMPAIGN_WEIGHTS[campaignType] ?? CAMPAIGN_WEIGHTS.promotional;

  const categories = {
    accessibility:  runAccessibilityRules(doc, rawHtml),
    deliverability: runDeliverabilityRules(doc, rawHtml),
    bestPractices:  runBestPracticesRules(doc, rawHtml),
    compatibility:  runCompatibilityRules(doc, rawHtml),
    darkMode:       runDarkModeRules(doc, rawHtml),
    spam:           runSpamRules(doc, rawHtml),
  };

  let overallScore = 0;
  for (const [key, result] of Object.entries(categories)) {
    overallScore += result.score * (weights[key] ?? 0);
  }

  // Email weight
  const sizeKB = Math.round(new TextEncoder().encode(rawHtml).length / 1024);

  return {
    overallScore: Math.round(overallScore),
    campaignType,
    sizeKB,
    categories,
    weights,
    generatedAt: new Date().toISOString(),
  };
}

export function calcScore(rules) {
  if (!rules.length) return 100;
  const points = rules.reduce((acc, r) => {
    if (r.status === "pass") return acc + 1;
    if (r.status === "warn") return acc + 0.5;
    return acc;
  }, 0);
  return Math.round((points / rules.length) * 100);
}
