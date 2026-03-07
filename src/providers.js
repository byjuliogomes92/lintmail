// providers.js — LintMail v0.5
// Can I Email property-level matrix + Samsung Mail
// Sources: caniemail.com, Litmus, MSO documentation

export function runProviderChecks(doc, raw) {
  return {
    gmail:     checkGmail(doc, raw),
    outlook:   checkOutlook(doc, raw),
    appleMail: checkAppleMail(doc, raw),
    yahoo:     checkYahoo(doc, raw),
    samsung:   checkSamsung(doc, raw),
  };
}

// ── CAN I EMAIL PROPERTY MATRIX ───────────────────────────────────────────────
// Each entry: { pattern, severity, nameEn, namePt, detailEn, detailPt }
// Checked against raw HTML string

const CSS_MATRIX = {
  gmail: [
    { re: /display\s*:\s*flex|flex-direction|flex-wrap|align-items|justify-content/i, sev:"fail",
      n:{en:"Flexbox",pt:"Flexbox"},
      d:{en:"Flexbox not supported in Gmail web — use table layout.",pt:"Flexbox não suportado no Gmail — use tabelas."} },
    { re: /display\s*:\s*grid|grid-template|grid-area/i, sev:"fail",
      n:{en:"CSS Grid",pt:"CSS Grid"},
      d:{en:"CSS Grid not supported in Gmail.",pt:"CSS Grid não suportado no Gmail."} },
    { re: /position\s*:\s*(absolute|fixed)/i, sev:"warn",
      n:{en:"position: absolute/fixed",pt:"position: absolute/fixed"},
      d:{en:"position: absolute/fixed ignored by Gmail.",pt:"position: absolute/fixed ignorado pelo Gmail."} },
    { re: /@font-face|fonts\.googleapis\.com/i, sev:"warn",
      n:{en:"Web Fonts",pt:"Web Fonts"},
      d:{en:"Web fonts not supported in Gmail — system fallback used.",pt:"Web fonts não suportadas no Gmail — fonte do sistema usada."} },
    { re: /animation\s*:|@keyframes/i, sev:"warn",
      n:{en:"CSS Animations",pt:"Animações CSS"},
      d:{en:"CSS animations stripped by Gmail.",pt:"Animações CSS removidas pelo Gmail."} },
    { re: /transform\s*:/i, sev:"warn",
      n:{en:"CSS transform",pt:"CSS transform"},
      d:{en:"CSS transform not supported in Gmail.",pt:"CSS transform não suportado no Gmail."} },
    { re: /:hover/i, sev:"warn",
      n:{en:":hover pseudo-class",pt:"Pseudo-classe :hover"},
      d:{en:":hover not supported in Gmail web.",pt:":hover não suportado no Gmail web."} },
  ],
  outlook: [
    { re: /display\s*:\s*flex|flex-direction|flex-wrap/i, sev:"fail",
      n:{en:"Flexbox",pt:"Flexbox"},
      d:{en:"Flexbox not supported in Outlook 2007–2019.",pt:"Flexbox não suportado no Outlook 2007–2019."} },
    { re: /display\s*:\s*grid|grid-template/i, sev:"fail",
      n:{en:"CSS Grid",pt:"CSS Grid"},
      d:{en:"CSS Grid not supported in Outlook.",pt:"CSS Grid não suportado no Outlook."} },
    { re: /border-radius/i, sev:"warn",
      n:{en:"border-radius",pt:"border-radius"},
      d:{en:"border-radius not supported in Outlook 2007–2019 — elements appear square.",pt:"border-radius não suportado no Outlook 2007–2019 — elementos ficam quadrados."} },
    { re: /background-image/i, sev:"warn",
      n:{en:"background-image",pt:"background-image"},
      d:{en:"background-image on divs/tds requires VML fallback for Outlook 2007–2019.",pt:"background-image em divs/tds requer fallback VML no Outlook 2007–2019."} },
    { re: /margin\s*:\s*\d|padding\s*:\s*\d(?!\s*px\s*\d)/i, sev:"warn",
      n:{en:"CSS Shorthand",pt:"CSS Shorthand"},
      d:{en:"CSS shorthand (margin/padding) partially supported — use longhand in Outlook.",pt:"CSS shorthand (margin/padding) suporte parcial — use forma completa no Outlook."} },
    { re: /max-width/i, sev:"warn",
      n:{en:"max-width",pt:"max-width"},
      d:{en:"max-width ignored on tables in Outlook 2007–2019 without MSO conditionals.",pt:"max-width ignorado em tabelas no Outlook 2007–2019 sem condicionais MSO."} },
    { re: /box-shadow/i, sev:"warn",
      n:{en:"box-shadow",pt:"box-shadow"},
      d:{en:"box-shadow not supported in Outlook.",pt:"box-shadow não suportado no Outlook."} },
    { re: /linear-gradient|radial-gradient/i, sev:"warn",
      n:{en:"CSS Gradients",pt:"Gradientes CSS"},
      d:{en:"CSS gradients not supported in Outlook 2007–2019.",pt:"Gradientes CSS não suportados no Outlook 2007–2019."} },
    { re: /overflow\s*:\s*(hidden|scroll|auto)/i, sev:"warn",
      n:{en:"overflow property",pt:"Propriedade overflow"},
      d:{en:"overflow: hidden/scroll not reliable in Outlook.",pt:"overflow: hidden/scroll não confiável no Outlook."} },
  ],
  appleMail: [
    { re: /@font-face/i, sev:"warn",
      n:{en:"@font-face in iCloud",pt:"@font-face no iCloud"},
      d:{en:"@font-face supported in Apple Mail app, not in iCloud web.",pt:"@font-face suportado no app Mail, não no iCloud web."} },
    { re: /animation\s*:|@keyframes/i, sev:"warn",
      n:{en:"CSS Animations",pt:"Animações CSS"},
      d:{en:"CSS animations supported in Apple Mail 16+ / iOS 16+, not older versions.",pt:"Animações CSS suportadas no Apple Mail 16+ / iOS 16+, não em versões antigas."} },
  ],
  yahoo: [
    { re: /display\s*:\s*flex|flex-direction/i, sev:"warn",
      n:{en:"Flexbox",pt:"Flexbox"},
      d:{en:"Flexbox partially supported in Yahoo Mail — test carefully.",pt:"Flexbox parcialmente suportado no Yahoo Mail — teste com cuidado."} },
    { re: /position\s*:\s*(absolute|fixed)/i, sev:"fail",
      n:{en:"position: absolute/fixed",pt:"position: absolute/fixed"},
      d:{en:"position: absolute/fixed not supported in Yahoo Mail.",pt:"position: absolute/fixed não suportado no Yahoo Mail."} },
    { re: /@font-face|fonts\.googleapis\.com/i, sev:"warn",
      n:{en:"Web Fonts",pt:"Web Fonts"},
      d:{en:"Web fonts not supported in Yahoo Mail.",pt:"Web fonts não suportadas no Yahoo Mail."} },
    { re: /margin\s*:\s*-\d|margin-(top|right|bottom|left)\s*:\s*-/i, sev:"warn",
      n:{en:"Negative Margins",pt:"Margens Negativas"},
      d:{en:"Negative margins unpredictable in Yahoo Mail.",pt:"Margens negativas imprevisíveis no Yahoo Mail."} },
  ],
  samsung: [
    { re: /display\s*:\s*flex|flex-direction/i, sev:"warn",
      n:{en:"Flexbox",pt:"Flexbox"},
      d:{en:"Flexbox partially supported in Samsung Mail — use table fallback.",pt:"Flexbox parcialmente suportado no Samsung Mail — use tabelas como fallback."} },
    { re: /@font-face/i, sev:"warn",
      n:{en:"Web Fonts",pt:"Web Fonts"},
      d:{en:"Web font support varies across Samsung Mail versions.",pt:"Suporte a web fonts varia entre versões do Samsung Mail."} },
    { re: /background-image/i, sev:"warn",
      n:{en:"background-image",pt:"background-image"},
      d:{en:"background-image support inconsistent in older Samsung Mail versions.",pt:"background-image inconsistente em versões antigas do Samsung Mail."} },
    { re: /animation\s*:|@keyframes/i, sev:"warn",
      n:{en:"CSS Animations",pt:"Animações CSS"},
      d:{en:"CSS animations not consistently supported in Samsung Mail.",pt:"Animações CSS não suportadas consistentemente no Samsung Mail."} },
  ],
};

function runMatrix(provKey, doc, raw) {
  const matrix = CSS_MATRIX[provKey] ?? [];
  return matrix
    .filter((entry) => entry.re.test(raw))
    .map((entry) => ({
      severity: entry.sev,
      name: entry.n,
      detail: entry.d,
    }));
}

// ── GMAIL ─────────────────────────────────────────────────────────────────────
function checkGmail(doc, raw) {
  const issues = runMatrix("gmail", doc, raw);

  const headStyles = doc.querySelectorAll("head style, link[rel='stylesheet']");
  if (headStyles.length > 0) issues.unshift({
    severity: "warn",
    name: {en:"CSS in <head>",pt:"CSS no <head>"},
    detail: {en:`${headStyles.length} <style> block(s) in <head> — Gmail strips these. Use inline CSS.`,
             pt:`${headStyles.length} bloco(s) <style> no <head> — Gmail remove esses. Use CSS inline.`},
  });

  const kb = Math.round(new TextEncoder().encode(raw).length / 1024);
  if (kb > 102) issues.unshift({
    severity: "fail",
    name: {en:"102KB Clip Limit",pt:"Limite de 102KB"},
    detail: {en:`Email is ${kb}KB — Gmail clips above 102KB. Recipients see "[Message clipped]".`,
             pt:`Email tem ${kb}KB — Gmail corta acima de 102KB. Destinatários verão "[Mensagem cortada]".`},
  });
  else if (kb > 85) issues.push({
    severity: "warn",
    name: {en:"Approaching Clip Limit",pt:"Próximo ao Limite"},
    detail: {en:`${kb}KB — approaching Gmail's 102KB clip limit.`,
             pt:`${kb}KB — se aproximando do limite de 102KB do Gmail.`},
  });

  if (!/@media/i.test(raw)) issues.push({
    severity: "warn",
    name: {en:"No Media Queries",pt:"Sem Media Queries"},
    detail: {en:"No media queries — Gmail mobile app may not render responsively.",
             pt:"Sem media queries — app Gmail no mobile pode não renderizar responsivamente."},
  });

  const forms = doc.querySelectorAll("form");
  if (forms.length > 0) issues.push({
    severity: "fail",
    name: {en:"<form> Tags",pt:"Tags <form>"},
    detail: {en:`${forms.length} <form> — Gmail strips all forms.`,
             pt:`${forms.length} <form> — Gmail remove todos os formulários.`},
  });

  return scoreProvider(issues, [
    { label:"Gmail Web", versions:["2024"] },
    { label:"Gmail App", versions:["iOS","Android"] },
  ]);
}

// ── OUTLOOK ───────────────────────────────────────────────────────────────────
function checkOutlook(doc, raw) {
  const issues = runMatrix("outlook", doc, raw);

  if (!(/<!--\[if\s+(mso|gte mso|lt mso)/i.test(raw))) issues.push({
    severity: "warn",
    name: {en:"Missing MSO Conditionals",pt:"Sem Condicionais MSO"},
    detail: {en:"No <!--[if mso]> conditionals — layout may break in Outlook 2007–2019.",
             pt:"Sem condicionais <!--[if mso]> — layout pode quebrar no Outlook 2007–2019."},
  });

  if (/@font-face/i.test(raw)) issues.push({
    severity: "warn",
    name: {en:"@font-face Support",pt:"Suporte @font-face"},
    detail: {en:"@font-face only supported in Outlook 365 (Windows). 2007–2019 use fallback.",
             pt:"@font-face suportado apenas no Outlook 365 (Windows). 2007–2019 usam fallback."},
  });

  const vml = /v:rect|v:roundrect|VML/i.test(raw);
  if (/background-image/i.test(raw) && !vml) issues.push({
    severity: "warn",
    name: {en:"background-image (no VML)",pt:"background-image (sem VML)"},
    detail: {en:"background-image without VML fallback — invisible in Outlook 2007–2019.",
             pt:"background-image sem fallback VML — invisível no Outlook 2007–2019."},
  });

  return scoreProvider(issues, [
    { label:"Outlook 2016/2019", versions:["Windows"] },
    { label:"Outlook 365", versions:["Windows","macOS"] },
    { label:"Outlook.com", versions:["Web"] },
  ]);
}

// ── APPLE MAIL ────────────────────────────────────────────────────────────────
function checkAppleMail(doc, raw) {
  const issues = runMatrix("appleMail", doc, raw);

  const phoneRe = /\b(\d{2,3}[\s.-]?\d{4,5}[\s.-]?\d{4})\b/;
  if (phoneRe.test(doc.body?.textContent || "")) issues.push({
    severity: "warn",
    name: {en:"Phone Number Auto-linking",pt:"Auto-link de Telefone"},
    detail: {en:"Phone numbers auto-linked by Apple Mail. Wrap in <a href='tel:...'> to control.",
             pt:"Telefones convertidos automaticamente em links. Use <a href='tel:...'> para controlar."},
  });

  if (!/@media\s*\(prefers-color-scheme\s*:\s*dark\)/i.test(raw)) issues.push({
    severity: "warn",
    name: {en:"Dark Mode Auto-invert",pt:"Auto-inversão Dark Mode"},
    detail: {en:"No dark mode styles — Apple Mail will auto-invert colors unexpectedly.",
             pt:"Sem estilos dark mode — Apple Mail inverterá cores automaticamente."},
  });

  if (doc.querySelectorAll("form").length > 0) issues.push({
    severity: "warn",
    name: {en:"<form> Tags",pt:"Tags <form>"},
    detail: {en:"Forms are stripped by most Apple Mail versions.",
             pt:"Formulários são removidos pela maioria das versões do Apple Mail."},
  });

  return scoreProvider(issues, [
    { label:"Apple Mail", versions:["macOS","iOS"] },
    { label:"iCloud Mail", versions:["Web"] },
  ]);
}

// ── YAHOO ─────────────────────────────────────────────────────────────────────
function checkYahoo(doc, raw) {
  const issues = runMatrix("yahoo", doc, raw);

  const headStyles = doc.querySelectorAll("head style");
  if (headStyles.length > 0) issues.unshift({
    severity: "warn",
    name: {en:"CSS in <head>",pt:"CSS no <head>"},
    detail: {en:`${headStyles.length} <style> block(s) — Yahoo Mail strips <head> styles. Use inline CSS.`,
             pt:`${headStyles.length} bloco(s) <style> — Yahoo remove estilos no <head>. Use CSS inline.`},
  });

  const trackingLinks = Array.from(doc.querySelectorAll("a[href]")).filter((a) =>
    (a.getAttribute("href")||"").includes("utm_")
  );
  if (trackingLinks.length > 0) issues.push({
    severity: "warn",
    name: {en:"Tracking URL Rewriting",pt:"Reescrita de URLs de Rastreamento"},
    detail: {en:`${trackingLinks.length} UTM link(s) — Yahoo may rewrite URLs. Test click tracking.`,
             pt:`${trackingLinks.length} link(s) com UTM — Yahoo pode reescrever URLs. Teste rastreamento.`},
  });

  return scoreProvider(issues, [
    { label:"Yahoo Mail", versions:["Web","App"] },
  ]);
}

// ── SAMSUNG MAIL ──────────────────────────────────────────────────────────────
function checkSamsung(doc, raw) {
  const issues = runMatrix("samsung", doc, raw);

  if (!/@media/i.test(raw)) issues.push({
    severity: "warn",
    name: {en:"No Media Queries",pt:"Sem Media Queries"},
    detail: {en:"No media queries — Samsung Mail may not render responsively on Galaxy devices.",
             pt:"Sem media queries — Samsung Mail pode não renderizar responsivamente em dispositivos Galaxy."},
  });

  const kb = Math.round(new TextEncoder().encode(raw).length / 1024);
  if (kb > 200) issues.push({
    severity: "warn",
    name: {en:"Large Email Size",pt:"Email Muito Grande"},
    detail: {en:`${kb}KB — large emails may load slowly on Samsung Mail on mobile data.`,
             pt:`${kb}KB — emails grandes podem carregar lentamente no Samsung Mail em dados móveis.`},
  });

  if (doc.querySelectorAll("head style").length > 0) issues.push({
    severity: "warn",
    name: {en:"CSS in <head>",pt:"CSS no <head>"},
    detail: {en:"<head> styles partially supported in Samsung Mail — inline CSS is safer.",
             pt:"Estilos no <head> parcialmente suportados no Samsung Mail — CSS inline é mais seguro."},
  });

  return scoreProvider(issues, [
    { label:"Samsung Mail", versions:["Android","Galaxy"] },
  ]);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function scoreProvider(issues, versions) {
  const penalty = issues.reduce((acc, i) => acc + (i.severity === "fail" ? 25 : 10), 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  return { score, issues, versions };
}
