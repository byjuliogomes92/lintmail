// history.js — LintMail v0.5
// Stores up to 20 analysis results in chrome.storage.local
// Provides diff calculation between two reports

const HISTORY_KEY = "lintmail_history";
const MAX_ENTRIES = 20;

/**
 * Save a report snapshot to history.
 * @param {object} report  - Full audit report from engine
 * @param {string} label   - Optional label (filename, URL, or user input)
 */
export async function saveToHistory(report, label = "") {
  const entry = {
    id:          Date.now(),
    label:       label || `Analysis ${new Date().toLocaleString()}`,
    timestamp:   report.generatedAt,
    campaignType:report.campaignType,
    overallScore:report.overallScore,
    sizeKB:      report.sizeKB ?? 0,
    categoryScores: Object.fromEntries(
      Object.entries(report.categories).map(([k, v]) => [k, v.score])
    ),
    esp: report.esp ?? null,
  };

  const history = await loadHistory();
  history.unshift(entry); // newest first
  const trimmed = history.slice(0, MAX_ENTRIES);

  return new Promise((resolve) => {
    chrome.storage.local.set({ [HISTORY_KEY]: trimmed }, resolve);
  });
}

/**
 * Load history array.
 * @returns {Promise<Array>}
 */
export async function loadHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [HISTORY_KEY]: [] }, (items) => {
      resolve(items[HISTORY_KEY] ?? []);
    });
  });
}

/**
 * Clear all history.
 */
export async function clearHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(HISTORY_KEY, resolve);
  });
}

/**
 * Delete a single entry by id.
 */
export async function deleteHistoryEntry(id) {
  const history = await loadHistory();
  const filtered = history.filter((e) => e.id !== id);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [HISTORY_KEY]: filtered }, resolve);
  });
}

/**
 * Calculate diff between two history entries (or a live report vs last entry).
 * @param {object} current  - entry with categoryScores + overallScore
 * @param {object} previous - entry with categoryScores + overallScore
 * @returns {object} { overallDiff, categories: { [key]: diff } }
 */
export function calcDiff(current, previous) {
  if (!previous) return null;

  const categories = {};
  const allKeys = new Set([
    ...Object.keys(current.categoryScores ?? {}),
    ...Object.keys(previous.categoryScores ?? {}),
  ]);

  for (const key of allKeys) {
    const curr = current.categoryScores?.[key] ?? 0;
    const prev = previous.categoryScores?.[key] ?? 0;
    categories[key] = curr - prev;
  }

  return {
    overallDiff: (current.overallScore ?? 0) - (previous.overallScore ?? 0),
    categories,
  };
}

/**
 * Format a diff value for display: "+12", "-5", "=" 
 */
export function formatDiff(diff) {
  if (diff === null || diff === undefined) return "";
  if (diff > 0)  return `+${diff}`;
  if (diff < 0)  return `${diff}`;
  return "=";
}

/**
 * Get diff CSS class based on value
 */
export function diffClass(diff) {
  if (diff > 3)  return "diff-up";
  if (diff < -3) return "diff-down";
  return "diff-eq";
}
