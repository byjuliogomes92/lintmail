// spam.js — LintMail Spam Score Rules
// Based on publicly documented SpamAssassin rules and industry best practices
import { calcScore } from "./utils.js";

export function runSpamRules(doc, raw) {
  const rules = [
    checkSpamSubjectPatterns(doc),
    checkExcessiveCaps(doc),
    checkExcessiveExclamation(doc),
    checkMoneySymbols(doc),
    checkPhishingPatterns(doc),
    checkHiddenText(doc),
    checkSuspiciousLinks(doc),
    checkFromDomainConsistency(doc),
    checkFormTags(doc),
    checkJavaScript(raw),
  ];
  return { score: calcScore(rules), rules };
}

function checkSpamSubjectPatterns(doc) {
  const PATTERNS_EN = [
    /free\s+money/i, /you('ve| have) won/i, /act\s+now/i, /limited\s+time\s+offer/i,
    /click\s+here/i, /make\s+money\s+fast/i, /earn\s+\$/, /weight\s+loss/i,
    /congratulations.*won/i, /no\s+credit\s+check/i, /lowest\s+price/i,
    /risk[\s-]free/i, /satisfaction\s+guaranteed/i, /winner/i,
  ];
  const PATTERNS_PT = [
    /dinheiro\s+fácil/i, /você\s+ganhou/i, /aja\s+agora/i, /oferta\s+limitada/i,
    /clique\s+aqui/i, /ganhe\s+dinheiro/i, /sem\s+risco/i, /grátis/i,
    /parabéns.*ganhou/i, /renda\s+extra/i,
  ];

  const text = doc.body?.textContent || "";
  const title = doc.querySelector("title")?.textContent || "";
  const fullText = `${text} ${title}`;

  const matched = [...PATTERNS_EN, ...PATTERNS_PT].filter((p) => p.test(fullText));

  if (matched.length === 0) {
    return pass("spamPatterns", {
      en: "No common spam patterns detected in content.",
      pt: "Nenhum padrão de spam detectado no conteúdo.",
    });
  }
  if (matched.length <= 2) {
    return warn("spamPatterns", {
      en: `${matched.length} spam pattern(s) found — review your copy.`,
      pt: `${matched.length} padrão(ões) de spam encontrado(s) — revise o texto.`,
    });
  }
  return fail("spamPatterns", {
    en: `${matched.length} spam patterns found — high risk of being filtered.`,
    pt: `${matched.length} padrões de spam encontrados — alto risco de filtragem.`,
  });
}

function checkExcessiveCaps(doc) {
  const text = doc.body?.textContent || "";
  const words = text.trim().split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return pass("excessiveCaps", { en: "No text found.", pt: "Nenhum texto encontrado." });

  const capsWords = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
  const ratio = capsWords.length / words.length;

  if (ratio < 0.15) {
    return pass("excessiveCaps", {
      en: `${Math.round(ratio * 100)}% words in ALL CAPS — within normal range.`,
      pt: `${Math.round(ratio * 100)}% palavras em CAPS — dentro do normal.`,
    });
  }
  if (ratio < 0.30) {
    return warn("excessiveCaps", {
      en: `${Math.round(ratio * 100)}% words in ALL CAPS — reduce to avoid spam filters.`,
      pt: `${Math.round(ratio * 100)}% palavras em CAPS — reduza para evitar filtros de spam.`,
    });
  }
  return fail("excessiveCaps", {
    en: `${Math.round(ratio * 100)}% words in ALL CAPS — major spam signal.`,
    pt: `${Math.round(ratio * 100)}% palavras em CAPS — sinal forte de spam.`,
  });
}

function checkExcessiveExclamation(doc) {
  const text = doc.body?.textContent || "";
  const count = (text.match(/!/g) || []).length;

  if (count <= 3) {
    return pass("exclamation", {
      en: `${count} exclamation mark(s) — acceptable.`,
      pt: `${count} ponto(s) de exclamação — aceitável.`,
    });
  }
  if (count <= 7) {
    return warn("exclamation", {
      en: `${count} exclamation marks — consider reducing.`,
      pt: `${count} pontos de exclamação — considere reduzir.`,
    });
  }
  return fail("exclamation", {
    en: `${count} exclamation marks — excessive use triggers spam filters.`,
    pt: `${count} pontos de exclamação — uso excessivo ativa filtros de spam.`,
  });
}

function checkMoneySymbols(doc) {
  const text = doc.body?.textContent || "";
  const matches = text.match(/(\$|€|£|R\$)\s*[\d,.]+/g) || [];

  if (matches.length <= 2) {
    return pass("moneySymbols", {
      en: `${matches.length} currency amount(s) — within acceptable range.`,
      pt: `${matches.length} valor(es) monetário(s) — dentro do aceitável.`,
    });
  }
  return warn("moneySymbols", {
    en: `${matches.length} currency amounts — high density can trigger spam filters.`,
    pt: `${matches.length} valores monetários — alta densidade pode ativar filtros de spam.`,
  });
}

function checkPhishingPatterns(doc) {
  const links = Array.from(doc.querySelectorAll("a[href]"));
  const PHISHING_PATTERNS = [
    /verify.*account/i, /confirm.*password/i, /update.*billing/i,
    /suspended.*account/i, /verifique.*conta/i, /confirme.*senha/i,
    /atualize.*pagamento/i,
  ];

  const suspicious = links.filter((a) => {
    const text = a.textContent?.toLowerCase() || "";
    return PHISHING_PATTERNS.some((p) => p.test(text));
  });

  if (suspicious.length === 0) {
    return pass("phishing", {
      en: "No phishing-like link patterns detected.",
      pt: "Nenhum padrão de link suspeito (phishing) detectado.",
    });
  }
  return warn("phishing", {
    en: `${suspicious.length} link(s) with phrasing that resembles phishing — review copy.`,
    pt: `${suspicious.length} link(s) com texto que lembra phishing — revise o conteúdo.`,
  });
}

function checkHiddenText(doc) {
  const HIDDEN_SELECTORS = [
    '[style*="display:none"]',
    '[style*="display: none"]',
    '[style*="visibility:hidden"]',
    '[style*="font-size:0"]',
    '[style*="color:#ffffff"][style*="background:#ffffff"]',
    '[style*="color:#fff"][style*="background:#fff"]',
  ];

  // Exclude known legitimate preheader patterns
  const allHidden = HIDDEN_SELECTORS.flatMap((s) => Array.from(doc.querySelectorAll(s)));
  const body = doc.body;
  const firstHidden = body?.querySelector('[style*="display:none"], [style*="display: none"]');

  // If the only hidden element is at the very top (preheader), it's fine
  const suspicious = allHidden.filter((el) => el !== firstHidden && el.textContent?.trim().length > 0);

  if (suspicious.length === 0) {
    return pass("hiddenText", {
      en: "No suspicious hidden text detected.",
      pt: "Nenhum texto oculto suspeito detectado.",
    });
  }
  return fail("hiddenText", {
    en: `${suspicious.length} element(s) with hidden text — spam filters penalize this heavily.`,
    pt: `${suspicious.length} elemento(s) com texto oculto — filtros de spam penalizam isso fortemente.`,
  });
}

function checkSuspiciousLinks(doc) {
  const links = Array.from(doc.querySelectorAll("a[href]"));
  const SUSPICIOUS_DOMAINS = [
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
    "rb.gy", "cutt.ly", "short.io",
  ];

  const shortLinks = links.filter((a) => {
    const href = a.getAttribute("href") || "";
    return SUSPICIOUS_DOMAINS.some((d) => href.includes(d));
  });

  if (shortLinks.length === 0) {
    return pass("suspiciousLinks", {
      en: "No URL shorteners detected.",
      pt: "Nenhum encurtador de URL detectado.",
    });
  }
  return warn("suspiciousLinks", {
    en: `${shortLinks.length} shortened URL(s) — use full domain URLs in emails.`,
    pt: `${shortLinks.length} URL(s) encurtada(s) — use URLs completas em emails.`,
  });
}

function checkFromDomainConsistency(doc) {
  const links = Array.from(doc.querySelectorAll("a[href]"));
  const domains = new Set();
  links.forEach((a) => {
    try {
      const url = new URL(a.getAttribute("href") || "");
      if (url.protocol.startsWith("http")) domains.add(url.hostname.replace(/^www\./, ""));
    } catch {}
  });

  if (domains.size === 0) {
    return pass("domainConsistency", {
      en: "No external links found.",
      pt: "Nenhum link externo encontrado.",
    });
  }
  if (domains.size <= 4) {
    return pass("domainConsistency", {
      en: `${domains.size} unique domain(s) in links — consistent.`,
      pt: `${domains.size} domínio(s) único(s) nos links — consistente.`,
    });
  }
  return warn("domainConsistency", {
    en: `${domains.size} different domains in links — high variety can trigger spam filters.`,
    pt: `${domains.size} domínios diferentes nos links — alta variedade pode ativar filtros de spam.`,
  });
}

function checkFormTags(doc) {
  const forms = doc.querySelectorAll("form");
  if (forms.length === 0) {
    return pass("formTags", {
      en: "No <form> tags detected — good.",
      pt: "Nenhuma tag <form> detectada — ótimo.",
    });
  }
  return fail("formTags", {
    en: `${forms.length} <form> tag(s) found — forms in emails are blocked by most clients and flagged as spam.`,
    pt: `${forms.length} tag(s) <form> encontrada(s) — formulários em emails são bloqueados pela maioria dos clientes.`,
  });
}

function checkJavaScript(raw) {
  const hasScript = /<script[\s>]/i.test(raw);
  if (!hasScript) {
    return pass("javascript", {
      en: "No <script> tags found — good.",
      pt: "Nenhuma tag <script> encontrada — ótimo.",
    });
  }
  return fail("javascript", {
    en: "<script> tags found — JavaScript is blocked by all email clients and marks emails as spam.",
    pt: "Tags <script> encontradas — JavaScript é bloqueado por todos os clientes de email.",
  });
}

function pass(id, detail) { return { id, status: "pass", name: RULE_NAMES[id], detail }; }
function warn(id, detail) { return { id, status: "warn", name: RULE_NAMES[id], detail }; }
function fail(id, detail) { return { id, status: "fail", name: RULE_NAMES[id], detail }; }

const RULE_NAMES = {
  spamPatterns:      { en: "Spam Content Patterns",    pt: "Padrões de Conteúdo Spam" },
  excessiveCaps:     { en: "Excessive Capitalization", pt: "Capitalização Excessiva" },
  exclamation:       { en: "Exclamation Marks",        pt: "Pontos de Exclamação" },
  moneySymbols:      { en: "Currency Density",         pt: "Densidade de Valores Monetários" },
  phishing:          { en: "Phishing-like Patterns",   pt: "Padrões de Phishing" },
  hiddenText:        { en: "Hidden Text",              pt: "Texto Oculto" },
  suspiciousLinks:   { en: "URL Shorteners",           pt: "Encurtadores de URL" },
  domainConsistency: { en: "Link Domain Variety",      pt: "Variedade de Domínios" },
  formTags:          { en: "Form Tags",                pt: "Tags de Formulário" },
  javascript:        { en: "JavaScript",               pt: "JavaScript" },
};
