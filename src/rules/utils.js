// utils.js — shared helpers, no imports (breaks circular dependency)
export function calcScore(rules) {
  if (!rules.length) return 100;
  const points = rules.reduce((acc, r) => {
    if (r.status === "pass") return acc + 1;
    if (r.status === "warn") return acc + 0.5;
    return acc;
  }, 0);
  return Math.round((points / rules.length) * 100);
}
