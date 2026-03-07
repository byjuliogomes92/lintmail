// background.js — LintMail
// Garante que o painel lateral abre ao clicar no ícone da extensão

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Fallback explícito: abre o painel ao clicar no ícone
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});
