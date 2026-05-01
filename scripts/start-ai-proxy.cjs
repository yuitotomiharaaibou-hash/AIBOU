const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.AIBOU_AI_PROXY_PORT || 8787);

function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function callAnthropic({ apiKey, model, prompt }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      temperature: 0.2,
      system: "Return only one JSON object. No markdown, no code fences, no text before or after.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json?.error?.message ? `: ${json.error.message}` : "";
    throw new Error(`Anthropic HTTP ${res.status}${detail}`);
  }
  const content = Array.isArray(json?.content)
    ? json.content.find((c) => c?.type === "text")?.text ?? ""
    : "";
  return content;
}

async function callOpenAI({ apiKey, model, prompt }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json?.error?.message ? `: ${json.error.message}` : "";
    throw new Error(`OpenAI HTTP ${res.status}${detail}`);
  }
  return json?.choices?.[0]?.message?.content ?? "";
}

const rootEnv = path.join(process.cwd(), ".env");
loadDotenv(rootEnv);

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST" || req.url !== "/ai/tomorrow-hearing") {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not Found" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += String(chunk);
  });
  req.on("end", async () => {
    try {
      const parsed = JSON.parse(body || "{}");
      const provider = parsed.provider === "openai" ? "openai" : "anthropic";
      const prompt = typeof parsed.prompt === "string" ? parsed.prompt : "";
      const model = typeof parsed.model === "string" ? parsed.model : undefined;
      if (!prompt.trim()) throw new Error("prompt is required");

      const anthropicKey =
        process.env.ANTHROPIC_API_KEY || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || "";
      const openaiKey =
        process.env.OPENAI_API_KEY ||
        process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
        process.env.EXPO_PUBLIC_OPENAI_KEY ||
        "";

      const content =
        provider === "openai"
          ? await callOpenAI({ apiKey: openaiKey, model, prompt })
          : await callAnthropic({ apiKey: anthropicKey, model, prompt });

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ content }));
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "proxy failed" }));
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[AIBOU AI Proxy] listening on http://127.0.0.1:${PORT}/ai/tomorrow-hearing`);
});
