// darkMode.js — LintMail Dark Mode Compatibility Rules
import { calcScore } from "./utils.js";

export function runDarkModeRules(doc, raw) {
  const rules = [
    checkMetaColorScheme(doc, raw),
    checkDarkModeMediaQuery(raw),
    checkHardcodedWhiteBackground(doc),
    checkDarkModeImages(doc),
    checkTransparentImages(doc),
  ];
  return { score: calcScore(rules), rules };
}

function checkMetaColorScheme(doc, raw) {
  const meta = doc.querySelector('meta[name="color-scheme"]');
  const hasSupported = raw.includes("color-scheme");
  if (meta || hasSupported) {
    return pass("metaColorScheme", {
      en: "color-scheme meta tag or property detected.",
      pt: "Meta tag ou propriedade color-scheme detectada.",
    });
  }
  return warn("metaColorScheme", {
    en: 'No color-scheme declaration — add <meta name="color-scheme" content="light dark"> for better dark mode support.',
    pt: 'Sem declaração color-scheme — adicione <meta name="color-scheme" content="light dark"> para melhor suporte ao dark mode.',
  });
}

function checkDarkModeMediaQuery(raw) {
  const hasDarkMQ = /@media\s*\(prefers-color-scheme\s*:\s*dark\)/i.test(raw);
  if (hasDarkMQ) {
    return pass("darkModeMediaQuery", {
      en: "Dark mode media query detected — great proactive support.",
      pt: "Media query de dark mode detectada — ótimo suporte proativo.",
    });
  }
  return warn("darkModeMediaQuery", {
    en: "No prefers-color-scheme: dark media query — your email may look broken in dark mode.",
    pt: "Sem media query prefers-color-scheme: dark — seu email pode quebrar no dark mode.",
  });
}

function checkHardcodedWhiteBackground(doc) {
  const WHITE_VALUES = ["#ffffff", "#fff", "white", "rgb(255, 255, 255)", "rgb(255,255,255)"];
  const elements = Array.from(doc.querySelectorAll("[style]"));
  const hardcoded = elements.filter((el) => {
    const bg = (el.style.backgroundColor || "").toLowerCase();
    return WHITE_VALUES.some((w) => bg === w);
  });

  if (hardcoded.length === 0) {
    return pass("hardcodedWhiteBg", {
      en: "No hardcoded white backgrounds detected.",
      pt: "Nenhum fundo branco fixo detectado.",
    });
  }
  return warn("hardcodedWhiteBg", {
    en: `${hardcoded.length} element(s) with hardcoded white background — may cause glare in dark mode.`,
    pt: `${hardcoded.length} elemento(s) com fundo branco fixo — pode causar ofuscamento no dark mode.`,
  });
}

function checkDarkModeImages(doc) {
  const imgs = Array.from(doc.querySelectorAll("img[src]"));
  // Check for srcset or picture element with dark mode variants
  const hasDarkVariant = imgs.some((img) => {
    const srcset = img.getAttribute("srcset") || "";
    return srcset.includes("dark");
  }) || doc.querySelectorAll("picture source").length > 0;

  if (imgs.length === 0) {
    return pass("darkModeImages", {
      en: "No images found — no dark mode image variants needed.",
      pt: "Nenhuma imagem encontrada — variantes para dark mode não necessárias.",
    });
  }
  if (hasDarkVariant) {
    return pass("darkModeImages", {
      en: "Dark mode image variants detected — excellent.",
      pt: "Variantes de imagem para dark mode detectadas — excelente.",
    });
  }
  return warn("darkModeImages", {
    en: `${imgs.length} image(s) without dark mode variants — logos/icons may look bad on dark backgrounds.`,
    pt: `${imgs.length} imagem(ns) sem variantes para dark mode — logos/ícones podem ficar ruins em fundos escuros.`,
  });
}

function checkTransparentImages(doc) {
  const imgs = Array.from(doc.querySelectorAll("img[src]"));
  const pngs = imgs.filter((img) => (img.getAttribute("src") || "").toLowerCase().includes(".png"));

  if (pngs.length === 0) {
    return pass("transparentImages", {
      en: "No PNG images detected — no transparency issues.",
      pt: "Nenhuma imagem PNG detectada — sem problemas de transparência.",
    });
  }
  return warn("transparentImages", {
    en: `${pngs.length} PNG image(s) — verify they have dark-mode-safe backgrounds or use transparent-aware designs.`,
    pt: `${pngs.length} imagem(ns) PNG — verifique se possuem fundos seguros para dark mode.`,
  });
}

function pass(id, detail) { return { id, status: "pass", name: RULE_NAMES[id], detail }; }
function warn(id, detail) { return { id, status: "warn", name: RULE_NAMES[id], detail }; }

const RULE_NAMES = {
  metaColorScheme:    { en: "Color Scheme Meta",         pt: "Meta Color Scheme" },
  darkModeMediaQuery: { en: "Dark Mode Media Query",     pt: "Media Query Dark Mode" },
  hardcodedWhiteBg:   { en: "Hardcoded White Background",pt: "Fundo Branco Fixo" },
  darkModeImages:     { en: "Dark Mode Image Variants",  pt: "Variantes de Imagem Dark Mode" },
  transparentImages:  { en: "PNG Transparency Safety",   pt: "Segurança de Transparência PNG" },
};
