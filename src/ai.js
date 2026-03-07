// ai.js — LintMail
// Unified AI provider: Anthropic, Gemini, OpenAI
// Returns a natural-language audit summary based on the report JSON

/**
 * @param {object} report     - Full audit report from engine
 * @param {string} lang       - "en" | "pt"
 * @param {object} settings   - { aiProvider, aiKey, campaignType }
 * @returns {Promise<string>} - Summary text or null if no provider configured
 */
export async function getAISummary(report, lang, settings) {
  const { aiProvider, aiKey } = settings;
  if (!aiProvider || aiProvider === "none" || !aiKey) return null;

  const prompt = buildPrompt(report, lang, settings.campaignType);

  try {
    if (aiProvider === "anthropic") return await callAnthropic(prompt, aiKey);
    if (aiProvider === "gemini")    return await callGemini(prompt, aiKey);
    if (aiProvider === "openai")    return await callOpenAI(prompt, aiKey);
  } catch (err) {
    console.error("LintMail AI error:", err);
    return null;
  }

  return null;
}

// ── PROMPT ────────────────────────────────────────────────────────────────────
function buildPrompt(report, lang, campaignType) {
  const issues = [];
  for (const [cat, result] of Object.entries(report.categories)) {
    for (const rule of result.rules) {
      if (rule.status !== "pass") {
        issues.push(`[${cat}] ${rule.name[lang]}: ${rule.detail[lang]}`);
      }
    }
  }

  const langInstruction = lang === "pt"
    ? "Responda em português brasileiro, de forma direta e profissional."
    : "Respond in English, concise and professional.";

  return `You are an email marketing expert reviewing an audit report.
${langInstruction}

Campaign type: ${campaignType}
Overall score: ${report.overallScore}/100

Issues found:
${issues.length ? issues.join("\n") : "No issues found."}

Write a 2-3 sentence summary for the email marketer: highlight the most critical issue, explain the impact briefly, and give one concrete action to improve. Be direct, no fluff.`;
}

// ── PROVIDERS ─────────────────────────────────────────────────────────────────
async function callAnthropic(prompt, key) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages:   [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Anthropic error");
  return data.content?.[0]?.text ?? null;
}

async function callGemini(prompt, key) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.5 },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini error");
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callOpenAI(prompt, key) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model:      "gpt-4o-mini",
      max_tokens: 200,
      messages:   [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "OpenAI error");
  return data.choices?.[0]?.message?.content ?? null;
}
