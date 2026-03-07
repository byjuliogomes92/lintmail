// settings.js — LintMail
// Manages user preferences via chrome.storage.local

export const DEFAULTS = {
  aiProvider:    "none",      // "none" | "anthropic" | "gemini" | "openai"
  aiKey:         "",
  aiTrigger:     "always",   // "always" | "below80" | "never"
  lang:          "en",
  campaignType:  "promotional",
};

export async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULTS, (items) => resolve(items));
  });
}

export async function saveSettings(partial) {
  return new Promise((resolve) => {
    chrome.storage.local.set(partial, resolve);
  });
}
