// accessibility.js — LintMail v0.5 — WCAG real contrast + enhanced rules
import { calcScore } from "./utils.js";

export function runAccessibilityRules(doc, raw) {
  const rules = [
    checkAltText(doc),
    checkFontSize(doc),
    checkLinkText(doc),
    checkHeadingStructure(doc),
    checkColorContrastWCAG(doc),   // ← real WCAG 2.1 ratio calculation
    checkLanguageAttribute(doc),
    checkRoleAttributes(doc),      // ← new
    checkTapTargetSize(doc),       // ← new
  ];
  return { score: calcScore(rules), rules };
}

// ── WCAG 2.1 REAL CONTRAST ────────────────────────────────────────────────────
// Calculates relative luminance and contrast ratio per WCAG 2.1 spec
function sRGBtoLin(val) {
  const v = val / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseColor(str) {
  if (!str) return null;
  const s = str.trim().toLowerCase();

  // Named colors map (most common in email)
  const NAMED = {
    white:"#ffffff", black:"#000000", red:"#ff0000", green:"#008000",
    blue:"#0000ff", gray:"#808080", grey:"#808080", silver:"#c0c0c0",
    lightgray:"#d3d3d3", lightgrey:"#d3d3d3", darkgray:"#a9a9a9",
    darkgrey:"#a9a9a9", dimgray:"#696969", gainsboro:"#dcdcdc",
    whitesmoke:"#f5f5f5", snow:"#fffafa", ivory:"#fffff0",
    beige:"#f5f5dc", linen:"#faf0e6", ghostwhite:"#f8f8ff",
    transparent: null,
  };
  if (NAMED[s] !== undefined) return NAMED[s] ? parseColor(NAMED[s]) : null;

  // #rgb or #rrggbb
  const hex3 = s.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (hex3) return [
    parseInt(hex3[1]+hex3[1],16),
    parseInt(hex3[2]+hex3[2],16),
    parseInt(hex3[3]+hex3[3],16),
  ];
  const hex6 = s.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
  if (hex6) return [parseInt(hex6[1],16), parseInt(hex6[2],16), parseInt(hex6[3],16)];

  // rgb(r,g,b)
  const rgb = s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];

  return null;
}

function checkColorContrastWCAG(doc) {
  const elements = Array.from(doc.querySelectorAll("[style]"));
  const failures = [];
  const warnings = [];

  for (const el of elements) {
    const fgStr = el.style.color;
    const bgStr = el.style.backgroundColor;
    if (!fgStr || !bgStr) continue;

    const fg = parseColor(fgStr);
    const bg = parseColor(bgStr);
    if (!fg || !bg) continue;

    const lFg = relativeLuminance(...fg);
    const lBg = relativeLuminance(...bg);
    const ratio = contrastRatio(lFg, lBg);

    // Get font size to determine AA threshold (large text ≥ 18pt or 14pt bold = 3:1, normal = 4.5:1)
    const fsMatch = el.style.fontSize?.match(/(\d+(?:\.\d+)?)(px|pt|em|rem)?/);
    const fsPx = fsMatch ? (
      fsMatch[2] === "pt" ? +fsMatch[1] * 1.333 :
      fsMatch[2] === "em" || fsMatch[2] === "rem" ? +fsMatch[1] * 16 :
      +fsMatch[1]
    ) : 16;

    const bold = el.style.fontWeight === "bold" || +el.style.fontWeight >= 700;
    const isLargeText = fsPx >= 24 || (bold && fsPx >= 18.67);
    const threshold = isLargeText ? 3.0 : 4.5;

    const text = el.textContent?.trim().slice(0, 30) || "";
    if (!text) continue;

    if (ratio < threshold) {
      const entry = `"${text.slice(0,20)}…" ratio ${ratio.toFixed(1)}:1 (min ${threshold}:1)`;
      ratio < 2.5 ? failures.push(entry) : warnings.push(entry);
    }
  }

  if (failures.length > 0) {
    return fail("colorContrast", {
      en: `${failures.length} element(s) fail WCAG AA contrast: ${failures[0]}`,
      pt: `${failures.length} elemento(s) falham no contraste WCAG AA: ${failures[0]}`,
    });
  }
  if (warnings.length > 0) {
    return warn("colorContrast", {
      en: `${warnings.length} element(s) with borderline contrast (WCAG AA). First: ${warnings[0]}`,
      pt: `${warnings.length} elemento(s) com contraste limítrofe (WCAG AA). Primeiro: ${warnings[0]}`,
    });
  }
  return pass("colorContrast", {
    en: "All inline color pairs pass WCAG AA contrast ratio (≥4.5:1).",
    pt: "Todos os pares de cores inline passam no contraste WCAG AA (≥4.5:1).",
  });
}

// ── ROLE ATTRIBUTES ───────────────────────────────────────────────────────────
function checkRoleAttributes(doc) {
  const tables = Array.from(doc.querySelectorAll("table"));
  if (tables.length === 0) {
    return pass("roleAttributes", {
      en: "No tables found — no role attributes needed.",
      pt: "Nenhuma tabela encontrada — atributos role não necessários.",
    });
  }

  const layoutTables = tables.filter((t) => {
    const role = t.getAttribute("role");
    return !role || role === ""; // layout tables should have role="presentation"
  });

  if (layoutTables.length === 0) {
    return pass("roleAttributes", {
      en: `All ${tables.length} table(s) have role attributes — screen reader friendly.`,
      pt: `Todas as ${tables.length} tabela(s) possuem atributo role — amigável para leitores de tela.`,
    });
  }
  return warn("roleAttributes", {
    en: `${layoutTables.length} table(s) missing role="presentation" — add it to layout tables for screen readers.`,
    pt: `${layoutTables.length} tabela(s) sem role="presentation" — adicione às tabelas de layout para leitores de tela.`,
  });
}

// ── TAP TARGET SIZE ───────────────────────────────────────────────────────────
function checkTapTargetSize(doc) {
  const links = Array.from(doc.querySelectorAll("a[href]"));
  const small = links.filter((a) => {
    const h = a.style.height || "";
    const p = a.style.padding || "";
    const fs = a.style.fontSize || "";
    // Flag links with very small explicit sizes
    const hMatch = h.match(/(\d+)px/);
    if (hMatch && +hMatch[1] < 30) return true;
    // Flag tiny font-size links (icon-sized)
    const fsMatch = fs.match(/(\d+)px/);
    if (fsMatch && +fsMatch[1] < 11) return true;
    return false;
  });

  if (small.length === 0) {
    return pass("tapTarget", {
      en: "No obviously undersized tap targets detected.",
      pt: "Nenhum alvo de toque muito pequeno detectado.",
    });
  }
  return warn("tapTarget", {
    en: `${small.length} link(s) may have small tap targets — minimum 44×44px recommended for mobile.`,
    pt: `${small.length} link(s) podem ter alvos de toque pequenos — mínimo 44×44px recomendado para mobile.`,
  });
}

// ── EXISTING RULES (unchanged) ─────────────────────────────────────────────
function checkAltText(doc) {
  const imgs    = Array.from(doc.querySelectorAll("img"));
  const missing = imgs.filter((img) => img.getAttribute("alt") === null);
  if (imgs.length === 0) return pass("altText", { en: "No images found.", pt: "Nenhuma imagem encontrada." });
  if (missing.length === 0) return pass("altText", { en: `All ${imgs.length} image(s) have alt attributes.`, pt: `Todas as ${imgs.length} imagem(ns) possuem alt.` });
  return fail("altText", { en: `${missing.length}/${imgs.length} images missing alt attribute.`, pt: `${missing.length}/${imgs.length} imagens sem alt.` });
}

function checkFontSize(doc) {
  const small = Array.from(doc.querySelectorAll("[style]")).filter((el) => {
    const m = el.style.fontSize?.match(/(\d+)px/);
    return m && +m[1] < 12;
  });
  if (small.length === 0) return pass("fontSize", { en: "No font sizes below 12px.", pt: "Nenhuma fonte abaixo de 12px." });
  return warn("fontSize", { en: `${small.length} element(s) below 12px — hard to read on mobile.`, pt: `${small.length} elemento(s) abaixo de 12px — difícil de ler no mobile.` });
}

function checkLinkText(doc) {
  const BAD = ["click here","clique aqui","here","aqui","read more","leia mais","more","link"];
  const bad = Array.from(doc.querySelectorAll("a")).filter((a) => BAD.includes((a.textContent||"").trim().toLowerCase()));
  if (bad.length === 0) return pass("linkText", { en: "All links have descriptive text.", pt: "Todos os links têm texto descritivo." });
  return warn("linkText", { en: `${bad.length} link(s) with generic text like "click here".`, pt: `${bad.length} link(s) com texto genérico como "clique aqui".` });
}

function checkHeadingStructure(doc) {
  const h1s = doc.querySelectorAll("h1");
  if (h1s.length === 0) return warn("headingStructure", { en: "No <h1> — add a main heading for screen readers.", pt: "Nenhum <h1> — adicione um título principal." });
  if (h1s.length > 1) return warn("headingStructure", { en: `${h1s.length} <h1> tags — should be only one.`, pt: `${h1s.length} tags <h1> — deve haver apenas uma.` });
  return pass("headingStructure", { en: "Heading structure is correct (1 h1).", pt: "Estrutura de títulos correta (1 h1)." });
}

function checkLanguageAttribute(doc) {
  const lang = doc.querySelector("html")?.getAttribute("lang");
  if (lang) return pass("languageAttr", { en: `lang="${lang}" set.`, pt: `lang="${lang}" definido.` });
  return warn("languageAttr", { en: 'Missing lang attribute on <html>.', pt: 'Atributo lang ausente no <html>.' });
}

function pass(id, detail) { return { id, status: "pass", name: RULE_NAMES[id], detail }; }
function warn(id, detail) { return { id, status: "warn", name: RULE_NAMES[id], detail }; }
function fail(id, detail) { return { id, status: "fail", name: RULE_NAMES[id], detail }; }

const RULE_NAMES = {
  altText:          { en: "Alt Text on Images",       pt: "Alt Text nas Imagens" },
  fontSize:         { en: "Minimum Font Size",         pt: "Tamanho Mínimo de Fonte" },
  linkText:         { en: "Descriptive Link Text",     pt: "Texto de Link Descritivo" },
  headingStructure: { en: "Heading Structure",         pt: "Estrutura de Títulos" },
  colorContrast:    { en: "WCAG AA Color Contrast",    pt: "Contraste WCAG AA" },
  languageAttr:     { en: "Language Attribute",        pt: "Atributo de Idioma" },
  roleAttributes:   { en: "Table Role Attributes",     pt: "Atributos Role nas Tabelas" },
  tapTarget:        { en: "Tap Target Size",           pt: "Tamanho do Alvo de Toque" },
};
