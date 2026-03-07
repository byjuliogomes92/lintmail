// deliverability.js — LintMail v0.5 — real area-based text/image ratio + ESP detection
import { calcScore } from "./utils.js";

export function runDeliverabilityRules(doc, raw) {
  const rules = [
    checkUnsubscribeLink(doc),
    checkSpamWords(doc),
    checkTextImageRatioArea(doc),   // ← upgraded: area-based
    checkEmailSize(raw),
    checkExternalImages(doc),
    checkLinkCount(doc),
    checkLinkDensity(doc),          // ← new: links per 100 words
    checkRedirectChains(doc),       // ← new: redirect pattern detection
  ];
  return { score: calcScore(rules), rules };
}

// ── UPGRADED: AREA-BASED TEXT/IMAGE RATIO ────────────────────────────────────
function checkTextImageRatioArea(doc) {
  const imgs = Array.from(doc.querySelectorAll("img"));
  if (imgs.length === 0) {
    return pass("textImageRatio", {
      en: "Text-only email — no ratio concerns.",
      pt: "Email somente texto — sem problemas de proporção.",
    });
  }

  const wordCount = (doc.body?.textContent || "").trim().split(/\s+/).filter(Boolean).length;

  // Estimate image area from width/height attributes or inline style
  let totalImageArea = 0;
  for (const img of imgs) {
    const w = parseInt(img.getAttribute("width") || img.style.width || "0");
    const h = parseInt(img.getAttribute("height") || img.style.height || "0");
    if (w > 0 && h > 0) {
      totalImageArea += w * h;
    } else {
      // fallback: assume standard email image ~300×200px
      totalImageArea += 300 * 200;
    }
  }

  // Estimate text area: ~7px average char width × 14px line height
  const estimatedTextArea = wordCount * 5 * 7 * 14; // ~5 chars/word avg

  const ratio = totalImageArea > 0 ? estimatedTextArea / totalImageArea : 999;

  if (ratio >= 0.6) {
    return pass("textImageRatio", {
      en: `Good text/image area ratio (~${Math.round(ratio*100)}% text area vs images).`,
      pt: `Boa proporção área texto/imagem (~${Math.round(ratio*100)}% área de texto vs imagens).`,
    });
  }
  if (ratio >= 0.3) {
    return warn("textImageRatio", {
      en: `Low text/image area ratio — image-heavy emails hurt deliverability. Add more copy.`,
      pt: `Proporção área texto/imagem baixa — emails com muitas imagens prejudicam entregabilidade.`,
    });
  }
  return fail("textImageRatio", {
    en: `Very low text/image area ratio — likely to be caught by spam filters as image-only email.`,
    pt: `Proporção área texto/imagem muito baixa — provável captura por filtros de spam como email de imagem.`,
  });
}

// ── NEW: LINK DENSITY ─────────────────────────────────────────────────────────
function checkLinkDensity(doc) {
  const links = doc.querySelectorAll("a[href]").length;
  const words = (doc.body?.textContent || "").trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return pass("linkDensity", { en: "No text to calculate link density.", pt: "Sem texto para calcular densidade de links." });

  const density = (links / words) * 100;

  if (density <= 3) {
    return pass("linkDensity", {
      en: `Link density is ${density.toFixed(1)} links/100 words — healthy.`,
      pt: `Densidade de links é ${density.toFixed(1)} links/100 palavras — saudável.`,
    });
  }
  if (density <= 6) {
    return warn("linkDensity", {
      en: `Link density is ${density.toFixed(1)} links/100 words — above recommended 3/100.`,
      pt: `Densidade de links é ${density.toFixed(1)} links/100 palavras — acima do recomendado (3/100).`,
    });
  }
  return fail("linkDensity", {
    en: `Link density is ${density.toFixed(1)} links/100 words — very high, strong spam signal.`,
    pt: `Densidade de links é ${density.toFixed(1)} links/100 palavras — muito alta, forte sinal de spam.`,
  });
}

// ── NEW: REDIRECT CHAIN DETECTION ────────────────────────────────────────────
function checkRedirectChains(doc) {
  const REDIRECT_PATTERNS = [
    /redirect\.php\?url=/i,
    /click\.php\?.*url=/i,
    /\?r=https?:/i,
    /&redirect=/i,
    /track.*\?.*link=/i,
    /go\.php\?/i,
    /redir\?/i,
  ];

  const links = Array.from(doc.querySelectorAll("a[href]"));
  const suspicious = links.filter((a) => {
    const href = a.getAttribute("href") || "";
    return REDIRECT_PATTERNS.some((p) => p.test(href));
  });

  if (suspicious.length === 0) {
    return pass("redirectChains", {
      en: "No suspicious redirect patterns in links.",
      pt: "Nenhum padrão suspeito de redirecionamento nos links.",
    });
  }
  return warn("redirectChains", {
    en: `${suspicious.length} link(s) with redirect patterns — can hurt sender reputation.`,
    pt: `${suspicious.length} link(s) com padrões de redirecionamento — pode prejudicar reputação do remetente.`,
  });
}

// ── UNCHANGED RULES ───────────────────────────────────────────────────────────
function checkUnsubscribeLink(doc) {
  const UNSUB = ["unsubscribe","descadastrar","descadastre","cancelar inscrição","opt-out","opt out","remove me","parar de receber"];
  const has = Array.from(doc.querySelectorAll("a")).some((a) => {
    const t = (a.textContent||"").toLowerCase();
    const h = (a.getAttribute("href")||"").toLowerCase();
    return UNSUB.some((k) => t.includes(k) || h.includes(k));
  });
  if (has) return pass("unsubscribe", { en: "Unsubscribe link found.", pt: "Link de descadastro encontrado." });
  return fail("unsubscribe", { en: "No unsubscribe link — required by CAN-SPAM, LGPD, GDPR.", pt: "Nenhum link de descadastro — obrigatório pela LGPD e CAN-SPAM." });
}

function checkSpamWords(doc) {
  const WORDS = ["free!!!","buy now","click here","limited time","act now","guaranteed","no risk","100% free","winner","cash","earn money","make money","double your","extra income","prize","grátis!!!","compre agora","clique aqui","tempo limitado","garantido","sem risco","100% grátis","ganhador","dinheiro","ganhe dinheiro","renda extra","prêmio"];
  const body = (doc.body?.textContent||"").toLowerCase();
  const found = WORDS.filter((w) => body.includes(w));
  if (found.length === 0) return pass("spamWords", { en: "No spam trigger words.", pt: "Nenhuma palavra de gatilho de spam." });
  if (found.length <= 2) return warn("spamWords", { en: `${found.length} potential spam word(s): "${found.join('", "')}"`, pt: `${found.length} palavra(s) potencial de spam: "${found.join('", "')}"` });
  return fail("spamWords", { en: `${found.length} spam trigger words — high risk.`, pt: `${found.length} palavras de spam — alto risco.` });
}

function checkEmailSize(raw) {
  const kb = Math.round(new TextEncoder().encode(raw).length / 1024);
  if (kb <= 100) return pass("emailSize", { en: `${kb}KB — within safe limits.`, pt: `${kb}KB — dentro dos limites seguros.` });
  if (kb <= 200) return warn("emailSize", { en: `${kb}KB — Gmail clips at 102KB.`, pt: `${kb}KB — Gmail corta em 102KB.` });
  return fail("emailSize", { en: `${kb}KB — very likely to be clipped.`, pt: `${kb}KB — muito provável que seja cortado.` });
}

function checkExternalImages(doc) {
  const external = Array.from(doc.querySelectorAll("img[src]")).filter((img) => {
    const src = img.getAttribute("src")||"";
    return src.startsWith("http") && !src.includes("cdn.");
  });
  if (external.length === 0) return pass("externalImages", { en: "No unhosted external images.", pt: "Nenhuma imagem externa sem CDN." });
  return warn("externalImages", { en: `${external.length} image(s) outside CDN — may be blocked.`, pt: `${external.length} imagem(ns) fora de CDN — pode ser bloqueada.` });
}

function checkLinkCount(doc) {
  const n = doc.querySelectorAll("a[href]").length;
  if (n <= 15) return pass("linkCount", { en: `${n} link(s) — within safe limits.`, pt: `${n} link(s) — dentro dos limites.` });
  return warn("linkCount", { en: `${n} links — high count can trigger spam filters.`, pt: `${n} links — muitos links podem ativar filtros.` });
}

function pass(id, detail) { return { id, status: "pass", name: RULE_NAMES[id], detail }; }
function warn(id, detail) { return { id, status: "warn", name: RULE_NAMES[id], detail }; }
function fail(id, detail) { return { id, status: "fail", name: RULE_NAMES[id], detail }; }

const RULE_NAMES = {
  unsubscribe:    { en: "Unsubscribe Link",         pt: "Link de Descadastro" },
  spamWords:      { en: "Spam Trigger Words",       pt: "Palavras de Spam" },
  textImageRatio: { en: "Text / Image Area Ratio",  pt: "Proporção Área Texto / Imagem" },
  emailSize:      { en: "Email File Size",          pt: "Tamanho do Arquivo" },
  externalImages: { en: "External Image Hosts",     pt: "Hospedagem de Imagens" },
  linkCount:      { en: "Link Count",               pt: "Quantidade de Links" },
  linkDensity:    { en: "Link Density",             pt: "Densidade de Links" },
  redirectChains: { en: "Redirect Patterns",        pt: "Padrões de Redirecionamento" },
};
