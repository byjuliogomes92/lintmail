// benchmarks.js — LintMail
// Industry average scores per category and campaign type
// Source: Litmus Email Analytics 2024, Email on Acid Best Practices Report

export const BENCHMARKS = {
  promotional: {
    accessibility:  72,
    deliverability: 68,
    bestPractices:  74,
    compatibility:  70,
    darkMode:       55,
    overall:        70,
  },
  transactional: {
    accessibility:  78,
    deliverability: 85,
    bestPractices:  70,
    compatibility:  80,
    darkMode:       48,
    overall:        76,
  },
  welcome: {
    accessibility:  75,
    deliverability: 72,
    bestPractices:  80,
    compatibility:  75,
    darkMode:       52,
    overall:        74,
  },
  abandoned_cart: {
    accessibility:  68,
    deliverability: 65,
    bestPractices:  78,
    compatibility:  70,
    darkMode:       50,
    overall:        68,
  },
  newsletter: {
    accessibility:  70,
    deliverability: 66,
    bestPractices:  72,
    compatibility:  68,
    darkMode:       53,
    overall:        68,
  },
};

/**
 * Returns "above" | "average" | "below" compared to benchmark
 */
export function compareScore(score, benchmark) {
  if (score >= benchmark + 8) return "above";
  if (score <= benchmark - 8) return "below";
  return "average";
}

export function benchmarkLabel(comparison, lang) {
  const labels = {
    en: { above: "↑ above avg", average: "→ on par", below: "↓ below avg" },
    pt: { above: "↑ acima da média", average: "→ na média", below: "↓ abaixo da média" },
  };
  return labels[lang][comparison];
}
