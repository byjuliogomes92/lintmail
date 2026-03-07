// panel.js — LintMail v0.5.2
import { loadSettings, saveSettings }               from "./settings.js";
import { getAISummary }                              from "./ai.js";
import { BENCHMARKS, compareScore, benchmarkLabel }  from "./benchmarks.js";
import { runProviderChecks }                         from "./providers.js";
import { saveToHistory, loadHistory, clearHistory,
         deleteHistoryEntry, calcDiff, formatDiff,
         diffClass }                                 from "./history.js";
import { exportMarkdown, exportPDF, downloadFile }   from "./export.js";
import { runAudit }                                  from "./rules/engine.js";

// ── helpers ───────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const cls = (s) => s >= 80 ? "great" : s >= 55 ? "ok" : "poor";

// ── i18n ──────────────────────────────────────────────────────────────────────
const S = {
  en: {
    tabAnalysis:"Analysis", tabPreview:"Preview", tabCompat:"Clients", tabHistory:"History",
    modePaste:"Paste", modeUpload:"Upload", modePage:"Page",
    inputPlaceholder:"Paste email HTML here…",
    dropText:"Drop file here or ", browse:"browse",
    pageTitle:"Capture current tab", pageDesc:"Works best on preview URLs.",
    btnCapture:"Capture HTML",
    abHint:"Analyzes both and shows diff.",
    campaignLbl:"campaign_type",
    c_promo:"Promotional", c_trans:"Transactional", c_wel:"Welcome",
    c_cart:"Abandoned Cart", c_news:"Newsletter",
    btnClear:"clear", btnAnalyze:"run analysis",
    emptyT:"No email loaded", emptyB:"Paste, upload, A/B, or capture HTML.",
    aiTitle:"AI Analysis", aiLoading:"Generating…",
    btnRerun:"re-run", btnSave:"save", expCopy:"copy", btnCoffee:"buy me a coffee",
    prevRender:"render", prevSource:"source", prevNotice:"browser approx.",
    pmNormal:"Normal", pmDark:"Dark Mode", pmNoImg:"No Images", pmFold:"Fold Line",
    srcCopy:"copy html",
    compatNote:"Static analysis · Can I Email · Litmus · MSO docs",
    histTitle:"Analysis History", histClear:"clear all", histEmpty:"No analyses saved yet.",
    settingsTitle:"settings", setAI:"AI provider", setPrefs:"preferences",
    provLbl:"Provider", keyLbl:"API Key", keyPh:"sk-... or AIza...",
    keyHint:"stored locally · never sent to lintmail servers",
    trigLbl:"Show AI summary", trigAlways:"always", trigBelow:"score < 80 only", trigNever:"never",
    defCampLbl:"Default campaign type", btnSaveSettings:"save settings",
    captureOK:"✓ captured", captureErr:"✗ failed — try paste mode",
    grades:{ great:"Ready to send", ok:"Needs attention", poor:"Critical issues" },
    cats:{ accessibility:"Accessibility", deliverability:"Deliverability",
           bestPractices:"Best Practices", compatibility:"Compatibility",
           darkMode:"Dark Mode", spam:"Spam Score" },
    providers:{ gmail:"Gmail", outlook:"Outlook", appleMail:"Apple Mail / iCloud",
                yahoo:"Yahoo Mail", samsung:"Samsung Mail" },
  },
  pt: {
    tabAnalysis:"Análise", tabPreview:"Preview", tabCompat:"Clientes", tabHistory:"Histórico",
    modePaste:"Colar", modeUpload:"Upload", modePage:"Página",
    inputPlaceholder:"Cole o HTML do email aqui…",
    dropText:"Solte o arquivo ou ", browse:"selecione",
    pageTitle:"Capturar aba atual", pageDesc:"Melhor em URLs de preview.",
    btnCapture:"Capturar HTML",
    abHint:"Analisa os dois e mostra o diff.",
    campaignLbl:"tipo_de_campanha",
    c_promo:"Promocional", c_trans:"Transacional", c_wel:"Boas-vindas",
    c_cart:"Carrinho Abandonado", c_news:"Newsletter",
    btnClear:"limpar", btnAnalyze:"executar análise",
    emptyT:"Nenhum email carregado", emptyB:"Cole, faça upload, A/B ou capture o HTML.",
    aiTitle:"Análise IA", aiLoading:"Gerando…",
    btnRerun:"re-executar", btnSave:"salvar", expCopy:"copiar", btnCoffee:"me pague um café",
    prevRender:"render", prevSource:"fonte", prevNotice:"aprox. do browser",
    pmNormal:"Normal", pmDark:"Dark Mode", pmNoImg:"Sem Imagens", pmFold:"Dobra",
    srcCopy:"copiar html",
    compatNote:"Análise estática · Can I Email · Litmus · MSO docs",
    histTitle:"Histórico de Análises", histClear:"limpar tudo", histEmpty:"Nenhuma análise salva.",
    settingsTitle:"configurações", setAI:"provedor de IA", setPrefs:"preferências",
    provLbl:"Provedor", keyLbl:"Chave de API", keyPh:"sk-... ou AIza...",
    keyHint:"armazenada localmente · nunca enviada a servidores do lintmail",
    trigLbl:"Exibir resumo IA", trigAlways:"sempre", trigBelow:"apenas score < 80", trigNever:"nunca",
    defCampLbl:"Tipo de campanha padrão", btnSaveSettings:"salvar configurações",
    captureOK:"✓ capturado", captureErr:"✗ falhou — use o modo colar",
    grades:{ great:"Pronto para envio", ok:"Precisa de ajustes", poor:"Problemas críticos" },
    cats:{ accessibility:"Acessibilidade", deliverability:"Entregabilidade",
           bestPractices:"Boas Práticas", compatibility:"Compatibilidade",
           darkMode:"Dark Mode", spam:"Score de Spam" },
    providers:{ gmail:"Gmail", outlook:"Outlook", appleMail:"Apple Mail / iCloud",
                yahoo:"Yahoo Mail", samsung:"Samsung Mail" },
  },
};

const CAT_ICONS  = { accessibility:"♿", deliverability:"📬", bestPractices:"✅",
                     compatibility:"🖥", darkMode:"🌙", spam:"🛡" };
const PROV_ICONS = {
  gmail: `<div class="prov-logo" style="background:#fff;border:1px solid #e0e0e0">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
    </svg></div>`,
  outlook: `<div class="prov-logo" style="background:#0078D4">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 7.387v10.478L19.2 21l-9.6-1.67v1.383L0 19.2V4.8l9.6-1.513v1.37L19.2 3l4.8 3.387v1.04zm-14.4 8.526V8.087l-6.4 1.067v5.693l6.4 1.066zm8-8.613L12 9.6v4.8l5.6 1.867V7.3zm4.8.744L19.2 5.8v12.4l3.2-2.244V8.044z" fill="#fff"/>
    </svg></div>`,
  appleMail: `<div class="prov-logo" style="background:#1C1C1E">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm3.536-11.536A5 5 0 0 0 8.1 14.9l1.9.7a3 3 0 0 1 5.464-2.436l1.736-1.036a5 5 0 0 0-1.664-1.664z" fill="#fff"/>
      <path d="M20 4H4c-1.1 0-2 .9-2 2v1.6l10 6.25 10-6.25V6c0-1.1-.9-2-2-2zm0 4.5L12 14 4 8.5V8l8 5 8-5v.5z" fill="#4FC3F7"/>
    </svg></div>`,
  yahoo: `<div class="prov-logo" style="background:#6001D2">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3l5.5 8.5L3 21h3l3.75-6.5L13.5 21h3l-5.5-9.5L16.5 3h-3L10 9 6 3H3z" fill="#fff"/>
      <circle cx="19" cy="19" r="2.5" fill="#fff"/>
    </svg></div>`,
  samsung: `<div class="prov-logo" style="background:#1428A0">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="#fff" stroke-width="1.5"/>
      <path d="M2 9h20M7 4v16" stroke="#fff" stroke-width="1.5"/>
      <circle cx="15.5" cy="14.5" r="2" fill="#fff"/>
    </svg></div>`
};

let lang          = "en";
let settings      = {};
let lastReport    = null;
let lastReportB   = null;
let lastHTML      = "";
let lastHTMLB     = "";
let lastProviders = null;
let activeMode    = "paste";
let previewMode   = "normal";
let historyCache  = [];
let activeTab     = "analysis";

const t = (key) => {
  const keys = key.split(".");
  let v = S[lang];
  for (const k of keys) v = v?.[k];
  return v ?? key;
};

// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
  settings = await loadSettings();

  // Detect Chrome language if no preference saved
  if (settings.lang) {
    lang = settings.lang;
  } else {
    const uiLang = (chrome.i18n?.getUILanguage?.() || navigator.language || "en").toLowerCase();
    lang = uiLang.startsWith("pt") ? "pt" : "en";
  }

  // Sync pill UI
  document.querySelectorAll(".pill button").forEach(b =>
    b.classList.toggle("on", b.dataset.lang === lang)
  );
  if (settings.campaignType) {
    $("campSel").value    = settings.campaignType;
    $("defCampSel").value = settings.campaignType;
  }
  if (settings.aiProvider) {
    document.querySelectorAll(".chip-btn").forEach(c =>
      c.classList.toggle("on", c.dataset.prov === settings.aiProvider)
    );
  }
  if (settings.aiKey)     $("keyIn").value   = settings.aiKey;
  if (settings.aiTrigger) $("trigSel").value = settings.aiTrigger;

  applyI18n();
  historyCache = await loadHistory();
}
init();

// ── i18n ──────────────────────────────────────────────────────────────────────
function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const v = t(el.dataset.i18n);
    if (v !== el.dataset.i18n) el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
}

// ── LANG TOGGLE ───────────────────────────────────────────────────────────────
document.querySelectorAll(".pill button").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".pill button").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    lang = b.dataset.lang;
    saveSettings({ lang });
    applyI18n();
    if (lastReport)    renderReport(lastReport, lastReportB);
    if (lastProviders) renderProviders(lastProviders);
    renderHistory();
  });
});

// ── INPUT MODE TABS ───────────────────────────────────────────────────────────
document.querySelectorAll(".mtab").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".mtab").forEach(x => x.classList.remove("on"));
    document.querySelectorAll(".mpanel").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    activeMode = b.dataset.mode;
    $(`mode-${activeMode}`)?.classList.add("on");
  });
});

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
function switchTab(name) {
  activeTab = name;
  document.querySelectorAll(".rtab").forEach(b =>
    b.classList.toggle("on", b.dataset.tab === name)
  );
  document.querySelectorAll(".rpanel").forEach(p =>
    p.classList.toggle("on", p.id === "rp-" + name)
  );
  if (name === "history") renderHistory();
}

document.querySelectorAll(".rtab").forEach(b =>
  b.addEventListener("click", () => switchTab(b.dataset.tab))
);

// ── SHOW RESULTS ──────────────────────────────────────────────────────────────
function showResults() {
  $("emptyState").style.display = "none";
  $("inputSection").classList.add("collapsed");
  $("statusBar").classList.add("on");
  $("rtabs").classList.add("on");
  $("resultArea").classList.add("on");
  switchTab("analysis");
}

function hideResults() {
  $("inputSection").classList.remove("collapsed");
  $("statusBar").classList.remove("on");
  $("rtabs").classList.remove("on");
  $("resultArea").classList.remove("on");
  document.querySelectorAll(".rpanel").forEach(p => p.classList.remove("on"));
  $("emptyState").style.display = "";
}

// ── FILE UPLOAD ───────────────────────────────────────────────────────────────
$("browseLink").addEventListener("click", () => $("fileIn").click());
$("dropZone").addEventListener("click",   () => $("fileIn").click());
$("dropZone").addEventListener("dragover", e => { e.preventDefault(); $("dropZone").classList.add("over"); });
$("dropZone").addEventListener("dragleave",  () => $("dropZone").classList.remove("over"));
$("dropZone").addEventListener("drop", e => {
  e.preventDefault(); $("dropZone").classList.remove("over");
  if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
});
$("fileIn").addEventListener("change", () => { if ($("fileIn").files[0]) readFile($("fileIn").files[0]); });

function readFile(file) {
  const r = new FileReader();
  r.onload = e => {
    lastHTML = e.target.result;
    $("dropZone").querySelector(".dz-text").textContent = `✓ ${file.name}`;
    $("dropZone").style.borderColor  = "var(--ok)";
    $("dropZone").style.borderStyle  = "solid";
  };
  r.readAsText(file);
}

// ── PAGE CAPTURE ──────────────────────────────────────────────────────────────
$("btnCapture").addEventListener("click", async () => {
  $("capStatus").textContent = "";
  $("btnCapture").disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const res = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML,
    });
    const captured = res?.[0]?.result;
    if (captured) {
      lastHTML = captured;
      $("capStatus").style.color   = "var(--ok)";
      $("capStatus").textContent   = t("captureOK");
    } else throw new Error();
  } catch {
    $("capStatus").style.color = "var(--er)";
    $("capStatus").textContent = t("captureErr");
  } finally {
    $("btnCapture").disabled = false;
  }
});

// ── CLEAR ─────────────────────────────────────────────────────────────────────
$("btnClear").addEventListener("click", resetAll);

function resetAll() {
  $("htmlInput").value = "";
  lastHTML = ""; lastHTMLB = "";
  lastReport = null; lastReportB = null; lastProviders = null;
  hideResults();
  $("cats").innerHTML = "";
  $("provCards").innerHTML = "";
  $("htmlSrc").textContent = "";
  $("aiStrip").classList.remove("on");
  const dz = $("dropZone");
  dz.querySelector(".dz-text").innerHTML =
    `<span>${t("dropText")}</span><strong id="browseLink">${t("browse")}</strong>`;
  dz.style.borderColor = ""; dz.style.borderStyle = "";
  document.getElementById("browseLink")?.addEventListener("click", () => $("fileIn").click());
  $("capStatus").textContent = "";
  $("espRow").style.display = "none";
  $("abSummary").style.display = "none";
}

// ── RE-RUN ────────────────────────────────────────────────────────────────────
$("btnRerun").addEventListener("click", () => {
  hideResults();
  if (lastHTML && activeMode === "paste") $("htmlInput").value = lastHTML;
  $("mainScroll").scrollTo({ top: 0, behavior: "smooth" });
});

// ── ANALYZE ───────────────────────────────────────────────────────────────────
$("btnAnalyze").addEventListener("click", async () => {
  const isAB = activeMode === "ab";
  const html  = isAB
    ? $("htmlA").value.trim()
    : activeMode === "paste" ? $("htmlInput").value.trim() : lastHTML.trim();
  const htmlB = isAB ? $("htmlB").value.trim() : "";
  if (!html) return;

  lastHTML = html; lastHTMLB = htmlB;
  $("btnAnalyze").disabled = true;
  $("btnAnalyze").classList.add("ld");
  $("aiStrip").classList.remove("on");

  await new Promise(r => setTimeout(r, 80));

  try {
    const camp = $("campSel").value;
    lastReport  = runAudit(html, camp);
    lastReportB = htmlB ? runAudit(htmlB, camp) : null;
    lastProviders = runProviderChecks(
      new DOMParser().parseFromString(html, "text/html"), html
    );

    renderReport(lastReport, lastReportB);
    renderProviders(lastProviders);
    renderPreview(html);
    showResults();

    // Save to history
    const label =
      activeMode === "upload" ? ($("dropZone").querySelector(".dz-text")?.textContent?.replace("✓ ","") || "upload")
      : activeMode === "page" ? "page capture"
      : isAB ? "A/B analysis"
      : html.slice(0, 40).replace(/[\n<]/g, "").trim() || "paste";
    await saveToHistory(lastReport, label);
    historyCache = await loadHistory();

    // AI summary
    const tr = settings.aiTrigger ?? "always";
    if (
      settings.aiProvider && settings.aiProvider !== "none" && settings.aiKey &&
      (tr === "always" || (tr === "below80" && lastReport.overallScore < 80))
    ) triggerAI(lastReport);

  } catch (e) {
    console.error("LintMail audit error:", e);
    $("cats").innerHTML = `<div style="padding:12px;color:var(--er);font-family:var(--mono);font-size:11px">Error: ${e.message}</div>`;
    showResults();
  }
  finally {
    $("btnAnalyze").disabled = false;
    $("btnAnalyze").classList.remove("ld");
  }
});

// ── STATUS BAR ────────────────────────────────────────────────────────────────
function renderStatusBar(report) {
  const s = report.overallScore, c = cls(s);
  const bench = BENCHMARKS[report.campaignType] ?? BENCHMARKS.promotional;
  const cmp   = compareScore(s, bench.overall);
  $("sNum").textContent = s;
  $("sNum").className   = `s-num ${c}`;
  $("sGrade").textContent = t(`grades.${c}`);
  $("sCap").textContent   =
    `${benchmarkLabel(cmp, lang)} · ${report.campaignType}${report.esp ? ` · ${report.esp}` : ""}`;
  const kb = report.sizeKB ?? 0;
  const kbCls = kb > 200 ? "er" : kb > 100 ? "wn" : "";
  const imgs = new DOMParser().parseFromString(lastHTML, "text/html")
    .querySelectorAll("img[src]").length;
  $("sPills").innerHTML =
    `<span class="s-pill ${kbCls}">${kb}KB html</span>` +
    `<span class="s-pill">${imgs} img</span>`;
}

// ── RENDER REPORT ─────────────────────────────────────────────────────────────
function renderReport(report, reportB) {
  renderStatusBar(report);
  const bench = BENCHMARKS[report.campaignType] ?? BENCHMARKS.promotional;

  // ESP badge
  if (report.esp) {
    $("espRow").style.display = "block";
    const b = $("espBadge");
    b.textContent = `esp: ${report.esp}`;
    b.className   = "esp-badge on";
  } else {
    $("espRow").style.display = "none";
  }

  // A/B summary
  if (reportB) {
    $("abSummary").style.display = "block";
    const diff = calcDiff(
      { overallScore: reportB.overallScore,
        categoryScores: Object.fromEntries(Object.entries(reportB.categories).map(([k,v])=>[k,v.score])) },
      { overallScore: report.overallScore,
        categoryScores: Object.fromEntries(Object.entries(report.categories).map(([k,v])=>[k,v.score])) }
    );
    $("abScoreRow").innerHTML = `
      <div style="flex:1;text-align:center">
        <div style="font-family:var(--mono);font-size:18px;font-weight:700;color:var(--ac)">${report.overallScore}</div>
        <div style="font-size:10px;color:var(--ink3)">Version A</div>
      </div>
      <div style="font-size:20px;color:var(--ink3);align-self:center">vs</div>
      <div style="flex:1;text-align:center">
        <div style="font-family:var(--mono);font-size:18px;font-weight:700;color:var(--ac)">${reportB.overallScore}</div>
        <div style="font-size:10px;color:var(--ink3)">Version B</div>
      </div>
      <div style="flex:1;text-align:center">
        <span class="diff-badge ${diffClass(diff?.overallDiff)}">${formatDiff(diff?.overallDiff)}</span>
        <div style="font-size:10px;color:var(--ink3);margin-top:2px">diff</div>
      </div>`;
    $("abCatDiffs").innerHTML = Object.entries(diff?.categories ?? {}).map(([k, d]) =>
      `<div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
        <span style="color:var(--ink2)">${t(`cats.${k}`)}</span>
        <span class="diff-badge ${diffClass(d)}">${formatDiff(d)}</span>
      </div>`
    ).join("");
  } else {
    $("abSummary").style.display = "none";
  }

  // Category cards
  $("cats").innerHTML = "";
  let i = 0;
  for (const [key, result] of Object.entries(report.categories)) {
    const diffVal = reportB ? ((reportB.categories[key]?.score ?? 0) - result.score) : null;
    const el = buildCat(key, result, bench, diffVal);
    $("cats").appendChild(el);
    i++;
  }
}

function buildCat(key, result, bench, diffVal) {
  const s = result.score, c = cls(s), bv = bench[key] ?? 70;
  const cmp     = compareScore(s, bv);
  const diffHtml = diffVal !== null
    ? `<span class="diff-badge ${diffClass(diffVal)}">${formatDiff(diffVal)}</span>` : "";
  const el = document.createElement("div");
  el.className = "cat";
  el.innerHTML = `
    <div class="cat-h">
      <span class="cat-ico">${CAT_ICONS[key] ?? "▸"}</span>
      <div class="cat-meta">
        <div class="cat-name">${t(`cats.${key}`)}</div>
        <div class="cat-track"><div class="cat-fill ${c}" style="width:${s}%"></div></div>
      </div>
      <div class="cat-right">
        <span class="cat-sc ${c}">${s}${diffHtml}</span>
        <span class="cat-bm ${cmp}">${benchmarkLabel(cmp, lang)}</span>
      </div>
      <span class="cat-chv">▾</span>
    </div>
    <div class="cat-body">${result.rules.map(buildRule).join("")}</div>`;
  el.querySelector(".cat-h").addEventListener("click", () => el.classList.toggle("open"));
  return el;
}

function buildRule(r) {
  const ico   = r.status === "pass" ? "✓" : r.status === "warn" ? "!" : "✕";
  const color = r.status === "pass" ? "var(--ok)" : r.status === "warn" ? "var(--wn)" : "var(--er)";
  const dc    = r.status === "warn" ? "wn" : r.status === "fail" ? "fl" : "";
  return `<div class="rule">
    <span class="rule-s" style="color:${color}">${ico}</span>
    <div>
      <div class="rule-n">${r.name[lang]}</div>
      <div class="rule-d ${dc}">${r.detail[lang]}</div>
    </div>
  </div>`;
}

// ── RENDER PROVIDERS ──────────────────────────────────────────────────────────
function renderProviders(providers) {
  $("provCards").innerHTML = "";
  for (const [key, data] of Object.entries(providers)) {
    $("provCards").appendChild(buildProvCard(key, data));
  }
}

function buildProvCard(key, data) {
  const s = data.score, c = cls(s);
  const noIssues = data.issues.length === 0;
  const versions = data.versions.map(v => `${v.label} (${v.versions.join(", ")})`).join(" · ");
  const issueLabel = noIssues
    ? "✓ ok"
    : `${data.issues.length} issue${data.issues.length > 1 && lang === "en" ? "s" : ""}`;
  const el = document.createElement("div");
  el.className = "prov";
  if (!noIssues) el.classList.add("open");
  el.innerHTML = `
    <div class="prov-h">
      ${PROV_ICONS[key] ?? '<div class="prov-logo" style="background:var(--sf2);border:1px solid var(--bd)"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/></svg></div>'}
      <div class="prov-info">
        <div class="prov-name">${t(`providers.${key}`)}</div>
        <div class="prov-vers">${versions}</div>
      </div>
      <div class="prov-right">
        <span class="prov-sc ${c}">${s}</span>
        <span class="prov-tag ${c}">${issueLabel}</span>
      </div>
      <span class="prov-chv">▾</span>
    </div>
    <div class="prov-body">
      ${noIssues
        ? `<div class="pi"><span class="pi-ico" style="color:var(--ok)">✓</span>
           <div><div class="pi-name">${lang === "pt" ? "Nenhum problema" : "No issues"}</div>
           <div class="pi-d">${lang === "pt" ? "Compatível." : "Compatible."}</div></div></div>`
        : data.issues.map(issue => {
            const ic = issue.severity === "fail" ? "✕" : "!";
            const sc = issue.severity === "fail" ? "var(--er)" : "var(--wn)";
            const dc = issue.severity === "fail" ? "fl" : "wn";
            return `<div class="pi">
              <span class="pi-ico" style="color:${sc}">${ic}</span>
              <div>
                <div class="pi-name">${issue.name[lang]}</div>
                <div class="pi-d ${dc}">${issue.detail[lang]}</div>
              </div>
            </div>`;
          }).join("")
      }
    </div>`;
  el.querySelector(".prov-h").addEventListener("click", () => el.classList.toggle("open"));
  return el;
}

// ── RENDER PREVIEW ────────────────────────────────────────────────────────────
function renderPreview(html) {
  previewMode = "normal";
  document.querySelectorAll(".prev-mode-btn")
    .forEach(b => b.classList.toggle("on", b.dataset.pmode === "normal"));
  $("foldLine").style.display = "none";
  applyPreviewMode(html, "normal");
  $("srcMeta").textContent = `email.html · ${lastReport?.sizeKB ?? 0}KB`;
  $("htmlSrc").innerHTML   = syntaxHighlight(html.slice(0, 60000));
}

function applyPreviewMode(html, mode) {
  $("foldLine").style.display = mode === "fold" ? "block" : "none";
  let rendered = html;
  if (mode === "dark") {
    rendered = html.replace("</head>",
      `<style>html{filter:invert(1) hue-rotate(180deg)!important}
       img{filter:invert(1) hue-rotate(180deg)!important}</style></head>`);
  }
  if (mode === "noimages") {
    rendered = html.replace(/<img([^>]*?)src\s*=\s*["'][^"']*["']/gi,
      '<img$1src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"');
  }
  const blob = new Blob([rendered], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const frame = $("previewFrame");
  frame.src = url;
  frame.onload = () => {
    try {
      const h = frame.contentDocument?.body?.scrollHeight;
      if (h) frame.style.height = `${Math.max(400, h + 20)}px`;
    } catch {}
    URL.revokeObjectURL(url);
  };
}

function syntaxHighlight(html) {
  return html
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g,'<span class="hl-comment">$1</span>')
    .replace(/(&lt;\/?)([\w:-]+)/g,'<span class="hl-tag">$1$2</span>')
    .replace(/([\w-]+)=(&quot;|&#39;)/g,'<span class="hl-attr">$1</span>=$2<span class="hl-val">')
    .replace(/(&quot;|&#39;)(?=[\s/]|&gt;)/g,'$1</span>');
}

// Preview sub-tabs
document.querySelectorAll("#prevModeSeg button").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll("#prevModeSeg button").forEach(x => x.classList.remove("on"));
    document.querySelectorAll(".prev-panel").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    $(`prev-${b.dataset.prev}`)?.classList.add("on");
  });
});
document.querySelectorAll(".wseg button").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".wseg button").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    $("frameShell").className = `fshell ${b.dataset.pw === "600" ? "d" : "m"}`;
  });
});
document.querySelectorAll(".prev-mode-btn").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".prev-mode-btn").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    previewMode = b.dataset.pmode;
    if (lastHTML) applyPreviewMode(lastHTML, previewMode);
  });
});

$("btnCopySrc").addEventListener("click", async () => {
  if (!lastHTML) return;
  await navigator.clipboard.writeText(lastHTML);
  const b = $("btnCopySrc"), o = b.textContent;
  b.textContent = "✓ copied"; setTimeout(() => b.textContent = o, 1500);
});

// ── AI ────────────────────────────────────────────────────────────────────────
async function triggerAI(report) {
  $("aiStrip").classList.add("on");
  $("aiBody").innerHTML =
    `<div class="ai-ld"><div class="ai-sp"></div>&nbsp;${t("aiLoading")}</div>`;
  const text = await getAISummary(report, lang, settings);
  if (text) $("aiBody").textContent = text;
  else $("aiStrip").classList.remove("on");
}

// ── HISTORY ───────────────────────────────────────────────────────────────────
async function renderHistory() {
  const entries = historyCache;
  const scroll  = $("histScroll");
  // Keep hist-empty as first child, rebuild rest
  scroll.innerHTML = "";
  if (entries.length === 0) {
    scroll.innerHTML = `
      <div class="hist-empty" id="histEmpty">
        <span style="font-size:24px;opacity:.4">📋</span>
        <span>${t("histEmpty")}</span>
      </div>`;
    return;
  }
  // Header border fix — add bottom radius only on last entry
  entries.forEach((entry, idx) => {
    const prev = entries[idx + 1] ?? null;
    const diff = prev ? calcDiff(
      { overallScore: entry.overallScore, categoryScores: entry.categoryScores },
      { overallScore: prev.overallScore,  categoryScores: prev.categoryScores }
    ) : null;
    const c      = cls(entry.overallScore);
    const colors = { great: "var(--ok)", ok: "var(--wn)", poor: "var(--er)" };
    const row    = document.createElement("div");
    row.className = "hist-entry";
    row.innerHTML = `
      <div class="hist-sc" style="color:${colors[c]}">${entry.overallScore}</div>
      <div class="hist-meta">
        <div class="hist-lbl">${entry.label}</div>
        <div class="hist-sub">${new Date(entry.timestamp).toLocaleString()}
          · ${entry.campaignType}${entry.esp ? ` · ${entry.esp}` : ""}</div>
      </div>
      <div class="hist-diff">
        ${diff ? `<span class="diff-badge ${diffClass(diff.overallDiff)}">${formatDiff(diff.overallDiff)}</span>` : ""}
        <button class="hist-del" data-id="${entry.id}">✕</button>
      </div>`;
    row.querySelector(".hist-del").addEventListener("click", async e => {
      e.stopPropagation();
      await deleteHistoryEntry(entry.id);
      historyCache = await loadHistory();
      renderHistory();
    });
    scroll.appendChild(row);
  });
}

$("btnClearHist").addEventListener("click", async () => {
  await clearHistory();
  historyCache = [];
  renderHistory();
});

// ── SAVE DROPDOWN ─────────────────────────────────────────────────────────────
const saveMenu    = $("saveMenu");
const saveToggle  = $("btnSaveToggle");

saveToggle.addEventListener("click", e => {
  e.stopPropagation();
  saveMenu.classList.toggle("on");
});
document.addEventListener("click", () => saveMenu.classList.remove("on"));
saveMenu.addEventListener("click", e => e.stopPropagation());

document.querySelectorAll(".save-opt").forEach(btn => {
  btn.addEventListener("click", async () => {
    saveMenu.classList.remove("on");
    if (!lastReport) return;
    const fmt = btn.dataset.fmt;
    if (fmt === "json") {
      downloadFile(
        JSON.stringify({ report: lastReport, providers: lastProviders, reportB: lastReportB }, null, 2),
        `lintmail-${Date.now()}.json`, "application/json"
      );
    } else if (fmt === "md") {
      downloadFile(exportMarkdown(lastReport, lastProviders, lang),
        `lintmail-${Date.now()}.md`, "text/markdown");
    } else if (fmt === "pdf") {
      exportPDF(lastReport, lastProviders, lang);
    } else if (fmt === "xlsx") {
      exportXLSX(lastReport, lastProviders);
    }
  });
});

// XLSX export (no dependencies — builds CSV-in-xlsx wrapper via HTML table trick)
function exportXLSX(report, providers) {
  const rows = [
    ["LintMail Report", "", "", ""],
    ["Score", report.overallScore, "Campaign", report.campaignType],
    ["Generated", report.generatedAt, "ESP", report.esp || "—"],
    ["", "", "", ""],
    ["Category", "Score", "Status", "Detail"],
  ];
  for (const [key, cat] of Object.entries(report.categories)) {
    rows.push([t(`cats.${key}`), cat.score, "", ""]);
    for (const r of cat.rules) {
      rows.push(["", "", r.status.toUpperCase(), r.name[lang] + ": " + r.detail[lang]]);
    }
  }
  if (providers) {
    rows.push(["", "", "", ""], ["Email Client", "Score", "Severity", "Detail"]);
    for (const [key, data] of Object.entries(providers)) {
      rows.push([t(`providers.${key}`), data.score, "", ""]);
      for (const issue of data.issues) {
        rows.push(["", "", issue.severity.toUpperCase(), issue.name[lang] + ": " + issue.detail[lang]]);
      }
    }
  }
  // Build HTML table that Excel opens as XLSX
  const table = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"><!--[if gte mso 9]><xml>
    <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>LintMail</x:Name>
    <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
    </xml><![endif]--></head><body>
    <table>${rows.map(r =>
      `<tr>${r.map(c => `<td>${String(c ?? "").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</td>`).join("")}</tr>`
    ).join("")}</table></body></html>`;
  downloadFile(table, `lintmail-${Date.now()}.xls`, "application/vnd.ms-excel");
}

// ── COPY ──────────────────────────────────────────────────────────────────────
$("btnCopy").addEventListener("click", async () => {
  if (!lastReport) return;
  const lines = [
    `lintmail — ${lastReport.overallScore}/100 [${lastReport.campaignType}]`,
    lastReport.generatedAt, "",
    ...Object.entries(lastReport.categories).map(([k, v]) => {
      const rules = v.rules.map(r => {
        const i = r.status === "pass" ? "+" : r.status === "warn" ? "~" : "-";
        return `  [${i}] ${r.name[lang]}: ${r.detail[lang]}`;
      }).join("\n");
      return `${t(`cats.${k}`)}: ${v.score}/100\n${rules}`;
    }),
  ];
  await navigator.clipboard.writeText(lines.join("\n"));
  const b = $("btnCopy"), o = b.innerHTML;
  b.textContent = "✓"; setTimeout(() => b.innerHTML = o, 1500);
});

// ── SETTINGS ──────────────────────────────────────────────────────────────────
$("btnSettings").addEventListener("click", () => {
  $("settingsPg").classList.add("on");
});
$("btnBack").addEventListener("click", () => {
  $("settingsPg").classList.remove("on");
});
document.querySelectorAll(".chip-btn").forEach(c => {
  c.addEventListener("click", () => {
    document.querySelectorAll(".chip-btn").forEach(x => x.classList.remove("on"));
    c.classList.add("on");
  });
});
$("btnSaveSettings").addEventListener("click", async () => {
  const prov = document.querySelector(".chip-btn.on")?.dataset.prov ?? "none";
  const s = {
    aiProvider:   prov,
    aiKey:        $("keyIn").value.trim(),
    aiTrigger:    $("trigSel").value,
    campaignType: $("defCampSel").value,
    lang,
  };
  await saveSettings(s);
  settings = { ...settings, ...s };
  $("campSel").value = s.campaignType;
  $("saveFb").textContent = lang === "pt" ? "✓ salvo" : "✓ saved";
  setTimeout(() => { $("saveFb").textContent = ""; }, 2000);
});
