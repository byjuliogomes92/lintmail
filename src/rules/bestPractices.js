// bestPractices.js — LintMail v0.5 — ESP detection + personalization by platform
import { calcScore } from "./utils.js";

export function runBestPracticesRules(doc, raw) {
  const esp = detectESP(doc, raw);
  const rules = [
    checkPreheader(doc),
    checkCTAPresence(doc),
    checkCTACount(doc),
    checkSubjectLength(doc),
    checkPersonalizationByESP(doc, raw, esp),  // ← upgraded
    checkPlainTextFallback(raw),
    { id: "espDetection", status: "pass",      // info rule, always pass
      name: { en: "ESP Detection", pt: "Detecção de ESP" },
      detail: {
        en: esp ? `Detected ESP: ${esp}.` : "No specific ESP detected — generic HTML.",
        pt: esp ? `ESP detectado: ${esp}.` : "Nenhum ESP específico detectado — HTML genérico.",
      }
    },
  ];
  return { score: calcScore(rules), rules, esp };
}

// ── ESP DETECTION ─────────────────────────────────────────────────────────────
export function detectESP(doc, raw) {
  const html = raw.toLowerCase();

  if (/%%[a-z_]+%%/.test(raw) || /mc:edit/i.test(raw) || /mailchimp/i.test(html)) return "Mailchimp";
  if (/\{%[^%]+%\}/.test(raw) || /klaviyo/i.test(html)) return "Klaviyo";
  if (/\{\{[^}]+\}\}/.test(raw) && /hubspot/i.test(html)) return "HubSpot";
  if (/ampscript|sfmc|exacttarget|%%[A-Z]/.test(raw)) return "Salesforce Marketing Cloud";
  if (/\[%[^\]]+%\]/.test(raw) || /campaign monitor/i.test(html)) return "Campaign Monitor";
  if (/\*\|[A-Z_]+\|\*/.test(raw)) return "Mailchimp (merge)";
  if (/\{\{[^}]+\}\}/.test(raw) && /braze/i.test(html)) return "Braze";
  if (/sendgrid/i.test(html)) return "SendGrid";
  if (/%recipient\./i.test(raw) || /mailgun/i.test(html)) return "Mailgun";
  if (/\$\{[^}]+\}/.test(raw) && /iterable/i.test(html)) return "Iterable";

  // Detect by merge tag syntax alone (without explicit brand mention)
  if (/%%[A-Z_]+%%/.test(raw)) return "SFMC / ExactTarget";
  if (/\*\|[A-Z_]+\|\*/.test(raw)) return "Mailchimp";
  if (/\[%=[^\]]+%\]/.test(raw)) return "Campaign Monitor";

  return null;
}

// ── PERSONALIZATION (ESP-aware) ───────────────────────────────────────────────
function checkPersonalizationByESP(doc, raw, esp) {
  const MERGE_PATTERNS = {
    "Salesforce Marketing Cloud": /%%[A-Za-z_]+%%/,
    "SFMC / ExactTarget": /%%[A-Za-z_]+%%/,
    "Mailchimp": /\*\|[A-Z_]+\|\*/,
    "Mailchimp (merge)": /\*\|[A-Z_]+\|\*/,
    "HubSpot": /\{\{contact\.[^}]+\}\}/,
    "Klaviyo": /\{\{[^}]+\}\}/,
    "Campaign Monitor": /\[%=[^\]]+%\]/,
    "Braze": /\{\{[^}]+\}\}/,
    "SendGrid": /\{\{[^}]+\}\}/,
    "Mailgun": /%recipient\.[a-z]+%/i,
    "Iterable": /\$\{[^}]+\}/,
  };

  const GENERIC_MERGE = /(%%[A-Za-z_]+%%|\*\|[A-Z_]+\|\*|\{\{[^}]+\}\}|\[\[.+?\]\])/;

  const pattern = esp && MERGE_PATTERNS[esp] ? MERGE_PATTERNS[esp] : GENERIC_MERGE;
  const hasMerge = pattern.test(raw);

  const espLabel = esp ? `(${esp})` : "";

  if (hasMerge) {
    return pass("personalization", {
      en: `Personalization merge tags found ${espLabel}.`,
      pt: `Merge tags de personalização encontrados ${espLabel}.`,
    });
  }
  return warn("personalization", {
    en: `No merge tags detected ${espLabel} — personalization boosts open and click rates significantly.`,
    pt: `Nenhum merge tag detectado ${espLabel} — personalização aumenta muito abertura e cliques.`,
  });
}

// ── UNCHANGED RULES ───────────────────────────────────────────────────────────
function checkPreheader(doc) {
  const SEL = ['span[style*="display:none"]','span[style*="display: none"]','div[style*="display:none"]','div[style*="display: none"]','span[style*="max-height:0"]','div[style*="max-height:0"]'];
  if (SEL.some((s) => doc.querySelector(s))) return pass("preheader", { en: "Preheader text detected.", pt: "Texto de preheader detectado." });
  return warn("preheader", { en: "No preheader text — add one to improve open rates.", pt: "Sem preheader — adicione um para melhorar abertura." });
}

function checkCTAPresence(doc) {
  const KW = ["shop","buy","get","start","download","register","comprar","obter","baixar","começar","cadastrar","acessar","ver","conferir","saiba mais","learn more","claim","view","access","open"];
  const has = Array.from(doc.querySelectorAll("a,button,[role='button']")).some((el) => KW.some((k) => (el.textContent||"").toLowerCase().includes(k)));
  if (has) return pass("ctaPresence", { en: "At least one CTA found.", pt: "Pelo menos um CTA encontrado." });
  return warn("ctaPresence", { en: "No clear CTA — every email needs a primary action.", pt: "Sem CTA claro — todo email precisa de uma ação principal." });
}

function checkCTACount(doc) {
  const ctas = Array.from(doc.querySelectorAll("a[href],button")).filter((el) => {
    const cls = el.className||""; const s = el.getAttribute("style")||"";
    return /btn|button|cta/i.test(cls) || s.includes("background");
  });
  if (ctas.length <= 3) return pass("ctaCount", { en: `${ctas.length} CTA(s) — focused.`, pt: `${ctas.length} CTA(s) — foco claro.` });
  return warn("ctaCount", { en: `${ctas.length} styled CTAs — reduce to 1–3.`, pt: `${ctas.length} CTAs estilizados — reduza para 1–3.` });
}

function checkSubjectLength(doc) {
  const title = doc.querySelector("title")?.textContent?.trim();
  if (!title) return warn("subjectLength", { en: "No <title> tag — subject length not checked.", pt: "Sem tag <title> — comprimento do assunto não verificado." });
  const len = title.length;
  if (len >= 30 && len <= 60) return pass("subjectLength", { en: `Subject: ${len} chars — ideal (30–60).`, pt: `Assunto: ${len} chars — ideal (30–60).` });
  if (len < 30) return warn("subjectLength", { en: `Subject: ${len} chars — consider longer (30–60 ideal).`, pt: `Assunto: ${len} chars — considere mais longo (30–60).` });
  return warn("subjectLength", { en: `Subject: ${len} chars — may truncate on mobile (≤60 ideal).`, pt: `Assunto: ${len} chars — pode ser cortado no mobile (≤60).` });
}

function checkPlainTextFallback(raw) {
  if (/content-type:\s*text\/plain/i.test(raw)) return pass("plainText", { en: "Plain-text version detected.", pt: "Versão em texto puro detectada." });
  return warn("plainText", { en: "No plain-text alternative — some spam filters prefer it.", pt: "Sem alternativa em texto puro — alguns filtros preferem." });
}

function pass(id, detail) { return { id, status: "pass", name: RULE_NAMES[id], detail }; }
function warn(id, detail) { return { id, status: "warn", name: RULE_NAMES[id], detail }; }

const RULE_NAMES = {
  preheader:       { en: "Preheader Text",          pt: "Texto de Preheader" },
  ctaPresence:     { en: "CTA Presence",            pt: "Presença de CTA" },
  ctaCount:        { en: "CTA Count",               pt: "Quantidade de CTAs" },
  subjectLength:   { en: "Subject Line Length",     pt: "Comprimento do Assunto" },
  personalization: { en: "Personalization Tags",    pt: "Tags de Personalização" },
  plainText:       { en: "Plain-Text Alternative",  pt: "Alternativa em Texto Puro" },
  espDetection:    { en: "ESP Detection",           pt: "Detecção de ESP" },
};
