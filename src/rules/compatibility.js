// compatibility.js — LintMail Compatibility Rules
import { calcScore } from "./utils.js";

export function runCompatibilityRules(doc, raw) {
  const rules = [
    checkTableLayout(doc),
    checkInlineCSS(doc),
    checkWebFonts(doc, raw),
    checkMediaQueries(raw),
    checkOutlookConditionals(raw),
    checkViewportMeta(doc),
  ];
  return { score: calcScore(rules), rules };
}

// ── RULES ─────────────────────────────────────────────────────────────────────

function checkTableLayout(doc) {
  const tables = doc.querySelectorAll("table");
  const divs   = doc.querySelectorAll("div");

  if (tables.length === 0 && divs.length > 5) {
    return warn("tableLayout", {
      en: "Layout appears to use divs — table-based layout has better Outlook compatibility.",
      pt: "Layout parece usar divs — layout baseado em tabelas tem melhor compatibilidade com Outlook.",
    });
  }
  if (tables.length > 0) {
    return pass("tableLayout", {
      en: `Table-based layout detected (${tables.length} table(s)) — good Outlook compatibility.`,
      pt: `Layout baseado em tabelas detectado (${tables.length} tabela(s)) — boa compatibilidade com Outlook.`,
    });
  }
  return warn("tableLayout", {
    en: "Could not determine layout method — verify Outlook rendering manually.",
    pt: "Não foi possível determinar o método de layout — verifique a renderização no Outlook manualmente.",
  });
}

function checkInlineCSS(doc) {
  const styledEls = doc.querySelectorAll("[style]");
  const stylesheets = doc.querySelectorAll("link[rel='stylesheet'], style");

  if (stylesheets.length > 0 && styledEls.length < 5) {
    return warn("inlineCSS", {
      en: "External/embedded CSS found — inline CSS is safer across email clients.",
      pt: "CSS externo/incorporado encontrado — CSS inline é mais seguro entre clientes de email.",
    });
  }
  if (styledEls.length >= 5) {
    return pass("inlineCSS", {
      en: "CSS appears to be inlined — good for email client compatibility.",
      pt: "CSS parece estar inline — bom para compatibilidade entre clientes de email.",
    });
  }
  return warn("inlineCSS", {
    en: "Could not verify CSS inlining — check manually.",
    pt: "Não foi possível verificar inlining de CSS — verifique manualmente.",
  });
}

function checkWebFonts(doc, raw) {
  const WEB_FONT_RE = /@import.*fonts\.googleapis\.com|@font-face/i;
  const hasWebFont  = WEB_FONT_RE.test(raw);

  if (!hasWebFont) {
    return pass("webFonts", {
      en: "No web fonts detected — system fonts render consistently everywhere.",
      pt: "Nenhuma web font detectada — fontes do sistema renderizam consistentemente.",
    });
  }

  // Check if there's a fallback
  const hasFallback = /font-family:[^;]*,/i.test(raw);
  if (hasFallback) {
    return warn("webFonts", {
      en: "Web font used with fallback — will degrade gracefully on unsupported clients.",
      pt: "Web font usada com fallback — degradará adequadamente em clientes não suportados.",
    });
  }
  return fail("webFonts", {
    en: "Web font without fallback — Outlook and Gmail may ignore it, breaking layout.",
    pt: "Web font sem fallback — Outlook e Gmail podem ignorá-la, quebrando o layout.",
  });
}

function checkMediaQueries(raw) {
  const MQ_RE = /@media\s+/;
  const hasMQ = MQ_RE.test(raw);

  if (hasMQ) {
    return pass("mediaQueries", {
      en: "Media queries found — responsive design detected.",
      pt: "Media queries encontradas — design responsivo detectado.",
    });
  }
  return warn("mediaQueries", {
    en: "No media queries found — email may not be responsive on mobile.",
    pt: "Nenhuma media query encontrada — email pode não ser responsivo no mobile.",
  });
}

function checkOutlookConditionals(raw) {
  // Outlook conditionals: <!--[if mso]> ... <![endif]-->
  const MSO_RE = /<!--\[if\s+(mso|gte mso|lt mso)/i;
  const hasMSO = MSO_RE.test(raw);

  if (hasMSO) {
    return pass("outlookConditionals", {
      en: "Outlook conditional comments detected — good MSO compatibility.",
      pt: "Comentários condicionais do Outlook detectados — boa compatibilidade com MSO.",
    });
  }
  return warn("outlookConditionals", {
    en: "No Outlook conditionals found — complex layouts may break in Outlook.",
    pt: "Nenhum condicional do Outlook encontrado — layouts complexos podem quebrar no Outlook.",
  });
}

function checkViewportMeta(doc) {
  const viewport = doc.querySelector('meta[name="viewport"]');
  if (viewport) {
    return pass("viewportMeta", {
      en: `Viewport meta tag found: "${viewport.getAttribute("content")}".`,
      pt: `Tag meta viewport encontrada: "${viewport.getAttribute("content")}".`,
    });
  }
  return warn("viewportMeta", {
    en: "No viewport meta tag — add it for better mobile rendering.",
    pt: "Sem tag meta viewport — adicione para melhor renderização no mobile.",
  });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function pass(id, detail) { return { id, status: "pass", name: RULE_NAMES[id], detail }; }
function warn(id, detail) { return { id, status: "warn", name: RULE_NAMES[id], detail }; }
function fail(id, detail) { return { id, status: "fail", name: RULE_NAMES[id], detail }; }

const RULE_NAMES = {
  tableLayout:          { en: "Table-Based Layout",        pt: "Layout Baseado em Tabelas" },
  inlineCSS:            { en: "Inline CSS",                pt: "CSS Inline" },
  webFonts:             { en: "Web Font Fallback",         pt: "Fallback de Web Fonts" },
  mediaQueries:         { en: "Responsive / Media Queries",pt: "Responsivo / Media Queries" },
  outlookConditionals:  { en: "Outlook Conditionals",      pt: "Condicionais do Outlook" },
  viewportMeta:         { en: "Viewport Meta Tag",         pt: "Tag Meta Viewport" },
};
